import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { UserContext, Profile, Subscription, DashboardStats } from "@/lib/types";

/**
 * 현재 로그인 사용자의 프로필 + 구독 정보를 함께 반환.
 * React.cache()로 동일 요청 내 중복 DB 호출을 방지한다.
 * (layout + dashboard 페이지에서 각각 호출해도 DB는 1번만 조회)
 */
export const getUserContext = cache(async (): Promise<UserContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [profileResult, subscriptionResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("subscriptions").select("*").eq("user_id", user.id).single(),
  ]);

  // 트리거 실패 등 edge case 대비 fallback
  const profile: Profile = profileResult.data ?? {
    id: user.id,
    email: user.email ?? "",
    name: (user.user_metadata as { name?: string })?.name ?? "사용자",
    created_at: user.created_at,
    updated_at: user.created_at,
  };

  const subscription: Subscription = subscriptionResult.data ?? {
    id: "",
    user_id: user.id,
    status: "free",
    current_period_end: null,
    created_at: user.created_at,
    updated_at: user.created_at,
  };

  return {
    profile,
    subscription,
    isPro: subscription.status === "pro",
  };
});

/** 대시보드용 통계. practice_notes, soap_notes 카운트. */
export async function getDashboardStats(
  userId: string
): Promise<DashboardStats> {
  const supabase = await createClient();

  const [notesResult, soapResult] = await Promise.all([
    supabase
      .from("practice_notes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("soap_notes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  if (notesResult.error) {
    console.error("getDashboardStats notes error:", notesResult.error);
  }
  if (soapResult.error) {
    console.error("getDashboardStats soap error:", soapResult.error);
  }

  return {
    notesCount: notesResult.error ? 0 : notesResult.count ?? 0,
    soapCount: soapResult.error ? 0 : soapResult.count ?? 0,
  };
}
