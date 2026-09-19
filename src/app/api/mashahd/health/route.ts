import { NextResponse } from "next/server";
import { getMashahdClient } from "@/lib/turso";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getMashahdClient();
    const v = await db.execute("SELECT COUNT(*) as n FROM Video");
    const c = await db.execute("SELECT COUNT(*) as n FROM Channel");
    return NextResponse.json({
      ok: true,
      service: "mashahd",
      db: "turso",
      videoCount: Number(v.rows[0]?.n || 0),
      channelCount: Number(c.rows[0]?.n || 0),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
