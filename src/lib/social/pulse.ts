import { db } from "@/lib/db";

/**
 * Emit a pulse event — records activity for the PulseRibbon.
 * Call this from any action that represents platform activity:
 * creating a post, liking, commenting, sending a Wasl message, etc.
 *
 * Pillars: "feed" | "wasl" | "mashahd" | "lamahat" | "midan"
 * Kinds:   "post" | "like" | "comment" | "message" | "view" | "save" | "capsule" | "whisper"
 */
export async function emitPulse(
  pillar: string,
  kind: string,
  weight = 1
): Promise<void> {
  try {
    await db.pulseEvent.create({
      data: { pillar, kind, weight },
    });
  } catch {
    // Pulse events are non-critical — never fail a user action because of them.
  }
}
