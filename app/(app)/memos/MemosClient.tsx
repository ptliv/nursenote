"use client";

import { useState } from "react";
import Link from "next/link";
import { PracticeNote, NoteCategory } from "@/lib/types";
import { MemoCard } from "@/components/memos/MemoCard";
import { NOTE_CATEGORY_LABELS } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface MemosClientProps {
  notes: PracticeNote[];
}

type FilterCategory = "all" | NoteCategory;

const FILTER_OPTIONS: { value: FilterCategory; label: string }[] = [
  { value: "all", label: "전체" },
  ...Object.entries(NOTE_CATEGORY_LABELS).map(([value, label]) => ({
    value: value as NoteCategory,
    label,
  })),
];

const primaryLinkClass =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700";

export function MemosClient({ notes }: MemosClientProps) {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");

  const filtered =
    activeFilter === "all"
      ? notes
      : notes.filter((n) => n.category === activeFilter);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTER_OPTIONS.map(({ value, label }) => {
          const count = value === "all" ? notes.length : notes.filter((n) => n.category === value).length;
          const isActive = activeFilter === value;

          return (
            <button
              key={value}
              type="button"
              onClick={() => setActiveFilter(value)}
              className={cn(
                "inline-flex min-h-[42px] min-w-fit items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              )}
            >
              <span>{label}</span>
              <span className={cn("text-xs", isActive ? "text-primary-500" : "text-gray-400")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
        <span>
          {activeFilter === "all" ? "전체 메모" : `${NOTE_CATEGORY_LABELS[activeFilter]} 메모`} {filtered.length}개
        </span>
        {activeFilter !== "all" && (
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className="font-medium text-primary-700"
          >
            전체 보기
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-12 text-center text-gray-400 sm:px-6 sm:py-16">
          <p className="mb-2 text-3xl">📝</p>
          {notes.length === 0 ? (
            <>
              <p className="text-sm font-medium text-gray-500">아직 작성한 메모가 없어요.</p>
              <p className="mt-1 text-sm text-gray-400">
                실습 중 관찰한 내용이나 배운 점을 휴대폰에서 바로 남겨보세요.
              </p>
              <Link href="/memos/new" className={`mt-5 inline-flex ${primaryLinkClass}`}>
                첫 메모 작성하기
              </Link>
            </>
          ) : (
            <p className="text-sm font-medium text-gray-500">
              선택한 카테고리에 해당하는 메모가 아직 없어요.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {filtered.map((note) => (
            <MemoCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
