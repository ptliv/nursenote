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
import { CaseStudyDraft, SubscriptionStatus } from "@/lib/types";
import {
  CASE_STUDY_MODEL_DEFAULT,
  CASE_STUDY_PROMPT_VERSION,
  OpenAIConfigError,
  OpenAITimeoutError,
  generateCaseStudyDraft,
} from "@/lib/case-study/generate";
import {
  buildCaseStudySourceText,
  normalizeCaseStudyId,
  normalizeForCaseStudy,
  validateCaseStudyExtraNote,
  validateCaseStudyPracticeText,
} from "@/lib/case-study/shared";

export interface CreateCaseStudyInput {
  practiceText: unknown;
  soapNoteId: unknown;
  journalDraftId: unknown;
  noteId?: unknown;
  extraNote?: unknown;
  style?: unknown;
  forceRegenerate?: boolean;
}

type CaseStudyPlan = "free" | "pro";

export interface CaseStudyQuota {
  plan: CaseStudyPlan;
  monthlyLimit: number | null;
  monthlyUsed: number;
}

function parsePositiveInt(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed);
}

export const CASE_STUDY_PRO_ONLY =
  process.env.CASE_STUDY_PRO_ONLY === "true";
export const CASE_STUDY_FREE_MONTHLY_LIMIT = parsePositiveInt(
  process.env.CASE_STUDY_FREE_MONTHLY_LIMIT
);
export const CASE_STUDY_UPGRADE_URL = "/pro?from=case-study-limit";

type CreateCaseStudyResult =
  | {
      ok: true;
      draft: CaseStudyDraft;
      warning?: string;
      quota: CaseStudyQuota;
      fromExisting: boolean;
    }
  | {
      ok: false;
      status: number;
      error: string;
      upgradeUrl?: string;
      quota?: CaseStudyQuota;
    };

interface SoapSourceRow {
  id: string;
  note_id: string | null;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface JournalSourceRow {
  id: string;
  note_id: string | null;
  soap_note_id: string;
  summary: string;
  observation_performance: string;
  learning_points: string;
  improvements: string;
  next_goals: string;
}

function computeInputHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 32);
}

function joinWarnings(warnings: string[]): string | undefined {
  if (warnings.length === 0) return undefined;
  return warnings.join(" ");
}

