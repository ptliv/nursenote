export interface SoapDraft {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export const SOAP_LIMITS = {
  sourceMin: 10,
  sourceMax: 4000,
  sectionMax: 1800,
} as const;

export const SOAP_FREE_LIMIT = 5;

type SoapTextValidationResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateSoapSourceText(
  sourceText: unknown
): SoapTextValidationResult {
  if (typeof sourceText !== "string") {
    return { ok: false, message: "입력 형식이 올바르지 않습니다." };
  }

  const normalized = sourceText.trim();
  if (normalized.length < SOAP_LIMITS.sourceMin) {
    return {
      ok: false,
      message: `내용을 더 자세히 입력해주세요. (${SOAP_LIMITS.sourceMin}자 이상)`,
    };
  }
  if (normalized.length > SOAP_LIMITS.sourceMax) {
    return {
      ok: false,
      message: `입력 길이가 너무 깁니다. (${SOAP_LIMITS.sourceMax}자 이하)`,
    };
  }

  return { ok: true, value: normalized };
}

export function normalizeSoapNoteId(noteId: unknown): string | null {
  if (typeof noteId !== "string") return null;
  const normalized = noteId.trim();
  if (!normalized) return null;
  if (!UUID_V4_PATTERN.test(normalized)) return null;
  return normalized;
}

/**
 * AI 호출 전 입력을 정규화한다.
 * 해시 기반 dedup의 기준이 되므로 일관성이 중요하다:
 * - Windows 개행 통일
 * - 각 줄 끝 공백 제거
 * - 3줄 이상 연속 빈 줄 → 2줄로 축소
 */
export function normalizeForSoap(text: string): string {
  return text
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n");
}
