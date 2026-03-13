import { NextRequest, NextResponse } from "next/server";
import { DUMMY_QUIZ } from "@/lib/data/dummy";
import { QuizQuestion } from "@/lib/types";

interface GenerateQuizRequest {
  drug_ids?: unknown;
  count?: unknown;
}

const QUIZ_MIN_COUNT = 1;
const QUIZ_MAX_COUNT = 10;
const QUIZ_DEFAULT_COUNT = 5;

function normalizeCount(rawCount: unknown): number {
  if (typeof rawCount !== "number" || !Number.isFinite(rawCount)) {
    return QUIZ_DEFAULT_COUNT;
  }

  return Math.min(
    QUIZ_MAX_COUNT,
    Math.max(QUIZ_MIN_COUNT, Math.floor(rawCount))
  );
}

function normalizeDrugIds(rawDrugIds: unknown): string[] {
  if (!Array.isArray(rawDrugIds)) return [];

  const ids = rawDrugIds.filter((id): id is string => typeof id === "string");
  return [...new Set(ids)];
}

function shuffleQuestions(questions: QuizQuestion[]): QuizQuestion[] {
  const next = [...questions];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [next[i], next[randomIndex]] = [next[randomIndex], next[i]];
  }
  return next;
}

export async function POST(request: NextRequest) {
  let body: GenerateQuizRequest;

  try {
    body = (await request.json()) as GenerateQuizRequest;
  } catch {
    return NextResponse.json(
      { error: "요청 형식이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const count = normalizeCount(body.count);
  const drugIds = normalizeDrugIds(body.drug_ids);

  let questions: QuizQuestion[] = DUMMY_QUIZ;
  if (drugIds.length > 0) {
    questions = DUMMY_QUIZ.filter((question) => drugIds.includes(question.drug_id));
  }

  const shuffled = shuffleQuestions(questions);

  return NextResponse.json({ questions: shuffled.slice(0, count) });
}
