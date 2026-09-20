import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/vaults/[id]/consent — toggle a holder's consent for vault recovery.
// Body: { holderId } — the user ID of the holder consenting.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: vaultId } = await params;
    const body = await req.json();
    const holderId = typeof body?.holderId === "string" ? body.holderId : "";

    if (!holderId) return NextResponse.json({ error: "holderId required" }, { status: 400 });

    const holder = await db.vaultHolder.findFirst({
      where: { vaultId, userId: holderId },
    });
    if (!holder) return NextResponse.json({ error: "holder not found" }, { status: 404 });

    const updated = await db.vaultHolder.update({
      where: { id: holder.id },
      data: {
        consented: !holder.consented,
        consentedAt: !holder.consented ? new Date() : null,
      },
    });

    // Check if threshold met
    const vault = await db.familyVault.findUnique({
      where: { id: vaultId },
      include: { holders: true },
    });
    const consented = vault?.holders.filter((h) => h.consented).length ?? 0;
    const threshold = vault?.threshold ?? 0;
    const unlocked = consented >= threshold;

    return NextResponse.json({ ok: true, consented: updated.consented, consentedCount: consented, threshold, unlocked });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
