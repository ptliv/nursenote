import "server-only";

import {
  CreateJournalInput,
  JOURNAL_FREE_MONTHLY_LIMIT,
  JOURNAL_UPGRADE_URL,
  createAndSaveJournal,
} from "@/lib/journal/service";

export type CreatePracticeLogInput = CreateJournalInput;

export type CreatePracticeLogResult = Awaited<
  ReturnType<typeof createAndSaveJournal>
>;

export const PRACTICE_LOG_FREE_MONTHLY_LIMIT = JOURNAL_FREE_MONTHLY_LIMIT;
export const PRACTICE_LOG_UPGRADE_URL = JOURNAL_UPGRADE_URL;
export const PRACTICE_LOG_PRO_ONLY =
  process.env.PRACTICE_LOG_PRO_ONLY === "true";

export async function createAndSavePracticeLog(
  input: CreatePracticeLogInput
): Promise<CreatePracticeLogResult> {
  return createAndSaveJournal(input);
}
