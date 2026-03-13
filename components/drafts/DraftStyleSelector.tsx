"use client";

import { DraftStyle, DRAFT_STYLE_OPTIONS, getDraftStyleOption } from "@/lib/drafts/style";
import { cn } from "@/lib/utils";

interface DraftStyleSelectorProps {
  value: DraftStyle;
  onChange: (value: DraftStyle) => void;
}

export function DraftStyleSelector({
  value,
  onChange,
}: DraftStyleSelectorProps) {
  const selectedOption = getDraftStyleOption(value);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">출력 스타일</p>
          <p className="text-xs leading-relaxed text-gray-500">
            기본 추천은 혼합형입니다. 생성 결과와 다음 단계에서도 같은 스타일을 유지합니다.
          </p>
        </div>
        <span className="inline-flex w-fit items-center rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
          추천: 혼합형
        </span>
      </div>

      <div className="space-y-3 md:hidden">
        <div className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {DRAFT_STYLE_OPTIONS.map((option) => {
            const isActive = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                aria-pressed={isActive}
                className={cn(
                  "min-h-[48px] min-w-[132px] rounded-xl border px-4 py-3 text-left transition-colors",
                  isActive
                    ? "border-primary-400 bg-primary-50 text-primary-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-primary-200 hover:bg-gray-50"
                )}
              >
                <p className="text-sm font-semibold">{option.label}</p>
                <p className="mt-1 text-xs text-gray-500">{option.shortDescription}</p>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-gray-900">{selectedOption.label}</p>
            <span className="rounded-full border border-primary-200 bg-white px-2 py-0.5 text-[11px] font-medium text-primary-700">
              현재 선택
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-gray-600">{selectedOption.shortDescription}</p>
          <p className="mt-2 text-xs leading-relaxed text-gray-500">{selectedOption.helperText}</p>
        </div>
      </div>

      <div className="hidden gap-3 md:grid md:grid-cols-3">
        {DRAFT_STYLE_OPTIONS.map((option) => {
          const isActive = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={isActive}
              className={cn(
                "rounded-2xl border px-4 py-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
                isActive
                  ? "border-primary-400 bg-primary-50"
                  : "border-gray-200 bg-white hover:border-primary-200 hover:bg-gray-50"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                {isActive && (
                  <span className="rounded-full border border-primary-200 bg-white px-2 py-0.5 text-[11px] font-medium text-primary-700">
                    선택됨
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs font-medium text-gray-600">{option.shortDescription}</p>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">{option.helperText}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
