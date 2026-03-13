"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NoteCategory, NoteCreateInput } from "@/lib/types";
import { NOTE_CATEGORY_LABELS, cn } from "@/lib/utils";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  NOTE_LIMITS,
  parseTagInput,
  validateNoteCreateInput,
} from "@/lib/validation/note";

interface MemoFormProps {
  initialValues?: Partial<NoteCreateInput>;
  onSubmit: (
    data: NoteCreateInput
  ) => Promise<{ success: boolean; error?: string }>;
  submitLabel?: string;
}

const CATEGORIES = Object.entries(NOTE_CATEGORY_LABELS) as [
  NoteCategory,
  string,
][];

export function MemoForm({
  initialValues,
  onSubmit,
  submitLabel = "저장하기",
}: MemoFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [content, setContent] = useState(initialValues?.content ?? "");
  const [category, setCategory] = useState<NoteCategory>(
    initialValues?.category ?? "general"
  );
  const [tagInput, setTagInput] = useState(
    (initialValues?.tags ?? []).join(", ")
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const tags = parseTagInput(tagInput);
    const validated = validateNoteCreateInput({
      title,
      content,
      category,
      tags,
    });

    if (!validated.ok) {
      setError(validated.message);
      return;
    }

    setLoading(true);
    const result = await onSubmit(validated.value);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "저장에 실패했습니다.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
      <Input
        id="title"
        label="제목"
        placeholder="메모 제목을 입력해주세요"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={NOTE_LIMITS.titleMax}
        required
        disabled={loading}
      />
      <p className="-mt-3 text-right text-xs text-gray-400">
        {title.trim().length}/{NOTE_LIMITS.titleMax}
      </p>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">카테고리</label>
        <div className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:flex-wrap">
          {CATEGORIES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value)}
              className={cn(
                "inline-flex min-h-[42px] items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                category === value
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Textarea
        id="content"
        label="내용"
        placeholder="실습 내용, 관찰 사항, 배운 점을 자유롭게 기록해주세요. 긴 내용을 붙여넣어도 괜찮아요."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={10}
        maxLength={NOTE_LIMITS.contentMax}
        required
        disabled={loading}
        className="min-h-[260px] sm:min-h-[320px]"
      />
      <p className="-mt-3 text-right text-xs text-gray-400">
        {content.trim().length}/{NOTE_LIMITS.contentMax}
      </p>

      <Input
        id="tags"
        label="태그 (쉼표로 구분)"
        placeholder="고혈압, 이뇨제, 부종"
        value={tagInput}
        onChange={(e) => setTagInput(e.target.value)}
        maxLength={NOTE_LIMITS.tagsMaxCount * (NOTE_LIMITS.tagMaxLength + 2)}
        disabled={loading}
      />
      <p className="-mt-3 text-xs leading-relaxed text-gray-400">
        태그는 나중에 메모를 다시 찾을 때 도움이 됩니다. 너무 많이 넣기보다 핵심 키워드만 남기는 편이 좋습니다.
      </p>

      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 border-t border-gray-100 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-0">
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="submit" loading={loading} className="w-full">
            {submitLabel}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={loading}
            className="w-full"
          >
            취소
          </Button>
        </div>
      </div>
    </form>
  );
}
