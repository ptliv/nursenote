"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DraftStyle, DEFAULT_DRAFT_STYLE, isDraftStyle } from "@/lib/drafts/style";
import { SoapNote } from "@/lib/types";
import { DraftStyleSelector } from "@/components/drafts/DraftStyleSelector";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { SoapResult } from "@/components/soap/SoapResult";
import { SOAP_LIMITS, SOAP_FREE_LIMIT } from "@/lib/soap/shared";

type Step = "input" | "loading" | "result";
type LoadingPhase = "validating" | "generating";

interface SoapQuota {
  plan: "free" | "pro";
  monthlyLimit: number | null;
  monthlyUsed: number;
}

interface SoapPageClientProps {
  initialText?: string;
  noteId?: string;
  noteTitle?: string;
  initialWarning?: string;
  initialUsageCount?: number;
  initialPlan?: "free" | "pro";
  initialStyle?: DraftStyle;
}

interface SoapApiResponse extends SoapNote {
  _warning?: string | null;
  _from_existing?: boolean;
  _quota?: SoapQuota;
}

interface SoapApiError {
  error?: string;
  upgrade_url?: string | null;
}

const secondaryLinkClass =
  "inline-flex min-h-[40px] items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50";

function isSoapApiResponse(value: unknown): value is SoapApiResponse {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;

  return (
    typeof obj.id === "string" &&
    typeof obj.user_id === "string" &&
    (typeof obj.note_id === "string" || obj.note_id === null) &&
    typeof obj.source_text === "string" &&
    isDraftStyle(obj.style) &&
    typeof obj.subjective === "string" &&
    typeof obj.objective === "string" &&
    typeof obj.assessment === "string" &&
    typeof obj.plan === "string" &&
    typeof obj.created_at === "string"
  );
}

