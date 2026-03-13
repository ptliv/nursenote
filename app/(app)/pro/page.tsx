import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Pro 업그레이드" };

const COMPARISON_ROWS = [
  {
    feature: "실습 메모 저장",
    free: "무제한",
    pro: "무제한",
    note: "기록 자체는 Free에서도 계속 사용할 수 있어요.",
  },
  {
    feature: "SOAP 초안 생성",
    free: "월 5회",
    pro: "무제한",
    note: "메모를 바탕으로 학습용 SOAP 초안을 빠르게 정리합니다.",
  },
  {
    feature: "실습일지 초안 생성",
    free: "월 5회",
    pro: "무제한",
    note: "제출 전에 다듬기 쉬운 초안 형태로 도와줍니다.",
  },
  {
    feature: "케이스스터디 초안 생성",
    free: "제한형 또는 점진 오픈",
    pro: "우선 제공",
    note: "실습 메모, SOAP, 실습일지를 연결해 구조 초안을 만듭니다.",
  },
  {
    feature: "초안 재생성",
    free: "기본 사용",
    pro: "반복 사용 여유",
    note: "여러 버전을 비교하며 다듬는 학생에게 차이가 큽니다.",
  },
  {
    feature: "추후 고급 학습 도구",
    free: "일부 제공",
    pro: "우선 제공 예정",
    note: "결제 연동 이후에도 학습/기록 보조 도구 방향을 유지합니다.",
  },
] as const;

const FREE_EXAMPLES = [
  "실습 후 메모를 남기고 중요한 날에만 SOAP나 실습일지 초안을 생성하는 학생",
  "월간 생성 횟수가 많지 않아 Free만으로도 충분한 학생",
  "우선 기록 습관부터 만들고 싶은 학생",
] as const;

const PRO_EXAMPLES = [
  "한 주에 여러 번 초안을 다시 생성하며 표현을 다듬는 학생",
  "SOAP → 실습일지 → 케이스스터디 흐름을 자주 이어서 쓰는 학생",
  "과제 초안을 반복 비교하면서 정리 시간을 줄이고 싶은 학생",
] as const;

const PRO_FOR_STUDENTS = [
  {
    title: "실습 과제가 몰리는 학생",
    body: "짧은 기간 안에 여러 초안을 만들어야 한다면 Pro가 훨씬 여유롭습니다. Free는 기본 흐름에는 충분하지만 반복 생성이 많아지면 금방 차이를 느끼게 됩니다.",
  },
  {
    title: "초안을 여러 번 다듬는 학생",
    body: "한 번에 끝내기보다 표현을 조금씩 바꾸며 다시 생성해보는 학생에게 Pro가 더 잘 맞습니다.",
  },
  {
    title: "케이스스터디까지 이어서 쓰는 학생",
    body: "SOAP과 실습일지에서 끝나지 않고 케이스스터디 초안까지 연결하는 흐름이라면 Pro 체감이 큽니다.",
  },
] as const;

const FAQ_ITEMS = [
  {
    q: "NurseNote가 의료 판단을 대신하나요?",
    a: "아니요. NurseNote는 간호학과 학생을 위한 학습/기록 보조 도구입니다. 의료 진단, 처방, 임상 판단을 대신하지 않습니다.",
  },
  {
    q: "지금 바로 결제할 수 있나요?",
    a: "아직은 실제 결제 연동 전 단계입니다. 현재 페이지는 기능 차이를 먼저 이해할 수 있도록 정리한 안내 페이지입니다.",
  },
  {
    q: "추후 결제가 열리면 무엇이 달라지나요?",
    a: "핵심 차이는 초안 생성 횟수와 반복 사용 여유입니다. 특히 SOAP, 실습일지, 케이스스터디를 자주 연결하는 학생일수록 체감이 큽니다.",
  },
] as const;

interface LimitContext {
  eyebrow: string;
  title: string;
  body: string;
  focus: string;
}

