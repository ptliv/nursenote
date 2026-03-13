import type { Metadata } from "next";
import { getPracticeNote } from "@/actions/practice_notes";
import {
  getPracticeLogMonthlyUsage,
  getSoapNoteForPracticeLog,
} from "@/actions/practice_log";
import { isDraftStyle, normalizeDraftStyle } from "@/lib/drafts/style";
import { normalizePracticeLogId } from "@/lib/practice-log/shared";
import { PracticeLogPageClient } from "./PracticeLogPageClient";

export const metadata: Metadata = { title: "실습일지 초안" };

interface PageProps {
  searchParams: Promise<{ note_id?: string; soap_id?: string; style?: string }>;
}

export default async function PracticeLogPage({ searchParams }: PageProps) {
  const { note_id, soap_id, style } = await searchParams;
  const rawNoteId = note_id?.trim();
  const rawSoapId = soap_id?.trim();
  const rawStyle = style?.trim();
  const normalizedNoteId = rawNoteId ? normalizePracticeLogId(rawNoteId) : null;
  const normalizedSoapId = rawSoapId ? normalizePracticeLogId(rawSoapId) : null;
  const initialStyle = normalizeDraftStyle(rawStyle);

  let initialPracticeText = "";
  let noteId: string | undefined;
  let noteTitle: string | undefined;
  const warnings: string[] = [];

  if (rawStyle && !isDraftStyle(rawStyle)) {
    warnings.push("스타일 설정이 올바르지 않아 혼합형으로 적용했습니다.");
  }

  if (rawNoteId) {
    if (!normalizedNoteId) {
      warnings.push("메모 연결 형식이 올바르지 않아 일반 입력 모드로 전환했습니다.");
    } else {
      const note = await getPracticeNote(normalizedNoteId);
      if (note) {
        initialPracticeText = note.content;
        noteId = note.id;
        noteTitle = note.title;
      } else {
        warnings.push("연결된 실습 메모를 찾지 못했습니다.");
      }
    }
  }

  if (rawSoapId && !normalizedSoapId) {
    warnings.push("SOAP 연결 형식이 올바르지 않습니다.");
  }

  const soapNote = await getSoapNoteForPracticeLog({
    noteId: noteId ?? null,
    soapNoteId: normalizedSoapId,
  });

  if (normalizedSoapId && !soapNote) {
    warnings.push("선택한 SOAP 초안을 찾지 못했습니다.");
  } else if (noteId && !soapNote) {
    warnings.push("연결된 SOAP 초안이 없어 먼저 SOAP 생성이 필요합니다.");
  }

  const monthlyUsage = await getPracticeLogMonthlyUsage();

  return (
    <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          실습일지 초안 생성
        </h1>
        <p className="text-sm leading-relaxed text-gray-500 sm:text-base">
          실습 메모와 SOAP를 바탕으로 제출 전에 다듬기 쉬운 실습일지 초안을 생성합니다.
        </p>
        <p className="text-xs leading-relaxed text-amber-600 sm:text-sm">
          결과는 학습 참고용 초안이며, 학생이 최종 수정 후 제출하는 용도로 사용해주세요.
        </p>
      </div>

      <PracticeLogPageClient
        initialPracticeText={initialPracticeText}
        noteId={noteId}
        noteTitle={noteTitle}
        initialWarning={warnings.length ? warnings.join(" ") : undefined}
        initialSoap={
          soapNote
            ? {
                id: soapNote.id,
                note_id: soapNote.note_id,
                subjective: soapNote.subjective,
                objective: soapNote.objective,
                assessment: soapNote.assessment,
                plan: soapNote.plan,
              }
            : undefined
        }
        initialUsageCount={monthlyUsage.monthlyUsed}
        initialPlan={monthlyUsage.plan}
        initialStyle={initialStyle}
      />
    </div>
  );
}
