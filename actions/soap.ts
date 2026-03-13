"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ActionResult, SoapNote, SoapGenerateInput } from "@/lib/types";
import { createAndSaveSoap } from "@/lib/soap/service";
import { SOAP_FREE_MONTHLY_LIMIT } from "@/lib/soap/service";

export interface SoapUsageSummary {
  plan: "free" | "pro";
  monthlyUsed: number;
  monthlyLimit: number | null;
}

/** 이번 달(UTC 기준) SOAP 사용량 + 플랜 정보. */
export async function getSoapMonthlyUsage(): Promise<SoapUsageSummary> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { plan: "free", monthlyUsed: 0, monthlyLimit: SOAP_FREE_MONTHLY_LIMIT };
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subscriptionError) {
    console.error("getSoapMonthlyUsage subscription error:", subscriptionError);
    return { plan: "free", monthlyUsed: 0, monthlyLimit: SOAP_FREE_MONTHLY_LIMIT };
  }

  const plan = subscription?.status === "pro" ? "pro" : "free";

  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
  ).toISOString();
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0)
  ).toISOString();

  const { count } = await supabase
    .from("soap_notes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", start)
    .lt("created_at", end);

  return {
    plan,
    monthlyUsed: count ?? 0,
    monthlyLimit: plan === "pro" ? null : SOAP_FREE_MONTHLY_LIMIT,
  };
}

export async function getSoapNotes(): Promise<SoapNote[]> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return [];

  const { data, error } = await supabase
    .from("soap_notes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getSoapNotes error:", error);
    return [];
  }

  return data as SoapNote[];
}

/**
 * 서버 액션 버전의 SOAP 생성 + 저장.
 * 현재 UI는 /api/soap 라우트를 사용하지만,
 * 서버 컴포넌트나 다른 서버 액션에서 직접 호출할 때 이 함수를 사용.
 */
export async function generateSoap(
  input: SoapGenerateInput
): Promise<ActionResult<SoapNote>> {
  const result = await createAndSaveSoap({
    sourceText: input.source_text,
    noteId: input.note_id ?? null,
    style: input.style,
  });

  if (!result.ok) {
    return { success: false, error: result.error };
  }

  revalidatePath("/soap");

  if (result.warning) {
    console.warn("generateSoap warning:", result.warning);
  }

  return { success: true, data: result.note };
}
