import "server-only";

import OpenAI, {
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
  RateLimitError,
} from "openai";
import { DraftStyle, getDraftStylePromptInstruction } from "@/lib/drafts/style";
import { CASE_STUDY_LIMITS, CaseStudyDraftSections } from "@/lib/case-study/shared";

const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS ?? 20_000);
const OPENAI_MAX_RETRIES = 1;

export const CASE_STUDY_MODEL_DEFAULT = "gpt-4o-mini";
export const CASE_STUDY_PROMPT_VERSION = "2026-03-13-v2";

const SECTION_KEYS = [
  "patient_summary",
  "major_observations",
  "nursing_problem_candidates",
  "priority_summary",
  "learning_needs",
] as const;

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new OpenAIConfigError("OPENAI_API_KEY가 설정되지 않았습니다.");
  }

  return new OpenAI({
    apiKey,
    timeout: Number.isFinite(OPENAI_TIMEOUT_MS) ? OPENAI_TIMEOUT_MS : 20_000,
    maxRetries: OPENAI_MAX_RETRIES,
  });
}

export class OpenAIConfigError extends Error {
  readonly name = "OpenAIConfigError";
  constructor(message: string) {
    super(message);
  }
}

export class OpenAITimeoutError extends Error {
  readonly name = "OpenAITimeoutError";
  constructor(message: string) {
    super(message);
  }
}

const CASE_STUDY_SYSTEM_PROMPT = `당신은 간호학과 학생의 케이스스터디 초안 작성 보조 도구입니다.

[필수 제약]
• 학습 참고용 초안만 작성.
• 의료 진단·처방·투약 지시·임상 판단처럼 보이는 문장 금지.
• "가능성/관찰됨/추가 사정 필요" 같은 비확정 표현 사용.
• 입력에 없는 사실 추가 금지.
• 학생이 최종 수정할 수 있도록 간결한 초안 문체 유지.

JSON만 반환:
{"patient_summary":"","major_observations":"","nursing_problem_candidates":"","priority_summary":"","learning_needs":""}`;

function getCaseStudyStyleRules(style: DraftStyle): string {
  if (style === "narrative") {
    return [
      "문장형 규칙:",
      "• 자연스러운 한국어 설명형 문장 중심으로 작성합니다.",
      "• 학생이 읽고 바로 수정할 수 있는 완결 문장 위주로 정리합니다.",
      "• 약어는 꼭 필요한 경우만 제한적으로 사용합니다.",
    ].join("\n");
  }

  if (style === "hybrid") {
    return [
      "혼합형 규칙:",
      "• 설명은 자연어 중심으로 유지하되 수치와 관찰 포인트에는 약어를 허용합니다.",
      "• 대상자 상태 요약과 주요 관찰 내용에서 기록형 요소가 드러나게 작성합니다.",
      "• 지나치게 장문 설명으로 흐르지 않게 합니다.",
    ].join("\n");
  }

  return [
    "기록형 규칙:",
    "• 기록체 우선. 설명형 장문 최소화.",
    "• '환자는', '~하였다', '~이었다' 같은 서술형 표현을 피합니다.",
    "• 대상자 상태 요약: 핵심 정보와 수치 중심으로 짧게 정리합니다.",
    "• 주요 관찰 내용: V/S, 증상, 관찰 소견을 기록 단위로 끊어 씁니다.",
    "• 간호문제 후보/우선순위/학습 필요 항목도 핵심어 중심으로 짧게 씁니다.",
    "• BP, HR, RR, SpO2, BST/FBS, c/o, edema 등 기본 약어를 우선 사용합니다.",
    "• 학생 제출용으로 읽을 수 있는 수준은 유지하되, 문장형처럼 길게 서술하지 마세요.",
  ].join("\n");
}

function buildCaseStudySystemPrompt(style: DraftStyle): string {
  return `${CASE_STUDY_SYSTEM_PROMPT}

[출력 스타일]
• ${getDraftStylePromptInstruction(style)}

[스타일 규칙]
${getCaseStudyStyleRules(style)}`;
}

function getClinicalCaseStudyFewShotMessages() {
  return [
    {
      role: "user" as const,
      content:
        "예시 입력 1\n스타일: clinical\n입력: 70세 여성. BP 148/92, HR 88. 양측 하지 부종. 다리 무거움 호소. 이뇨제 투여 중. FBS 196.",
    },
    {
      role: "assistant" as const,
      content: JSON.stringify({
        patient_summary: "70F\nBP 148/92, HR 88\nbilat LE edema\n다리 무거움 c/o\nFBS 196",
        major_observations:
          "V/S 상승 소견\nbilat LE edema 관찰\n이뇨제 투여 중\n혈당 수치 높게 확인",
        nursing_problem_candidates:
          "체액 저류 관련 불편감 가능성\n혈당 조절 관련 추가 사정 필요",
        priority_summary:
          "V/S, edema, 혈당 추이 우선 확인\n증상 변화와 투약 반응 함께 관찰",
        learning_needs: "edema 사정 용어 정리\n이뇨제 모니터링 포인트 복습",
      }),
    },
    {
      role: "user" as const,
      content:
        "예시 입력 2\n스타일: clinical\n입력: 수술 후 1일차. SpO2 94%, RR 24. 숨참 호소. 심호흡 교육 시행. 보행 시 어지러움 호소.",
    },
    {
      role: "assistant" as const,
      content: JSON.stringify({
        patient_summary: "post-op 1일차\nSpO2 94%, RR 24\n숨참, 보행 시 어지러움 c/o",
        major_observations:
          "호흡수 증가\nSpO2 94% 확인\n심호흡 교육 시행\n활동 시 증상 호소",
        nursing_problem_candidates:
          "호흡 불편감 관련 추가 사정 필요\n활동 시 어지러움 관련 관찰 필요",
        priority_summary:
          "SpO2, RR, 활동 시 증상 우선 확인\n교육 후 반응과 변화 추적 필요",
        learning_needs: "post-op 호흡 관찰 포인트 복습\n활동 전후 증상 기록 보완",
      }),
    },
  ];
}

