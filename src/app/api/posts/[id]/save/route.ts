import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CURRENT_USER_ID } from "@/lib/social/types";
import { emitPulse } from "@/lib/social/pulse";

export const dynamic = "force-dynamic";

/**
 * POST /api/posts/[id]/save
 * Toggles whether the current user has "saved" post [id].
 * Returns { saved: boolean }.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: postId } = await params;

    const post = await db.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const existing = await db.savedPost.findUnique({
      where: { userId_postId: { userId: CURRENT_USER_ID, postId } },
    });

    if (existing) {
      await db.savedPost.delete({ where: { id: existing.id } });
      await emitPulse("feed", "save");

    return NextResponse.json({ saved: false });
    }

    await db.savedPost.create({
      data: { userId: CURRENT_USER_ID, postId },
    });
    await emitPulse("feed", "save");

    return NextResponse.json({ saved: true });
  } catch (err) {
    console.error("[posts/save] error", err);
    return NextResponse.json(
      { error: "Failed to toggle save" },
      { status: 500 },
    );
  }
}
