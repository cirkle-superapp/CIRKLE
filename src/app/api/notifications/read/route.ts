import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CURRENT_USER_ID } from "@/lib/social/types";

export const dynamic = "force-dynamic";

/** POST /api/notifications/read — mark all current-user notifications as read. */
export async function POST() {
  try {
    await db.notification.updateMany({
      where: { userId: CURRENT_USER_ID, read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notifications/read] error", err);
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 },
    );
  }
}
