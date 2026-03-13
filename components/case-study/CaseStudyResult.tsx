import { CaseStudyDraft } from "@/lib/types";
import { DraftStyleBadge } from "@/components/drafts/DraftStyleBadge";

interface CaseStudyResultProps {
  draft: CaseStudyDraft;
}

interface CaseStudySection {
  key: keyof Pick<
    CaseStudyDraft,
    | "patient_summary"
    | "major_observations"
    | "nursing_problem_candidates"
    | "priority_summary"
    | "learning_needs"
  >;
  label: string;
  color: string;
  description: string;
}

const CASE_STUDY_SECTIONS: CaseStudySection[] = [
  {
    key: "patient_summary",
    label: "1) 대상자 상태 요약",
    color: "border-l-blue-400 bg-blue-50",
    description: "대상자의 현재 상태를 학습 관점에서 정리한 요약",
  },
  {
    key: "major_observations",
    label: "2) 주요 관찰 내용",
    color: "border-l-green-400 bg-green-50",
    description: "관찰한 징후, 수치, 변화 포인트",
  },
  {
    key: "nursing_problem_candidates",
    label: "3) 간호문제 후보",
    color: "border-l-amber-400 bg-amber-50",
    description: "확정 진단이 아닌 학습용 후보 정리",
  },
  {
    key: "priority_summary",
    label: "4) 우선순위 정리",
    color: "border-l-purple-400 bg-purple-50",
    description: "실습 목적 안에서 먼저 볼 항목 정리",
  },
  {
    key: "learning_needs",
    label: "5) 추가 학습 필요 항목",
    color: "border-l-teal-400 bg-teal-50",
    description: "과제를 더 다듬기 위해 확인할 내용",
  },
];

export function CaseStudyResult({ draft }: CaseStudyResultProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <DraftStyleBadge draftStyle={draft.style} />
        <p className="text-xs text-gray-500">학습 참고용 초안</p>
      </div>

      {CASE_STUDY_SECTIONS.map((section) => (
        <section
          key={section.key}
          className={`rounded-2xl border-l-4 p-3 sm:p-4 ${section.color}`}
        >
          <div className="mb-2">
            <h3 className="text-sm font-semibold text-gray-800 sm:text-base">
              {section.label}
            </h3>
            <p className="text-xs text-gray-500">{section.description}</p>
          </div>
          <p className="whitespace-pre-line break-words text-[13px] leading-6 text-gray-700 sm:text-sm">
            {draft[section.key]}
          </p>
        </section>
      ))}

      <p className="pt-1 text-center text-xs leading-relaxed text-gray-400">
        케이스스터디 제출 전에는 학생 본인이 직접 표현과 우선순위를 다시 검토해주세요.
      </p>
    </div>
  );
}
