import { NextRequest, NextResponse } from "next/server";
import { getWaslClient, resolveWaslUser } from "@/lib/turso";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const conversationId = req.nextUrl.searchParams.get("conversationId");
    if (!conversationId) return NextResponse.json({ error: "conversationId required" }, { status: 400 });

    const db = getWaslClient();
    const res = await db.execute({
      sql: `SELECT id, conversationId, senderId, content, type, status, createdAt
            FROM Message WHERE conversationId = ? ORDER BY createdAt ASC`,
      args: [conversationId],
    });

    const messages = res.rows.map((r) => ({
      id: String(r.id),
      conversationId: String(r.conversationId),
      senderId: String(r.senderId),
      content: String(r.content),
      type: String(r.type || "text"),
      status: String(r.status || "sent"),
      createdAt: String(r.createdAt),
    }));

    // Mark received messages as read (update participant lastReadAt).
    const userId = resolveWaslUser("u_current");
    await db.execute({
      sql: `UPDATE Participant SET lastReadAt = ? WHERE conversationId = ? AND userId = ?`,
      args: [new Date().toISOString(), conversationId, userId],
    }).catch(() => {});

    return NextResponse.json(messages);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const conversationId = body?.conversationId;
    const senderId = resolveWaslUser(body?.senderId || "u_current");
    const content = typeof body?.content === "string" ? body.content.trim() : "";

    if (!conversationId || !content) return NextResponse.json({ error: "conversationId and content required" }, { status: 400 });

    const db = getWaslClient();
    const crypto = await import("crypto");
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO Message (id, conversationId, senderId, content, type, status, replyToId, commitId, senderLabel, senderLabelColor, senderAvatarPath, fromPhone, createdAt, protected, edited, pinned)
            VALUES (?, ?, ?, ?, 'text', 'sent', NULL, NULL, NULL, NULL, NULL, NULL, ?, 0, 0, 0)`,
      args: [id, conversationId, senderId, content, now],
    });

    // Update conversation.updatedAt
    await db.execute({ sql: `UPDATE Conversation SET updatedAt = ? WHERE id = ?`, args: [now, conversationId] }).catch(() => {});
    // Update sender's lastReadAt
    await db.execute({ sql: `UPDATE Participant SET lastReadAt = ? WHERE conversationId = ? AND userId = ?`, args: [now, conversationId, senderId] }).catch(() => {});

    return NextResponse.json({
      id,
      conversationId,
      senderId,
      content,
      type: "text",
      status: "sent",
      createdAt: now,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
