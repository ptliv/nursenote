export type { JournalDraftSections as PracticeLogDraftSections } from "@/lib/journal/shared";
export {
  JOURNAL_FREE_LIMIT as PRACTICE_LOG_FREE_LIMIT,
  JOURNAL_LIMITS as PRACTICE_LOG_LIMITS,
  buildJournalSourceText as buildPracticeLogSourceText,
  normalizeForJournal as normalizeForPracticeLog,
  normalizeJournalId as normalizePracticeLogId,
  validateJournalExtraNote as validatePracticeLogExtraNote,
  validateJournalPracticeText as validatePracticeLogText,
} from "@/lib/journal/shared";
