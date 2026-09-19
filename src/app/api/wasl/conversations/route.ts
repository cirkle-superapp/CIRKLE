import { NextRequest, NextResponse } from "next/server";
import { getWaslClient, resolveWaslUser, WASL_CURRENT_USER_ID, mapHexColor } from "@/lib/turso";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = resolveWaslUser(req.nextUrl.searchParams.get("userId") || "u_current");
    const db = getWaslClient();

    // Get all conversations the user participates in.
    const parts = await db.execute({
      sql: `SELECT p.conversationId, p.lastReadAt, c.id as cid, c.name, c.isGroup, c.avatarColor, c.createdBy
            FROM Participant p
            JOIN Conversation c ON p.conversationId = c.id
            WHERE p.userId = ?
            ORDER BY c.updatedAt DESC`,
      args: [userId],
    });

    const conversations = [];
    for (const p of parts.rows) {
      const convId = String(p.conversationId);
      const isGroup = Boolean(p.isGroup);
      let otherParticipant = null;

      if (!isGroup) {
        // Find the other participant in the DM.
        const otherRes = await db.execute({
          sql: `SELECT u.id, u.username, u.name, u.avatarColor, u.verified, u.online, u.about
                FROM Participant p2 JOIN User u ON p2.userId = u.id
                WHERE p2.conversationId = ? AND p2.userId != ? LIMIT 1`,
          args: [convId, userId],
        });
        if (otherRes.rows.length > 0) {
          const o = otherRes.rows[0];
          otherParticipant = {
            id: String(o.id),
            username: String(o.username),
            name: String(o.name),
            avatarColor: mapHexColor(typeof o.avatarColor === "string" ? o.avatarColor : null),
            verified: Boolean(o.verified),
            online: Boolean(o.online),
            about: String(o.about || ""),
          };
        }
      }

      // Last message.
      const lastRes = await db.execute({
        sql: `SELECT id, conversationId, senderId, content, type, status, createdAt
              FROM Message WHERE conversationId = ? ORDER BY createdAt DESC LIMIT 1`,
        args: [convId],
      });
      const lastMessage = lastRes.rows.length > 0 ? {
        id: String(lastRes.rows[0].id),
        conversationId: String(lastRes.rows[0].conversationId),
        senderId: String(lastRes.rows[0].senderId),
        content: String(lastRes.rows[0].content),
        type: String(lastRes.rows[0].type || "text"),
        status: String(lastRes.rows[0].status || "sent"),
        createdAt: String(lastRes.rows[0].createdAt),
      } : null;

      // Unread count.
      const unreadRes = await db.execute({
        sql: `SELECT COUNT(*) as n FROM Message
              WHERE conversationId = ? AND senderId != ? AND createdAt > ?`,
        args: [convId, userId, String(p.lastReadAt || "1970-01-01")],
      });
      const unreadCount = Number(unreadRes.rows[0]?.n || 0);

      conversations.push({
        id: convId,
        name: p.name ? String(p.name) : null,
        isGroup,
        avatarColor: p.avatarColor ? String(p.avatarColor) : null,
        otherParticipant,
        lastMessage,
        unreadCount,
      });
    }

    return NextResponse.json(conversations);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = resolveWaslUser(body?.userId || "u_current");
    const otherUserId = resolveWaslUser(body?.otherUserId || "");
    const db = getWaslClient();

    if (!otherUserId) return NextResponse.json({ error: "otherUserId required" }, { status: 400 });

    // Check if a DM already exists between these two users.
    const existing = await db.execute({
      sql: `SELECT c.id, c.isGroup FROM Conversation c
            WHERE c.isGroup = 0
            AND (SELECT COUNT(*) FROM Participant p WHERE p.conversationId = c.id AND p.userId IN (?, ?)) = 2
            AND (SELECT COUNT(*) FROM Participant p WHERE p.conversationId = c.id) = 2
            LIMIT 1`,
      args: [userId, otherUserId],
    });

    if (existing.rows.length > 0) {
      const convId = String(existing.rows[0].id);
      // Fetch the conversation details (reuse GET logic).
      return NextResponse.json({ id: convId, name: null, isGroup: false, avatarColor: null, otherParticipant: null, lastMessage: null, unreadCount: 0 });
    }

    // Create a new DM conversation.
    const crypto = await import("crypto");
    const convId = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.execute({
      sql: `INSERT INTO Conversation (id, name, isGroup, avatar, avatarColor, createdBy, createdAt, updatedAt) VALUES (?, NULL, 0, NULL, NULL, ?, ?, ?)`,
      args: [convId, userId, now, now],
    });
    await db.execute({
      sql: `INSERT INTO Participant (id, conversationId, userId, joinedAt, lastReadAt, muted) VALUES (?, ?, ?, ?, ?, 0)`,
      args: [crypto.randomUUID(), convId, userId, now, now],
    });
    await db.execute({
      sql: `INSERT INTO Participant (id, conversationId, userId, joinedAt, lastReadAt, muted) VALUES (?, ?, ?, ?, ?, 0)`,
      args: [crypto.randomUUID(), convId, otherUserId, now, now, now],
    });

    return NextResponse.json({ id: convId, name: null, isGroup: false, avatarColor: null, otherParticipant: null, lastMessage: null, unreadCount: 0 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
