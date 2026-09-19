import { NextRequest, NextResponse } from "next/server";
import { CURRENT_USER_ID } from "@/lib/social/types";
import { generateText, CIRKLE_SYSTEM_PROMPT } from "@/lib/ai/providers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const conversationId = body?.conversationId;

    if (!conversationId || typeof conversationId !== "string") {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    // Fetch recent messages from the main app's Wasl API (queries Turso directly).
    const waslRes = await fetch(
      `http://localhost:3000/api/wasl/messages?conversationId=${conversationId}`
    );
    if (!waslRes.ok) {
      return NextResponse.json({
        replies: ["Hey! 👋", "How's your day going?", "Good to see you here!"],
      });
    }
    const all = (await waslRes.json()) as {
      id: string;
      conversationId: string;
      senderId: string;
      content: string;
      createdAt: string;
    }[];
    // Last 8, oldest-first.
    const recent = all.slice(-8);

    if (recent.length === 0) {
      return NextResponse.json({ replies: ["Hey! 👋", "How's your day going?", "Good to see you here!"] });
    }

    // Build a compact transcript labeled "me" vs "them".
    const transcript = recent
      .map((m) => (m.senderId === CURRENT_USER_ID ? `Me: ${m.content}` : `Them: ${m.content}`))
      .join("\n");

    const prompt = `Here is the recent Wasl conversation:\n${transcript}\n\nSuggest 3 short, natural quick replies "Me" could send next. Each reply should be 1-8 words, casual, and fit the conversation tone. Return ONLY a JSON array of 3 strings, nothing else.`;

    const result = await generateText({
      messages: [
        { role: "system", content: CIRKLE_SYSTEM_PROMPT + " You suggest natural, brief chat replies. Always return valid JSON arrays." },
        { role: "user", content: prompt },
      ],
      maxTokens: 200,
      temperature: 0.8,
    });

    let replies: string[] = [];
    const cleaned = result.text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        replies = JSON.parse(match[0]);
      } catch {
        /* fall through */
      }
    }
    if (replies.length === 0) {
      replies = cleaned
        .split(/\n+/)
        .map((s) => s.replace(/^\s*\d+[\.\)]\s*/, "").replace(/^["']|["']$/g, "").trim())
        .filter(Boolean)
        .slice(0, 3);
    }
    if (replies.length === 0) replies = ["Sounds good!", "Tell me more", "😄"];

    return NextResponse.json({
      replies: replies.slice(0, 3),
      provider: result.provider,
      ms: result.ms,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