function extractJSONObject(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced && fenced[1]) {
    const candidate = fenced[1].trim();
    if (candidate.startsWith("{") && candidate.endsWith("}")) return candidate;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  throw new Error("AI 응답 형식이 올바르지 않습니다.");
}

function normalizeLineBreaks(text: string): string {
  return text.replace(/\r\n/g, "\n").trim();
}

function clipSection(text: string): string {
  if (text.length <= CASE_STUDY_LIMITS.sectionMax) return text;
  return `${text.slice(0, CASE_STUDY_LIMITS.sectionMax)}...`;
}

function addSafetySuffixIfNeeded(text: string, style: DraftStyle): string {
  const riskyDirectivePattern =
    /(진단|처방|투약\s*지시|용량|증량|감량|치료\s*결정|확정)/i;

  if (!riskyDirectivePattern.test(text)) return text;

  const suffix =
    style === "clinical"
      ? "\n\n(학습 참고: 확정 진단 아님)"
      : "\n\n(학습 참고: 확정 진단/처방이 아닌 케이스스터디 학습 초안으로 해석하세요.)";

  if (text.includes(suffix)) return text;
  return clipSection(`${text}${suffix}`);
}

function parseCaseStudyResponse(
  content: string,
  style: DraftStyle
): CaseStudyDraftSections {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJSONObject(content));
  } catch {
    throw new Error("AI 응답을 해석할 수 없습니다. 다시 시도해주세요.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI 응답 형식이 올바르지 않습니다.");
  }

  const obj = parsed as Record<string, unknown>;
  const sections = {} as Record<(typeof SECTION_KEYS)[number], string>;

  for (const key of SECTION_KEYS) {
    const value = obj[key];
    if (typeof value !== "string") {
      throw new Error(`AI 응답에서 '${key}' 항목이 누락되었습니다.`);
    }

    const normalized = clipSection(normalizeLineBreaks(value));
    if (!normalized) {
      throw new Error(`AI 응답의 '${key}' 항목이 비어있습니다.`);
    }

    sections[key] = addSafetySuffixIfNeeded(normalized, style);
  }

  return {
    patient_summary: sections.patient_summary,
    major_observations: sections.major_observations,
    nursing_problem_candidates: sections.nursing_problem_candidates,
    priority_summary: sections.priority_summary,
    learning_needs: sections.learning_needs,
  };
}

function mapOpenAIError(error: unknown): Error {
  if (error instanceof OpenAIConfigError) return error;

  if (error instanceof APIConnectionTimeoutError) {
    return new OpenAITimeoutError(
      "AI 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요."
    );
  }

  if (error instanceof AuthenticationError) {
    return new OpenAIConfigError(
      "AI 인증 설정이 올바르지 않습니다. 관리자에게 문의하세요."
    );
  }

  if (error instanceof RateLimitError) {
    return new Error("요청이 많아 잠시 후 다시 시도해주세요.");
  }

  if (error instanceof APIError) {
    return new Error("AI 서버 응답에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
  }

  if (error instanceof Error) return error;
  return new Error("케이스스터디 초안 생성 중 알 수 없는 오류가 발생했습니다.");
}

export async function generateCaseStudyDraft(
  sourceText: string,
  style: DraftStyle
): Promise<CaseStudyDraftSections> {
  const client = getOpenAIClient();
  const model =
    process.env.OPENAI_CASE_STUDY_MODEL ??
    process.env.OPENAI_MODEL ??
    CASE_STUDY_MODEL_DEFAULT;

  try {
    const response = await client.chat.completions.create(
      {
        model,
        messages: [
          { role: "system", content: buildCaseStudySystemPrompt(style) },
          ...(style === "clinical" ? getClinicalCaseStudyFewShotMessages() : []),
          {
            role: "user",
            content: `다음 입력을 바탕으로 간호학과 케이스스터디 학습 초안을 작성해주세요.\n적용 스타일: ${style}\n\n${sourceText}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "case_study_draft",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                patient_summary: { type: "string" },
                major_observations: { type: "string" },
                nursing_problem_candidates: { type: "string" },
                priority_summary: { type: "string" },
                learning_needs: { type: "string" },
              },
              required: SECTION_KEYS,
            },
          },
        },
        temperature: 0.2,
        max_tokens: 1000,
      },
      {
        timeout: Number.isFinite(OPENAI_TIMEOUT_MS) ? OPENAI_TIMEOUT_MS : 20_000,
      }
    );

    const content = response.choices[0]?.message?.content;
    if (!content?.trim()) {
      throw new Error("AI에서 유효한 응답을 받지 못했습니다.");
    }

    return parseCaseStudyResponse(content, style);
  } catch (error) {
    throw mapOpenAIError(error);
  }
}
