import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@libsql/client";

export const dynamic = "force-dynamic";

const cirkleDb = createClient({
  url: process.env.CIRKLE_TURSO_URL || "libsql://cirkle-superapp-fortleem.aws-us-east-1.turso.io",
  authToken: process.env.CIRKLE_TURSO_TOKEN || "",
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "images only" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "max 10MB" }, { status: 400 });
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const resized = await sharp(inputBuffer).resize(1200, 1200, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    const base64 = resized.toString("base64");
    const id = crypto.randomUUID();
    await cirkleDb.execute({ sql: "INSERT INTO images (id, data, content_type) VALUES (?, ?, ?)", args: [id, base64, "image/jpeg"] });
    return NextResponse.json({ url: `/api/image/${id}`, id });
  } catch (e) {
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      if (file) {
        const buf = Buffer.from(await file.arrayBuffer());
        const resized = await sharp(buf).resize(1200, 1200, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
        return NextResponse.json({ url: `data:image/jpeg;base64,${resized.toString("base64")}`, fallback: true });
      }
    } catch {}
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
