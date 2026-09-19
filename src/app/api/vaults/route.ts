import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CURRENT_USER_ID } from "@/lib/social/types";
import { emitPulse } from "@/lib/social/pulse";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// GET /api/vaults — list your family vaults
export async function GET() {
  try {
    const vaults = await db.familyVault.findMany({
      where: { ownerId: CURRENT_USER_ID },
      include: { holders: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ vaults });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

// POST /api/vaults — create a new vault
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const secret = typeof body?.secret === "string" ? body.secret : "";
    const threshold = Number(body?.threshold) || 2;
    const holders = Array.isArray(body?.holders) ? body.holders : [];

    if (!name || !secret || holders.length < threshold) {
      return NextResponse.json({ error: "name, secret, and >= threshold holders required" }, { status: 400 });
    }

    const secretHash = crypto.createHash("sha256").update(secret).digest("hex");
    const vault = await db.familyVault.create({
      data: {
        ownerId: CURRENT_USER_ID,
        name,
        secretHash,
        threshold,
        totalShares: holders.length,
        holders: {
          create: holders.map((h: { id: string; name: string; relation: string }) => ({
            userId: h.id,
            name: h.name,
            relation: h.relation,
          })),
        },
      },
      include: { holders: true },
    });

    await emitPulse("feed", "save");

    return NextResponse.json({ ok: true, vault });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
