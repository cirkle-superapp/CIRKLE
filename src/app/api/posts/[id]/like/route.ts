import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CURRENT_USER_ID } from "@/lib/social/types";
import { emitPulse } from "@/lib/social/pulse";

export const dynamic = "force-dynamic";

/**
 * POST /api/posts/[id]/like — toggles like by CURRENT_USER_ID on post [id].
 * Returns { liked, likesCount }. Sends a notification when liking someone
 * else's post.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: postId } = await params;

    const post = await db.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const existing = await db.like.findUnique({
      where: { postId_userId: { postId, userId: CURRENT_USER_ID } },
    });

    if (existing) {
      await db.like.delete({ where: { id: existing.id } });
      const likesCount = await db.like.count({ where: { postId } });
      return NextResponse.json({ liked: false, likesCount });
    }

    await db.like.create({
      data: { postId, userId: CURRENT_USER_ID },
    });

    // Emit pulse event for the live PulseRibbon.
    await emitPulse("feed", "like");

    // Notify the post author (skip self-notifications).
    if (post.authorId !== CURRENT_USER_ID) {
      const me = await db.user.findUnique({
        where: { id: CURRENT_USER_ID },
        select: { name: true },
      });
      const name = me?.name ?? "Someone";
      await db.notification.create({
        data: {
          userId: post.authorId,
          type: "like",
          content: `${name} liked your post.`,
          actorId: CURRENT_USER_ID,
          read: false,
        },
      });
    }

    const likesCount = await db.like.count({ where: { postId } });
    return NextResponse.json({ liked: true, likesCount });
  } catch (err) {
    console.error("[like] error", err);
    return NextResponse.json(
      { error: "Failed to toggle like" },
      { status: 500 },
    );
  }
}
