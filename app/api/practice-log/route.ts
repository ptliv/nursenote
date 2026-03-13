import { NextRequest, NextResponse } from "next/server";
import { createAndSavePracticeLog } from "@/lib/practice-log/service";

interface PracticeLogRequestBody {
  practice_text?: unknown;
  soap_note_id?: unknown;
  note_id?: unknown;
  extra_note?: unknown;
  style?: unknown;
  force_regenerate?: unknown;
}

export async function POST(request: NextRequest) {
  let body: PracticeLogRequestBody;
  try {
    body = (await request.json()) as PracticeLogRequestBody;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const result = await createAndSavePracticeLog({
    practiceText: body.practice_text,
    soapNoteId: body.soap_note_id,
    noteId: body.note_id,
    extraNote: body.extra_note,
    style: body.style,
    forceRegenerate: body.force_regenerate === true,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        upgrade_url: result.upgradeUrl ?? null,
      },
      { status: result.status }
    );
  }

  return NextResponse.json({
    ...result.draft,
    _warning: result.warning ?? null,
    _from_existing: result.fromExisting,
    _quota: result.quota,
  });
}
