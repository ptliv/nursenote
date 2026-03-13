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
import { SoapNote, SubscriptionStatus } from "@/lib/types";
import {
  OpenAIConfigError,
  OpenAITimeoutError,
  SOAP_MODEL_DEFAULT,
  SOAP_PROMPT_VERSION,
  generateSoapDraft,
} from "@/lib/soap/generate";
import {
  normalizeForSoap,
  normalizeSoapNoteId,
  validateSoapSourceText,
} from "@/lib/soap/shared";

export interface CreateSoapInput {
  sourceText: unknown;
  noteId?: unknown;
  style?: unknown;
  /** true이면 동일 해시 초안이 있어도 새로 생성한다 */
  forceRegenerate?: boolean;
}

type SoapPlan = "free" | "pro";

export interface SoapQuota {
  plan: SoapPlan;
  monthlyLimit: number | null;
  monthlyUsed: number;
}

export const SOAP_FREE_MONTHLY_LIMIT = 5;
export const SOAP_UPGRADE_URL = "/pro?from=soap-limit";

export type CreateSoapResult =
  | {
      ok: true;
      note: SoapNote;
      warning?: string;
      quota: SoapQuota;
      /** true이면 AI 호출 없이 기존 초안을 반환한 것 (사용량 차감 없음) */
      fromExisting: boolean;
    }
  | {
      ok: false;
      status: number;
      error: string;
      upgradeUrl?: string;
      quota?: SoapQuota;
    };

/** SHA-256 앞 32자. dedup 식별용이며 보안 목적이 아님. */
function computeInputHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 32);
}

