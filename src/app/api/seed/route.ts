import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/social/seed-data";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await seedDatabase();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[seed] error", err);
    return NextResponse.json(
      { error: "Failed to seed database" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const result = await seedDatabase();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[seed] error", err);
    return NextResponse.json(
      { error: "Failed to seed database" },
      { status: 500 },
    );
  }
}
