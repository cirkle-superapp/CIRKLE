import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapUser } from "@/lib/social/mappers";
import { CURRENT_USER_ID } from "@/lib/social/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/friends/requests
 * Returns pending friend requests received by the current user.
 * Shape: { requests: { friendship, user }[] } where friendship is the raw
 * Prisma Friendship row (initiatorId/receiverId/status/createdAt) and user
 * is the initiator mapped to SocialUser.
 */
export async function GET() {
  try {
    const friendships = await db.friendship.findMany({
      where: {
        receiverId: CURRENT_USER_ID,
        status: "pending",
      },
      orderBy: { createdAt: "desc" },
      include: { initiator: true },
    });

    const requests = friendships.map((f) => ({
      friendship: {
        id: f.id,
        initiatorId: f.initiatorId,
        receiverId: f.receiverId,
        status: f.status,
        createdAt: f.createdAt.toISOString(),
      },
      user: mapUser(f.initiator),
    }));

    return NextResponse.json({ requests });
  } catch (err) {
    console.error("[friends/requests] error", err);
    return NextResponse.json(
      { error: "Failed to fetch friend requests" },
      { status: 500 },
    );
  }
}
