import type { Metadata } from "next";
import Link from "next/link";
import { getUserContext, getDashboardStats } from "@/lib/supabase/queries";
import { getRecentPracticeNotes } from "@/actions/practice_notes";
import { MemoCard } from "@/components/memos/MemoCard";
import { Card, CardBody } from "@/components/ui/Card";

export const metadata: Metadata = { title: "대시보드" };

const QUICK_ACTIONS = [
  { href: "/memos/new", icon: "📝", label: "메모 작성" },
  { href: "/soap", icon: "📋", label: "SOAP 초안" },
  { href: "/practice-log", icon: "📒", label: "실습일지" },
  { href: "/case-study", icon: "🗂️", label: "케이스스터디" },
  { href: "/drugs", icon: "💊", label: "약물 학습" },
];

const linkButtonClass =
  "inline-flex min-h-[40px] items-center justify-center rounded-xl border border-primary-300 bg-white px-4 py-2.5 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50";

export default async function DashboardPage() {
  const userContext = await getUserContext();
  if (!userContext) return null;

  const [stats, recentNotes] = await Promise.all([
    getDashboardStats(userContext.profile.id),
    getRecentPracticeNotes(3),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          안녕하세요, {userContext.profile.name}님
        </h1>
        <p className="text-sm leading-relaxed text-gray-500 sm:text-base">
          오늘의 실습 메모를 정리하고, SOAP와 실습일지 초안을 휴대폰에서도 빠르게 이어서 만들어보세요.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
          빠른 실행
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="h-full transition-all hover:border-primary-300 hover:shadow-md">
                <CardBody className="flex min-h-[112px] flex-col items-center justify-center gap-2 text-center sm:min-h-[124px]">
                  <span className="text-3xl" aria-hidden="true">
                    {action.icon}
                  </span>
                  <span className="text-sm font-medium text-gray-700">{action.label}</span>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardBody className="py-5 text-center">
            <p className="text-3xl font-bold text-primary-600">{stats.notesCount}</p>
            <p className="mt-1 text-xs text-gray-500">총 실습 메모</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-5 text-center">
            <p className="text-3xl font-bold text-teal-600">{stats.soapCount}</p>
            <p className="mt-1 text-xs text-gray-500">SOAP 생성</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-5 text-center">
            <p className="text-3xl font-bold text-purple-600">
              {userContext.isPro ? "Pro" : "Free"}
            </p>
            <p className="mt-1 text-xs text-gray-500">현재 플랜</p>
          </CardBody>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            최근 메모
          </h2>
          <Link href="/memos" className="text-sm font-medium text-primary-700">
            전체 보기 →
          </Link>
        </div>

        {recentNotes.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-10 text-center text-gray-400 sm:px-6 sm:py-12">
            <p className="mb-2 text-3xl">📝</p>
            <p className="text-sm font-medium">아직 작성한 메모가 없어요</p>
            <Link href="/memos/new" className={`mt-4 inline-flex ${linkButtonClass}`}>
              첫 메모 작성하기
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentNotes.map((note) => (
              <MemoCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </section>

      {!userContext.isPro && (
        <Card className="border-0 bg-gradient-to-r from-primary-600 to-teal-600">
          <CardBody className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-white">
              <p className="font-bold">Pro로 업그레이드 안내 보기</p>
              <p className="mt-1 text-sm opacity-90">
                생성 한도와 활용 흐름을 한눈에 보고, 지금 필요한 수준만 선택할 수 있어요.
              </p>
            </div>
            <Link
              href="/pro"
              className="inline-flex min-h-[40px] w-full items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50 sm:w-auto"
            >
              자세히 보기
            </Link>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
