"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DraftStyle, DEFAULT_DRAFT_STYLE, isDraftStyle } from "@/lib/drafts/style";
import { JournalDraft } from "@/lib/types";
import { DraftStyleSelector } from "@/components/drafts/DraftStyleSelector";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { JournalResult } from "@/components/journal/JournalResult";
import { JOURNAL_FREE_LIMIT, JOURNAL_LIMITS } from "@/lib/journal/shared";

type Step = "input" | "loading" | "result";
type LoadingPhase = "validating" | "generating";

interface JournalQuota {
  plan: "free" | "pro";
  monthlyLimit: number | null;
  monthlyUsed: number;
}

interface SoapPreview {
  id: string;
  note_id: string | null;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface JournalPageClientProps {
  initialPracticeText?: string;
  initialSoap?: SoapPreview;
  noteId?: string;
  noteTitle?: string;
  initialWarning?: string;
  initialUsageCount?: number;
  initialPlan?: "free" | "pro";
  initialStyle?: DraftStyle;
}

interface JournalApiResponse extends JournalDraft {
  _warning?: string | null;
  _from_existing?: boolean;
  _quota?: JournalQuota;
}

interface JournalApiError {
  error?: string;
  upgrade_url?: string | null;
}

const secondaryLinkClass =
  "inline-flex min-h-[40px] items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50";

function isJournalApiResponse(value: unknown): value is JournalApiResponse {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;

  return (
    typeof obj.id === "string" &&
    typeof obj.user_id === "string" &&
    (typeof obj.note_id === "string" || obj.note_id === null) &&
    typeof obj.soap_note_id === "string" &&
    typeof obj.source_text === "string" &&
    isDraftStyle(obj.style) &&
    typeof obj.practice_text === "string" &&
    typeof obj.soap_snapshot === "string" &&
    (typeof obj.extra_note === "string" || obj.extra_note === null) &&
    typeof obj.summary === "string" &&
    typeof obj.observation_performance === "string" &&
    typeof obj.learning_points === "string" &&
    typeof obj.improvements === "string" &&
    typeof obj.next_goals === "string" &&
    typeof obj.created_at === "string"
  );
}

export function JournalPageClient({
  initialPracticeText = "",
  initialSoap,
  noteId,
  noteTitle,
  initialWarning,
  initialUsageCount = 0,
  initialPlan = "free",
  initialStyle = DEFAULT_DRAFT_STYLE,
}: JournalPageClientProps) {
  const [step, setStep] = useState<Step>("input");
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>("validating");
  const [practiceText, setPracticeText] = useState(initialPracticeText);
  const [extraNote, setExtraNote] = useState("");
  const [style, setStyle] = useState<DraftStyle>(initialStyle);
  const [soapPreview] = useState<SoapPreview | undefined>(initialSoap);
  const [result, setResult] = useState<JournalDraft | null>(null);
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

  const trimmedPracticeLength = practiceText.trim().length;
  const trimmedExtraLength = extraNote.trim().length;
  const canSubmit =
    step !== "loading" &&
    !isSubmittingRef.current &&
    !!soapPreview &&
    trimmedPracticeLength >= JOURNAL_LIMITS.practiceMin &&
    trimmedPracticeLength <= JOURNAL_LIMITS.practiceMax &&
    trimmedExtraLength <= JOURNAL_LIMITS.extraMax;

  const isNearLimit = plan === "free" && usageCount >= JOURNAL_FREE_LIMIT - 1;

  async function handleGenerate() {
    if (isSubmittingRef.current || step === "loading") return;

    if (!soapPreview) {
      setError("연결된 SOAP 초안을 먼저 준비해주세요.");
      return;
    }

    const trimmedPractice = practiceText.trim();
    const trimmedExtra = extraNote.trim();

    if (trimmedPractice.length < JOURNAL_LIMITS.practiceMin) {
      setError(`실습 메모를 더 자세히 입력해주세요. (${JOURNAL_LIMITS.practiceMin}자 이상)`);
      return;
    }
    if (trimmedPractice.length > JOURNAL_LIMITS.practiceMax) {
      setError(`실습 메모가 너무 깁니다. (${JOURNAL_LIMITS.practiceMax}자 이하)`);
      return;
    }
    if (trimmedExtra.length > JOURNAL_LIMITS.extraMax) {
      setError(`추가 메모가 너무 깁니다. (${JOURNAL_LIMITS.extraMax}자 이하)`);
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
      const response = await fetch("/api/practice-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          practice_text: trimmedPractice,
          soap_note_id: soapPreview.id,
          note_id: noteId ?? soapPreview.note_id ?? null,
          extra_note: trimmedExtra || null,
          style,
          force_regenerate: useForceRegenerate,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = (await response
          .json()
          .catch(() => ({ error: undefined }))) as JournalApiError;

        const nextUpgradeUrl =
          typeof errorBody.upgrade_url === "string" && errorBody.upgrade_url
            ? errorBody.upgrade_url
            : null;
        setUpgradeUrl(nextUpgradeUrl);
        setAuthRequired(response.status === 401);

        throw new Error(
          errorBody.error ??
            "실습일지 초안 생성에 실패했습니다. 잠시 후 다시 시도해주세요."
        );
      }

      const payload = (await response.json()) as unknown;
      if (!isJournalApiResponse(payload)) {
        throw new Error("서버 응답 형식이 올바르지 않습니다.");
      }

      if (payload._warning) setWarning(payload._warning);
      if (payload._from_existing) setIsFromExisting(true);
      if (payload._quota) {
        setUsageCount(payload._quota.monthlyUsed);
        setPlan(payload._quota.plan);
      }

      setResult(payload);
      setStep("result");
    } catch (err) {
      setStep("input");
      if (err instanceof Error && err.name === "AbortError") {
        setError("요청 시간이 초과되었습니다. 네트워크 상태를 확인하고 다시 시도해주세요.");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("실습일지 초안 생성 중 알 수 없는 오류가 발생했습니다.");
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
      `[1. 실습 내용 요약]\n${result.summary}`,
      `[2. 관찰 및 수행 내용]\n${result.observation_performance}`,
      `[3. 배운 점]\n${result.learning_points}`,
      `[4. 아쉬웠던 점 / 보완할 점]\n${result.improvements}`,
      `[5. 다음 실습 목표]\n${result.next_goals}`,
      "",
      "* 학습 참고용 초안입니다. 제출 전에는 학생이 직접 수정해 사용해주세요.",
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
          usageCount >= JOURNAL_FREE_LIMIT
            ? "bg-red-50 text-red-600"
            : isNearLimit
              ? "bg-amber-50 text-amber-600"
              : "bg-gray-100 text-gray-500"
        }`}
      >
        이번 달 {usageCount}/{JOURNAL_FREE_LIMIT}회
      </span>
    );

  if (step === "loading") {
    const messages: Record<LoadingPhase, { main: string; sub: string }> = {
      validating: {
        main: "입력 데이터를 준비하고 있습니다",
        sub: "SOAP 연결 상태와 실습 메모 내용을 확인하고 있어요.",
      },
      generating: {
        main: "AI가 실습일지 초안을 생성하고 있습니다",
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
            <span>실습일지 초안이 저장되었습니다.</span>
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

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,auto))_1fr] xl:items-center">
          <Button variant="secondary" size="sm" onClick={handleReset} className="w-full sm:w-auto">
            새로 입력하기
          </Button>
          <Button variant="ghost" size="sm" onClick={handleForceRegenerate} className="w-full sm:w-auto">
            다시 생성
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCopyToClipboard} className="w-full sm:w-auto">
            전체 복사
          </Button>

          <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap xl:justify-end">
            <Link
              href={
                result.note_id
                  ? `/soap?note_id=${result.note_id}&style=${result.style}`
                  : `/soap?style=${result.style}`
              }
              className={secondaryLinkClass}
            >
              이전 SOAP 보기
            </Link>
            {result.note_id && (
              <Link href={`/memos/${result.note_id}`} className={secondaryLinkClass}>
                연결 메모 보기
              </Link>
            )}
            <Link
              href={
                result.note_id
                  ? `/case-study?note_id=${result.note_id}&soap_id=${result.soap_note_id}&journal_id=${result.id}&style=${result.style}`
                  : `/case-study?soap_id=${result.soap_note_id}&journal_id=${result.id}&style=${result.style}`
              }
              className={secondaryLinkClass}
            >
              케이스스터디로 이어쓰기
            </Link>
          </div>
        </div>

        <Card>
          <CardBody className="space-y-2">
            <p className="text-xs font-medium text-gray-400">원본 실습 메모</p>
            <p className="line-clamp-3 text-sm leading-relaxed text-gray-600">
              {result.practice_text}
            </p>
          </CardBody>
        </Card>

        <JournalResult draft={result} />
      </div>
    );
  }

  const soapPageLink = noteId ? `/soap?note_id=${noteId}&style=${style}` : `/soap?style=${style}`;

  return (
    <Card className="overflow-hidden">
      <CardBody className="space-y-4 sm:space-y-5">
        {(noteId || warning) && (
          <div className="space-y-2">
            {noteId && (
              <div className="rounded-2xl bg-primary-50 px-4 py-3 text-sm text-primary-700">
                {noteTitle
                  ? `실습 메모 “${noteTitle}”에서 내용을 불러왔습니다.`
                  : "연결된 실습 메모에서 내용을 불러왔습니다."}
              </div>
            )}
            {warning && (
              <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {warning}
              </div>
            )}
          </div>
        )}

        {soapPreview ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold text-gray-500">연결된 SOAP 초안</p>
              <Link href={soapPageLink} className="text-sm font-medium text-primary-700">
                SOAP 다시 보기 →
              </Link>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-600 line-clamp-3">
              S: {soapPreview.subjective}
              {"\n"}O: {soapPreview.objective}
              {"\n"}A: {soapPreview.assessment}
              {"\n"}P: {soapPreview.plan}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-amber-700">
              실습일지 초안을 만들려면 SOAP 초안이 먼저 필요합니다.
            </p>
            <Link href={soapPageLink} className={secondaryLinkClass}>
              SOAP 생성
            </Link>
          </div>
        )}

        <Textarea
          id="journal-practice-input"
          label="실습 메모"
          value={practiceText}
          onChange={(e) => setPracticeText(e.target.value)}
          rows={8}
          maxLength={JOURNAL_LIMITS.practiceMax}
          className="min-h-[220px] sm:min-h-[250px]"
        />

        <Textarea
          id="journal-extra-input"
          label="추가 메모 (선택)"
          value={extraNote}
          onChange={(e) => setExtraNote(e.target.value)}
          rows={4}
          maxLength={JOURNAL_LIMITS.extraMax}
          className="min-h-[140px]"
        />

        <DraftStyleSelector value={style} onChange={setStyle} />

        <div className="flex flex-col gap-2 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
          <span>실습 메모와 SOAP 내용이 잘 맞을수록 더 자연스러운 초안이 나옵니다.</span>
          <div className="flex flex-wrap items-center gap-2">
            {usageBadge}
            <span>
              메모 {trimmedPracticeLength}/{JOURNAL_LIMITS.practiceMax} · 추가 {trimmedExtraLength}/{JOURNAL_LIMITS.extraMax}
            </span>
          </div>
        </div>

        {plan === "free" && isNearLimit && usageCount < JOURNAL_FREE_LIMIT && (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            실습일지 무료 사용량이 거의 다 찼습니다. ({usageCount}/{JOURNAL_FREE_LIMIT}회)
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
              실습일지 생성 한도에 도달했어요. Pro로 업그레이드하면 계속 사용할 수 있습니다.
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
            실습일지 초안 생성
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
