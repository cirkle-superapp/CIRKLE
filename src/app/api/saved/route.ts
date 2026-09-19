import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapPost } from "@/lib/social/mappers";
import { CURRENT_USER_ID } from "@/lib/social/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/saved
 * Returns posts saved by the current user, newest first, with full includes
 * (author / counts / likedByMe). Shape: { posts: SocialPost[] }.
 */
export async function GET() {
  try {
    const saved = await db.savedPost.findMany({
      where: { userId: CURRENT_USER_ID },
      orderBy: { createdAt: "desc" },
      select: { postId: true },
    });

    if (saved.length === 0) {
      return NextResponse.json({ posts: [] });
    }

    const posts = await db.post.findMany({
      where: { id: { in: saved.map((s) => s.postId) } },
      orderBy: { createdAt: "desc" },
      include: {
        author: true,
        likes: true,
        _count: { select: { comments: true } },
      },
    });

    return NextResponse.json({ posts: posts.map(mapPost) });
  } catch (err) {
    console.error("[saved] error", err);
    return NextResponse.json(
      { error: "Failed to fetch saved posts" },
      { status: 500 },
    );
  }
}
