import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapPost } from "@/lib/social/mappers";

export const dynamic = "force-dynamic";

/**
 * GET /api/trending?limit=10
 * Returns posts from the last 7 days ordered by a simple trending score
 * = likesCount * 2 + commentsCount (descending). Default limit = 10.
 * Shape: { posts: SocialPost[] } with full includes.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const rawLimit = Number(url.searchParams.get("limit"));
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 10;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const posts = await db.post.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      include: {
        author: true,
        likes: true,
        _count: { select: { comments: true } },
      },
    });

    const scored = posts
      .map((p) => {
        const likesCount = p.likes.length;
        const commentsCount = p._count.comments;
        const score = likesCount * 2 + commentsCount;
        return { post: p, score };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // Tie-break by newest createdAt.
        return b.post.createdAt.getTime() - a.post.createdAt.getTime();
      })
      .slice(0, limit)
      .map((s) => s.post);

    return NextResponse.json({ posts: scored.map(mapPost) });
  } catch (err) {
    console.error("[trending] error", err);
    return NextResponse.json(
      { error: "Failed to fetch trending posts" },
      { status: 500 },
    );
  }
}
