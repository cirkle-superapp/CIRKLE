import { NextRequest, NextResponse } from "next/server";
import { generateText, CIRKLE_SYSTEM_PROMPT, type ChatMessage } from "@/lib/ai/providers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];

    if (messages.length === 0) {
      return NextResponse.json({ error: "messages are required" }, { status: 400 });
    }

    // Prepend the Cirkle persona if no system message was provided.
    const hasSystem = messages.some((m) => m.role === "system");
    const fullMessages: ChatMessage[] = hasSystem ? messages : [{ role: "system", content: CIRKLE_SYSTEM_PROMPT }, ...messages];

    const result = await generateText({
      messages: fullMessages,
      maxTokens: 300,
      temperature: 0.85,
    });

    return NextResponse.json({
      reply: result.text,
      provider: result.provider,
      model: result.model,
      ms: result.ms,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
