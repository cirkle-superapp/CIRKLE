import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CURRENT_USER_ID } from "@/lib/social/types";

export const dynamic = "force-dynamic";

// POST /api/whispers/[id]/view — record a view; burn if expired/maxed
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const whisper = await db.whisper.findUnique({ where: { id } });
    if (!whisper) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (whisper.toId !== CURRENT_USER_ID) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (whisper.burned) return NextResponse.json({ burned: true, body: null });

    let firstViewedAt = whisper.firstViewedAt;
    let expiresAt = whisper.expiresAt;
    if (!firstViewedAt) {
      firstViewedAt = new Date();
      expiresAt = new Date(firstViewedAt.getTime() + whisper.ttlSeconds * 1000);
    }

    const viewCount = whisper.viewCount + 1;
    const now = new Date();
    const expired = expiresAt ? now > expiresAt : false;
    const maxed = viewCount >= whisper.maxViews;
    const burned = expired || maxed;

    const updated = await db.whisper.update({
      where: { id },
      data: { viewCount, firstViewedAt, expiresAt, burned },
    });

    if (burned && whisper.viewCount > 0) {
      return NextResponse.json({ burned: true, body: null });
    }

    const remaining = Math.max(0, updated.maxViews - updated.viewCount);
    return NextResponse.json({
      body: updated.body,
      viewCount: updated.viewCount,
      maxViews: updated.maxViews,
      expiresAt: updated.expiresAt,
      burned: updated.burned,
      remaining,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
