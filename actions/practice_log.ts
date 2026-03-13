"use server";

import type { JournalUsageSummary } from "@/actions/journal";
import { ActionResult, JournalDraft, JournalGenerateInput, SoapNote } from "@/lib/types";
import {
  generateJournal,
  getJournalDrafts,
  getJournalMonthlyUsage,
  getSoapNoteForJournal,
} from "@/actions/journal";

export type PracticeLogUsageSummary = JournalUsageSummary;

export async function getPracticeLogMonthlyUsage(): Promise<PracticeLogUsageSummary> {
  return getJournalMonthlyUsage();
}

export async function getPracticeLogDrafts(): Promise<JournalDraft[]> {
  return getJournalDrafts();
}

export async function getSoapNoteForPracticeLog(params: {
  noteId?: string | null;
  soapNoteId?: string | null;
}): Promise<SoapNote | null> {
  return getSoapNoteForJournal(params);
}

export async function generatePracticeLog(
  input: JournalGenerateInput
): Promise<ActionResult<JournalDraft>> {
  return generateJournal(input);
}
