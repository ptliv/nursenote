import "server-only";

import { createHash } from "crypto";
import {
  DraftStyle,
  isMissingDraftStyleColumnError,
  omitDraftStyle,
  normalizeDraftStyle,
  withDraftStyle,
} from "@/lib/drafts/style";
import { createClient } from "@/lib/supabase/server";
import { JournalDraft, SubscriptionStatus } from "@/lib/types";
import {
  JOURNAL_MODEL_DEFAULT,
  JOURNAL_PROMPT_VERSION,
  OpenAIConfigError,
  OpenAITimeoutError,
  generateJournalDraft,
} from "@/lib/journal/generate";
import {
  JOURNAL_FREE_LIMIT,
  buildJournalSourceText,
  normalizeForJournal,
  normalizeJournalId,
  validateJournalExtraNote,
  validateJournalPracticeText,
} from "@/lib/journal/shared";

export interface CreateJournalInput {
  practiceText: unknown;
  soapNoteId: unknown;
  noteId?: unknown;
  extraNote?: unknown;
  style?: unknown;
  forceRegenerate?: boolean;
}

type JournalPlan = "free" | "pro";

export interface JournalQuota {
  plan: JournalPlan;
  monthlyLimit: number | null;
  monthlyUsed: number;
}

export const JOURNAL_FREE_MONTHLY_LIMIT = JOURNAL_FREE_LIMIT;
export const JOURNAL_UPGRADE_URL = "/pro?from=practice-log-limit";

type CreateJournalResult =
  | {
      ok: true;
      draft: JournalDraft;
      warning?: string;
      quota: JournalQuota;
      fromExisting: boolean;
    }
  | {
      ok: false;
      status: number;
      error: string;
      upgradeUrl?: string;
      quota?: JournalQuota;
    };

interface SoapSourceRow {
  id: string;
  note_id: string | null;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

function computeInputHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 32);
}

function joinWarnings(warnings: string[]): string | undefined {
  if (warnings.length === 0) return undefined;
  return warnings.join(" ");
}

function toJournalPlan(
  status: SubscriptionStatus | null | undefined
): JournalPlan {
  return status === "pro" ? "pro" : "free";
}

function getCurrentMonthRangeUTC(now: Date = new Date()): {
  start: string;
  end: string;
} {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0)
  );
  return { start: start.toISOString(), end: end.toISOString() };
}

function buildSoapSnapshot(soapNote: SoapSourceRow): string {
  return [
    `S: ${soapNote.subjective}`,
    `O: ${soapNote.objective}`,
    `A: ${soapNote.assessment}`,
    `P: ${soapNote.plan}`,
  ].join("\n");
}

