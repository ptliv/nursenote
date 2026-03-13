export interface CaseStudyDraftSections {
  patient_summary: string;
  major_observations: string;
  nursing_problem_candidates: string;
  priority_summary: string;
  learning_needs: string;
}

export const CASE_STUDY_LIMITS = {
  practiceMin: 10,
  practiceMax: 4000,
  extraMax: 1200,
  sectionMax: 1800,
} as const;

type ValidationResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

type OptionalValidationResult =
  | { ok: true; value: string | null }
  | { ok: false; message: string };

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeCaseStudyId(id: unknown): string | null {
  if (typeof id !== "string") return null;
  const normalized = id.trim();
  if (!normalized) return null;
  if (!UUID_V4_PATTERN.test(normalized)) return null;
  return normalized;
}

export function validateCaseStudyPracticeText(sourceText: unknown): ValidationResult {
  if (typeof sourceText !== "string") {
    return { ok: false, message: "실습 메모 입력 형식이 올바르지 않습니다." };
  }

  const normalized = sourceText.trim();
  if (normalized.length < CASE_STUDY_LIMITS.practiceMin) {
    return {
      ok: false,
      message: `실습 메모를 더 자세히 입력해주세요. (${CASE_STUDY_LIMITS.practiceMin}자 이상)`,
    };
  }
  if (normalized.length > CASE_STUDY_LIMITS.practiceMax) {
    return {
      ok: false,
      message: `실습 메모가 너무 깁니다. (${CASE_STUDY_LIMITS.practiceMax}자 이하)`,
    };
  }

  return { ok: true, value: normalized };
}

export function validateCaseStudyExtraNote(
  extraNote: unknown
): OptionalValidationResult {
  if (extraNote === undefined || extraNote === null || extraNote === "") {
    return { ok: true, value: null };
  }
  if (typeof extraNote !== "string") {
    return { ok: false, message: "추가 메모 형식이 올바르지 않습니다." };
  }

  const normalized = extraNote.trim();
  if (!normalized) return { ok: true, value: null };

  if (normalized.length > CASE_STUDY_LIMITS.extraMax) {
    return {
      ok: false,
      message: `추가 메모가 너무 깁니다. (${CASE_STUDY_LIMITS.extraMax}자 이하)`,
    };
  }

  return { ok: true, value: normalized };
}

export function normalizeForCaseStudy(text: string): string {
  return text
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n");
}

export function buildCaseStudySourceText(input: {
  practiceText: string;
  soapSnapshot: string;
  journalSnapshot: string;
  extraNote: string | null;
}): string {
  const blocks = [
    `[실습 메모]\n${input.practiceText}`,
    `[연결 SOAP]\n${input.soapSnapshot}`,
    `[연결 실습일지 초안]\n${input.journalSnapshot}`,
  ];

  if (input.extraNote) {
    blocks.push(`[추가 메모]\n${input.extraNote}`);
  }

  return normalizeForCaseStudy(blocks.join("\n\n"));
}
