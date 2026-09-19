import { createClient, type Client } from "@libsql/client";

/**
 * Turso DB clients for the Cirkle pillar databases.
 * Used by the main Next.js app to query Wasl + Mashahd directly
 * (so everything works on a single Vercel deployment — no mini-services needed in production).
 */

// Wasl (chat) — libsql://wasl-fortleem...
let _waslClient: Client | null = null;
export function getWaslClient(): Client {
  if (!_waslClient) {
    _waslClient = createClient({
      url: process.env.TURSO_DATABASE_URL || "libsql://wasl-fortleem.aws-us-east-1.turso.io",
      authToken: process.env.TURSO_AUTH_TOKEN || "",
    });
  }
  return _waslClient;
}

// Mashahd (video) — libsql://mashahd-fortleem...
let _mashahdClient: Client | null = null;
export function getMashahdClient(): Client {
  if (!_mashahdClient) {
    _mashahdClient = createClient({
      url: process.env.MASHAHD_TURSO_URL || "libsql://mashahd-fortleem.aws-us-east-1.turso.io",
      authToken: process.env.MASHAHD_TURSO_TOKEN || "",
    });
  }
  return _mashahdClient;
}

// The "current user" in the Wasl DB (the real @demo user who owns conversations).
export const WASL_CURRENT_USER_ID = "cmtxkjucf0001sqvxlgnpf3y1";

// Map the frontend's symbolic "u_current" → the real Wasl user.
export function resolveWaslUser(userId: string): string {
  return userId === "u_current" ? WASL_CURRENT_USER_ID : userId;
}

// Map real DB hex avatarColor → Cirkle color name.
export function mapHexColor(hex: string | null): "teal" | "rose" | "steel" | "gold" | "charcoal" {
  if (!hex) return "teal";
  const h = hex.toUpperCase();
  if (/#(128C7E|075E54|34B7F1|10B981)/.test(h)) return "teal";
  if (/#(FF6B6B|F97316|F59E0B|EC4899)/.test(h)) return "rose";
  if (/#(84CC16|8B5CF6)/.test(h)) return "steel";
  if (/#(ECE5DD|FDFCF9)/.test(h)) return "gold";
  return "charcoal";
}
