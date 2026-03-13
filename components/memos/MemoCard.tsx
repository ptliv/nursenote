import Link from "next/link";
import { PracticeNote } from "@/lib/types";
import {
  formatDateTime,
  truncate,
  NOTE_CATEGORY_LABELS,
  NOTE_CATEGORY_COLORS,
} from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

interface MemoCardProps {
  note: PracticeNote;
}

export function MemoCard({ note }: MemoCardProps) {
  return (
    <Link
      href={`/memos/${note.id}`}
      className="block rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:border-primary-300 hover:shadow-md sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-base font-semibold text-gray-900 sm:text-lg">
            {note.title}
          </h3>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-500">
            {truncate(note.content, 140)}
          </p>
        </div>
        <Badge className={NOTE_CATEGORY_COLORS[note.category]}>
          {NOTE_CATEGORY_LABELS[note.category]}
        </Badge>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {note.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-primary-50 px-2.5 py-1 text-xs text-primary-600"
            >
              #{tag}
            </span>
          ))}
        </div>
        <span className="text-xs text-gray-400">{formatDateTime(note.updated_at)}</span>
      </div>
    </Link>
  );
}
