import { NextRequest, NextResponse } from "next/server";
import { toggleMailStar, markMailRead } from "@/lib/mail-db";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body?.id;
    const action = body?.action;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    if (action === "read") {
      const result = await markMailRead(id);
      return NextResponse.json(result);
    }
    const result = await toggleMailStar(id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
