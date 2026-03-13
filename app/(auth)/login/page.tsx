"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

type FormState = "idle" | "loading" | "error";

const ERROR_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "이메일 또는 비밀번호가 올바르지 않습니다.",
  "Email not confirmed": "이메일 인증이 필요합니다. 받은 편지함을 확인해주세요.",
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setState("error");
      setErrorMsg("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setState("loading");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        setState("error");
        setErrorMsg(
          ERROR_MESSAGES[error.message] ??
            "로그인에 실패했습니다. 다시 시도해주세요."
        );
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (unknownError) {
      console.error("handleLogin error:", unknownError);
      setState("error");
      setErrorMsg("로그인 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardBody className="py-8 px-7">
        <h1 className="text-xl font-bold text-gray-900 mb-1 text-center">
          로그인
        </h1>
        <p className="text-xs text-gray-400 text-center mb-7">
          NurseNote에 오신 걸 환영합니다
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            id="email"
            type="email"
            label="이메일"
            placeholder="nurse@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={state === "loading"}
          />
          <Input
            id="password"
            type="password"
            label="비밀번호"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={state === "loading"}
          />

          {errorMsg && (
            <div className="flex gap-2 items-start bg-red-50 border border-red-100 px-3 py-2.5 rounded-lg">
              <span className="text-red-400 shrink-0 mt-0.5">!</span>
              <p className="text-sm text-red-600">{errorMsg}</p>
            </div>
          )}

          <Button
            type="submit"
            loading={state === "loading"}
            className="w-full mt-1"
          >
            로그인
          </Button>
        </form>

        <p className="text-sm text-center text-gray-500 mt-6">
          계정이 없으신가요?{" "}
          <Link
            href="/signup"
            className="text-primary-600 font-medium hover:underline"
          >
            회원가입
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
