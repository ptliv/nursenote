import { NextRequest, NextResponse } from "next/server";
import { createAndSaveSoap } from "@/lib/soap/service";

interface SoapRequestBody {
  text?: unknown;
  note_id?: unknown;
  style?: unknown;
  force_regenerate?: unknown;
}

export async function POST(request: NextRequest) {
  let body: SoapRequestBody;
  try {
    body = (await request.json()) as SoapRequestBody;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const result = await createAndSaveSoap({
    sourceText: body.text,
    noteId: body.note_id,
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
    ...result.note,
    _warning: result.warning ?? null,
    _from_existing: result.fromExisting,
    _quota: result.quota,
  });
}
