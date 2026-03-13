"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deletePracticeNote } from "@/actions/practice_notes";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface DeleteMemoButtonProps {
  noteId: string;
  className?: string;
}

export function DeleteMemoButton({ noteId, className }: DeleteMemoButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    if (!confirm("메모를 정말 삭제하시겠어요? 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }

    try {
      setLoading(true);
      const result = await deletePracticeNote(noteId);

      if (result.success) {
        router.push("/memos");
        router.refresh();
        return;
      }

      setError(result.error ?? "삭제에 실패했습니다. 다시 시도해주세요.");
    } catch (unknownError) {
      console.error("DeleteMemoButton error:", unknownError);
      setError("삭제 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button variant="danger" loading={loading} onClick={handleDelete} className={cn("w-full", className)}>
        삭제
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
