"use client";

import { useState } from "react";
import { QuizQuestion, QuizResult } from "@/lib/types";
import { Button } from "@/components/ui/Button";

interface QuizCardProps {
  question: QuizQuestion;
  onAnswer: (result: QuizResult) => void;
}

export function QuizCard({ question, onAnswer }: QuizCardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (selected === null) return;
    setSubmitted(true);
    onAnswer({
      question_id: question.id,
      selected_index: selected,
      is_correct: selected === question.correct_index,
    });
  }

  const isCorrect = submitted && selected === question.correct_index;
  const isWrong = submitted && selected !== question.correct_index;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
      <p className="font-semibold text-gray-900 leading-relaxed">
        {question.question}
      </p>

      <div className="space-y-2.5">
        {question.options.map((option, index) => {
          let optionStyle = "border-gray-200 text-gray-700 hover:border-gray-300";

          if (submitted) {
            if (index === question.correct_index) {
              optionStyle = "border-green-400 bg-green-50 text-green-800";
            } else if (index === selected && isWrong) {
              optionStyle = "border-red-400 bg-red-50 text-red-800";
            }
          } else if (selected === index) {
            optionStyle = "border-primary-400 bg-primary-50 text-primary-800";
          }

          return (
            <button
              key={index}
              onClick={() => !submitted && setSelected(index)}
              disabled={submitted}
              className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${optionStyle} disabled:cursor-default`}
            >
              <span className="font-medium mr-2">
                {["①", "②", "③", "④"][index]}
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {submitted && (
        <div
          className={`p-4 rounded-lg text-sm ${
            isCorrect
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <p className="font-semibold mb-1">
            {isCorrect ? "✅ 정답입니다!" : "❌ 오답입니다."}
          </p>
          <p className="text-xs leading-relaxed">{question.explanation}</p>
        </div>
      )}

      {!submitted && (
        <Button
          onClick={handleSubmit}
          disabled={selected === null}
          size="sm"
        >
          답안 제출
        </Button>
      )}
    </div>
  );
}
