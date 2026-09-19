import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/pulse — per-pillar activity heat over last 60 minutes
export async function GET() {
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const events = await db.pulseEvent.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
    });

    // Aggregate by pillar
    const byPillar: Record<string, { count: number; weight: number; kinds: Record<string, number> }> = {};
    for (const e of events) {
      if (!byPillar[e.pillar]) byPillar[e.pillar] = { count: 0, weight: 0, kinds: {} };
      byPillar[e.pillar].count++;
      byPillar[e.pillar].weight += e.weight;
      byPillar[e.pillar].kinds[e.kind] = (byPillar[e.pillar].kinds[e.kind] || 0) + 1;
    }

    const pillars = Object.entries(byPillar).map(([pillar, d]) => ({
      pillar,
      count: d.count,
      weight: d.weight,
      kinds: d.kinds,
    }));

    return NextResponse.json({
      total: events.length,
      pillars,
      windowMinutes: 60,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
