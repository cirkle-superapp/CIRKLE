import { NextRequest, NextResponse } from "next/server";
import { getWaslClient, resolveWaslUser } from "@/lib/turso";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const conversationId = body?.conversationId;
    const userId = resolveWaslUser(body?.userId || "u_current");
    if (!conversationId) return NextResponse.json({ error: "conversationId required" }, { status: 400 });

    const db = getWaslClient();
    await db.execute({
      sql: `UPDATE Participant SET lastReadAt = ? WHERE conversationId = ? AND userId = ?`,
      args: [new Date().toISOString(), conversationId, userId],
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
