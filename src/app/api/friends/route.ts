import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapMessage, mapUser, stableOnline } from "@/lib/social/mappers";
import { CURRENT_USER_ID, type SocialMessage } from "@/lib/social/types";

export const dynamic = "force-dynamic";

type FriendWithExtras = ReturnType<typeof mapUser> & {
  online: boolean;
  lastMessage: SocialMessage | null;
};

/**
 * GET /api/friends — all users connected to CURRENT_USER_ID via an accepted
 * Friendship (either direction), plus a stable `online` flag and the most
 * recent message exchanged with each friend.
 */
export async function GET() {
  try {
    // Find all accepted friendships involving the current user.
    const friendships = await db.friendship.findMany({
      where: {
        status: "accepted",
        OR: [
          { initiatorId: CURRENT_USER_ID },
          { receiverId: CURRENT_USER_ID },
        ],
      },
      include: {
        initiator: true,
        receiver: true,
      },
    });

    // Resolve the "other side" of each friendship.
    const friendIds = new Set<string>();
    for (const f of friendships) {
      const otherId =
        f.initiatorId === CURRENT_USER_ID ? f.receiverId : f.initiatorId;
      friendIds.add(otherId);
    }

    if (friendIds.size === 0) {
      return NextResponse.json({ friends: [] });
    }

    const friends = await db.user.findMany({
      where: { id: { in: Array.from(friendIds) } },
    });

    // Pull the most recent message between current user and each friend.
    const allMessages = await db.message.findMany({
      where: {
        OR: [
          { fromId: CURRENT_USER_ID, toId: { in: Array.from(friendIds) } },
          { fromId: { in: Array.from(friendIds) }, toId: CURRENT_USER_ID },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    // Map friendId -> most recent message.
    const lastByFriend = new Map<string, ReturnType<typeof mapMessage>>();
    for (const m of allMessages) {
      const otherId =
        m.fromId === CURRENT_USER_ID ? m.toId : m.fromId;
      if (!lastByFriend.has(otherId)) {
        lastByFriend.set(otherId, mapMessage(m));
      }
    }

    const result: FriendWithExtras[] = friends.map((u) => {
      const base = mapUser(u);
      return {
        ...base,
        online: stableOnline(u.id),
        lastMessage: lastByFriend.get(u.id) ?? null,
      };
    });

    // Sort: friends with a recent message first, then by name.
    result.sort((a, b) => {
      const at = a.lastMessage?.createdAt ?? "";
      const bt = b.lastMessage?.createdAt ?? "";
      if (at !== bt) return bt.localeCompare(at);
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ friends: result });
  } catch (err) {
    console.error("[friends] error", err);
    return NextResponse.json(
      { error: "Failed to fetch friends" },
      { status: 500 },
    );
  }
}
