import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapPost, mapUser } from "@/lib/social/mappers";
import { CURRENT_USER_ID } from "@/lib/social/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/profile/[id] — full profile for any user.
 * Returns the user, postsCount, friendsCount, the user's posts (newest first,
 * with author / counts / likedByMe), isFriend (vs. current user) and
 * isCurrentUser flag.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [posts, postsCount, friendsCount, friendship] = await Promise.all([
      db.post.findMany({
        where: { authorId: id },
        orderBy: { createdAt: "desc" },
        include: {
          author: true,
          likes: true,
          _count: { select: { comments: true } },
        },
      }),
      db.post.count({ where: { authorId: id } }),
      db.friendship.count({
        where: {
          status: "accepted",
          OR: [{ initiatorId: id }, { receiverId: id }],
        },
      }),
      id === CURRENT_USER_ID
        ? Promise.resolve(null)
        : db.friendship.findFirst({
            where: {
              OR: [
                { initiatorId: CURRENT_USER_ID, receiverId: id },
                { initiatorId: id, receiverId: CURRENT_USER_ID },
              ],
            },
          }),
    ]);

    return NextResponse.json({
      user: mapUser(user),
      postsCount,
      friendsCount,
      posts: posts.map(mapPost),
      isFriend: Boolean(friendship && friendship.status === "accepted"),
      isCurrentUser: id === CURRENT_USER_ID,
    });
  } catch (err) {
    console.error("[profile] GET error", err);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 },
    );
  }
}
