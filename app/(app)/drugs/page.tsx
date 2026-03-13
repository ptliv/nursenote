import type { Metadata } from "next";
import { DrugsPageClient } from "./DrugsPageClient";

export const metadata: Metadata = { title: "약물 학습" };

export default function DrugsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">약물 학습</h2>
        <p className="text-sm text-gray-500 mt-1">
          주요 약물의 간호 포인트를 학습하고 퀴즈로 확인하세요.
          <br />
          <span className="text-xs text-amber-600">
            ※ 학습 참고용 정보입니다. 실제 투약은 처방에 따라 진행하세요.
          </span>
        </p>
      </div>
      <DrugsPageClient />
    </div>
  );
}
