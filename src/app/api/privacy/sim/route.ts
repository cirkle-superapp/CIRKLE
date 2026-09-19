import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CURRENT_USER_ID } from "@/lib/social/types";

export const dynamic = "force-dynamic";

// Viewer-kind visibility profiles (0-100 + visible fields + recommendations).
// This is a deterministic rules engine — no AI needed, fully auditable.
const PROFILES: Record<string, { score: number; fields: string[]; recs: string[] }> = {
  stranger: {
    score: 18,
    fields: ["Display name", "Username", "Avatar", "Verified badge", "Public posts (echoes only)"],
    recs: [
      "Your private Wasl messages are fully encrypted — strangers never see them.",
      "Hide your bio in Settings → Privacy if you want zero surface area.",
      "Your saved posts are always private — only you can see them.",
    ],
  },
  friend: {
    score: 64,
    fields: ["Everything a stranger sees", "Bio", "Cover photo", "All public + friends-only posts", "Online status", "Your stories/echoes", "Mutual connections"],
    recs: [
      "Friends see your online status — disable in Privacy → 'Show when active'.",
      "Your Wasl chats with this friend remain E2EE — only you two can read them.",
      "Consider a Close Friends list for sensitive echoes.",
    ],
  },
  employer: {
    score: 41,
    fields: ["Public posts", "Verified professional identity", "Display name", "Profile photo", "Public echoes", "Connection graph (depth 1)"],
    recs: [
      "Employers see your public feed — curate it with the 'Professional' tag.",
      "Your Wasl DMs are invisible — even to legal requests (E2EE, no server key).",
      "Use Cirkle Verify to prove credentials without exposing personal data.",
    ],
  },
  advertiser: {
    score: 12,
    fields: ["Anonymized interest buckets", "Country-level region", "Preferred language"],
    recs: [
      "Cirkle is zero-ads by design — advertisers only see anonymized aggregates.",
      "No personal data is ever sold. Disable interest buckets in Privacy → AI Consents.",
      "Your messages, posts, and browsing are never used for ad targeting.",
    ],
  },
  state: {
    score: 8,
    fields: ["Verified identity (if court-ordered)", "Account creation date", "Country (per DRE)"],
    recs: [
      "State requests must go through the DRE (Data Residency Engine) — Cirkle never voluntaries data.",
      "End-to-end encrypted Wasl messages cannot be decrypted by Cirkle — only the conversation participants hold keys.",
      "Enable Citizen Shield to receive alerts if a data request targets your account.",
    ],
  },
};

// GET /api/privacy/sim — list your past simulation runs + summary
export async function GET() {
  try {
    const runs = await db.privacySimRun.findMany({
      where: { userId: CURRENT_USER_ID },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const summary = {
      totalRuns: runs.length,
      avgScore: runs.length ? Math.round(runs.reduce((a, r) => a + r.score, 0) / runs.length) : 0,
      lowest: runs.length ? Math.min(...runs.map((r) => r.score)) : 0,
      highest: runs.length ? Math.max(...runs.map((r) => r.score)) : 0,
    };
    return NextResponse.json({ runs, summary });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

// POST /api/privacy/sim — run a simulation for a viewer kind
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const viewerKind = typeof body?.viewerKind === "string" ? body.viewerKind : "stranger";
    const profile = PROFILES[viewerKind] || PROFILES.stranger;

    const run = await db.privacySimRun.create({
      data: {
        userId: CURRENT_USER_ID,
        viewerKind,
        score: profile.score,
        fields: JSON.stringify(profile.fields),
        recommendations: JSON.stringify(profile.recs),
      },
    });

    return NextResponse.json({
      ok: true,
      id: run.id,
      viewerKind,
      score: profile.score,
      fields: profile.fields,
      recommendations: profile.recs,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
