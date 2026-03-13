import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NurseNote",
    template: "%s | NurseNote",
  },
  description:
    "간호학과 학생을 위한 실습 기록·학습 보조 서비스. 의료적 진단·처방을 제공하지 않습니다.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
