import "server-only";

import OpenAI, {
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
  RateLimitError,
} from "openai";
import { DraftStyle, getDraftStylePromptInstruction } from "@/lib/drafts/style";
import { SOAP_LIMITS, SoapDraft } from "@/lib/soap/shared";

const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS ?? 20_000);
const OPENAI_MAX_RETRIES = 1;

/**
 * 모델 교체 포인트: 환경변수 OPENAI_MODEL로 오버라이드 가능.
 * gpt-4o-mini → gpt-4.1-mini 전환 시 이 상수만 변경하면 됨.
 */
export const SOAP_MODEL_DEFAULT = "gpt-4o-mini";
export const SOAP_PROMPT_VERSION = "2026-03-13-v3";

const SECTION_KEYS = ["subjective", "objective", "assessment", "plan"] as const;

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

/**
 * 압축된 시스템 프롬프트.
 * 이전 대비 약 65% 토큰 절감 (약 280 → 약 95 토큰).
 * 동일한 안전 제약과 출력 형식을 유지한다.
 */
const SOAP_SYSTEM_PROMPT = `당신은 간호학과 실습 기록 보조 도구입니다.

[필수 제약]
• 학습 참고용 초안만. 임상 진단·처방·투약 결정 금지.
• Assessment: "가능성/관찰됨/사정 필요" 표현만 사용.
• Plan: 일반 간호 중재·모니터링만. 구체 처방 제외.
• 입력에 없는 정보 추가 금지.

JSON만 반환: {"subjective":"","objective":"","assessment":"","plan":""}`;

function getSoapStyleRules(style: DraftStyle): string {
  if (style === "narrative") {
    return [
      "문장형 규칙:",
      "• 자연스러운 한국어 설명형 문장 중심으로 작성합니다.",
      "• 약어는 꼭 필요한 경우만 제한적으로 사용합니다.",
      "• 학생이 바로 읽고 수정하기 쉬운 완결 문장 위주로 작성합니다.",
    ].join("\n");
  }

  if (style === "hybrid") {
    return [
      "혼합형 규칙:",
      "• 설명은 자연어로 유지하되 핵심 수치와 반복 관찰은 약어를 허용합니다.",
      "• BP, HR, RR, SpO2, BST/FBS, c/o 정도의 기본 약어는 자연스럽게 사용할 수 있습니다.",
      "• 문장형과 기록형의 중간 톤을 유지합니다.",
    ].join("\n");
  }

  return [
    "기록형 규칙:",
    "• 설명형 문장 최소화. 기록체/차팅 톤을 우선합니다.",
    "• '환자는', '~하였다', '~이었다', '~를 이해하였다' 같은 서술형 표현은 사용하지 마세요.",
    "• 수치, 활력징후, 검사값은 약어 우선: V/S, BP, HR, RR, SpO2, BST/FBS.",
    "• 호소/관찰은 짧은 기록 단위로 작성: c/o, edema, bilat LE edema, monitor 필요 등.",
    "• 한 섹션 안에서도 1~4개의 짧은 기록 줄로 끊어 쓰세요.",
    "• 학생 제출용으로 읽을 수 있는 수준은 유지하되, 문장형처럼 길게 설명하지 마세요.",
  ].join("\n");
}

function buildSoapSystemPrompt(style: DraftStyle): string {
  return `${SOAP_SYSTEM_PROMPT}

[출력 스타일]
• ${getDraftStylePromptInstruction(style)}

[스타일 규칙]
${getSoapStyleRules(style)}`;
}

