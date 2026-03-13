import { SoapNote } from "@/lib/types";
import { DraftStyleBadge } from "@/components/drafts/DraftStyleBadge";

interface SoapResultProps {
  soap: SoapNote;
}

interface SoapSection {
  key: keyof Pick<SoapNote, "subjective" | "objective" | "assessment" | "plan">;
  label: string;
  color: string;
  description: string;
}

const SOAP_SECTIONS: SoapSection[] = [
  {
    key: "subjective",
    label: "S · Subjective (주관적 자료)",
    color: "border-l-blue-400 bg-blue-50",
    description: "대상자가 직접 말한 증상, 느낌, 호소 내용",
  },
  {
    key: "objective",
    label: "O · Objective (객관적 자료)",
    color: "border-l-green-400 bg-green-50",
    description: "활력징후, 검사 결과, 관찰 소견",
  },
  {
    key: "assessment",
    label: "A · Assessment (사정)",
    color: "border-l-amber-400 bg-amber-50",
    description: "수집한 자료를 바탕으로 정리한 학습용 해석",
  },
  {
    key: "plan",
    label: "P · Plan (계획)",
    color: "border-l-purple-400 bg-purple-50",
    description: "추가 관찰, 기록, 학습 방향 초안",
  },
];

export function SoapResult({ soap }: SoapResultProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <DraftStyleBadge draftStyle={soap.style} />
        <p className="text-xs text-gray-500">학습 참고용 초안</p>
      </div>

      {SOAP_SECTIONS.map((section) => (
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
            {soap[section.key]}
          </p>
        </section>
      ))}

      <p className="pt-1 text-center text-xs leading-relaxed text-gray-400">
        이 결과는 학습과 기록 정리를 돕는 초안입니다. 실제 임상 판단이나 처방 결정에는 반드시 담당 교수자와 임상 지침을 함께 확인해주세요.
      </p>
    </div>
  );
}
