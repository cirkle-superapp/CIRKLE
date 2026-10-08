import { NextRequest, NextResponse } from "next/server";
import { getMailEmails } from "@/lib/mail-db";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const folder = req.nextUrl.searchParams.get("folder") || "ALL";
    const emails = await getMailEmails(folder, 50);
    return NextResponse.json({ emails });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
