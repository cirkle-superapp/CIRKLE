import { inngest } from "./client";

// === Inngest background functions ===
// db is lazy-loaded inside step.run to avoid cold-start Prisma init issues on Vercel.

// 1. Time capsule auto-unseal — every minute.
export const capsuleUnseal = inngest.createFunction(
  { id: "capsule-unseal", name: "Time Capsule Auto-Unseal", cron: "* * * * *" },
  async ({ step }) => {
    const result = await step.run("unseal-capsules", async () => {
      const { db } = await import("@/lib/db");
      const now = new Date();
      const expired = await db.timeCapsule.findMany({
        where: { unsealed: false, unsealAt: { lte: now } },
        select: { id: true },
      });
      if (expired.length === 0) return { unsealed: 0 };
      await db.timeCapsule.updateMany({
        where: { id: { in: expired.map((c) => c.id) } },
        data: { unsealed: true },
      });
      return { unsealed: expired.length };
    });
    return result;
  }
);

// 2. Whisper auto-burn — every minute.
export const whisperBurn = inngest.createFunction(
  { id: "whisper-burn", name: "Whisper Auto-Burn", cron: "* * * * *" },
  async ({ step }) => {
    const result = await step.run("burn-expired-whispers", async () => {
      const { db } = await import("@/lib/db");
      const now = new Date();
      const expired = await db.whisper.findMany({
        where: { burned: false, firstViewedAt: { not: null }, expiresAt: { lte: now } },
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

// 3. Pulse snapshot — every 5 minutes.
export const pulseSnapshot = inngest.createFunction(
  { id: "pulse-snapshot", name: "Pulse Snapshot", cron: "*/5 * * * *" },
  async ({ step }) => {
    const result = await step.run("snapshot-pulse", async () => {
      const { db } = await import("@/lib/db");
      const since = new Date(Date.now() - 5 * 60 * 1000);
      const count = await db.pulseEvent.count({ where: { createdAt: { gte: since } } });
      return { eventsInLast5Min: count, snapshotAt: new Date().toISOString() };
    });
    return result;
  }
);

export const functions = [capsuleUnseal, whisperBurn, pulseSnapshot];
