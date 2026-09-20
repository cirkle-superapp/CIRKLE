import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

export const dynamic = "force-dynamic";

const cirkleDb = createClient({
  url: process.env.CIRKLE_TURSO_URL || "libsql://cirkle-superapp-fortleem.aws-us-east-1.turso.io",
  authToken: process.env.CIRKLE_TURSO_TOKEN || process.env.DATABASE_AUTH_TOKEN || "",
});

// GET /api/image/[id] — serves an image stored in the Cirkle Turso DB.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = await cirkleDb.execute({
      sql: "SELECT data, content_type FROM images WHERE id = ?",
      args: [id],
    });
    if (res.rows.length === 0) {
      return new NextResponse("Not found", { status: 404 });
    }
    const base64 = String(res.rows[0].data);
    const contentType = String(res.rows[0].content_type || "image/jpeg");
    const buffer = Buffer.from(base64, "base64");
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    return new NextResponse("Error", { status: 500 });
  }
}
