import { inngest } from "./client";
import { db } from "@/lib/db";

// === Inngest background functions ===
// These run on our Vercel serverless (Inngest triggers them via HTTP to /api/inngest).
// They use Prisma directly to perform real database maintenance.

// 1. Time capsule auto-unseal — every minute, mark capsules as unsealed when their time arrives.
export const capsuleUnseal = inngest.createFunction(
  { id: "capsule-unseal", name: "Time Capsule Auto-Unseal", cron: "* * * * *" },
  async ({ step }) => {
    const result = await step.run("unseal-capsules", async () => {
      const now = new Date();
      // Find capsules whose unseal time has passed but aren't marked unsealed yet.
      const expired = await db.timeCapsule.findMany({
        where: { unsealed: false, unsealAt: { lte: now } },
        select: { id: true },
      });
      if (expired.length === 0) return { unsealed: 0 };

      // Mark them as unsealed so they appear in the feed.
      await db.timeCapsule.updateMany({
        where: { id: { in: expired.map((c) => c.id) } },
        data: { unsealed: true },
      });
      return { unsealed: expired.length };
    });
    return result;
  }
);

// 2. Whisper auto-burn — every minute, burn whispers that have exceeded their TTL or max views.
export const whisperBurn = inngest.createFunction(
  { id: "whisper-burn", name: "Whisper Auto-Burn", cron: "* * * * *" },
  async ({ step }) => {
    const result = await step.run("burn-expired-whispers", async () => {
      const now = new Date();
      // Find whispers that have been viewed (firstViewedAt set) and whose TTL has expired.
      const expired = await db.whisper.findMany({
        where: {
          burned: false,
          firstViewedAt: { not: null },
          expiresAt: { lte: now },
        },
        select: { id: true },
      });
      if (expired.length === 0) return { burned: 0 };

      await db.whisper.updateMany({
        where: { id: { in: expired.map((w) => w.id) } },
        data: { burned: true },
      });
      return { burned: expired.length };
    });
    return result;
  }
);

// 3. Pulse snapshot — every 5 minutes, log a summary of pulse activity.
export const pulseSnapshot = inngest.createFunction(
  { id: "pulse-snapshot", name: "Pulse Snapshot", cron: "*/5 * * * *" },
  async ({ step }) => {
    const result = await step.run("snapshot-pulse", async () => {
      const since = new Date(Date.now() - 5 * 60 * 1000);
      const count = await db.pulseEvent.count({
        where: { createdAt: { gte: since } },
      });
      return { eventsInLast5Min: count, snapshotAt: new Date().toISOString() };
    });
    return result;
  }
);

export const functions = [capsuleUnseal, whisperBurn, pulseSnapshot];
