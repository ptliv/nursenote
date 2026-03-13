import { JournalDraft } from "@/lib/types";
import { DraftStyleBadge } from "@/components/drafts/DraftStyleBadge";

interface JournalResultProps {
  draft: JournalDraft;
}

interface JournalSection {
  key: keyof Pick<
    JournalDraft,
    | "summary"
    | "observation_performance"
    | "learning_points"
    | "improvements"
    | "next_goals"
  >;
  label: string;
  color: string;
  description: string;
}

const JOURNAL_SECTIONS: JournalSection[] = [
  {
    key: "summary",
    label: "1) 실습 내용 요약",
    color: "border-l-blue-400 bg-blue-50",
    description: "오늘 실습에서 경험한 핵심 상황 요약",
  },
  {
    key: "observation_performance",
    label: "2) 관찰 및 수행 내용",
    color: "border-l-green-400 bg-green-50",
    description: "관찰한 내용과 직접 수행한 행동 정리",
  },
  {
    key: "learning_points",
    label: "3) 배운 점",
    color: "border-l-teal-400 bg-teal-50",
    description: "실습을 통해 새롭게 이해한 내용",
  },
  {
    key: "improvements",
    label: "4) 아쉬웠던 점 / 보완할 점",
    color: "border-l-amber-400 bg-amber-50",
    description: "부족했던 부분과 다음에 보완할 점",
  },
  {
    key: "next_goals",
    label: "5) 다음 실습 목표",
    color: "border-l-purple-400 bg-purple-50",
    description: "다음 실습에서 이어서 점검할 목표",
  },
];

export function JournalResult({ draft }: JournalResultProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <DraftStyleBadge draftStyle={draft.style} />
        <p className="text-xs text-gray-500">학습 참고용 초안</p>
      </div>

      {JOURNAL_SECTIONS.map((section) => (
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
        실습일지 제출 전에는 학생 본인이 직접 수정하고, 표현과 사실 관계를 다시 확인해주세요.
      </p>
    </div>
  );
}
