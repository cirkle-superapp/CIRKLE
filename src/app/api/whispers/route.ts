import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CURRENT_USER_ID } from "@/lib/social/types";
import { emitPulse } from "@/lib/social/pulse";

export const dynamic = "force-dynamic";

// GET /api/whispers — list whispers sent to me (not burned)
export async function GET() {
  try {
    const whispers = await db.whisper.findMany({
      where: { toId: CURRENT_USER_ID, burned: false },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ whispers });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

// POST /api/whispers — send a whisper
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const toId = typeof body?.toId === "string" ? body.toId : "";
    const text = typeof body?.body === "string" ? body.body.trim() : "";
    const ttl = Number(body?.ttlSeconds) || 60;
    const maxViews = Number(body?.maxViews) || 1;

    if (!toId || !text) return NextResponse.json({ error: "toId and body are required" }, { status: 400 });
    if (ttl < 10 || ttl > 604800) return NextResponse.json({ error: "ttl must be 10-604800 seconds" }, { status: 400 });

    const whisper = await db.whisper.create({
      data: {
        fromId: CURRENT_USER_ID,
        toId,
        body: text,
        ttlSeconds: ttl,
        maxViews,
        expiresAt: null, // set on first view
      },
    });

    // Emit pulse event for the live PulseRibbon.
    await emitPulse("wasl", "whisper");

    return NextResponse.json({ ok: true, id: whisper.id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
