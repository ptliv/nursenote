import type { Metadata } from "next";
import { getPracticeNote } from "@/actions/practice_notes";
import {
  getCaseStudyLinkedContext,
  getCaseStudyMonthlyUsage,
} from "@/actions/case_study";
import { isDraftStyle, normalizeDraftStyle } from "@/lib/drafts/style";
import { normalizeCaseStudyId } from "@/lib/case-study/shared";
import { CaseStudyPageClient } from "./CaseStudyPageClient";

export const metadata: Metadata = { title: "케이스스터디 초안" };

interface PageProps {
  searchParams: Promise<{
    note_id?: string;
    soap_id?: string;
    journal_id?: string;
    style?: string;
  }>;
}

export default async function CaseStudyPage({ searchParams }: PageProps) {
  const { note_id, soap_id, journal_id, style } = await searchParams;
  const rawNoteId = note_id?.trim();
  const rawSoapId = soap_id?.trim();
  const rawJournalId = journal_id?.trim();
  const rawStyle = style?.trim();
  const normalizedNoteId = rawNoteId ? normalizeCaseStudyId(rawNoteId) : null;
  const normalizedSoapId = rawSoapId ? normalizeCaseStudyId(rawSoapId) : null;
  const normalizedJournalId = rawJournalId ? normalizeCaseStudyId(rawJournalId) : null;
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
  if (rawJournalId && !normalizedJournalId) {
    warnings.push("실습일지 연결 형식이 올바르지 않습니다.");
  }

  const linkedContext = await getCaseStudyLinkedContext({
    noteId: noteId ?? normalizedNoteId,
    soapNoteId: normalizedSoapId,
    journalDraftId: normalizedJournalId,
  });

  const { soapNote, journalDraft } = linkedContext;

  if (normalizedSoapId && !soapNote) {
    warnings.push("선택한 SOAP 초안을 찾지 못했습니다.");
  }
  if (normalizedJournalId && !journalDraft) {
    warnings.push("선택한 실습일지 초안을 찾지 못했습니다.");
  }
  if (!soapNote) {
    warnings.push("케이스스터디 초안을 만들려면 SOAP 초안이 먼저 필요합니다.");
  }
  if (!journalDraft) {
    warnings.push("케이스스터디 초안을 만들려면 실습일지 초안이 먼저 필요합니다.");
  }

  if (!initialPracticeText && journalDraft?.practice_text) {
    initialPracticeText = journalDraft.practice_text;
  }
  if (!noteId) {
    noteId = journalDraft?.note_id ?? soapNote?.note_id ?? undefined;
  }

  const monthlyUsage = await getCaseStudyMonthlyUsage();

  return (
    <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          케이스스터디 초안 생성
        </h1>
        <p className="text-sm leading-relaxed text-gray-500 sm:text-base">
          실습 메모, SOAP, 실습일지 초안을 연결해 케이스스터디 시작 구조를 빠르게 정리합니다.
        </p>
        <p className="text-xs leading-relaxed text-amber-600 sm:text-sm">
          결과는 학습 참고용 초안이며, 의료 진단이나 처방처럼 보이지 않도록 보수적으로 작성됩니다.
        </p>
      </div>

      <CaseStudyPageClient
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
        initialJournal={
          journalDraft
            ? {
                id: journalDraft.id,
                note_id: journalDraft.note_id,
                soap_note_id: journalDraft.soap_note_id,
                summary: journalDraft.summary,
                observation_performance: journalDraft.observation_performance,
                learning_points: journalDraft.learning_points,
                improvements: journalDraft.improvements,
                next_goals: journalDraft.next_goals,
                practice_text: journalDraft.practice_text,
              }
            : undefined
        }
        initialUsageCount={monthlyUsage.monthlyUsed}
        initialPlan={monthlyUsage.plan}
        initialMonthlyLimit={monthlyUsage.monthlyLimit}
        initialProOnly={monthlyUsage.proOnly}
        initialStyle={initialStyle}
      />
    </div>
  );
}
