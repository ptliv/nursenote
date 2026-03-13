import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPracticeNote } from "@/actions/practice_notes";
import { Badge } from "@/components/ui/Badge";
import {
  formatDateTime,
  NOTE_CATEGORY_LABELS,
  NOTE_CATEGORY_COLORS,
} from "@/lib/utils";
import { DeleteMemoButton } from "./DeleteMemoButton";

export const metadata: Metadata = { title: "메모 상세" };

const secondaryLinkClass =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MemoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const note = await getPracticeNote(id);
  if (!note) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
      <nav className="text-sm text-gray-400">
        <Link href="/memos" className="hover:text-gray-600 transition-colors">
          실습 메모
        </Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-gray-700">상세 보기</span>
      </nav>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {note.title}
            </h1>
            <p className="mt-2 text-xs text-gray-400">
              마지막 수정: {formatDateTime(note.updated_at)}
            </p>
          </div>
          <Badge className={NOTE_CATEGORY_COLORS[note.category]}>
            {NOTE_CATEGORY_LABELS[note.category]}
          </Badge>
        </div>

        {note.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {note.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-primary-50 px-2.5 py-1 text-xs text-primary-600"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
        <p className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-700 sm:text-base">
          {note.content}
        </p>
      </section>

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Link href={`/memos/${note.id}/edit`} className={secondaryLinkClass}>
          메모 수정
        </Link>
        <Link href={`/soap?note_id=${note.id}`} className={secondaryLinkClass}>
          SOAP 초안 만들기
        </Link>
        <DeleteMemoButton noteId={note.id} />
      </section>
    </div>
  );
}
