"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  ActionResult,
  PracticeNote,
  NoteCreateInput,
  NoteUpdateInput,
} from "@/lib/types";
import {
  validateNoteCreateInput,
  validateNoteUpdateInput,
} from "@/lib/validation/note";

async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("getAuthenticatedUserId error:", error);
    return null;
  }

  return user?.id ?? null;
}

export async function getPracticeNotes(): Promise<PracticeNote[]> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("practice_notes")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getPracticeNotes error:", error);
    return [];
  }

  return data as PracticeNote[];
}

export async function getPracticeNote(id: string): Promise<PracticeNote | null> {
  if (!id.trim()) return null;

  const userId = await getAuthenticatedUserId();
  if (!userId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("practice_notes")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("getPracticeNote error:", error);
    return null;
  }

  return data as PracticeNote;
}

export async function getRecentPracticeNotes(
  limit: number = 3
): Promise<PracticeNote[]> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return [];

  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 20);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("practice_notes")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    console.error("getRecentPracticeNotes error:", error);
    return [];
  }

  return data as PracticeNote[];
}

export async function createPracticeNote(
  input: NoteCreateInput
): Promise<ActionResult<PracticeNote>> {
  const validated = validateNoteCreateInput(input);
  if (!validated.ok) {
    return { success: false, error: validated.message };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    if (authError) console.error("createPracticeNote auth error:", authError);
    return { success: false, error: "로그인이 필요합니다." };
  }

  const { data, error } = await supabase
    .from("practice_notes")
    .insert({ ...validated.value, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error("createPracticeNote error:", error);
    return {
      success: false,
      error: "메모 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  revalidatePath("/memos");
  revalidatePath("/dashboard");
  return { success: true, data: data as PracticeNote };
}

export async function updatePracticeNote(
  input: NoteUpdateInput
): Promise<ActionResult<PracticeNote>> {
  if (!input.id.trim()) {
    return { success: false, error: "잘못된 메모 요청입니다." };
  }

  const validated = validateNoteUpdateInput(input);
  if (!validated.ok) {
    return { success: false, error: validated.message };
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const supabase = await createClient();
  const { id } = input;

  const { data, error } = await supabase
    .from("practice_notes")
    .update(validated.value)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("updatePracticeNote error:", error);
    return {
      success: false,
      error: "메모 수정 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  revalidatePath("/memos");
  revalidatePath(`/memos/${id}`);
  return { success: true, data: data as PracticeNote };
}

export async function deletePracticeNote(id: string): Promise<ActionResult> {
  if (!id.trim()) {
    return { success: false, error: "잘못된 메모 요청입니다." };
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("practice_notes")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("deletePracticeNote error:", error);
    return {
      success: false,
      error: "메모 삭제 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  revalidatePath("/memos");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}
