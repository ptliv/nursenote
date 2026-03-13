// drug_cards: Supabase에 시드 데이터가 없을 때 fallback으로 사용.
// schema.sql의 INSERT 실행 후에는 Supabase에서 직접 조회.

import { DrugCard, QuizQuestion } from "@/lib/types";

export const DUMMY_DRUG_CARDS: DrugCard[] = [
  {
    id: "drug-1",
    name_ko: "푸로세미드",
    name_generic: "Furosemide",
    category: "diuretic",
    indication: "부종, 울혈성 심부전, 고혈압",
    common_dosage: "경구 20-80mg/일 (학습 참고용)",
    side_effects: ["저칼륨혈증", "저나트륨혈증", "기립성 저혈압", "탈수"],
    nursing_points: [
      "섭취량/배설량(I/O) 모니터링",
      "체중 매일 측정",
      "전해질 수치 확인",
      "기립성 저혈압 교육",
      "햇빛 과민반응 주의",
    ],
    created_at: "",
  },
  {
    id: "drug-2",
    name_ko: "아스피린",
    name_generic: "Aspirin",
    category: "analgesic",
    indication: "해열, 진통, 항혈소판 (심혈관 예방)",
    common_dosage: "항혈소판 100mg/일 (학습 참고용)",
    side_effects: ["위장관 출혈", "이명", "과민반응", "레이 증후군(소아)"],
    nursing_points: [
      "식후 복용 권장 (위장 보호)",
      "출혈 경향성 모니터링",
      "수술 전 복용 중단 여부 확인",
      "소아에게 투여 금기",
    ],
    created_at: "",
  },
  {
    id: "drug-3",
    name_ko: "암로디핀",
    name_generic: "Amlodipine",
    category: "antihypertensive",
    indication: "고혈압, 협심증",
    common_dosage: "5-10mg/일 (학습 참고용)",
    side_effects: ["말초 부종", "두통", "안면홍조", "현기증"],
    nursing_points: [
      "혈압 및 맥박 투여 전 확인",
      "갑작스러운 중단 금지",
      "자몽 주스 상호작용 교육",
      "기립성 저혈압 주의",
    ],
    created_at: "",
  },
  {
    id: "drug-4",
    name_ko: "와파린",
    name_generic: "Warfarin",
    category: "anticoagulant",
    indication: "심방세동, 심부정맥혈전증, 인공판막",
    common_dosage: "INR 목표에 따라 개별화 (학습 참고용)",
    side_effects: ["출혈", "멍", "피부 괴사(드물게)"],
    nursing_points: [
      "PT/INR 정기 모니터링",
      "출혈 징후 관찰 (혈뇨, 흑변)",
      "비타민K 함유 식품 일관성 유지",
      "낙상 예방 교육",
      "NSAIDs 등 약물 상호작용 주의",
    ],
    created_at: "",
  },
  {
    id: "drug-5",
    name_ko: "세팔렉신",
    name_generic: "Cephalexin",
    category: "antibiotic",
    indication: "피부 및 연조직 감염, 요로감염",
    common_dosage: "250-500mg q6h (학습 참고용)",
    side_effects: ["위장장애", "설사", "알레르기 반응", "C.diff 감염"],
    nursing_points: [
      "페니실린 알레르기 교차 반응 확인",
      "충분한 수분 섭취 권장",
      "처방 기간 전체 복용 완료 교육",
      "배양 결과 확인 후 투여",
    ],
    created_at: "",
  },
];

export const DUMMY_QUIZ: QuizQuestion[] = [
  {
    id: "quiz-1",
    drug_id: "drug-1",
    question: "Furosemide 투여 시 가장 중요하게 모니터링해야 할 전해질은?",
    options: ["칼슘", "칼륨", "마그네슘", "인"],
    correct_index: 1,
    explanation:
      "Furosemide는 고리이뇨제로 칼륨 손실을 일으켜 저칼륨혈증(Hypokalemia)이 주요 부작용입니다.",
  },
  {
    id: "quiz-2",
    drug_id: "drug-4",
    question: "Warfarin 복용 환자에게 교육할 내용으로 옳지 않은 것은?",
    options: [
      "멍이 쉽게 드는 것은 정상 반응이다",
      "채소 섭취량을 매일 다르게 한다",
      "두통, 현기증 심하면 즉시 보고",
      "정기적 혈액 검사가 필요하다",
    ],
    correct_index: 1,
    explanation:
      "비타민K 함유 식품 섭취를 갑자기 늘리거나 줄이면 INR이 불안정해집니다. 완전히 금지하는 것이 아니라 '일관성'을 유지해야 합니다.",
  },
  {
    id: "quiz-3",
    drug_id: "drug-3",
    question: "Amlodipine 복용 환자에게 주의시켜야 할 식품은?",
    options: ["우유", "자몽 주스", "녹차", "커피"],
    correct_index: 1,
    explanation:
      "자몽 주스는 CYP3A4를 억제하여 Amlodipine 혈중 농도를 높입니다. 복용 중 자몽 주스를 피하도록 교육합니다.",
  },
];