export function SoapPageClient({
  initialText = "",
  noteId,
  noteTitle,
  initialWarning,
  initialUsageCount = 0,
  initialPlan = "free",
  initialStyle = DEFAULT_DRAFT_STYLE,
}: SoapPageClientProps) {
  const [step, setStep] = useState<Step>("input");
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>("validating");
  const [inputText, setInputText] = useState(initialText);
  const [style, setStyle] = useState<DraftStyle>(initialStyle);
  const [result, setResult] = useState<SoapNote | null>(null);
  const [isFromExisting, setIsFromExisting] = useState(false);
  const [warning, setWarning] = useState<string | null>(initialWarning ?? null);
  const [error, setError] = useState<string | null>(null);
  const [upgradeUrl, setUpgradeUrl] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [plan, setPlan] = useState<"free" | "pro">(initialPlan);
  const [usageCount, setUsageCount] = useState(initialUsageCount);
  const isSubmittingRef = useRef(false);
  const forceRegenerateRef = useRef(false);

  useEffect(() => {
    if (step !== "loading") {
      setLoadingPhase("validating");
      return;
    }

    const id = setTimeout(() => setLoadingPhase("generating"), 500);
    return () => clearTimeout(id);
  }, [step]);

  const trimmedLength = inputText.trim().length;
  const canSubmit =
    step !== "loading" &&
    !isSubmittingRef.current &&
    trimmedLength >= SOAP_LIMITS.sourceMin &&
    trimmedLength <= SOAP_LIMITS.sourceMax;

  const isNearLimit = plan === "free" && usageCount >= SOAP_FREE_LIMIT - 1;

  async function handleGenerate() {
    if (isSubmittingRef.current || step === "loading") return;

    const trimmed = inputText.trim();

    if (trimmed.length < SOAP_LIMITS.sourceMin) {
      setError(`내용을 조금 더 자세히 입력해주세요. (${SOAP_LIMITS.sourceMin}자 이상)`);
      return;
    }
    if (trimmed.length > SOAP_LIMITS.sourceMax) {
      setError(`입력 길이가 너무 깁니다. (${SOAP_LIMITS.sourceMax}자 이하)`);
      return;
    }

    const useForceRegenerate = forceRegenerateRef.current;
    forceRegenerateRef.current = false;

    setError(null);
    setWarning(null);
    setUpgradeUrl(null);
    setAuthRequired(false);
    setIsFromExisting(false);
    setStep("loading");
    isSubmittingRef.current = true;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch("/api/soap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          note_id: noteId ?? null,
          style,
          force_regenerate: useForceRegenerate,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = (await response
          .json()
          .catch(() => ({ error: undefined }))) as SoapApiError;

        const nextUpgradeUrl =
          typeof errorBody.upgrade_url === "string" && errorBody.upgrade_url
            ? errorBody.upgrade_url
            : null;
        setUpgradeUrl(nextUpgradeUrl);
        setAuthRequired(response.status === 401);

        throw new Error(
          errorBody.error ?? "SOAP 생성에 실패했습니다. 잠시 후 다시 시도해주세요."
        );
      }

      const payload = (await response.json()) as unknown;
      if (!isSoapApiResponse(payload)) {
        throw new Error("서버 응답 형식이 올바르지 않습니다.");
      }

      if (payload._warning) setWarning(payload._warning);
      if (payload._from_existing) setIsFromExisting(true);
      if (payload._quota) {
        setUsageCount(payload._quota.monthlyUsed);
        setPlan(payload._quota.plan);
      }

      setResult({
        id: payload.id,
        user_id: payload.user_id,
        note_id: payload.note_id,
        source_text: payload.source_text,
        style: payload.style,
        subjective: payload.subjective,
        objective: payload.objective,
        assessment: payload.assessment,
        plan: payload.plan,
        created_at: payload.created_at,
      });
      setStep("result");
    } catch (err) {
      setStep("input");
      if (err instanceof Error && err.name === "AbortError") {
        setError("요청 시간이 초과되었습니다. 네트워크 상태를 확인하고 다시 시도해주세요.");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("SOAP 생성 중 알 수 없는 오류가 발생했습니다.");
      }
    } finally {
      clearTimeout(timeoutId);
      isSubmittingRef.current = false;
    }
  }

  function handleReset() {
    setStep("input");
    setResult(null);
    setWarning(initialWarning ?? null);
    setError(null);
    setUpgradeUrl(null);
    setAuthRequired(false);
    setIsFromExisting(false);
    forceRegenerateRef.current = false;
  }

  function handleForceRegenerate() {
    forceRegenerateRef.current = true;
    handleGenerate();
  }

  function handleCopyToClipboard() {
    if (!result) return;

    const text = [
      `[S · 주관적 자료]\n${result.subjective}`,
      `[O · 객관적 자료]\n${result.objective}`,
      `[A · 사정]\n${result.assessment}`,
      `[P · 계획]\n${result.plan}`,
      "",
      "* 학습 참고용 초안입니다. 실제 임상 판단이나 처방에는 사용하지 마세요.",
    ].join("\n\n");

    navigator.clipboard.writeText(text).catch(() => null);
  }

  const usageBadge =
    plan === "pro" ? (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
        Pro 무제한
      </span>
    ) : (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
          usageCount >= SOAP_FREE_LIMIT
            ? "bg-red-50 text-red-600"
            : isNearLimit
              ? "bg-amber-50 text-amber-600"
              : "bg-gray-100 text-gray-500"
        }`}
      >
        이번 달 {usageCount}/{SOAP_FREE_LIMIT}회
      </span>
    );

  if (step === "loading") {
    const messages: Record<LoadingPhase, { main: string; sub: string }> = {
      validating: {
        main: "입력 내용을 확인하고 있습니다",
        sub: "글 길이와 메모 연결 상태를 먼저 점검하고 있어요.",
      },
      generating: {
        main: "AI가 SOAP 초안을 생성하고 있습니다",
        sub: "보통 5~15초 정도 소요됩니다.",
      },
    };
    const { main, sub } = messages[loadingPhase];

    return (
      <Card>
        <CardBody className="flex flex-col items-center gap-4 py-14 text-center sm:py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          <div>
            <p className="text-sm font-medium text-gray-700">{main}</p>
            <p className="mt-1 text-xs text-gray-400">{sub}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-600">
              입력 확인
            </span>
            <span className="text-gray-300">→</span>
            <span className="rounded-full bg-primary-100 px-2 py-0.5 text-primary-700">
              초안 생성 중
            </span>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (step === "result" && result) {
    return (
      <div className="space-y-4 sm:space-y-5">
        {isFromExisting ? (
          <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
            동일한 입력으로 생성된 기존 초안을 다시 불러왔어요. 사용량은 차감되지 않았습니다.
          </div>
        ) : result.id ? (
          <div className="flex flex-col gap-2 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700 sm:flex-row sm:items-center sm:justify-between">
            <span>SOAP 초안이 저장되었습니다.</span>
            {usageBadge}
          </div>
        ) : (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            초안은 생성되었지만 저장에 실패했습니다. 제출 전에 복사해 임시 보관해주세요.
          </div>
        )}

        {warning && (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {warning}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,auto))_1fr] lg:items-center">
          <Button variant="secondary" size="sm" onClick={handleReset} className="w-full sm:w-auto">
            새로 입력하기
          </Button>
          <Button variant="ghost" size="sm" onClick={handleForceRegenerate} className="w-full sm:w-auto">
            다시 생성
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCopyToClipboard} className="w-full sm:w-auto">
            전체 복사
          </Button>

          <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
            {result.note_id && (
              <Link href={`/memos/${result.note_id}`} className={secondaryLinkClass}>
                연결 메모 보기
              </Link>
            )}
            <Link
              href={
                result.note_id
                  ? `/practice-log?note_id=${result.note_id}&soap_id=${result.id}&style=${result.style}`
                  : `/practice-log?soap_id=${result.id}&style=${result.style}`
              }
              className={secondaryLinkClass}
            >
              실습일지로 이어쓰기
            </Link>
          </div>
        </div>

        <Card>
          <CardBody className="space-y-2">
            <p className="text-xs font-medium text-gray-400">원본 메모</p>
            <p className="line-clamp-3 text-sm leading-relaxed text-gray-600">
              {result.source_text}
            </p>
          </CardBody>
        </Card>

        <SoapResult soap={result} />
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardBody className="space-y-4 sm:space-y-5">
        {(noteId || warning) && (
          <div className="space-y-2">
            {noteId && (
              <div className="rounded-2xl bg-primary-50 px-4 py-3 text-sm text-primary-700">
                {noteTitle
                  ? `실습 메모 “${noteTitle}”에서 내용을 불러왔습니다. 필요하면 수정 후 생성해주세요.`
                  : "실습 메모에서 내용을 불러왔습니다. 필요하면 수정 후 생성해주세요."}
              </div>
            )}
            {warning && (
              <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {warning}
              </div>
            )}
          </div>
        )}

        <Textarea
          id="soap-input"
          label="실습 메모 입력"
          placeholder={`예시:\n70대 여성. 고혈압 병력 있음.\nBP 152/94, FBS 186mg/dL, SpO2 96%\n양측 하지 부종. “다리가 붓고 숨이 조금 차요.” 호소.\n이뇨제 투여 중. 식이 교육 예정.`}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={9}
          maxLength={SOAP_LIMITS.sourceMax}
          className="min-h-[240px] sm:min-h-[280px]"
        />

        <DraftStyleSelector value={style} onChange={setStyle} />

        <div className="flex flex-col gap-2 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
          <span>활력징후, 증상, 관찰 소견이 포함될수록 더 자연스럽게 정리됩니다.</span>
          <div className="flex flex-wrap items-center gap-2">
            {usageBadge}
            <span>
              {trimmedLength} / {SOAP_LIMITS.sourceMax}
            </span>
          </div>
        </div>

        {plan === "free" && isNearLimit && usageCount < SOAP_FREE_LIMIT && (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            이번 달 무료 사용량이 거의 다 찼습니다. ({usageCount}/{SOAP_FREE_LIMIT}회)
            <Link href="/pro" className="ml-2 font-medium underline">
              Pro 안내 보기
            </Link>
          </div>
        )}

        {error && (
          <p aria-live="polite" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {upgradeUrl && (
          <div className="flex flex-col gap-3 rounded-2xl bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-amber-700">
              Free 플랜 사용량에 도달했어요. Pro로 업그레이드하면 더 넉넉하게 사용할 수 있습니다.
            </p>
            <Link href={upgradeUrl} className={secondaryLinkClass}>
              Pro 보기
            </Link>
          </div>
        )}

        {authRequired && (
          <div className="flex flex-col gap-3 rounded-2xl bg-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">
              로그인 상태가 만료되었을 수 있어요. 다시 로그인한 뒤 시도해주세요.
            </p>
            <Link href="/login" className={secondaryLinkClass}>
              로그인
            </Link>
          </div>
        )}

        <div className="sticky bottom-0 -mx-4 border-t border-gray-100 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-0">
          <Button onClick={handleGenerate} disabled={!canSubmit} className="w-full">
            SOAP 초안 생성
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
