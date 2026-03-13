export interface JournalDraftSections {
  summary: string;
  observation_performance: string;
  learning_points: string;
  improvements: string;
  next_goals: string;
}

export const JOURNAL_LIMITS = {
  practiceMin: 10,
  practiceMax: 4000,
  extraMax: 1200,
  sectionMax: 1800,
} as const;

export const JOURNAL_FREE_LIMIT = 5;

type ValidationResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

type OptionalValidationResult =
  | { ok: true; value: string | null }
  | { ok: false; message: string };

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeJournalId(id: unknown): string | null {
  if (typeof id !== "string") return null;
  const normalized = id.trim();
  if (!normalized) return null;
  if (!UUID_V4_PATTERN.test(normalized)) return null;
  return normalized;
}

export function validateJournalPracticeText(sourceText: unknown): ValidationResult {
  if (typeof sourceText !== "string") {
    return { ok: false, message: "실습 메모 입력 형식이 올바르지 않습니다." };
  }

  const normalized = sourceText.trim();
  if (normalized.length < JOURNAL_LIMITS.practiceMin) {
    return {
      ok: false,
      message: `실습 메모를 더 자세히 입력해주세요. (${JOURNAL_LIMITS.practiceMin}자 이상)`,
    };
  }
  if (normalized.length > JOURNAL_LIMITS.practiceMax) {
    return {
      ok: false,
      message: `실습 메모가 너무 깁니다. (${JOURNAL_LIMITS.practiceMax}자 이하)`,
    };
  }

  return { ok: true, value: normalized };
}

export function validateJournalExtraNote(extraNote: unknown): OptionalValidationResult {
  if (extraNote === undefined || extraNote === null || extraNote === "") {
    return { ok: true, value: null };
  }
  if (typeof extraNote !== "string") {
    return { ok: false, message: "추가 메모 형식이 올바르지 않습니다." };
  }

  const normalized = extraNote.trim();
  if (!normalized) return { ok: true, value: null };

  if (normalized.length > JOURNAL_LIMITS.extraMax) {
    return {
      ok: false,
      message: `추가 메모가 너무 깁니다. (${JOURNAL_LIMITS.extraMax}자 이하)`,
    };
  }

  return { ok: true, value: normalized };
}

export function normalizeForJournal(text: string): string {
  return text
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n");
}

export function buildJournalSourceText(input: {
  practiceText: string;
  soapSnapshot: string;
  extraNote: string | null;
}): string {
  const blocks = [
    `[실습 메모]\n${input.practiceText}`,
    `[연결 SOAP]\n${input.soapSnapshot}`,
  ];

  if (input.extraNote) {
    blocks.push(`[추가 메모]\n${input.extraNote}`);
  }

  return normalizeForJournal(blocks.join("\n\n"));
}
