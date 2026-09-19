import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/ai/image";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const result = await generateImage(prompt);

    return NextResponse.json({
      imageUrl: result.imageUrl,
      model: result.model,
      ms: result.ms,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
