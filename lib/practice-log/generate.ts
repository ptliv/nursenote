import "server-only";

import {
  JOURNAL_MODEL_DEFAULT,
  JOURNAL_PROMPT_VERSION,
  OpenAIConfigError,
  OpenAITimeoutError,
  generateJournalDraft,
} from "@/lib/journal/generate";

export {
  OpenAIConfigError,
  OpenAITimeoutError,
  JOURNAL_MODEL_DEFAULT as PRACTICE_LOG_MODEL_DEFAULT,
  JOURNAL_PROMPT_VERSION as PRACTICE_LOG_PROMPT_VERSION,
};

export async function generatePracticeLogDraft(
  sourceText: string,
  style: import("@/lib/drafts/style").DraftStyle
) {
  return generateJournalDraft(sourceText, style);
}
