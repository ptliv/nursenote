import type { DraftStyle } from "@/lib/drafts/style";

// ─── 사용자 / 인증 ────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export type SubscriptionStatus = "free" | "pro" | "cancelled";
export type { DraftStyle } from "@/lib/drafts/style";

export interface Subscription {
  id: string;
  user_id: string;
  status: SubscriptionStatus;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

/** 레이아웃/헤더에서 사용하는 통합 컨텍스트 */
export interface UserContext {
  profile: Profile;
  subscription: Subscription;
  isPro: boolean;
}

// ─── 실습 메모 ────────────────────────────────────────────

export type NoteCategory =
  | "general"    // 일반
  | "patient"    // 환자 관찰
  | "procedure"  // 처치/술기
  | "medication" // 약물
  | "education"; // 학습

export interface PracticeNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: NoteCategory;
  tags: string[];
  soap_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteCreateInput {
  title: string;
  content: string;
  category: NoteCategory;
  tags: string[];
}

export interface NoteUpdateInput extends Partial<NoteCreateInput> {
  id: string;
}

// ─── SOAP ─────────────────────────────────────────────────

export interface SoapNote {
  id: string;
  user_id: string;
  note_id: string | null;
  source_text: string;
  style: DraftStyle;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  created_at: string;
}

export interface SoapGenerateInput {
  source_text: string;
  note_id?: string | null;
  style?: DraftStyle;
}

export interface JournalDraft {
  id: string;
  user_id: string;
  note_id: string | null;
  soap_note_id: string;
  source_text: string;
  style: DraftStyle;
  practice_text: string;
  soap_snapshot: string;
  extra_note: string | null;
  summary: string;
  observation_performance: string;
  learning_points: string;
  improvements: string;
  next_goals: string;
  created_at: string;
}

export interface JournalGenerateInput {
  practice_text: string;
  soap_note_id: string;
  note_id?: string | null;
  extra_note?: string | null;
  style?: DraftStyle;
}

export interface CaseStudyDraft {
  id: string;
  user_id: string;
  note_id: string | null;
  soap_note_id: string;
  journal_draft_id: string;
  source_text: string;
  style: DraftStyle;
  practice_text: string;
  soap_snapshot: string;
  journal_snapshot: string;
  extra_note: string | null;
  patient_summary: string;
  major_observations: string;
  nursing_problem_candidates: string;
  priority_summary: string;
  learning_needs: string;
  created_at: string;
}

export interface CaseStudyGenerateInput {
  practice_text: string;
  soap_note_id: string;
  journal_draft_id: string;
  note_id?: string | null;
  extra_note?: string | null;
  style?: DraftStyle;
}

// ─── 약물 ────────────────────────────────────────────────

export type DrugCategory =
  | "analgesic"
  | "antibiotic"
  | "antihypertensive"
  | "anticoagulant"
  | "diuretic"
  | "other";

export interface DrugCard {
  id: string;
  name_ko: string;
  name_generic: string;
  category: DrugCategory;
  indication: string;
  common_dosage: string | null;
  side_effects: string[];
  nursing_points: string[];
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  drug_id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface QuizResult {
  question_id: string;
  selected_index: number;
  is_correct: boolean;
}

// ─── 대시보드 통계 ─────────────────────────────────────────

export interface DashboardStats {
  notesCount: number;
  soapCount: number;
}

// ─── 공통 ─────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
