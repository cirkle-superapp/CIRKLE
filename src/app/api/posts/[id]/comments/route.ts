import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapComment } from "@/lib/social/mappers";
import { CURRENT_USER_ID } from "@/lib/social/types";
import { emitPulse } from "@/lib/social/pulse";

export const dynamic = "force-dynamic";

/** GET /api/posts/[id]/comments — comments for a post, oldest first. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: postId } = await params;
    const comments = await db.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      include: { author: true },
    });
    return NextResponse.json({ comments: comments.map(mapComment) });
  } catch (err) {
    console.error("[comments] GET error", err);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 },
    );
  }
}

/** POST /api/posts/[id]/comments — create a comment as CURRENT_USER_ID. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: postId } = await params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body.content !== "string" || !body.content.trim()) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 },
      );
    }

    const post = await db.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const comment = await db.comment.create({
      data: {
        postId,
        authorId: CURRENT_USER_ID,
        content: body.content.trim(),
      },
      include: { author: true },
    });

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
          type: "comment",
          content: `${name} commented on your post.`,
          actorId: CURRENT_USER_ID,
          read: false,
        },
      });
    }

    // Emit pulse event for the live PulseRibbon.
    await emitPulse("feed", "comment");

    return NextResponse.json(mapComment(comment));
  } catch (err) {
    console.error("[comments] POST error", err);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 },
    );
  }
}
