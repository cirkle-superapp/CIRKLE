import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CURRENT_USER_ID } from "@/lib/social/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/friends/accept
 * Body: { userId }
 * Accepts a pending friendship where initiatorId=userId, receiverId=current.
 * Creates a friend notification for the initiator. Returns { ok: true }.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.userId !== "string" || !body.userId.trim()) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    const userId = body.userId.trim();

    const friendship = await db.friendship.findFirst({
      where: {
        initiatorId: userId,
        receiverId: CURRENT_USER_ID,
        status: "pending",
      },
    });

    if (!friendship) {
      return NextResponse.json(
        { error: "No pending friend request from this user" },
        { status: 404 },
      );
    }

    await db.friendship.update({
      where: { id: friendship.id },
      data: { status: "accepted" },
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
        content: `${name} accepted your friend request`,
        actorId: CURRENT_USER_ID,
        read: false,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[friends/accept] error", err);
    return NextResponse.json(
      { error: "Failed to accept friend request" },
      { status: 500 },
    );
  }
}
