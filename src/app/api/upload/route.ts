import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const dynamic = "force-dynamic";

// POST /api/upload — accepts FormData with a 'file' image field.
// Auto-resizes to max 1200px wide, converts to JPEG at 80% quality,
// returns a data URI (base64) that persists in the Neon DB.
// This keeps images small (~100-300KB instead of 5MB phone photos).
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file field required" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "only images allowed" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "max 10MB" }, { status: 400 });
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());

    // Auto-resize: max 1200px wide, maintain aspect ratio, convert to JPEG 80% quality.
    // This reduces a 5MB phone photo to ~100-300KB.
    const resizedBuffer = await sharp(inputBuffer)
      .resize(1200, 1200, {
        fit: "inside",    // maintain aspect ratio, don't crop
        withoutEnlargement: true,  // don't upscale small images
      })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    const base64 = resizedBuffer.toString("base64");
    const dataUri = `data:image/jpeg;base64,${base64}`;

    return NextResponse.json({
      url: dataUri,
      originalSize: file.size,
      resizedSize: resizedBuffer.length,
      width: 1200,
    });
  } catch (e) {
    // Fallback: if sharp fails (e.g., SVG input), return original as data URI
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      if (file) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString("base64");
        const dataUri = `data:${file.type};base64,${base64}`;
        return NextResponse.json({ url: dataUri, fallback: true });
      }
    } catch {}
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
