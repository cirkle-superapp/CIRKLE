import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CURRENT_USER_ID } from "@/lib/social/types";
import { emitPulse } from "@/lib/social/pulse";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// GET /api/tickets — list your event tickets
export async function GET() {
  try {
    const tickets = await db.eventTicket.findMany({
      where: { ownerId: CURRENT_USER_ID },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ tickets });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

// POST /api/tickets — mint a new ticket (for demo / testing)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventName = typeof body?.eventName === "string" ? body.eventName.trim() : "";
    const eventDate = typeof body?.eventDate === "string" ? body.eventDate : "";
    const venue = typeof body?.venue === "string" ? body.venue.trim() : "";
    const tier = ["general", "vip", "press", "free"].includes(body?.tier) ? body.tier : "general";

    if (!eventName || !eventDate || !venue) {
      return NextResponse.json({ error: "eventName, eventDate, venue required" }, { status: 400 });
    }

    const anchorHash = crypto.createHash("sha256").update(eventName + eventDate + venue + CURRENT_USER_ID + Date.now()).digest("hex");
    const qrSeed = crypto.randomBytes(12).toString("hex");

    const ticket = await db.eventTicket.create({
      data: { ownerId: CURRENT_USER_ID, eventName, eventDate, venue, tier, anchorHash, qrSeed },
    });

    await emitPulse("feed", "save");

    return NextResponse.json({ ok: true, ticket });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
