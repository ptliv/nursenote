import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MemoForm } from "@/components/memos/MemoForm";
import { createPracticeNote } from "@/actions/practice_notes";
import { NoteCreateInput } from "@/lib/types";

export const metadata: Metadata = { title: "새 메모 작성" };

export default function NewMemoPage() {
  async function handleCreate(
    data: NoteCreateInput
  ): Promise<{ success: boolean; error?: string }> {
    "use server";
    const result = await createPracticeNote(data);
    if (!result.success) return { success: false, error: result.error };
    redirect("/memos");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          새 메모 작성
        </h1>
        <p className="text-sm leading-relaxed text-gray-500 sm:text-base">
          실습 중 관찰한 내용, 수행한 간호, 배운 점을 휴대폰에서도 빠르게 기록해보세요.
        </p>
      </div>
      <MemoForm onSubmit={handleCreate} />
    </div>
  );
}
