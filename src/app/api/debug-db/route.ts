import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const url = process.env.DATABASE_URL || "(not set)";
  // Mask the password
  const masked = url.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
  return NextResponse.json({ 
    databaseUrl: masked,
    provider: url.startsWith("postgresql") ? "postgresql" : url.startsWith("file") ? "sqlite" : "unknown",
    hasTurso: !!process.env.TURSO_DATABASE_URL,
  });
}
