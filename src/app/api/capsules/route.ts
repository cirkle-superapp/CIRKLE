import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CURRENT_USER_ID } from "@/lib/social/types";
import { emitPulse } from "@/lib/social/pulse";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// GET /api/capsules — list capsules (unsealed public ones + your own)
export async function GET() {
  try {
    const now = new Date();
    // Public capsules that have unsealed (unsealAt <= now) + your own (all)
    const capsules = await db.timeCapsule.findMany({
      where: {
        OR: [
          { AND: [{ visibility: "public" }, { unsealed: true }, { unsealAt: { lte: now } }] },
          { authorId: CURRENT_USER_ID },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ capsules });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

// POST /api/capsules — seal a new time capsule
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = typeof body?.payload === "string" ? body.payload.trim() : "";
    const days = Number(body?.days) || 30;
    const visibility = body?.visibility === "self" ? "self" : "public";

    if (!payload) return NextResponse.json({ error: "payload is required" }, { status: 400 });
    if (days < 1 || days > 3650) return NextResponse.json({ error: "days must be 1-3650" }, { status: 400 });

    const sealedAt = new Date();
    const unsealAt = new Date(sealedAt.getTime() + days * 86400_000);
    const anchorHash = crypto.createHash("sha256").update(payload + sealedAt.toISOString()).digest("hex");

    const capsule = await db.timeCapsule.create({
      data: {
        authorId: CURRENT_USER_ID,
        payload,
        anchorHash,
        sealedAt,
        unsealAt,
        visibility,
      },
    });

    // Emit pulse event for the live PulseRibbon.
    await emitPulse("feed", "capsule");

    return NextResponse.json({ ok: true, anchorHash: capsule.anchorHash, unsealAt: capsule.unsealAt, id: capsule.id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
