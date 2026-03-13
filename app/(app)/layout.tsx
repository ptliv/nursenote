import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/supabase/queries";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userContext = await getUserContext();

  if (!userContext) {
    redirect("/login");
  }

  return <AppShell userContext={userContext}>{children}</AppShell>;
}
