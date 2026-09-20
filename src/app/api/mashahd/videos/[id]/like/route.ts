import { NextRequest, NextResponse } from "next/server";
import { getMashahdClient } from "@/lib/turso";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getMashahdClient();
    await db.execute({ sql: `UPDATE Video SET likes = likes + 1 WHERE id = ?`, args: [id] });
    const res = await db.execute({ sql: `SELECT likes FROM Video WHERE id = ?`, args: [id] });
    return NextResponse.json({ likes: Number(res.rows[0]?.likes || 0) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
