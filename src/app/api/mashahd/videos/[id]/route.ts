import { NextRequest, NextResponse } from "next/server";
import { getMashahdClient } from "@/lib/turso";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getMashahdClient();

    const res = await db.execute({
      sql: `SELECT v.*, c.name as channelName, c.handle as channelHandle, c.avatarUrl as channelAvatarUrl,
                   c.bannerColors as channelAvatarColor, c.subscribers as channelSubscriberCount
            FROM Video v LEFT JOIN Channel c ON v.channelId = c.id WHERE v.id = ?`,
      args: [id],
    });

    if (res.rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });

    const r = res.rows[0];
    // Get recent comments.
    let comments: any[] = [];
    try {
      const commentRes = await db.execute({
        sql: `SELECT id, text, author, createdAt FROM Comment WHERE videoId = ? ORDER BY createdAt DESC LIMIT 10`,
        args: [id],
      });
      comments = commentRes.rows.map((c) => ({
        id: String(c.id),
        content: String(c.text || ""),
        authorName: String(c.author || "Anonymous"),
        authorColor: null,
        createdAt: String(c.createdAt || ""),
      }));
    } catch { /* Comment table may differ */ }

    return NextResponse.json({
      id: String(r.id),
      title: String(r.title || ""),
      description: String(r.description || ""),
      thumbnailUrl: String(r.thumbnailUrl || ""),
      videoUrl: String(r.videoUrl || ""),
      durationSec: Number(r.durationSec || 0),
      views: Number(r.views || 0),
      likes: Number(r.likes || 0),
      dislikes: Number(r.dislikes || 0),
      category: String(r.category || ""),
      tags: String(r.tags || "").split("|").filter(Boolean),
      createdAt: String(r.createdAt || ""),
      channel: r.channelId ? {
        id: String(r.channelId),
        name: String(r.channelName || ""),
        handle: String(r.channelHandle || ""),
        avatarUrl: r.channelAvatarUrl ? String(r.channelAvatarUrl) : null,
        avatarColor: r.channelAvatarColor ? String(r.channelAvatarColor) : null,
        subscriberCount: Number(r.channelSubscriberCount || 0),
        verified: false,
      } : null,
      comments,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
