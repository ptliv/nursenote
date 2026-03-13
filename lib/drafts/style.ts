export type DraftStyle = "narrative" | "clinical" | "hybrid";

export const DEFAULT_DRAFT_STYLE: DraftStyle = "hybrid";

export interface DraftStyleOption {
  value: DraftStyle;
  label: string;
  shortDescription: string;
  helperText: string;
  promptInstruction: string;
}

export const DRAFT_STYLE_OPTIONS: readonly DraftStyleOption[] = [
  {
    value: "narrative",
    label: "문장형",
    shortDescription: "읽기 쉬운 설명형",
    helperText:
      "초보 학생도 읽기 쉬운 자연스러운 한국어 문장 위주로 작성합니다.",
    promptInstruction:
      "문장형 스타일로 작성하세요. 약어는 꼭 필요한 경우만 최소한으로 사용하고, 자연스러운 한국어 설명형 문장을 우선합니다.",
  },
  {
    value: "clinical",
    label: "기록형",
    shortDescription: "실습 기록/약어 중심",
    helperText:
      "실습 기록처럼 간결하게 정리하되, 학생 제출용으로 읽을 수 있는 수준을 유지합니다.",
    promptInstruction:
      "기록형 스타일로 작성하세요. 완전한 설명형 문장은 최소화하고, V/S, BP, HR, SpO2, BST/FBS, c/o, edema 등 일반적인 간호/임상 약어를 우선 사용하세요. 수치, 활력징후, 검사값, 관찰 소견은 짧은 기록 단위로 끊어 쓰고, '환자는', '~하였다', '~이었다' 같은 설명형 서술은 피하세요.",
  },
  {
    value: "hybrid",
    label: "혼합형",
    shortDescription: "설명과 기록의 균형",
    helperText:
      "수치와 반복 관찰은 간결하게, 설명이 필요한 부분은 자연어로 정리하는 기본 추천 스타일입니다.",
    promptInstruction:
      "혼합형 스타일로 작성하세요. 수치, 활력징후, 검사값, 반복 관찰 표현에는 약어를 적절히 허용하고, 설명이 필요한 부분은 자연스러운 한국어 문장으로 유지하세요.",
  },
] as const;

const DRAFT_STYLE_MAP: Record<DraftStyle, DraftStyleOption> = {
  narrative: DRAFT_STYLE_OPTIONS[0],
  clinical: DRAFT_STYLE_OPTIONS[1],
  hybrid: DRAFT_STYLE_OPTIONS[2],
};

export function isDraftStyle(value: unknown): value is DraftStyle {
  return value === "narrative" || value === "clinical" || value === "hybrid";
}

export function normalizeDraftStyle(value: unknown): DraftStyle {
  return isDraftStyle(value) ? value : DEFAULT_DRAFT_STYLE;
}

export function getDraftStyleOption(style: DraftStyle): DraftStyleOption {
  return DRAFT_STYLE_MAP[style];
}

export function getDraftStylePromptInstruction(style: DraftStyle): string {
  return DRAFT_STYLE_MAP[style].promptInstruction;
}

export function withDraftStyle<T extends { style?: DraftStyle | null }>(
  row: T,
  fallbackStyle: DraftStyle = DEFAULT_DRAFT_STYLE
): Omit<T, "style"> & { style: DraftStyle } {
  return {
    ...row,
    style: isDraftStyle(row.style) ? row.style : fallbackStyle,
  };
}

export function omitDraftStyle<T extends { style: DraftStyle }>(
  row: T
): Omit<T, "style"> {
  const { style, ...rest } = row;
  void style;
  return rest;
}

export function isMissingDraftStyleColumnError(
  error: unknown,
  tableName?: string
): boolean {
  if (!error || typeof error !== "object") return false;

  const postgrestError = error as {
    code?: string;
    message?: string;
  };

  const message = postgrestError.message?.toLowerCase() ?? "";
  const expectedTarget = tableName ? `${tableName}.style` : "style";

  return (
    postgrestError.code === "42703" &&
    message.includes("column") &&
    message.includes(expectedTarget.toLowerCase())
  );
}
