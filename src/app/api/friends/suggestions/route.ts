import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapUser } from "@/lib/social/mappers";
import { CURRENT_USER_ID } from "@/lib/social/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/friends/suggestions
 * Returns up to 6 users who are NOT already friends with the current user
 * (no accepted Friendship row to/from them) and not the current user.
 * Shape: SocialUser[].
 */
export async function GET() {
  try {
    // Pull all friendships involving current user (any status) so we can
    // exclude both pending requests and accepted friends from suggestions.
    const friendships = await db.friendship.findMany({
      where: {
        OR: [
          { initiatorId: CURRENT_USER_ID },
          { receiverId: CURRENT_USER_ID },
        ],
      },
      select: { initiatorId: true, receiverId: true },
    });

    const excluded = new Set<string>([CURRENT_USER_ID]);
    for (const f of friendships) {
      excluded.add(f.initiatorId);
      excluded.add(f.receiverId);
    }

    const users = await db.user.findMany({
      where: { id: { notIn: Array.from(excluded) } },
      take: 6,
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(users.map(mapUser));
  } catch (err) {
    console.error("[friends/suggestions] error", err);
    return NextResponse.json(
      { error: "Failed to fetch friend suggestions" },
      { status: 500 },
    );
  }
}