function getClinicalSoapFewShotMessages() {
  return [
    {
      role: "user" as const,
      content:
        "예시 입력 1\n스타일: clinical\n메모: 70세 여성. BP 148/92, HR 88. 양측 하지 부종. 다리가 무겁다고 호소. 이뇨제 투여 중. FBS 196.",
    },
    {
      role: "assistant" as const,
      content: JSON.stringify({
        subjective: "다리 무거움 c/o",
        objective: "V/S: BP 148/92, HR 88\nbilat LE edema 관찰\nFBS 196\n이뇨제 투여 중",
        assessment: "체액 저류 관련 edema 지속 가능성\n혈당 조절 상태 추가 사정 필요",
        plan: "V/S, edema, I/O monitor\n이뇨제 반응/부작용 관찰\n혈당 추이 확인",
      }),
    },
    {
      role: "user" as const,
      content:
        "예시 입력 2\n스타일: clinical\n메모: 수술 후 1일차. SpO2 94%, RR 24. 숨이 차다고 말함. 심호흡 교육 시행. 보행 시 어지러움 호소.",
    },
    {
      role: "assistant" as const,
      content: JSON.stringify({
        subjective: "숨참 c/o\n보행 시 어지러움 c/o",
        objective: "SpO2 94%, RR 24\npost-op 1일차\n심호흡 교육 시행",
        assessment: "호흡 불편감 지속 관찰됨\n활동 시 증상 악화 여부 사정 필요",
        plan: "SpO2, RR monitor\n심호흡/기침 격려\n보행 전후 증상 재확인",
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
  if (text.length <= SOAP_LIMITS.sectionMax) return text;
  return `${text.slice(0, SOAP_LIMITS.sectionMax)}...`;
}

function addSafetySuffixIfNeeded(
  section: "assessment" | "plan",
  text: string,
  style: DraftStyle
): string {
  const riskyDirectivePattern =
    /(처방|용량|증량|감량|투약\s*지시|치료\s*방침\s*결정|진단\s*확정)/i;

  if (!riskyDirectivePattern.test(text)) return text;

  const suffix =
    style === "clinical"
      ? section === "assessment"
        ? "\n\n(학습 참고: 확정 진단 아님)"
        : "\n\n(학습 참고: 처방 결정 아님)"
      : section === "assessment"
      ? "\n\n(학습 참고: 확정 진단이 아닌 간호 관점 사정 수준으로 해석하세요.)"
      : "\n\n(학습 참고: 구체 처방/용량 결정은 담당 의료진 지시에 따르세요.)";

  if (text.includes(suffix)) return text;
  return clipSection(`${text}${suffix}`);
}

function parseSoapResponse(content: string, style: DraftStyle): SoapDraft {
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

    sections[key] = normalized;
  }

  sections.assessment = addSafetySuffixIfNeeded(
    "assessment",
    sections.assessment,
    style
  );
  sections.plan = addSafetySuffixIfNeeded("plan", sections.plan, style);

  return {
    subjective: sections.subjective,
    objective: sections.objective,
    assessment: sections.assessment,
    plan: sections.plan,
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
  return new Error("SOAP 생성 중 알 수 없는 오류가 발생했습니다.");
}

export async function generateSoapDraft(
  sourceText: string,
  style: DraftStyle
): Promise<SoapDraft> {
  const client = getOpenAIClient();
  const model = process.env.OPENAI_MODEL ?? SOAP_MODEL_DEFAULT;

  try {
    const response = await client.chat.completions.create(
      {
        model,
        messages: [
          { role: "system", content: buildSoapSystemPrompt(style) },
          ...(style === "clinical" ? getClinicalSoapFewShotMessages() : []),
          {
            role: "user",
            content: `다음 실습 메모를 SOAP 학습 초안으로 정리해주세요.\n적용 스타일: ${style}\n\n${sourceText}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "soap_draft",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                subjective: { type: "string" },
                objective: { type: "string" },
                assessment: { type: "string" },
                plan: { type: "string" },
              },
              required: SECTION_KEYS,
            },
          },
        },
        temperature: 0.2,
        // 한국어 SOAP 4섹션 기준 비용-품질 균형 상한.
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

    return parseSoapResponse(content, style);
  } catch (error) {
    throw mapOpenAIError(error);
  }
}
