import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/upload — accepts FormData with a 'file' image field.
// Returns a data URI (base64) so it works on Vercel's read-only filesystem
// (no local /uploads directory needed). Data URIs persist in the Neon DB
// when used as imageUrl on posts.
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
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "max 5MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    return NextResponse.json({ url: dataUri });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