function joinWarnings(warnings: string[]): string | undefined {
  if (warnings.length === 0) return undefined;
  return warnings.join(" ");
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

function toSoapPlan(status: SubscriptionStatus | null | undefined): SoapPlan {
  return status === "pro" ? "pro" : "free";
}

export async function createAndSaveSoap(
  input: CreateSoapInput
): Promise<CreateSoapResult> {
  // ── 1. 입력 검증 + 정규화 + 해시 ────────────────────────────────
  const validated = validateSoapSourceText(input.sourceText);
  if (!validated.ok) {
    return { ok: false, status: 400, error: validated.message };
  }

  const style = normalizeDraftStyle(input.style);

  // 공백/개행 정규화: 해시 기반 dedup의 일관성과 AI 프롬프트 품질에 영향
  const normalizedText = normalizeForSoap(validated.value);
  const modelKey = process.env.OPENAI_MODEL ?? SOAP_MODEL_DEFAULT;
  const inputHash = computeInputHash(
    `${SOAP_PROMPT_VERSION}|${modelKey}|${style}|${normalizedText}`
  );

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, status: 401, error: "로그인이 필요합니다." };
  }

  // 1) 구독 상태 확인 (free/pro)
  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subscriptionError) {
    console.error("createAndSaveSoap subscription error:", {
      userId: user.id,
      subscriptionError,
    });
    return {
      ok: false,
      status: 500,
      error: "이용 한도 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  const plan = toSoapPlan(
    (subscription?.status as SubscriptionStatus | undefined) ?? null
  );

  let quota: SoapQuota = {
    plan,
    monthlyLimit: plan === "free" ? SOAP_FREE_MONTHLY_LIMIT : null,
    monthlyUsed: 0,
  };

  // 2) free 사용자 월간 사용량 체크
  if (plan === "free") {
    const { start, end } = getCurrentMonthRangeUTC();
    const { count, error: usageError } = await supabase
      .from("soap_notes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", start)
      .lt("created_at", end);

    if (usageError) {
      console.error("createAndSaveSoap usage error:", {
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
      monthlyLimit: SOAP_FREE_MONTHLY_LIMIT,
      monthlyUsed: count ?? 0,
    };

  }

  const warnings: string[] = [];
  const hasNoteContextHint =
    input.noteId !== undefined && input.noteId !== null;

  // ── 3. note_id 유효성/소유권 확인 ────────────────────────────────
  let resolvedNoteId: string | null = null;
  const normalizedNoteId = normalizeSoapNoteId(input.noteId);
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
      console.error("createAndSaveSoap note lookup error:", { userId: user.id, noteError });
      warnings.push("메모 연결 확인 중 문제가 있어 연결 없이 저장합니다.");
    } else if (note) {
      resolvedNoteId = note.id;
    } else {
      warnings.push("연결할 실습 메모를 찾지 못해 메모 미연결 상태로 저장합니다.");
    }
  }

  // ── 4. 동일 입력 기존 초안 조회 ─────────────────────────────────
  // 한도 체크 이전에 실행: 동일 입력은 AI 호출 없이 기존 결과를 반환하며 사용량 차감 없음.
  // 단, note_id가 주어진 경우에는 동일 note_id 결과에만 재사용하여
  // 다른 메모와 잘못 연결된 결과가 노출되지 않게 한다.
  if (!input.forceRegenerate) {
    try {
      const { data: existing, error: existingError } = await supabase
        .from("soap_notes")
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
        const existingNote = withDraftStyle(
          existing as SoapNote & { style?: DraftStyle | null },
          style
        );
        const isNoteContextMatch =
          resolvedNoteId !== null
            ? existingNote.note_id === resolvedNoteId
            : hasNoteContextHint
            ? existingNote.note_id === null
            : true;

        if (isNoteContextMatch) {
          return {
            ok: true,
            note: existingNote,
            fromExisting: true,
            quota,
            warning: joinWarnings(warnings),
          };
        }
      }
    } catch (error) {
      // input_hash 컬럼 미존재(마이그레이션 전 개발 환경) 시 조용히 통과
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        const missingColumn =
          message.includes("input_hash") && message.includes("column");
        if (!missingColumn) {
          console.error("createAndSaveSoap dedup lookup error:", {
            userId: user.id,
            error,
          });
        }
      }
    }
  }

  // ── 5. 무료 한도 초과 체크 ───────────────────────────────────────
  if (plan === "free" && quota.monthlyUsed >= SOAP_FREE_MONTHLY_LIMIT) {
    return {
      ok: false,
      status: 403,
      error:
        "이번 달 무료 한도(5회)를 모두 사용했어요. Pro로 업그레이드하면 SOAP를 무제한으로 생성할 수 있어요.",
      upgradeUrl: SOAP_UPGRADE_URL,
      quota,
    };
  }

  let draft;
  try {
    draft = await generateSoapDraft(normalizedText, style);
  } catch (error) {
    console.error("createAndSaveSoap generate error:", { userId: user.id, error });

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
      error: "SOAP 생성 중 알 수 없는 문제가 발생했습니다.",
    };
  }

  const insertPayload = {
    user_id: user.id,
    note_id: resolvedNoteId,
    source_text: normalizedText,
    input_hash: inputHash,
    style,
    subjective: draft.subjective,
    objective: draft.objective,
    assessment: draft.assessment,
    plan: draft.plan,
  };

  let { data: saved, error: saveError } = await supabase
    .from("soap_notes")
    .insert(insertPayload)
    .select()
    .single();

  if (saveError && isMissingDraftStyleColumnError(saveError, "soap_notes")) {
    console.error("createAndSaveSoap save retry without style column:", {
      userId: user.id,
      code: saveError.code,
      message: saveError.message,
      details: saveError.details,
      hint: saveError.hint,
    });

    const legacyInsertPayload = omitDraftStyle(insertPayload);
    const retryResult = await supabase
      .from("soap_notes")
      .insert(legacyInsertPayload)
      .select()
      .single();

    saved = retryResult.data;
    saveError = retryResult.error;
  }

  if (saveError) {
    console.error("createAndSaveSoap save error:", {
      userId: user.id,
      code: saveError.code,
      message: saveError.message,
      details: saveError.details,
      hint: saveError.hint,
    });
    warnings.push(
      "초안은 생성되었지만 저장에 실패했습니다. 클립보드에 복사해 임시 보관해주세요."
    );

    const tempNote: SoapNote = {
      id: "",
      user_id: user.id,
      note_id: resolvedNoteId,
      source_text: normalizedText,
      style,
      subjective: draft.subjective,
      objective: draft.objective,
      assessment: draft.assessment,
      plan: draft.plan,
      created_at: new Date().toISOString(),
    };

    return {
      ok: true,
      note: tempNote,
      warning: joinWarnings(warnings),
      quota, // 저장 실패 시 카운트 변화 없음
      fromExisting: false,
    };
  }

  // 새 초안 저장 성공: monthlyUsed를 +1 해서 정확한 현재 카운트 반환
  const updatedQuota: SoapQuota = {
    ...quota,
    monthlyUsed: quota.monthlyUsed + 1,
  };

  return {
    ok: true,
    note: withDraftStyle(saved as SoapNote & { style?: DraftStyle | null }, style),
    warning: joinWarnings(warnings),
    quota: updatedQuota,
    fromExisting: false,
  };
}
