"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ActionResult, JournalDraft, JournalGenerateInput, SoapNote } from "@/lib/types";
import {
  JOURNAL_FREE_MONTHLY_LIMIT,
  createAndSaveJournal,
} from "@/lib/journal/service";

export interface JournalUsageSummary {
  plan: "free" | "pro";
  monthlyUsed: number;
  monthlyLimit: number | null;
}

export async function getJournalMonthlyUsage(): Promise<JournalUsageSummary> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      plan: "free",
      monthlyUsed: 0,
      monthlyLimit: JOURNAL_FREE_MONTHLY_LIMIT,
    };
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subscriptionError) {
    console.error("getJournalMonthlyUsage subscription error:", subscriptionError);
    return {
      plan: "free",
      monthlyUsed: 0,
      monthlyLimit: JOURNAL_FREE_MONTHLY_LIMIT,
    };
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
    .from("journal_drafts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", start)
    .lt("created_at", end);

  return {
    plan,
    monthlyUsed: count ?? 0,
    monthlyLimit: plan === "pro" ? null : JOURNAL_FREE_MONTHLY_LIMIT,
  };
}

export async function getJournalDrafts(): Promise<JournalDraft[]> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return [];

  const { data, error } = await supabase
    .from("journal_drafts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getJournalDrafts error:", error);
    return [];
  }

  return data as JournalDraft[];
}

export async function getSoapNoteForJournal(params: {
  noteId?: string | null;
  soapNoteId?: string | null;
}): Promise<SoapNote | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  if (params.soapNoteId) {
    const { data, error } = await supabase
      .from("soap_notes")
      .select("*")
      .eq("id", params.soapNoteId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("getSoapNoteForJournal by soap id error:", error);
      return null;
    }
    if (data) return data as SoapNote;
  }

  if (params.noteId) {
    const { data, error } = await supabase
      .from("soap_notes")
      .select("*")
      .eq("note_id", params.noteId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("getSoapNoteForJournal by note id error:", error);
      return null;
    }
    return (data as SoapNote | null) ?? null;
  }

  return null;
}

export async function generateJournal(
  input: JournalGenerateInput
): Promise<ActionResult<JournalDraft>> {
  const result = await createAndSaveJournal({
    practiceText: input.practice_text,
    noteId: input.note_id ?? null,
    soapNoteId: input.soap_note_id,
    extraNote: input.extra_note ?? null,
    style: input.style,
  });

  if (!result.ok) {
    return { success: false, error: result.error };
  }

  revalidatePath("/journal");
  revalidatePath("/practice-log");

  if (result.warning) {
    console.warn("generateJournal warning:", result.warning);
  }

  return { success: true, data: result.draft };
}
