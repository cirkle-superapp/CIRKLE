import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CURRENT_USER_ID } from "@/lib/social/types";

export const dynamic = "force-dynamic";

// POST /api/tickets/[id]/transfer — transfer a ticket to a new owner (chain-of-custody).
// Body: { toUserId } — the recipient user ID.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const toUserId = typeof body?.toUserId === "string" ? body.toUserId : "";

    if (!toUserId) return NextResponse.json({ error: "toUserId required" }, { status: 400 });

    const ticket = await db.eventTicket.findUnique({ where: { id } });
    if (!ticket) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (ticket.ownerId !== CURRENT_USER_ID) return NextResponse.json({ error: "not your ticket" }, { status: 403 });

    // Mark old ticket as transferred, create a new one for the recipient with a fresh anchor.
    const crypto = await import("crypto");
    const newAnchor = crypto.createHash("sha256").update(ticket.eventName + ticket.eventDate + toUserId + Date.now()).digest("hex");
    const newQr = crypto.randomBytes(12).toString("hex");

    await db.eventTicket.update({ where: { id }, data: { state: "transferred" } });
    const newTicket = await db.eventTicket.create({
      data: {
        ownerId: toUserId,
        eventName: ticket.eventName,
        eventDate: ticket.eventDate,
        venue: ticket.venue,
        tier: ticket.tier,
        anchorHash: newAnchor,
        qrSeed: newQr,
        state: "issued",
      },
    });

    return NextResponse.json({ ok: true, newTicketId: newTicket.id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
