"use client";

import { useState } from "react";
import { DrugCard as DrugCardType, QuizResult } from "@/lib/types";
import { DUMMY_DRUG_CARDS, DUMMY_QUIZ } from "@/lib/data/dummy";
import { DrugCard } from "@/components/drugs/DrugCard";
import { QuizCard } from "@/components/drugs/QuizCard";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { DRUG_CATEGORY_LABELS } from "@/lib/utils";

type Tab = "cards" | "quiz";

export function DrugsPageClient() {
  const [tab, setTab] = useState<Tab>("cards");
  const [selectedDrug, setSelectedDrug] = useState<DrugCardType | null>(null);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);

  const correctCount = quizResults.filter((r) => r.is_correct).length;

  if (selectedDrug) {
    return (
      <div className="space-y-5">
        <Button variant="ghost" size="sm" onClick={() => setSelectedDrug(null)}>
          ← 목록으로
        </Button>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedDrug.name_ko}
                </h3>
                <p className="text-sm text-gray-400 italic mt-0.5">
                  {selectedDrug.name_generic}
                </p>
              </div>
              <span className="text-xs bg-primary-100 text-primary-700 px-2.5 py-1 rounded-full font-medium">
                {DRUG_CATEGORY_LABELS[selectedDrug.category]}
              </span>
            </div>
          </div>

          <div className="px-6 py-5 space-y-6">
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                적응증
              </h4>
              <p className="text-sm text-gray-700">{selectedDrug.indication}</p>
            </div>

            {selectedDrug.common_dosage && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  일반적 용량
                </h4>
                <p className="text-sm text-gray-700">
                  {selectedDrug.common_dosage}
                </p>
                <p className="text-xs text-amber-600 mt-1.5">
                  실제 투약량은 처방에 따르며 개인차가 있습니다.
                </p>
              </div>
            )}

            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                주요 부작용
              </h4>
              <div className="flex gap-2 flex-wrap">
                {selectedDrug.side_effects.map((se) => (
                  <span
                    key={se}
                    className="text-xs bg-red-50 text-red-600 px-2.5 py-1 rounded-full"
                  >
                    {se}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                간호 포인트
              </h4>
              <ul className="space-y-2">
                {selectedDrug.nursing_points.map((point, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-primary-500 font-bold shrink-0">
                      •
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 탭 */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(["cards", "quiz"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "cards" ? "💊 약물 카드" : "📝 퀴즈"}
          </button>
        ))}
      </div>

      {tab === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DUMMY_DRUG_CARDS.map((drug) => (
            <DrugCard
              key={drug.id}
              drug={drug}
              onClick={() => setSelectedDrug(drug)}
            />
          ))}
        </div>
      )}

      {tab === "quiz" && (
        <div className="space-y-5">
          {quizResults.length > 0 && (
            <Card className="border-primary-200 bg-primary-50">
              <CardBody className="py-3 flex items-center justify-between">
                <p className="text-sm font-medium text-primary-700">
                  {quizResults.length}문제 중{" "}
                  <strong>{correctCount}개</strong> 정답
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setQuizResults([])}
                >
                  초기화
                </Button>
              </CardBody>
            </Card>
          )}
          {DUMMY_QUIZ.map((q) => (
            <QuizCard
              key={q.id}
              question={q}
              onAnswer={(r) => setQuizResults((prev) => [...prev, r])}
            />
          ))}
        </div>
      )}
    </div>
  );
}
