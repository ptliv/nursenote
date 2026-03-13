import type { Metadata } from "next";
import Link from "next/link";
import { getPracticeNotes } from "@/actions/practice_notes";
import { MemosClient } from "./MemosClient";

export const metadata: Metadata = { title: "실습 메모" };

export default async function MemosPage() {
  const notes = await getPracticeNotes();

  return (
    <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            실습 메모
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {notes.length}개의 메모가 저장되어 있어요.
          </p>
        </div>
        <Link
          href="/memos/new"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          + 새 메모
        </Link>
      </div>

      <MemosClient notes={notes} />
    </div>
  );
}
