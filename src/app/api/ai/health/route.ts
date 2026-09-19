import { NextResponse } from "next/server";
import { aiProviderStatus } from "@/lib/ai/providers";
import { imageProviderStatus } from "@/lib/ai/image";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "cirkle-ai",
    providers: aiProviderStatus(),
    image: imageProviderStatus(),
  });
}
