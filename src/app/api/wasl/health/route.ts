import { NextResponse } from "next/server";
import { getWaslClient } from "@/lib/turso";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getWaslClient();
    const u = await db.execute("SELECT COUNT(*) as n FROM User");
    const c = await db.execute("SELECT COUNT(*) as n FROM Conversation");
    const m = await db.execute("SELECT COUNT(*) as n FROM Message");
    return NextResponse.json({
      ok: true,
      service: "wasl",
      db: "turso",
      userCount: Number(u.rows[0]?.n || 0),
      conversationCount: Number(c.rows[0]?.n || 0),
      messageCount: Number(m.rows[0]?.n || 0),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
