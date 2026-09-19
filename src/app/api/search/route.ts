import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapPost, mapUser } from "@/lib/social/mappers";
import { CURRENT_USER_ID } from "@/lib/social/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/search?q=<query>
 * Searches Users (by name OR username, contains, case-insensitive in SQLite)
 * and Posts (by content contains). Excludes the current user from results.
 *
 * Returns { users, posts, total }. If q is empty or shorter than 2 chars,
 * returns empty arrays.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();

    if (q.length < 2) {
      return NextResponse.json({ users: [], posts: [], total: 0 });
    }

    const [users, posts] = await Promise.all([
      db.user.findMany({
        where: {
          id: { not: CURRENT_USER_ID },
          OR: [{ name: { contains: q } }, { username: { contains: q } }],
        },
        take: 10,
      }),
      db.post.findMany({
        where: { content: { contains: q } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          author: true,
          likes: true,
          _count: { select: { comments: true } },
        },
      }),
    ]);

    const mappedUsers = users.map(mapUser);
    const mappedPosts = posts.map(mapPost);

    return NextResponse.json({
      users: mappedUsers,
      posts: mappedPosts,
      total: mappedUsers.length + mappedPosts.length,
    });
  } catch (err) {
    console.error("[search] error", err);
    return NextResponse.json(
      { error: "Failed to run search" },
      { status: 500 },
    );
  }
}
