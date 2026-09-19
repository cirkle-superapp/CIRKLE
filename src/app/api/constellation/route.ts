import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/constellation?userId=X — orbital connection graph
// Returns top contacts by message volume, grouped into 3 orbits (inner/middle/outer).
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    // Count messages exchanged with each other user (from main app Message table)
    const sent = await db.message.findMany({
      where: { fromId: userId },
      select: { toId: true },
    });
    const received = await db.message.findMany({
      where: { toId: userId },
      select: { fromId: true },
    });

    // Tally volume per contact
    const volume: Record<string, number> = {};
    for (const m of sent) volume[m.toId] = (volume[m.toId] || 0) + 1;
    for (const m of received) volume[m.fromId] = (volume[m.fromId] || 0) + 1;

    const contactIds = Object.keys(volume);
    if (contactIds.length === 0) {
      return NextResponse.json({ total: 0, orbits: { inner: [], middle: [], outer: [] } });
    }

    const users = await db.user.findMany({
      where: { id: { in: contactIds } },
      select: { id: true, name: true, username: true, avatarColor: true, verified: true },
    });

    // Sort by volume desc, assign to orbits
    const ranked = contactIds
      .map((id) => {
        const u = users.find((x) => x.id === id);
        return u ? { ...u, volume: volume[id] } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b!.volume - a!.volume);

    const total = ranked.length;
    const innerCount = Math.min(3, Math.ceil(total / 3));
    const middleCount = Math.min(6, Math.ceil(total / 2));
    const orbits = {
      inner: ranked.slice(0, innerCount),
      middle: ranked.slice(innerCount, middleCount),
      outer: ranked.slice(middleCount, middleCount + 8),
    };

    return NextResponse.json({ total, orbits });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
