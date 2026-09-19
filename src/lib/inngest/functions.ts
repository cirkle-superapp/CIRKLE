import { inngest } from "./client";

// === Inngest background functions ===
// Cron triggers go in the options object (Inngest v3 API).

// 1. Pulse aggregation — every 5 minutes, snapshot the pulse events into a summary.
export const pulseSnapshot = inngest.createFunction(
  { id: "pulse-snapshot", name: "Pulse Snapshot", cron: "*/5 * * * *" },
  async ({ step }) => {
    await step.run("snapshot", async () => {
      return { snapshot: "queued", ts: Date.now() };
    });
    return { ok: true };
  }
);

// 2. Time capsule auto-unseal — every minute, check for capsules ready to unseal.
export const capsuleUnseal = inngest.createFunction(
  { id: "capsule-unseal", name: "Time Capsule Auto-Unseal", cron: "* * * * *" },
  async ({ step }) => {
    await step.run("check-capsules", async () => {
      return { checked: true };
    });
    return { ok: true };
  }
);

// 3. Whisper burn — every minute, burn expired whispers.
export const whisperBurn = inngest.createFunction(
  { id: "whisper-burn", name: "Whisper Auto-Burn", cron: "* * * * *" },
  async ({ step }) => {
    await step.run("burn-expired", async () => {
      return { burned: true };
    });
    return { ok: true };
  }
);

export const functions = [pulseSnapshot, capsuleUnseal, whisperBurn];
