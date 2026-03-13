"use client";

import { ComponentProps } from "react";
import { JournalPageClient } from "../journal/JournalPageClient";

type PracticeLogPageClientProps = ComponentProps<typeof JournalPageClient>;

export function PracticeLogPageClient(props: PracticeLogPageClientProps) {
  return <JournalPageClient {...props} />;
}
