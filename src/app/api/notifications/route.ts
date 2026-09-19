import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapNotification } from "@/lib/social/mappers";
import { CURRENT_USER_ID } from "@/lib/social/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications — notifications for CURRENT_USER_ID, newest first,
 * with nested actor (SocialUser | null). Includes `unreadCount`.
 *
 * Note: the schema stores `actorId` as a plain String (no relation), so we
 * resolve actor users in a second query and stitch them in.
 */
export async function GET() {
  try {
    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: { userId: CURRENT_USER_ID },
        orderBy: { createdAt: "desc" },
      }),
      db.notification.count({
        where: { userId: CURRENT_USER_ID, read: false },
      }),
    ]);

    const actorIds = Array.from(
      new Set(
        notifications
          .map((n) => n.actorId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const actors = actorIds.length
      ? await db.user.findMany({ where: { id: { in: actorIds } } })
      : [];

    const actorById = new Map(actors.map((u) => [u.id, u]));

    const mapped = notifications.map((n) =>
      mapNotification({
        ...n,
        actor: n.actorId ? (actorById.get(n.actorId) ?? null) : null,
      }),
    );

    return NextResponse.json({ notifications: mapped, unreadCount });
  } catch (err) {
    console.error("[notifications] error", err);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}
