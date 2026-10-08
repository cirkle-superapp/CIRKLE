import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/mail-db";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
    const emailBody = typeof body?.body === "string" ? body.body.trim() : "";
    const toEmails = typeof body?.toEmails === "string" ? body.toEmails.trim() : "you@cirkle.mail";
    if (!subject || !emailBody) return NextResponse.json({ error: "subject and body required" }, { status: 400 });
    const result = await sendMail(subject, emailBody, toEmails);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
