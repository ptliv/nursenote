import { NoteCategory, NoteCreateInput } from "@/lib/types";

export const NOTE_LIMITS = {
  titleMin: 2,
  titleMax: 120,
  contentMin: 10,
  contentMax: 5000,
  tagsMaxCount: 10,
  tagMaxLength: 20,
} as const;

const NOTE_CATEGORIES: ReadonlySet<NoteCategory> = new Set([
  "general",
  "patient",
  "procedure",
  "medication",
  "education",
]);

type ValidationSuccess<T> = { ok: true; value: T };
type ValidationFailure = { ok: false; message: string };

export type NoteValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const rawTag of tags) {
    const tag = rawTag.replace(/^#+/, "").trim();
    if (!tag) continue;

    const dedupeKey = tag.toLowerCase();
    if (seen.has(dedupeKey)) continue;

    seen.add(dedupeKey);
    normalized.push(tag);
  }

  return normalized;
}

export function parseTagInput(input: string): string[] {
  return normalizeTags(input.split(","));
}

export function validateNoteCreateInput(
  input: NoteCreateInput
): NoteValidationResult<NoteCreateInput> {
  const title = input.title.trim();
  const content = input.content.trim();
  const tags = normalizeTags(input.tags);

  if (title.length < NOTE_LIMITS.titleMin) {
    return { ok: false, message: "제목은 2자 이상 입력해주세요." };
  }
  if (title.length > NOTE_LIMITS.titleMax) {
    return {
      ok: false,
      message: `제목은 ${NOTE_LIMITS.titleMax}자 이하로 입력해주세요.`,
    };
  }

  if (content.length < NOTE_LIMITS.contentMin) {
    return { ok: false, message: "내용은 10자 이상 입력해주세요." };
  }
  if (content.length > NOTE_LIMITS.contentMax) {
    return {
      ok: false,
      message: `내용은 ${NOTE_LIMITS.contentMax}자 이하로 입력해주세요.`,
    };
  }

  if (!NOTE_CATEGORIES.has(input.category)) {
    return { ok: false, message: "카테고리 값이 올바르지 않습니다." };
  }

  if (tags.length > NOTE_LIMITS.tagsMaxCount) {
    return {
      ok: false,
      message: `태그는 최대 ${NOTE_LIMITS.tagsMaxCount}개까지 입력할 수 있습니다.`,
    };
  }

  const hasLongTag = tags.some((tag) => tag.length > NOTE_LIMITS.tagMaxLength);
  if (hasLongTag) {
    return {
      ok: false,
      message: `태그는 각 ${NOTE_LIMITS.tagMaxLength}자 이하로 입력해주세요.`,
    };
  }

  return {
    ok: true,
    value: {
      title,
      content,
      category: input.category,
      tags,
    },
  };
}

export function validateNoteUpdateInput(
  input: Partial<NoteCreateInput>
): NoteValidationResult<Partial<NoteCreateInput>> {
  const next: Partial<NoteCreateInput> = {};

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (title.length < NOTE_LIMITS.titleMin) {
      return { ok: false, message: "제목은 2자 이상 입력해주세요." };
    }
    if (title.length > NOTE_LIMITS.titleMax) {
      return {
        ok: false,
        message: `제목은 ${NOTE_LIMITS.titleMax}자 이하로 입력해주세요.`,
      };
    }
    next.title = title;
  }

  if (input.content !== undefined) {
    const content = input.content.trim();
    if (content.length < NOTE_LIMITS.contentMin) {
      return { ok: false, message: "내용은 10자 이상 입력해주세요." };
    }
    if (content.length > NOTE_LIMITS.contentMax) {
      return {
        ok: false,
        message: `내용은 ${NOTE_LIMITS.contentMax}자 이하로 입력해주세요.`,
      };
    }
    next.content = content;
  }

  if (input.category !== undefined) {
    if (!NOTE_CATEGORIES.has(input.category)) {
      return { ok: false, message: "카테고리 값이 올바르지 않습니다." };
    }
    next.category = input.category;
  }

  if (input.tags !== undefined) {
    const tags = normalizeTags(input.tags);
    if (tags.length > NOTE_LIMITS.tagsMaxCount) {
      return {
        ok: false,
        message: `태그는 최대 ${NOTE_LIMITS.tagsMaxCount}개까지 입력할 수 있습니다.`,
      };
    }
    const hasLongTag = tags.some((tag) => tag.length > NOTE_LIMITS.tagMaxLength);
    if (hasLongTag) {
      return {
        ok: false,
        message: `태그는 각 ${NOTE_LIMITS.tagMaxLength}자 이하로 입력해주세요.`,
      };
    }
    next.tags = tags;
  }

  if (Object.keys(next).length === 0) {
    return { ok: false, message: "수정할 내용이 없습니다." };
  }

  return { ok: true, value: next };
}
