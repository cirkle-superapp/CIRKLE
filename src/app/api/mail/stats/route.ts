import { NextResponse } from "next/server";
import { getMailStats } from "@/lib/mail-db";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getMailStats();
    return NextResponse.json(stats);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
