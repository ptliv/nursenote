import { NoteCategory, DrugCategory } from "@/lib/types";

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export const NOTE_CATEGORY_LABELS: Record<NoteCategory, string> = {
  general: "일반",
  patient: "환자 관찰",
  procedure: "처치/기기",
  medication: "약물",
  education: "학습",
};

export const NOTE_CATEGORY_COLORS: Record<NoteCategory, string> = {
  general: "bg-gray-100 text-gray-700",
  patient: "bg-blue-100 text-blue-700",
  procedure: "bg-green-100 text-green-700",
  medication: "bg-purple-100 text-purple-700",
  education: "bg-yellow-100 text-yellow-700",
};

export const DRUG_CATEGORY_LABELS: Record<DrugCategory, string> = {
  analgesic: "진통제",
  antibiotic: "항생제",
  antihypertensive: "항고혈압제",
  anticoagulant: "항응고제",
  diuretic: "이뇨제",
  other: "기타",
};
