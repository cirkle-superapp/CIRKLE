import { NextRequest, NextResponse } from "next/server";
import { getMashahdClient } from "@/lib/turso";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get("category");
    const limit = Number(req.nextUrl.searchParams.get("limit")) || 24;
    const db = getMashahdClient();

    // Discover Video columns (adapt to actual schema).
    const cols = await db.execute("PRAGMA table_info(Video)");
    const colNames = cols.rows.map((r) => String(r.name));

    let sql = `SELECT v.id, v.title, v.description, v.thumbnailUrl, v.videoUrl, v.durationSec,
                      v.views, v.likes, v.dislikes, v.category, v.tags, v.createdAt,
                      v.channelId,
                      c.name as channelName, c.handle as channelHandle, c.avatarUrl as channelAvatarUrl,
                      c.bannerColors as channelAvatarColor, c.subscribers as channelSubscriberCount
               FROM Video v
               LEFT JOIN Channel c ON v.channelId = c.id`;
    const args: string[] = [];
    if (category && category !== "All") {
      sql += ` WHERE v.category = ?`;
      args.push(category);
    }
    sql += ` ORDER BY v.createdAt DESC LIMIT ?`;
    args.push(String(limit));

    const res = await db.execute({ sql, args });

    const videos = res.rows.map((r) => ({
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
    }));

    return NextResponse.json({ videos });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