export async function createAndSaveJournal(
  input: CreateJournalInput
): Promise<CreateJournalResult> {
  const validatedPractice = validateJournalPracticeText(input.practiceText);
  if (!validatedPractice.ok) {
    return { ok: false, status: 400, error: validatedPractice.message };
  }

  const validatedExtra = validateJournalExtraNote(input.extraNote);
  if (!validatedExtra.ok) {
    return { ok: false, status: 400, error: validatedExtra.message };
  }

  const style = normalizeDraftStyle(input.style);

  const normalizedSoapNoteId = normalizeJournalId(input.soapNoteId);
  if (!normalizedSoapNoteId) {
    return {
      ok: false,
      status: 400,
      error: "연결된 SOAP 초안을 선택해주세요.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, status: 401, error: "로그인이 필요합니다." };
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subscriptionError) {
    console.error("createAndSaveJournal subscription error:", {
      userId: user.id,
      subscriptionError,
    });
    return {
      ok: false,
      status: 500,
      error: "이용 한도 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  const plan = toJournalPlan(
    (subscription?.status as SubscriptionStatus | undefined) ?? null
  );

  let quota: JournalQuota = {
    plan,
    monthlyLimit: plan === "free" ? JOURNAL_FREE_MONTHLY_LIMIT : null,
    monthlyUsed: 0,
  };

  if (plan === "free") {
    const { start, end } = getCurrentMonthRangeUTC();
    const { count, error: usageError } = await supabase
      .from("journal_drafts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", start)
      .lt("created_at", end);

    if (usageError) {
      console.error("createAndSaveJournal usage error:", {
        userId: user.id,
        usageError,
      });
      return {
        ok: false,
        status: 500,
        error: "이용 한도 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
      };
    }

    quota = {
      plan,
      monthlyLimit: JOURNAL_FREE_MONTHLY_LIMIT,
      monthlyUsed: count ?? 0,
    };
  }

  const warnings: string[] = [];
  let resolvedNoteId: string | null = null;
  const normalizedNoteId = normalizeJournalId(input.noteId);
  if (input.noteId !== undefined && input.noteId !== null && !normalizedNoteId) {
    warnings.push("메모 연결 정보가 올바르지 않아 연결 없이 저장합니다.");
  }

  if (normalizedNoteId) {
    const { data: note, error: noteError } = await supabase
      .from("practice_notes")
      .select("id")
      .eq("id", normalizedNoteId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (noteError) {
      console.error("createAndSaveJournal note lookup error:", {
        userId: user.id,
        noteError,
      });
      warnings.push("메모 연결 확인 중 문제가 있어 연결 없이 저장합니다.");
    } else if (note) {
      resolvedNoteId = note.id;
    } else {
      warnings.push("연결할 실습 메모를 찾지 못해 메모 미연결 상태로 저장합니다.");
    }
  }

  const { data: soapNote, error: soapError } = await supabase
    .from("soap_notes")
    .select("id,note_id,subjective,objective,assessment,plan")
    .eq("id", normalizedSoapNoteId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (soapError) {
    console.error("createAndSaveJournal soap lookup error:", {
      userId: user.id,
      soapError,
    });
    return {
      ok: false,
      status: 500,
      error: "연결된 SOAP 초안을 확인하는 중 문제가 발생했습니다.",
    };
  }

  if (!soapNote) {
    return {
      ok: false,
      status: 400,
      error: "연결된 SOAP 초안을 찾지 못했습니다. SOAP를 먼저 생성해주세요.",
    };
  }

  const resolvedSoap = soapNote as SoapSourceRow;

  if (
    resolvedNoteId &&
    resolvedSoap.note_id &&
    resolvedSoap.note_id !== resolvedNoteId
  ) {
    return {
      ok: false,
      status: 400,
      error: "선택한 SOAP 초안이 현재 메모와 연결되어 있지 않습니다.",
    };
  }

  if (!resolvedNoteId && resolvedSoap.note_id) {
    resolvedNoteId = resolvedSoap.note_id;
  }

  const normalizedPractice = normalizeForJournal(validatedPractice.value);
  const normalizedExtra = validatedExtra.value
    ? normalizeForJournal(validatedExtra.value)
    : null;
  const soapSnapshot = buildSoapSnapshot(resolvedSoap);
  const sourceText = buildJournalSourceText({
    practiceText: normalizedPractice,
    soapSnapshot,
    extraNote: normalizedExtra,
  });

  const modelKey = process.env.OPENAI_MODEL ?? JOURNAL_MODEL_DEFAULT;
  const inputHash = computeInputHash(
    `${JOURNAL_PROMPT_VERSION}|${modelKey}|${style}|${sourceText}`
  );

  if (!input.forceRegenerate) {
    try {
      const { data: existing, error: existingError } = await supabase
        .from("journal_drafts")
        .select("*")
        .eq("user_id", user.id)
        .eq("input_hash", inputHash)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existing) {
        const existingDraft = withDraftStyle(
          existing as JournalDraft & { style?: DraftStyle | null },
          style
        );
        const isContextMatch =
          existingDraft.soap_note_id === resolvedSoap.id &&
          (resolvedNoteId === null || existingDraft.note_id === resolvedNoteId);

        if (isContextMatch) {
          return {
            ok: true,
            draft: existingDraft,
            fromExisting: true,
            quota,
            warning: joinWarnings(warnings),
          };
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        const missingColumn =
          message.includes("input_hash") && message.includes("column");
        if (!missingColumn) {
          console.error("createAndSaveJournal dedup lookup error:", {
            userId: user.id,
            error,
          });
        }
      }
    }
  }

  if (plan === "free" && quota.monthlyUsed >= JOURNAL_FREE_MONTHLY_LIMIT) {
    return {
      ok: false,
      status: 403,
      error:
        "이번 달 무료 한도를 모두 사용했어요. Pro로 업그레이드하면 실습일지 초안을 무제한으로 생성할 수 있어요.",
      upgradeUrl: JOURNAL_UPGRADE_URL,
      quota,
    };
  }

  let generated;
  try {
    generated = await generateJournalDraft(sourceText, style);
  } catch (error) {
    console.error("createAndSaveJournal generate error:", { userId: user.id, error });

    if (error instanceof OpenAIConfigError) {
      return {
        ok: false,
        status: 503,
        error: "AI 서비스가 아직 설정되지 않았습니다. 관리자에게 문의하세요.",
      };
    }
    if (error instanceof OpenAITimeoutError) {
      return {
        ok: false,
        status: 504,
        error: "AI 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.",
      };
    }
    if (error instanceof Error) {
      return { ok: false, status: 500, error: error.message };
    }
    return {
      ok: false,
      status: 500,
      error: "실습일지 초안 생성 중 알 수 없는 문제가 발생했습니다.",
    };
  }

  const insertPayload = {
    user_id: user.id,
    note_id: resolvedNoteId,
    soap_note_id: resolvedSoap.id,
    source_text: sourceText,
    input_hash: inputHash,
    style,
    practice_text: normalizedPractice,
    soap_snapshot: soapSnapshot,
    extra_note: normalizedExtra,
    summary: generated.summary,
    observation_performance: generated.observation_performance,
    learning_points: generated.learning_points,
    improvements: generated.improvements,
    next_goals: generated.next_goals,
  };

  let { data: saved, error: saveError } = await supabase
    .from("journal_drafts")
    .insert(insertPayload)
    .select()
    .single();

  if (saveError && isMissingDraftStyleColumnError(saveError, "journal_drafts")) {
    console.error("createAndSaveJournal save retry without style column:", {
      userId: user.id,
      code: saveError.code,
      message: saveError.message,
      details: saveError.details,
      hint: saveError.hint,
    });

    const legacyInsertPayload = omitDraftStyle(insertPayload);
    const retryResult = await supabase
      .from("journal_drafts")
      .insert(legacyInsertPayload)
      .select()
      .single();

    saved = retryResult.data;
    saveError = retryResult.error;
  }

  if (saveError) {
    console.error("createAndSaveJournal save error:", {
      userId: user.id,
      code: saveError.code,
      message: saveError.message,
      details: saveError.details,
      hint: saveError.hint,
    });
    warnings.push(
      "초안은 생성되었지만 저장에 실패했습니다. 내용을 복사해 임시 보관해주세요."
    );

    const tempDraft: JournalDraft = {
      id: "",
      user_id: user.id,
      note_id: resolvedNoteId,
      soap_note_id: resolvedSoap.id,
      source_text: sourceText,
      style,
      practice_text: normalizedPractice,
      soap_snapshot: soapSnapshot,
      extra_note: normalizedExtra,
      summary: generated.summary,
      observation_performance: generated.observation_performance,
      learning_points: generated.learning_points,
      improvements: generated.improvements,
      next_goals: generated.next_goals,
      created_at: new Date().toISOString(),
    };

    return {
      ok: true,
      draft: tempDraft,
      warning: joinWarnings(warnings),
      quota,
      fromExisting: false,
    };
  }

  const updatedQuota: JournalQuota = {
    ...quota,
    monthlyUsed: quota.monthlyUsed + 1,
  };

  return {
    ok: true,
    draft: withDraftStyle(
      saved as JournalDraft & { style?: DraftStyle | null },
      style
    ),
    warning: joinWarnings(warnings),
    quota: updatedQuota,
    fromExisting: false,
  };
}
