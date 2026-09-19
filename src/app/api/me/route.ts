import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CURRENT_USER_ID } from "@/lib/social/types";
import { mapUser } from "@/lib/social/mappers";
import type { AvatarColor } from "@/lib/social/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await db.user.findUnique({ where: { id: CURRENT_USER_ID } });
    if (!user) return NextResponse.json({ user: null });
    return NextResponse.json({ user: mapUser(user) });
  } catch (e) {
    return NextResponse.json({ user: null, error: String(e) }, { status: 500 });
  }
}

const AVATAR_COLORS: AvatarColor[] = [
  "teal",
  "rose",
  "steel",
  "gold",
  "charcoal",
];

/**
 * PATCH /api/me — update the current user (u_current).
 * Body: { name?, bio?, coverUrl?, avatarColor? } — only provided fields are updated.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const data: {
      name?: string;
      bio?: string | null;
      coverUrl?: string | null;
      avatarColor?: AvatarColor;
    } = {};

    if (typeof body.name === "string" && body.name.trim()) {
      data.name = body.name.trim();
    }
    if (typeof body.bio === "string") {
      data.bio = body.bio.trim() || null;
    }
    if (typeof body.coverUrl === "string") {
      data.coverUrl = body.coverUrl.trim() || null;
    }
    if (
      typeof body.avatarColor === "string" &&
      AVATAR_COLORS.includes(body.avatarColor as AvatarColor)
    ) {
      data.avatarColor = body.avatarColor as AvatarColor;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No updatable fields provided" },
        { status: 400 },
      );
    }

    const updated = await db.user.update({
      where: { id: CURRENT_USER_ID },
      data,
    });

    return NextResponse.json({ user: mapUser(updated) });
  } catch (err) {
    console.error("[me] PATCH error", err);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
