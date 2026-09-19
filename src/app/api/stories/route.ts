import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapStory } from "@/lib/social/mappers";

export const dynamic = "force-dynamic";

/** GET /api/stories — non-expired stories, newest first. */
export async function GET() {
  try {
    const stories = await db.story.findMany({
      where: { expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      include: { author: true },
    });
    return NextResponse.json({ stories: stories.map(mapStory) });
  } catch (err) {
    console.error("[stories] error", err);
    return NextResponse.json(
      { error: "Failed to fetch stories" },
      { status: 500 },
    );
  }
}
