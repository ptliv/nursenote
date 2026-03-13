import { DrugCard as DrugCardType } from "@/lib/types";
import { DRUG_CATEGORY_LABELS } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

interface DrugCardProps {
  drug: DrugCardType;
  onClick?: () => void;
}

export function DrugCard({ drug, onClick }: DrugCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-gray-200 bg-white p-5 hover:border-primary-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-900">{drug.name_ko}</h3>
          <p className="text-sm text-gray-400 italic">{drug.name_generic}</p>
        </div>
        <Badge className="bg-primary-100 text-primary-700 shrink-0">
          {DRUG_CATEGORY_LABELS[drug.category]}
        </Badge>
      </div>

      <p className="mt-3 text-sm text-gray-700">
        <span className="font-medium">적응증:</span> {drug.indication}
      </p>

      <div className="mt-3">
        <p className="text-xs font-medium text-gray-400 mb-1.5">
          주요 간호 포인트
        </p>
        <ul className="space-y-1">
          {drug.nursing_points.slice(0, 3).map((point, i) => (
            <li key={i} className="text-xs text-gray-600 flex gap-1.5">
              <span className="text-primary-400 shrink-0">•</span>
              {point}
            </li>
          ))}
          {drug.nursing_points.length > 3 && (
            <li className="text-xs text-gray-400">
              +{drug.nursing_points.length - 3}개 더보기...
            </li>
          )}
        </ul>
      </div>
    </button>
  );
}
