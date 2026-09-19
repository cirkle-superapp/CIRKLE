import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/tickets/[id]/validate — mark a ticket as validated (for demo / validator use).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ticket = await db.eventTicket.findUnique({ where: { id } });
    if (!ticket) return NextResponse.json({ error: "not found" }, { status: 404 });

    const updated = await db.eventTicket.update({
      where: { id },
      data: { state: "validated" },
    });
    return NextResponse.json({ ok: true, state: updated.state });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
