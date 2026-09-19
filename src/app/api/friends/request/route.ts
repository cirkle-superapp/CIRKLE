import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CURRENT_USER_ID } from "@/lib/social/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/friends/request
 * Body: { userId }
 * Creates a pending Friendship (initiator=current, receiver=userId) and a
 * friend notification. If a friendship already exists in either direction,
 * returns { ok: true, existed: true } without mutating.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.userId !== "string" || !body.userId.trim()) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    const userId = body.userId.trim();

    if (userId === CURRENT_USER_ID) {
      return NextResponse.json(
        { error: "Cannot send a friend request to yourself" },
        { status: 400 },
      );
    }

    const target = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await db.friendship.findFirst({
      where: {
        OR: [
          { initiatorId: CURRENT_USER_ID, receiverId: userId },
          { initiatorId: userId, receiverId: CURRENT_USER_ID },
        ],
      },
    });
    if (existing) {
      return NextResponse.json({ ok: true, existed: true });
    }

    await db.friendship.create({
      data: {
        initiatorId: CURRENT_USER_ID,
        receiverId: userId,
        status: "pending",
      },
    });

    const me = await db.user.findUnique({
      where: { id: CURRENT_USER_ID },
      select: { name: true },
    });
    const name = me?.name ?? "Someone";
    await db.notification.create({
      data: {
        userId,
        type: "friend",
        content: `${name} sent you a friend request`,
        actorId: CURRENT_USER_ID,
        read: false,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[friends/request] error", err);
    return NextResponse.json(
      { error: "Failed to send friend request" },
      { status: 500 },
    );
  }
}
