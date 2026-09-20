import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/pulse/emit — emit a pulse event from the frontend.
// Used for actions that happen in external services (e.g. Wasl messages on port 3004)
// where the backend can't directly write to this app's DB.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pillar = typeof body?.pillar === "string" ? body.pillar : "feed";
    const kind = typeof body?.kind === "string" ? body.kind : "action";
    const weight = Number(body?.weight) || 1;
    await db.pulseEvent.create({ data: { pillar, kind, weight } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
