import "server-only";

import OpenAI, {
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
  RateLimitError,
} from "openai";
import { DraftStyle, getDraftStylePromptInstruction } from "@/lib/drafts/style";
import { JOURNAL_LIMITS, JournalDraftSections } from "@/lib/journal/shared";

const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS ?? 20_000);
const OPENAI_MAX_RETRIES = 1;

export const JOURNAL_MODEL_DEFAULT = "gpt-4o-mini";
export const JOURNAL_PROMPT_VERSION = "2026-03-13-v2";

const SECTION_KEYS = [
  "summary",
  "observation_performance",
  "learning_points",
  "improvements",
  "next_goals",
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

const JOURNAL_SYSTEM_PROMPT = `당신은 간호학과 학생의 실습일지 작성 보조 도구입니다.

[필수 제약]
• 학습 참고용 초안만 작성.
• 의료 진단·처방·투약 지시·임상 판단처럼 보이는 문장 금지.
• 확정/단정 표현 대신 관찰·학습 관점 표현 사용.
• 입력에 없는 사실 추가 금지.
• 학생이 최종 수정할 수 있도록 간결한 초안 문체 유지.

JSON만 반환:
{"summary":"","observation_performance":"","learning_points":"","improvements":"","next_goals":""}`;

function getJournalStyleRules(style: DraftStyle): string {
  if (style === "narrative") {
    return [
      "문장형 규칙:",
      "• 자연스러운 한국어 문장 중심으로 작성합니다.",
      "• 각 섹션은 읽기 쉬운 설명형 문장으로 정리합니다.",
      "• 약어는 꼭 필요한 경우만 최소화합니다.",
    ].join("\n");
  }

  if (style === "hybrid") {
    return [
      "혼합형 규칙:",
      "• 설명은 자연어로 유지하되 핵심 수치, 활력징후, 반복 관찰에는 약어를 허용합니다.",
      "• 관찰 및 수행 내용 섹션에서 기록형 요소가 가장 잘 드러나게 작성합니다.",
      "• 문장형과 기록형이 모두 느껴지되 지나치게 차팅체가 되지 않게 합니다.",
    ].join("\n");
  }

  return [
    "기록형 규칙:",
    "• 실습일지라도 기록체 우선. 완전한 설명형 문장 최소화.",
    "• '환자는', '~하였다', '~이었다', '~를 이해하였다' 같은 서술형 표현을 피합니다.",
    "• 실습 내용 요약: 긴 문장 대신 핵심 상황/수치/행위 요약.",
    "• 관찰 및 수행 내용: 가장 강한 기록체로 작성. V/S, BP, HR, RR, SpO2, BST/FBS, c/o, edema 등 약어 우선.",
    "• 배운 점/보완점/다음 목표: 짧은 핵심어 또는 짧은 기록 문장 중심.",
    "• 한 섹션 안에서도 짧은 기록 단위로 줄바꿈해 작성합니다.",
    "• 학생 제출용으로 읽을 수 있는 수준은 유지하되, 문장형처럼 장문 설명을 하지 마세요.",
  ].join("\n");
}

function buildJournalSystemPrompt(style: DraftStyle): string {
  return `${JOURNAL_SYSTEM_PROMPT}

[출력 스타일]
• ${getDraftStylePromptInstruction(style)}

[스타일 규칙]
${getJournalStyleRules(style)}`;
}

function getClinicalJournalFewShotMessages() {
  return [
    {
      role: "user" as const,
      content:
        "예시 입력 1\n스타일: clinical\n실습 메모: 70세 여성. BP 148/92, HR 88. 양측 하지 부종. 다리가 무겁다고 호소. 이뇨제 투여 중. FBS 196.",
    },
    {
      role: "assistant" as const,
      content: JSON.stringify({
        summary: "70F, 다리 무거움 c/o\nBP 148/92, HR 88\nbilat LE edema, FBS 196",
        observation_performance:
          "V/S 확인: BP 148/92, HR 88\nbilat LE edema 관찰\n이뇨제 투여 상태 확인\n혈당 수치 기록",
        learning_points:
          "edema 관찰 시 V/S, I/O, 혈당 같이 확인 필요\n수치 중심 기록 중요",
        improvements:
          "증상 변화 질문 더 구체화 필요\n투약 후 반응 기록 보완 필요",
        next_goals: "edema 사정 표현 정리\nV/S-증상 연계 기록 연습",
      }),
    },
    {
      role: "user" as const,
      content:
        "예시 입력 2\n스타일: clinical\n실습 메모: 수술 후 1일차. SpO2 94%, RR 24. 숨이 차다고 말함. 심호흡 교육 시행. 보행 시 어지러움 호소.",
    },
    {
      role: "assistant" as const,
      content: JSON.stringify({
        summary: "post-op 1일차\nSpO2 94%, RR 24\n숨참, 보행 시 어지러움 c/o",
        observation_performance:
          "SpO2, RR 확인\n숨참 c/o 확인\n심호흡 교육 시행\n보행 시 어지러움 반응 관찰",
        learning_points:
          "post-op 호흡상태는 수치와 증상 함께 기록 필요\n교육 후 반응 확인 중요",
        improvements:
          "보행 전후 증상 비교 기록 보완 필요\n호흡 양상 표현 더 구체화 필요",
        next_goals: "호흡기 사정 기록체 연습\n교육-반응 연결 기록 보완",
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
  if (text.length <= JOURNAL_LIMITS.sectionMax) return text;
  return `${text.slice(0, JOURNAL_LIMITS.sectionMax)}...`;
}

function addSafetySuffixIfNeeded(text: string, style: DraftStyle): string {
  const riskyDirectivePattern =
    /(진단|처방|투약\s*지시|용량|증량|감량|치료\s*결정|확정)/i;

  if (!riskyDirectivePattern.test(text)) return text;

  const suffix =
    style === "clinical"
      ? "\n\n(학습 참고: 의료적 판단 아님)"
      : "\n\n(학습 참고: 의료적 판단/처방은 담당 의료진 지침을 따르고, 본 문서는 학생 실습일지 초안으로만 사용하세요.)";

  if (text.includes(suffix)) return text;
  return clipSection(`${text}${suffix}`);
}

function parseJournalResponse(
  content: string,
  style: DraftStyle
): JournalDraftSections {
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
    summary: sections.summary,
    observation_performance: sections.observation_performance,
    learning_points: sections.learning_points,
    improvements: sections.improvements,
    next_goals: sections.next_goals,
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
  return new Error("실습일지 초안 생성 중 알 수 없는 오류가 발생했습니다.");
}

export async function generateJournalDraft(
  sourceText: string,
  style: DraftStyle
): Promise<JournalDraftSections> {
  const client = getOpenAIClient();
  const model = process.env.OPENAI_MODEL ?? JOURNAL_MODEL_DEFAULT;

  try {
    const response = await client.chat.completions.create(
      {
        model,
        messages: [
          { role: "system", content: buildJournalSystemPrompt(style) },
          ...(style === "clinical" ? getClinicalJournalFewShotMessages() : []),
          {
            role: "user",
            content: `다음 입력을 바탕으로 간호학과 실습일지 학습 초안을 작성해주세요.\n적용 스타일: ${style}\n\n${sourceText}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "journal_draft",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                summary: { type: "string" },
                observation_performance: { type: "string" },
                learning_points: { type: "string" },
                improvements: { type: "string" },
                next_goals: { type: "string" },
              },
              required: SECTION_KEYS,
            },
          },
        },
        temperature: 0.2,
        max_tokens: 900,
      },
      {
        timeout: Number.isFinite(OPENAI_TIMEOUT_MS) ? OPENAI_TIMEOUT_MS : 20_000,
      }
    );

    const content = response.choices[0]?.message?.content;
    if (!content?.trim()) {
      throw new Error("AI에서 유효한 응답을 받지 못했습니다.");
    }

    return parseJournalResponse(content, style);
  } catch (error) {
    throw mapOpenAIError(error);
  }
}
