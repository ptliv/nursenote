"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  ActionResult,
  CaseStudyDraft,
  CaseStudyGenerateInput,
  JournalDraft,
  SoapNote,
} from "@/lib/types";
import {
  CASE_STUDY_FREE_MONTHLY_LIMIT,
  CASE_STUDY_PRO_ONLY,
  createAndSaveCaseStudy,
} from "@/lib/case-study/service";

export interface CaseStudyUsageSummary {
  plan: "free" | "pro";
  monthlyUsed: number;
  monthlyLimit: number | null;
  proOnly: boolean;
}

export interface CaseStudyLinkedContext {
  soapNote: SoapNote | null;
  journalDraft: JournalDraft | null;
}

export async function getCaseStudyMonthlyUsage(): Promise<CaseStudyUsageSummary> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const defaultLimit = CASE_STUDY_FREE_MONTHLY_LIMIT > 0 ? CASE_STUDY_FREE_MONTHLY_LIMIT : null;

  if (authError || !user) {
    return {
      plan: "free",
      monthlyUsed: 0,
      monthlyLimit: defaultLimit,
      proOnly: CASE_STUDY_PRO_ONLY,
    };
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subscriptionError) {
    console.error("getCaseStudyMonthlyUsage subscription error:", subscriptionError);
    return {
      plan: "free",
      monthlyUsed: 0,
      monthlyLimit: defaultLimit,
      proOnly: CASE_STUDY_PRO_ONLY,
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

  if (plan === "pro" || defaultLimit === null) {
    return {
      plan,
      monthlyUsed: 0,
      monthlyLimit: plan === "pro" ? null : defaultLimit,
      proOnly: CASE_STUDY_PRO_ONLY,
    };
  }

  const { count, error: usageError } = await supabase
    .from("case_study_drafts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", start)
    .lt("created_at", end);

  if (usageError) {
    console.error("getCaseStudyMonthlyUsage usage error:", usageError);
    return {
      plan,
      monthlyUsed: 0,
      monthlyLimit: defaultLimit,
      proOnly: CASE_STUDY_PRO_ONLY,
    };
  }

  return {
    plan,
    monthlyUsed: count ?? 0,
    monthlyLimit: defaultLimit,
    proOnly: CASE_STUDY_PRO_ONLY,
  };
}

export async function getCaseStudyDrafts(): Promise<CaseStudyDraft[]> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return [];

  const { data, error } = await supabase
    .from("case_study_drafts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getCaseStudyDrafts error:", error);
    return [];
  }

  return data as CaseStudyDraft[];
}

export async function getCaseStudyLinkedContext(params: {
  noteId?: string | null;
  soapNoteId?: string | null;
  journalDraftId?: string | null;
}): Promise<CaseStudyLinkedContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { soapNote: null, journalDraft: null };
  }

  let soapNote: SoapNote | null = null;
  let journalDraft: JournalDraft | null = null;

  if (params.journalDraftId) {
    const { data, error } = await supabase
      .from("journal_drafts")
      .select("*")
      .eq("id", params.journalDraftId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("getCaseStudyLinkedContext journal by id error:", error);
    } else {
      journalDraft = (data as JournalDraft | null) ?? null;
    }
  }

  if (params.soapNoteId) {
    const { data, error } = await supabase
      .from("soap_notes")
      .select("*")
      .eq("id", params.soapNoteId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("getCaseStudyLinkedContext soap by id error:", error);
    } else {
      soapNote = (data as SoapNote | null) ?? null;
    }
  }

  if (!soapNote && params.noteId) {
    const { data, error } = await supabase
      .from("soap_notes")
      .select("*")
      .eq("note_id", params.noteId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("getCaseStudyLinkedContext soap by note error:", error);
    } else {
      soapNote = (data as SoapNote | null) ?? null;
    }
  }

  if (!journalDraft && params.noteId) {
    const { data, error } = await supabase
      .from("journal_drafts")
      .select("*")
      .eq("note_id", params.noteId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("getCaseStudyLinkedContext journal by note error:", error);
    } else {
      journalDraft = (data as JournalDraft | null) ?? null;
    }
  }

  if (!soapNote && journalDraft) {
    const { data, error } = await supabase
      .from("soap_notes")
      .select("*")
      .eq("id", journalDraft.soap_note_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("getCaseStudyLinkedContext soap by journal error:", error);
    } else {
      soapNote = (data as SoapNote | null) ?? null;
    }
  }

  if (!journalDraft && soapNote) {
    const { data, error } = await supabase
      .from("journal_drafts")
      .select("*")
      .eq("soap_note_id", soapNote.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("getCaseStudyLinkedContext journal by soap error:", error);
    } else {
      journalDraft = (data as JournalDraft | null) ?? null;
    }
  }

  return { soapNote, journalDraft };
}

export async function generateCaseStudy(
  input: CaseStudyGenerateInput
): Promise<ActionResult<CaseStudyDraft>> {
  const result = await createAndSaveCaseStudy({
    practiceText: input.practice_text,
    noteId: input.note_id ?? null,
    soapNoteId: input.soap_note_id,
    journalDraftId: input.journal_draft_id,
    extraNote: input.extra_note ?? null,
    style: input.style,
  });

  if (!result.ok) {
    return { success: false, error: result.error };
  }

  revalidatePath("/case-study");

  if (result.warning) {
    console.warn("generateCaseStudy warning:", result.warning);
  }

  return { success: true, data: result.draft };
}