function getLimitContext(from?: string): LimitContext | null {
  if (from === "soap-limit") {
    return {
      eyebrow: "SOAP 사용량 안내",
      title: "이번 달 SOAP 무료 사용량을 모두 사용했어요.",
      body: "실습 메모를 자주 정리하는 학생이라면 Pro에서 더 자연스럽게 이어갈 수 있어요.",
      focus: "SOAP 초안 무제한 생성",
    };
  }

  if (from === "practice-log-limit" || from === "journal-limit") {
    return {
      eyebrow: "실습일지 사용량 안내",
      title: "실습일지 초안 무료 사용량을 모두 사용했어요.",
      body: "실습일지를 여러 번 다듬는 흐름이라면 Pro가 훨씬 여유롭습니다.",
      focus: "실습일지 초안 무제한 생성",
    };
  }

  if (from === "case-study-limit") {
    return {
      eyebrow: "케이스스터디 사용량 안내",
      title: "케이스스터디 초안을 더 이어서 쓰고 싶은 상태예요.",
      body: "SOAP과 실습일지 이후 케이스스터디까지 자주 연결하는 학생이라면 Pro에서 흐름이 훨씬 자연스럽습니다.",
      focus: "케이스스터디 초안 우선 제공",
    };
  }

  return null;
}

interface ProPageProps {
  searchParams: Promise<{ from?: string }>;
}

const primaryLinkClass =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700";