function toCaseStudyPlan(
  status: SubscriptionStatus | null | undefined
): CaseStudyPlan {
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

function buildJournalSnapshot(journalDraft: JournalSourceRow): string {
  return [
    `실습 내용 요약: ${journalDraft.summary}`,
    `관찰 및 수행 내용: ${journalDraft.observation_performance}`,
    `배운 점: ${journalDraft.learning_points}`,
    `아쉬웠던 점 / 보완할 점: ${journalDraft.improvements}`,
    `다음 실습 목표: ${journalDraft.next_goals}`,
  ].join("\n");
}

export async function createAndSaveCaseStudy(
  input: CreateCaseStudyInput
): Promise<CreateCaseStudyResult> {
  const validatedPractice = validateCaseStudyPracticeText(input.practiceText);
  if (!validatedPractice.ok) {
    return { ok: false, status: 400, error: validatedPractice.message };
  }

  const validatedExtra = validateCaseStudyExtraNote(input.extraNote);
  if (!validatedExtra.ok) {
    return { ok: false, status: 400, error: validatedExtra.message };
  }

  const style = normalizeDraftStyle(input.style);

  const normalizedSoapNoteId = normalizeCaseStudyId(input.soapNoteId);
  if (!normalizedSoapNoteId) {
    return {
      ok: false,
      status: 400,
      error: "연결된 SOAP 초안을 선택해주세요.",
    };
  }

  const normalizedJournalDraftId = normalizeCaseStudyId(input.journalDraftId);
  if (!normalizedJournalDraftId) {
    return {
      ok: false,
      status: 400,
      error: "연결된 실습일지 초안을 선택해주세요.",
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
    console.error("createAndSaveCaseStudy subscription error:", {
      userId: user.id,
      subscriptionError,
    });
    return {
      ok: false,
      status: 500,
      error: "이용 한도 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  const plan = toCaseStudyPlan(
    (subscription?.status as SubscriptionStatus | undefined) ?? null
  );

  let quota: CaseStudyQuota = {
    plan,
    monthlyLimit:
      plan === "free" && CASE_STUDY_FREE_MONTHLY_LIMIT > 0
        ? CASE_STUDY_FREE_MONTHLY_LIMIT
        : null,
    monthlyUsed: 0,
  };

  if (plan === "free" && CASE_STUDY_FREE_MONTHLY_LIMIT > 0) {
    const { start, end } = getCurrentMonthRangeUTC();
    const { count, error: usageError } = await supabase
      .from("case_study_drafts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", start)
      .lt("created_at", end);

    if (usageError) {
      console.error("createAndSaveCaseStudy usage error:", {
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
      ...quota,
      monthlyUsed: count ?? 0,
    };
  }

  if (plan === "free" && CASE_STUDY_PRO_ONLY) {
    return {
      ok: false,
      status: 403,
      error:
        "케이스스터디 초안은 현재 Pro 전용 기능입니다. Pro로 업그레이드하면 바로 사용할 수 있어요.",
      upgradeUrl: CASE_STUDY_UPGRADE_URL,
      quota,
    };
  }


  const warnings: string[] = [];
  let resolvedNoteId: string | null = null;
  const normalizedNoteId = normalizeCaseStudyId(input.noteId);
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
      console.error("createAndSaveCaseStudy note lookup error:", {
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
    console.error("createAndSaveCaseStudy soap lookup error:", {
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

  const { data: journalDraft, error: journalError } = await supabase
    .from("journal_drafts")
    .select(
      "id,note_id,soap_note_id,summary,observation_performance,learning_points,improvements,next_goals"
    )
    .eq("id", normalizedJournalDraftId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (journalError) {
    console.error("createAndSaveCaseStudy journal lookup error:", {
      userId: user.id,
      journalError,
    });
    return {
      ok: false,
      status: 500,
      error: "연결된 실습일지 초안을 확인하는 중 문제가 발생했습니다.",
    };
  }

  if (!journalDraft) {
    return {
      ok: false,
      status: 400,
      error: "연결된 실습일지 초안을 찾지 못했습니다. 실습일지를 먼저 생성해주세요.",
    };
  }

  const resolvedJournal = journalDraft as JournalSourceRow;

  if (resolvedJournal.soap_note_id !== resolvedSoap.id) {
    return {
      ok: false,
      status: 400,
      error: "선택한 SOAP과 실습일지 초안의 연결 정보가 일치하지 않습니다.",
    };
  }

  if (resolvedSoap.note_id && resolvedJournal.note_id) {
    if (resolvedSoap.note_id !== resolvedJournal.note_id) {
      return {
        ok: false,
        status: 400,
        error: "선택한 SOAP과 실습일지 초안이 서로 다른 메모에 연결되어 있습니다.",
      };
    }
  }

  if (!resolvedNoteId) {
    resolvedNoteId = resolvedJournal.note_id ?? resolvedSoap.note_id ?? null;
  }

  if (resolvedNoteId && resolvedSoap.note_id && resolvedSoap.note_id !== resolvedNoteId) {
    return {
      ok: false,
      status: 400,
      error: "선택한 SOAP 초안이 현재 메모와 연결되어 있지 않습니다.",
    };
  }
  if (
    resolvedNoteId &&
    resolvedJournal.note_id &&
    resolvedJournal.note_id !== resolvedNoteId
  ) {
    return {
      ok: false,
      status: 400,
      error: "선택한 실습일지 초안이 현재 메모와 연결되어 있지 않습니다.",
    };
  }

  const normalizedPractice = normalizeForCaseStudy(validatedPractice.value);
  const normalizedExtra = validatedExtra.value
    ? normalizeForCaseStudy(validatedExtra.value)
    : null;
  const soapSnapshot = buildSoapSnapshot(resolvedSoap);
  const journalSnapshot = buildJournalSnapshot(resolvedJournal);
  const sourceText = buildCaseStudySourceText({
    practiceText: normalizedPractice,
    soapSnapshot,
    journalSnapshot,
    extraNote: normalizedExtra,
  });

  const modelKey =
    process.env.OPENAI_CASE_STUDY_MODEL ??
    process.env.OPENAI_MODEL ??
    CASE_STUDY_MODEL_DEFAULT;
  const inputHash = computeInputHash(
    `${CASE_STUDY_PROMPT_VERSION}|${modelKey}|${style}|${sourceText}`
  );

  if (!input.forceRegenerate) {
    try {
      const { data: existing, error: existingError } = await supabase
        .from("case_study_drafts")
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
          existing as CaseStudyDraft & { style?: DraftStyle | null },
          style
        );
        const isContextMatch =
          existingDraft.soap_note_id === resolvedSoap.id &&
          existingDraft.journal_draft_id === resolvedJournal.id &&
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
          console.error("createAndSaveCaseStudy dedup lookup error:", {
            userId: user.id,
            error,
          });
        }
      }
    }
  }
  if (
    plan === "free" &&
    CASE_STUDY_FREE_MONTHLY_LIMIT > 0 &&
    quota.monthlyUsed >= CASE_STUDY_FREE_MONTHLY_LIMIT
  ) {
    return {
      ok: false,
      status: 403,
      error:
        "이번 달 케이스스터디 무료 시도를 모두 사용했어요. Pro로 업그레이드하면 무제한으로 생성할 수 있어요.",
      upgradeUrl: CASE_STUDY_UPGRADE_URL,
      quota,
    };
  }

  let generated;
  try {
    generated = await generateCaseStudyDraft(sourceText, style);
  } catch (error) {
    console.error("createAndSaveCaseStudy generate error:", { userId: user.id, error });

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
      error: "케이스스터디 초안 생성 중 알 수 없는 문제가 발생했습니다.",
    };
  }

  const insertPayload = {
    user_id: user.id,
    note_id: resolvedNoteId,
    soap_note_id: resolvedSoap.id,
    journal_draft_id: resolvedJournal.id,
    source_text: sourceText,
    input_hash: inputHash,
    style,
    practice_text: normalizedPractice,
    soap_snapshot: soapSnapshot,
    journal_snapshot: journalSnapshot,
    extra_note: normalizedExtra,
    patient_summary: generated.patient_summary,
    major_observations: generated.major_observations,
    nursing_problem_candidates: generated.nursing_problem_candidates,
    priority_summary: generated.priority_summary,
    learning_needs: generated.learning_needs,
  };

  let { data: saved, error: saveError } = await supabase
    .from("case_study_drafts")
    .insert(insertPayload)
    .select()
    .single();

  if (saveError && isMissingDraftStyleColumnError(saveError, "case_study_drafts")) {
    console.error("createAndSaveCaseStudy save retry without style column:", {
      userId: user.id,
      code: saveError.code,
      message: saveError.message,
      details: saveError.details,
      hint: saveError.hint,
    });

    const legacyInsertPayload = omitDraftStyle(insertPayload);
    const retryResult = await supabase
      .from("case_study_drafts")
      .insert(legacyInsertPayload)
      .select()
      .single();

    saved = retryResult.data;
    saveError = retryResult.error;
  }

  if (saveError) {
    console.error("createAndSaveCaseStudy save error:", {
      userId: user.id,
      code: saveError.code,
      message: saveError.message,
      details: saveError.details,
      hint: saveError.hint,
    });
    warnings.push(
      "초안은 생성되었지만 저장에 실패했습니다. 내용을 복사해 임시 보관해주세요."
    );

    const tempDraft: CaseStudyDraft = {
      id: "",
      user_id: user.id,
      note_id: resolvedNoteId,
      soap_note_id: resolvedSoap.id,
      journal_draft_id: resolvedJournal.id,
      source_text: sourceText,
      style,
      practice_text: normalizedPractice,
      soap_snapshot: soapSnapshot,
      journal_snapshot: journalSnapshot,
      extra_note: normalizedExtra,
      patient_summary: generated.patient_summary,
      major_observations: generated.major_observations,
      nursing_problem_candidates: generated.nursing_problem_candidates,
      priority_summary: generated.priority_summary,
      learning_needs: generated.learning_needs,
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

  const updatedQuota: CaseStudyQuota = {
    ...quota,
    monthlyUsed: quota.monthlyUsed + 1,
  };

  return {
    ok: true,
    draft: withDraftStyle(
      saved as CaseStudyDraft & { style?: DraftStyle | null },
      style
    ),
    warning: joinWarnings(warnings),
    quota: updatedQuota,
    fromExisting: false,
  };
}

