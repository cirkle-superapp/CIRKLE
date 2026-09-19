import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapMessage } from "@/lib/social/mappers";
import { CURRENT_USER_ID } from "@/lib/social/types";
import { emitPulse } from "@/lib/social/pulse";

export const dynamic = "force-dynamic";

/**
 * GET /api/messages?userId=X — full conversation between CURRENT_USER_ID and
 * user X, oldest first. Marks received (toId = current) messages as read.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const otherId = url.searchParams.get("userId");
    if (!otherId) {
      return NextResponse.json(
        { error: "userId query param is required" },
        { status: 400 },
      );
    }

    // Verify the other user exists.
    const other = await db.user.findUnique({
      where: { id: otherId },
      select: { id: true },
    });
    if (!other) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const messages = await db.message.findMany({
      where: {
        OR: [
          { fromId: CURRENT_USER_ID, toId: otherId },
          { fromId: otherId, toId: CURRENT_USER_ID },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    // Mark received messages as read.
    await db.message.updateMany({
      where: { fromId: otherId, toId: CURRENT_USER_ID, read: false },
      data: { read: true },
    });

    return NextResponse.json({ messages: messages.map(mapMessage) });
  } catch (err) {
    console.error("[messages] GET error", err);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 },
    );
  }
}

/** POST /api/messages — send a message as CURRENT_USER_ID. Persistence only. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.toId !== "string" || !body.toId.trim()) {
      return NextResponse.json({ error: "toId is required" }, { status: 400 });
    }
    if (typeof body.content !== "string" || !body.content.trim()) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 },
      );
    }
    if (body.toId === CURRENT_USER_ID) {
      return NextResponse.json(
        { error: "Cannot send a message to yourself" },
        { status: 400 },
      );
    }

    const toId = body.toId.trim();
    const other = await db.user.findUnique({
      where: { id: toId },
      select: { id: true },
    });
    if (!other) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    const message = await db.message.create({
      data: {
        fromId: CURRENT_USER_ID,
        toId,
        content: body.content.trim(),
      },
    });

    // Drop a notification for the recipient.
    const me = await db.user.findUnique({
      where: { id: CURRENT_USER_ID },
      select: { name: true },
    });
    const name = me?.name ?? "Someone";
    await db.notification.create({
      data: {
        userId: toId,
        type: "message",
        content: `${name} sent you a message.`,
        actorId: CURRENT_USER_ID,
        read: false,
      },
    });

    return NextResponse.json(mapMessage(message));
  } catch (err) {
    console.error("[messages] POST error", err);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}
