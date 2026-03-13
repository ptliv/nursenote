"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  proOnly?: boolean;
}

interface SidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "대시보드", icon: "🏠" },
  { href: "/memos", label: "실습 메모", icon: "📝" },
  { href: "/soap", label: "SOAP 초안", icon: "📋" },
  { href: "/practice-log", label: "실습일지 초안", icon: "📒" },
  { href: "/case-study", label: "케이스스터디 초안", icon: "🗂️" },
  { href: "/drugs", label: "약물 학습", icon: "💊" },
  { href: "/pro", label: "Pro 안내", icon: "⭐" },
];

export function Sidebar({ mobile = false, onNavigate, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-50 text-xl text-primary-700">
            🩺
          </span>
          <div>
            <p className="text-xs font-medium text-gray-400">학습 기록 보조</p>
            <p className="text-lg font-bold text-primary-700">NurseNote</p>
          </div>
        </Link>

        {mobile && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 text-lg text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            aria-label="사이드바 닫기"
          >
            ✕
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex min-h-[48px] items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <span className="text-lg" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.proOnly && (
                  <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-semibold text-yellow-700">
                    Pro
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-gray-100 px-4 py-4">
        <p className="text-xs leading-relaxed text-gray-400">
          NurseNote는 간호학과 학생을 위한 학습·기록 보조 도구입니다.
          <br />
          의료 진단, 처방, 임상판단을 대신하지 않습니다.
        </p>
      </div>
    </aside>
  );
}
