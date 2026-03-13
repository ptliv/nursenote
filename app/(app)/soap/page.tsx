import type { Metadata } from "next";
import { getPracticeNote } from "@/actions/practice_notes";
import { getSoapMonthlyUsage } from "@/actions/soap";
import { isDraftStyle, normalizeDraftStyle } from "@/lib/drafts/style";
import { normalizeSoapNoteId } from "@/lib/soap/shared";
import { SoapPageClient } from "./SoapPageClient";

export const metadata: Metadata = { title: "SOAP 초안" };

interface PageProps {
  searchParams: Promise<{ note_id?: string; style?: string }>;
}

export default async function SoapPage({ searchParams }: PageProps) {
  const { note_id, style } = await searchParams;
  const rawNoteId = note_id?.trim();
  const rawStyle = style?.trim();
  const normalizedNoteId = rawNoteId ? normalizeSoapNoteId(rawNoteId) : null;
  const initialStyle = normalizeDraftStyle(rawStyle);

  let initialText = "";
  let noteId: string | undefined;
  let noteTitle: string | undefined;
  let initialWarning: string | undefined;

  if (rawStyle && !isDraftStyle(rawStyle)) {
    initialWarning = "스타일 설정이 올바르지 않아 혼합형으로 적용했습니다.";
  }

  if (rawNoteId) {
    if (!normalizedNoteId) {
      initialWarning = [
        initialWarning,
        "메모 연결 정보 형식이 올바르지 않아 일반 입력 모드로 전환했습니다.",
      ]
        .filter(Boolean)
        .join(" ");
    } else {
      const note = await getPracticeNote(normalizedNoteId);
      if (note) {
        initialText = note.content;
        noteId = note.id;
        noteTitle = note.title;
      } else {
        initialWarning = [
          initialWarning,
          "연결된 메모를 찾지 못했습니다. 새 메모 내용으로 SOAP를 생성해주세요.",
        ]
          .filter(Boolean)
          .join(" ");
      }
    }
  }

  const monthlyUsage = await getSoapMonthlyUsage();

  return (
    <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          SOAP 초안 생성
        </h1>
        <p className="text-sm leading-relaxed text-gray-500 sm:text-base">
          실습 메모를 입력하면 AI가 학습용 SOAP 초안을 빠르게 정리해줍니다.
        </p>
        <p className="text-xs leading-relaxed text-amber-600 sm:text-sm">
          결과는 학습 참고용 초안이며, 실제 임상 판단이나 처방을 대신하지 않습니다.
        </p>
      </div>

      <SoapPageClient
        initialText={initialText}
        noteId={noteId}
        noteTitle={noteTitle}
        initialWarning={initialWarning}
        initialUsageCount={monthlyUsage.monthlyUsed}
        initialPlan={monthlyUsage.plan}
        initialStyle={initialStyle}
      />
    </div>
  );
}
