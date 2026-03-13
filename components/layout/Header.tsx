"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UserContext } from "@/lib/types";

interface HeaderProps {
  userContext: UserContext;
  onOpenNav?: () => void;
}

export function Header({ userContext, onOpenNav }: HeaderProps) {
  const router = useRouter();
  const { profile, isPro } = userContext;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenNav}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 text-lg text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 lg:hidden"
            aria-label="메뉴 열기"
          >
            ☰
          </button>

          <div className="lg:hidden">
            <p className="text-sm font-semibold text-gray-900">NurseNote</p>
            <p className="text-xs text-gray-500">실습 후 바로 기록하기</p>
          </div>

          <div className="hidden lg:block">
            <p className="text-xs font-medium text-gray-400">학습 기록 보조</p>
            <p className="text-sm font-semibold text-gray-900">실습 후 빠르게 초안 만들기</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
              isPro ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            {isPro ? "Pro" : "Free"}
          </span>

          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-gray-700">{profile.name}</p>
            <p className="text-xs text-gray-400">학습용 계정</p>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex min-h-[40px] items-center rounded-xl px-3 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
