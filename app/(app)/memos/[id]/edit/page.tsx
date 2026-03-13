import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPracticeNote, updatePracticeNote } from "@/actions/practice_notes";
import { MemoForm } from "@/components/memos/MemoForm";
import { NoteCreateInput } from "@/lib/types";

export const metadata: Metadata = { title: "메모 수정" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMemoPage({ params }: PageProps) {
  const { id } = await params;
  const note = await getPracticeNote(id);
  if (!note) notFound();

  async function handleUpdate(
    data: NoteCreateInput
  ): Promise<{ success: boolean; error?: string }> {
    "use server";
    const result = await updatePracticeNote({ id, ...data });
    if (!result.success) return { success: false, error: result.error };
    redirect(`/memos/${id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          메모 수정
        </h1>
        <p className="text-sm text-gray-500">
          제목, 카테고리, 본문을 실습 흐름에 맞게 다시 정리해보세요.
        </p>
      </div>
      <MemoForm
        initialValues={{
          title: note.title,
          content: note.content,
          category: note.category,
          tags: note.tags,
        }}
        onSubmit={handleUpdate}
        submitLabel="수정 저장하기"
      />
    </div>
  );
}
