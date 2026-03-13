"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

type FormState = "idle" | "loading" | "done" | "error";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const normalizedName = name.trim();
    const normalizedEmail = email.trim();

    if (normalizedName.length < 2) {
      setErrorMsg("이름은 2자 이상 입력해주세요.");
      return;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setErrorMsg("올바른 이메일 형식을 입력해주세요.");
      return;
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      setErrorMsg(`비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`);
      return;
    }

    if (password.length > PASSWORD_MAX_LENGTH) {
      setErrorMsg(`비밀번호는 ${PASSWORD_MAX_LENGTH}자 이하로 입력해주세요.`);
      return;
    }

    setState("loading");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: { name: normalizedName } },
      });

      if (error) {
        setState("error");
        setErrorMsg(
          "회원가입에 실패했습니다. 이미 사용 중인 이메일일 수 있습니다."
        );
        return;
      }

      // 이메일 인증이 필요한 경우 (session이 null)
      if (!data.session) {
        setState("done");
        return;
      }

      // 이메일 인증 없이 바로 로그인된 경우
      router.push("/dashboard");
      router.refresh();
    } catch (unknownError) {
      console.error("handleSignup error:", unknownError);
      setState("error");
      setErrorMsg("회원가입 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  }

  // 이메일 인증 안내 화면
  if (state === "done") {
    return (
      <Card className="w-full max-w-sm">
        <CardBody className="py-10 px-7 text-center">
          <div className="text-4xl mb-4">📬</div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            이메일을 확인해주세요
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            <strong>{email}</strong>로 인증 링크를 보냈습니다.
            <br />
            링크를 클릭하면 자동으로 로그인됩니다.
          </p>
          <Link
            href="/login"
            className="text-sm text-primary-600 font-medium hover:underline"
          >
            로그인 페이지로 →
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardBody className="py-8 px-7">
        <h1 className="text-xl font-bold text-gray-900 mb-1 text-center">
          회원가입
        </h1>
        <p className="text-xs text-gray-400 text-center mb-7">
          무료로 시작하고 언제든지 Pro로 업그레이드할 수 있어요
        </p>

        <form onSubmit={handleSignup} className="space-y-4">
          <Input
            id="name"
            label="이름 (닉네임)"
            placeholder="홍길동"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={state === "loading"}
          />
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
            label="비밀번호 (8자 이상)"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
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
            시작하기
          </Button>
        </form>

        <p className="text-sm text-center text-gray-500 mt-6">
          이미 계정이 있으신가요?{" "}
          <Link
            href="/login"
            className="text-primary-600 font-medium hover:underline"
          >
            로그인
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