export default async function ProPage({ searchParams }: ProPageProps) {
  const { from } = await searchParams;
  const limitContext = getLimitContext(from);

  return (
    <div className="mx-auto max-w-5xl space-y-6 sm:space-y-8">
      {limitContext && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            {limitContext.eyebrow}
          </p>
          <h2 className="mt-1 text-lg font-bold text-amber-900 sm:text-xl">
            {limitContext.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-800">
            {limitContext.body}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex w-fit rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-700">
              핵심 차이: {limitContext.focus}
            </span>
            <Link href="#plan" className={primaryLinkClass}>
              Pro 차이 보기
            </Link>
          </div>
        </div>
      )}

      <section className="rounded-3xl border border-gray-200 bg-gradient-to-br from-white via-emerald-50 to-sky-50 px-5 py-7 sm:px-6 sm:py-8 md:px-8">
        <div className="max-w-3xl">
          <span className="inline-flex rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
            NurseNote Pro
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Free와 Pro의 차이를 한눈에 보고,
            <br className="hidden sm:block" />
            지금 필요한 수준만 선택할 수 있게 정리했어요.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-gray-600 sm:text-base">
            NurseNote는 간호학과 학생을 위한 학습/기록 보조 도구입니다. 초안 생성 횟수와 반복 사용 여유가 Free와 Pro의 가장 큰 차이예요. 의료 서비스처럼 판단을 대신하는 도구가 아니라, 기록과 초안 정리를 더 빠르게 돕는 방향을 유지합니다.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link href="#comparison" className={primaryLinkClass}>
              기능 비교 보기
            </Link>
            <Link
              href="#plan"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-primary-300 bg-white px-4 py-2.5 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50"
            >
              업그레이드 안내 보기
            </Link>
          </div>
        </div>
      </section>

      <section id="plan" className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardBody className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-500">Free</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                무료
                <span className="ml-1 text-sm font-normal text-gray-400">/ 현재 사용 가능</span>
              </p>
              <p className="mt-2 text-sm text-gray-600">
                기본 기록과 가벼운 초안 생성을 중심으로 시작하기에 충분한 플랜입니다.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                이런 사용 흐름에 잘 맞아요
              </p>
              {FREE_EXAMPLES.map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
                >
                  {item}
                </div>
              ))}
            </div>
            <Button variant="secondary" className="w-full" disabled>
              현재는 Free로 충분한지 먼저 살펴보기
            </Button>
          </CardBody>
        </Card>

        <Card className="border-primary-300 bg-primary-50/40 ring-1 ring-primary-200">
          <CardBody className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-primary-700">Pro</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  추후 오픈
                  <span className="ml-1 text-sm font-normal text-gray-400">/ 가격 준비 중</span>
                </p>
              </div>
              <span className="rounded-full border border-primary-200 bg-white px-2.5 py-1 text-xs font-semibold text-primary-700">
                반복 생성에 추천
              </span>
            </div>
            <p className="text-sm text-gray-700">
              초안을 자주 다시 만들고, SOAP부터 실습일지, 케이스스터디까지 이어서 쓰는 학생에게 더 잘 맞는 플랜입니다.
            </p>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                이런 사용 흐름에 특히 좋아요
              </p>
              {PRO_EXAMPLES.map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-primary-200 bg-white px-3 py-2 text-sm text-gray-700"
                >
                  {item}
                </div>
              ))}
            </div>
            <Button className="w-full" disabled>
              Pro 오픈 준비 중
            </Button>
            <p className="text-center text-xs text-gray-500">
              실제 결제 연동 전까지는 안내 페이지 형태로 운영합니다.
            </p>
          </CardBody>
        </Card>
      </section>

      <section id="comparison" className="space-y-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">기능 비교 표</h2>
          <p className="mt-1 text-sm text-gray-500">
            SOAP, 실습일지, 케이스스터디 흐름에서 무엇이 달라지는지 한눈에 볼 수 있게 정리했어요.
          </p>
        </div>

        <div className="grid gap-3 md:hidden">
          {COMPARISON_ROWS.map((row) => (
            <Card key={row.feature}>
              <CardBody className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-gray-900">{row.feature}</h3>
                  <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                    Pro {row.pro}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-400">Free</p>
                    <p className="mt-1 font-medium text-gray-700">{row.free}</p>
                  </div>
                  <div className="rounded-xl bg-primary-50 px-3 py-2">
                    <p className="text-xs text-primary-500">Pro</p>
                    <p className="mt-1 font-medium text-primary-700">{row.pro}</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-gray-500">{row.note}</p>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="hidden overflow-x-auto rounded-2xl border border-gray-200 bg-white md:block">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                <th className="px-4 py-3 font-semibold">기능</th>
                <th className="px-4 py-3 font-semibold">Free</th>
                <th className="px-4 py-3 font-semibold">Pro</th>
                <th className="px-4 py-3 font-semibold">설명</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.feature} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-4 font-medium text-gray-900">{row.feature}</td>
                  <td className="px-4 py-4 text-gray-600">{row.free}</td>
                  <td className="px-4 py-4 font-medium text-primary-700">{row.pro}</td>
                  <td className="px-4 py-4 text-gray-500">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Free / Pro 사용 예시</h2>
          <p className="mt-1 text-sm text-gray-500">
            실제 사용 흐름으로 보면 차이가 더 자연스럽게 느껴집니다.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardBody className="space-y-3">
              <p className="text-sm font-semibold text-gray-900">Free 예시</p>
              <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-600">
                실습 메모를 계속 저장하면서, 중요한 날에만 SOAP와 실습일지 초안을 생성하는 방식입니다. 기록 습관을 만들고 기본 흐름을 익히는 단계에서는 Free만으로도 충분할 수 있어요.
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-3">
              <p className="text-sm font-semibold text-gray-900">Pro 예시</p>
              <div className="rounded-xl bg-primary-50 px-4 py-3 text-sm leading-relaxed text-gray-700">
                같은 메모를 바탕으로 SOAP를 여러 버전으로 정리하고, 이어서 실습일지와 케이스스터디 초안까지 반복해서 다듬는 방식입니다. 초안을 자주 비교하는 학생일수록 Pro 차이가 커집니다.
              </div>
            </CardBody>
          </Card>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">어떤 학생에게 Pro가 유용할까</h2>
          <p className="mt-1 text-sm text-gray-500">
            모든 학생에게 꼭 필요한 것은 아니지만, 아래 흐름이라면 체감이 큽니다.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PRO_FOR_STUDENTS.map((item) => (
            <Card key={item.title}>
              <CardBody>
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.body}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white">
        <CardBody className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">업그레이드 안내</h2>
            <p className="mt-1 text-sm text-gray-500">
              아직 실제 결제 연동 전이라, 지금은 준비 중 안내 상태를 유지하고 있어요.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-2xl bg-gray-50 px-4 py-4">
              <p className="text-sm font-medium text-gray-900">
                Pro는 학습/기록 보조 흐름을 더 자주, 더 여유 있게 쓰고 싶은 학생을 위한 선택지입니다.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                실제 오픈 전까지는 결제 버튼 대신 안내 상태를 유지합니다. 오픈 후에도 의료 서비스처럼 보이지 않도록 학습/기록 보조 도구라는 성격을 그대로 유지할 예정입니다.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button disabled>결제 기능 준비 중</Button>
              <Button variant="secondary" disabled>
                곧 오픈 예정
              </Button>
            </div>
          </div>
        </CardBody>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-gray-900">자주 묻는 질문</h2>
        {FAQ_ITEMS.map((item) => (
          <div key={item.q} className="rounded-2xl bg-gray-50 px-4 py-4">
            <p className="text-sm font-semibold text-gray-900">{item.q}</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">{item.a}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
