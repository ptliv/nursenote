import Link from "next/link";
import { Button } from "@/components/ui/Button";

const FEATURES = [
  {
    icon: "📝",
    title: "실습 메모 기록",
    desc: "실습 중 관찰한 내용을 카테고리별로 빠르게 기록하세요.",
  },
  {
    icon: "📋",
    title: "SOAP 형식 정리",
    desc: "자유 메모를 SOAP 형식 학습 초안으로 자동 변환합니다.",
  },
  {
    icon: "💊",
    title: "약물 학습 카드",
    desc: "주요 약물의 간호 포인트를 카드로 학습하고 퀴즈로 확인하세요.",
  },
  {
    icon: "📄",
    title: "실습일지 초안 생성",
    desc: "메모를 기반으로 실습일지 초안을 자동 생성합니다. (Pro)",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🩺</span>
          <span className="text-xl font-bold text-primary-700">NurseNote</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              로그인
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">무료로 시작하기</Button>
          </Link>
        </div>
      </header>

      {/* 히어로 */}
      <section className="text-center px-4 py-24 max-w-3xl mx-auto">
        <span className="inline-block text-xs font-medium bg-primary-100 text-primary-700 px-3 py-1 rounded-full mb-6">
          간호학과 학생을 위한 학습 보조 서비스
        </span>
        <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-6">
          실습 기록은 빠르게,
          <br />
          학습은 더 체계적으로
        </h1>
        <p className="text-lg text-gray-500 mb-10 leading-relaxed">
          실습 메모를 SOAP 형식으로 정리하고, 약물 학습 카드로 국시를 준비하세요.
          <br />
          NurseNote는 의료 진단이 아닌, 여러분의 학습을 돕는 기록 보조 도구입니다.
        </p>
        <Link href="/signup">
          <Button size="lg">무료로 시작하기 →</Button>
        </Link>
      </section>

      {/* 기능 소개 */}
      <section className="max-w-5xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl border border-gray-200 p-6"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 면책 고지 */}
      <footer className="text-center py-8 border-t border-gray-100">
        <p className="text-xs text-gray-400 max-w-xl mx-auto leading-relaxed">
          NurseNote는 간호학과 학생의 학습·기록 보조를 목적으로 합니다.
          의료적 진단, 처방, 임상 판단을 제공하지 않습니다.
          모든 내용은 학습 참고용이며, 실제 임상에서는 반드시 전문가의 판단을 따르세요.
        </p>
      </footer>
    </div>
  );
}
