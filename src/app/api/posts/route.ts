import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapPost } from "@/lib/social/mappers";
import { CURRENT_USER_ID } from "@/lib/social/types";
import { emitPulse } from "@/lib/social/pulse";

export const dynamic = "force-dynamic";

/** GET /api/posts — all posts, newest first, with author + counts + likedByMe. */
export async function GET() {
  try {
    const posts = await db.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: true,
        likes: true,
        _count: { select: { comments: true } },
      },
    });
    return NextResponse.json({ posts: posts.map(mapPost) });
  } catch (err) {
    console.error("[posts] GET error", err);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 },
    );
  }
}

/** POST /api/posts — create a post as CURRENT_USER_ID. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.content !== "string" || !body.content.trim()) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 },
      );
    }

    const content = body.content.trim();
    const imageUrl =
      typeof body.imageUrl === "string" && body.imageUrl.trim()
        ? body.imageUrl.trim()
        : null;
    const feeling =
      typeof body.feeling === "string" && body.feeling.trim()
        ? body.feeling.trim()
        : null;
    const location =
      typeof body.location === "string" && body.location.trim()
        ? body.location.trim()
        : null;

    // Make sure the current user exists (defensive — the seed creates it).
    const me = await db.user.findUnique({ where: { id: CURRENT_USER_ID } });
    if (!me) {
      return NextResponse.json(
        { error: "Current user not found. Run /api/seed first." },
        { status: 400 },
      );
    }

    const post = await db.post.create({
      data: {
        authorId: CURRENT_USER_ID,
        content,
        imageUrl,
        feeling,
        location,
      },
      include: {
        author: true,
        likes: true,
        _count: { select: { comments: true } },
      },
    });

    // Emit pulse event for the live PulseRibbon.
    await emitPulse("feed", "post");

    return NextResponse.json(mapPost(post));
  } catch (err) {
    console.error("[posts] POST error", err);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 },
    );
  }
}
