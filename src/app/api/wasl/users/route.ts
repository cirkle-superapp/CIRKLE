import { NextResponse } from "next/server";
import { getWaslClient, WASL_CURRENT_USER_ID } from "@/lib/turso";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getWaslClient();
    const res = await db.execute({
      sql: `SELECT id, username, name, avatarColor, verified, online, about FROM User ORDER BY name`,
      args: [],
    });
    const users = res.rows.map((r) => ({
      id: String(r.id),
      username: String(r.username),
      name: String(r.name),
      avatarColor: String(r.avatarColor || "#128C7E"),
      verified: Boolean(r.verified),
      online: Boolean(r.online),
      about: String(r.about || ""),
    }));
    return NextResponse.json({ users });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
