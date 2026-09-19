import { NextRequest, NextResponse } from "next/server";
import { generateText, CIRKLE_SYSTEM_PROMPT } from "@/lib/ai/providers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const topic = typeof body?.topic === "string" ? body.topic.trim() : "";

    const prompt = topic
      ? `Suggest 3 short, authentic social post ideas about "${topic}" for the Cirkle feed. Each should be 1-2 sentences, warm and personal, the kind a real person would share. Return ONLY the 3 ideas as a JSON array of strings, nothing else.`
      : `Suggest 3 short, authentic social post ideas someone could share on the Cirkle feed right now. Vary the tone (one reflective, one celebratory, one curious). Each 1-2 sentences. Return ONLY the 3 ideas as a JSON array of strings, nothing else.`;

    const result = await generateText({
      messages: [
        { role: "system", content: CIRKLE_SYSTEM_PROMPT + " You always return valid JSON when asked for arrays." },
        { role: "user", content: prompt },
      ],
      maxTokens: 400,
      temperature: 0.9,
    });

    // Parse JSON array out of the response (tolerant of code fences / extra text).
    let suggestions: string[] = [];
    const cleaned = result.text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        suggestions = JSON.parse(match[0]);
      } catch {
        // fall through to line-split
      }
    }
    if (suggestions.length === 0) {
      // Fallback: split by newlines, filter non-empty, strip numbering.
      suggestions = cleaned
        .split(/\n+/)
        .map((s) => s.replace(/^\s*\d+[\.\)]\s*/, "").replace(/^["']|["']$/g, "").trim())
        .filter((s) => s.length > 0)
        .slice(0, 3);
    }
    if (suggestions.length === 0) suggestions = [result.text.trim()];

    return NextResponse.json({
      suggestions: suggestions.slice(0, 3),
      provider: result.provider,
      ms: result.ms,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
