import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "실습일지 초안" };

interface PageProps {
  searchParams: Promise<{
    note_id?: string;
    soap_id?: string;
    journal_id?: string;
    style?: string;
  }>;
}

export default async function JournalPage({ searchParams }: PageProps) {
  const { note_id, soap_id, journal_id, style } = await searchParams;

  const nextParams = new URLSearchParams();
  if (note_id?.trim()) nextParams.set("note_id", note_id.trim());
  if (soap_id?.trim()) nextParams.set("soap_id", soap_id.trim());
  if (journal_id?.trim()) nextParams.set("journal_id", journal_id.trim());
  if (style?.trim()) nextParams.set("style", style.trim());

  const query = nextParams.toString();
  redirect(query ? `/practice-log?${query}` : "/practice-log");
}
