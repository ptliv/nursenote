import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <span className="text-2xl">🩺</span>
        <span className="text-xl font-bold text-primary-700">NurseNote</span>
      </Link>
      {children}
      <p className="mt-8 text-xs text-gray-400 text-center max-w-sm leading-relaxed">
        NurseNote는 학습 보조 서비스입니다. 의료 진단·처방을 제공하지 않습니다.
      </p>
    </div>
  );
}
