import { DraftStyle, getDraftStyleOption } from "@/lib/drafts/style";

interface DraftStyleBadgeProps {
  draftStyle: DraftStyle;
}

export function DraftStyleBadge({ draftStyle }: DraftStyleBadgeProps) {
  const option = getDraftStyleOption(draftStyle);

  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
      적용 스타일: {option.label}
    </span>
  );
}
