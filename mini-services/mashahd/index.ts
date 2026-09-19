/**
 * Mashahd — Cirkle's watch/video pillar (دواير → Mashahd = "viewing").
 * Standalone Bun + Hono mini-service backed by the real Mashahd Turso cloud DB.
 *
 * Port: 3005. Routes prefixed /api/mashahd.
 *
 * Adapted to the ACTUAL Turso schema (verified via PRAGMA at startup):
 *   Channel: id, name, handle, avatarUrl, bannerColors, description, subscribers, createdAt
 *     (spec wanted avatarColor/subscriberCount/verified — we map bannerColors→avatarColor,
 *      subscribers→subscriberCount, verified defaults to false because no such column exists)
 *   Video: id, title, description, thumbnailUrl, videoUrl, durationSec, views, likes,
 *          dislikes, category, tags, channelId, createdAt
 *   Comment: id, videoId, author, avatarUrl, text, likes, createdAt, timestamp, parentId
 *     (spec wanted content/authorName/authorColor — we map text→content,
 *      author→authorName, authorColor=null because no such column exists)
 */
import { Hono } from "hono";
import { createClient } from "@libsql/client";

const TURSO_URL = process.env.TURSO_DATABASE_URL || "libsql://mashahd-fortleem.aws-us-east-1.turso.io";
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || "";

const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

const PORT = 3005;
const app = new Hono();

// ---------------------------------------------------------------------------
// Schema discovery (logged at startup; used to keep us honest about the DB).
// ---------------------------------------------------------------------------
type ColInfo = { name: string; type: string };
let videoCols: ColInfo[] = [];
let channelCols: ColInfo[] = [];
let commentCols: ColInfo[] = [];

async function discoverSchema() {
  const [v, c, cm] = await Promise.all([
    db.execute("PRAGMA table_info(Video)"),
    db.execute("PRAGMA table_info(Channel)"),
    db.execute("PRAGMA table_info(Comment)"),
  ]);
  const toCols = (r: { rows: any[] }): ColInfo[] =>
    r.rows.map((row) => ({ name: String(row.name), type: String(row.type) }));
  videoCols = toCols(v);
  channelCols = toCols(c);
  commentCols = toCols(cm);
  console.log(
    `[mashahd] Video columns:   ${videoCols.map((x) => x.name).join(", ")}`
  );
  console.log(
    `[mashahd] Channel columns: ${channelCols.map((x) => x.name).join(", ")}`
  );
  console.log(
    `[mashahd] Comment columns: ${commentCols.map((x) => x.name).join(", ")}`
  );
}

function hasColumn(cols: ColInfo[], name: string): boolean {
  return cols.some((c) => c.name === name);
}

// ---------------------------------------------------------------------------
// Mappers — turn a DB row into the API response shape.
// Spec-aligned but flexible: include the spec keys + the raw extras when they
// exist so the frontend gets the richest possible payload.
// ---------------------------------------------------------------------------
function mapChannel(row: any) {
  // The DB has bannerColors (string of comma-separated colors) instead of
  // avatarColor, and `subscribers` instead of `subscriberCount`. There is no
  // `verified` column — we default it to false.
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    avatarUrl: row.avatarUrl,
    avatarColor: row.bannerColors ?? null, // map to spec name
    bannerColors: row.bannerColors ?? null, // also expose raw
    subscriberCount: Number(row.subscribers ?? 0), // map to spec name
    subscribers: Number(row.subscribers ?? 0), // also expose raw
    verified: false, // no such column in this DB
    description: row.description ?? "",
    createdAt: row.createdAt,
  };
}

function mapVideo(row: any, channel: any) {
  const tagsStr = String(row.tags ?? "");
  const tags = tagsStr
    .split("|")
    .map((t) => t.trim())
    .filter(Boolean);
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    thumbnailUrl: row.thumbnailUrl,
    videoUrl: row.videoUrl,
    durationSec: Number(row.durationSec ?? 0),
    views: Number(row.views ?? 0),
    likes: Number(row.likes ?? 0),
    dislikes: Number(row.dislikes ?? 0),
    category: row.category,
    tags, // array — split from the pipe-separated string
    createdAt: row.createdAt,
    channel: channel ? mapChannel(channel) : null,
  };
}

function mapComment(row: any) {
  // DB has `text` (not content), `author` (not authorName), and no
  // `authorColor` column — we expose null for authorColor.
  return {
    id: row.id,
    content: row.text, // map to spec name
    text: row.text, // also expose raw
    authorName: row.author, // map to spec name
    author: row.author, // also expose raw
    authorColor: null, // no such column
    avatarUrl: row.avatarUrl ?? null,
    likes: Number(row.likes ?? 0),
    timestamp: row.timestamp ?? null,
    parentId: row.parentId ?? null,
    createdAt: row.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.get("/api/mashahd/health", async (c) => {
  let videoCount: number | null = null;
  let channelCount: number | null = null;
  let dbOk = false;
  try {
    const vc = await db.execute("SELECT COUNT(*) AS c FROM Video");
    videoCount = Number(vc.rows[0]?.c ?? 0);
    const cc = await db.execute("SELECT COUNT(*) AS c FROM Channel");
    channelCount = Number(cc.rows[0]?.c ?? 0);
    dbOk = true;
  } catch (e) {
    console.error("[mashahd] health db error:", e);
  }
  return c.json({
    ok: true,
    service: "mashahd",
    db: "turso",
    port: PORT,
    videoCount,
    channelCount,
    dbOk,
    videoColumns: videoCols.map((x) => x.name),
    channelColumns: channelCols.map((x) => x.name),
  });
});

// GET /api/mashahd/videos?category=X&limit=20
app.get("/api/mashahd/videos", async (c) => {
  const category = c.req.query("category");
  const limitRaw = Number(c.req.query("limit") ?? "20");
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 20;

  const params: any[] = [];
  let where = "";
  if (category && category.trim()) {
    where = "WHERE v.category = ?";
    params.push(category.trim());
  }
  params.push(limit);

  const sql = `
    SELECT v.*, c.id AS c_id, c.name AS c_name, c.handle AS c_handle,
           c.avatarUrl AS c_avatarUrl, c.bannerColors AS c_bannerColors,
           c.description AS c_description, c.subscribers AS c_subscribers,
           c.createdAt AS c_createdAt
    FROM Video v
    LEFT JOIN Channel c ON c.id = v.channelId
    ${where}
    ORDER BY v.createdAt DESC
    LIMIT ?
  `;
  const res = await db.execute({ sql, args: params });

  const videos = res.rows.map((r: any) =>
    mapVideo(
      r,
      r.c_id
        ? {
            id: r.c_id,
            name: r.c_name,
            handle: r.c_handle,
            avatarUrl: r.c_avatarUrl,
            bannerColors: r.c_bannerColors,
            description: r.c_description,
            subscribers: r.c_subscribers,
            createdAt: r.c_createdAt,
          }
        : null
    )
  );

  return c.json({ videos, count: videos.length, category: category ?? null });
});

// GET /api/mashahd/videos/:id  (single video + channel + recent 10 comments)
app.get("/api/mashahd/videos/:id", async (c) => {
  const id = c.req.param("id");

  const vRes = await db.execute({
    sql: `
      SELECT v.*, c.id AS c_id, c.name AS c_name, c.handle AS c_handle,
             c.avatarUrl AS c_avatarUrl, c.bannerColors AS c_bannerColors,
             c.description AS c_description, c.subscribers AS c_subscribers,
             c.createdAt AS c_createdAt
      FROM Video v
      LEFT JOIN Channel c ON c.id = v.channelId
      WHERE v.id = ?
      LIMIT 1
    `,
    args: [id],
  });

  if (vRes.rows.length === 0) {
    return c.json({ error: "video not found", id }, 404);
  }

  const r: any = vRes.rows[0];
  const channel = r.c_id
    ? {
        id: r.c_id,
        name: r.c_name,
        handle: r.c_handle,
        avatarUrl: r.c_avatarUrl,
        bannerColors: r.c_bannerColors,
        description: r.c_description,
        subscribers: r.c_subscribers,
        createdAt: r.c_createdAt,
      }
    : null;

  const video = mapVideo(r, channel);

  // Recent 10 comments (latest first). Column `timestamp` is the in-video
  // offset (sec), not a wall-clock — sort by createdAt for "recent".
  const cmRes = await db.execute({
    sql: `
      SELECT * FROM Comment
      WHERE videoId = ?
      ORDER BY createdAt DESC
      LIMIT 10
    `,
    args: [id],
  });
  const comments = cmRes.rows.map((row: any) => mapComment(row));

  return c.json({ ...video, comments });
});

// POST /api/mashahd/videos/:id/like  → increments likes, returns new count
app.post("/api/mashahd/videos/:id/like", async (c) => {
  const id = c.req.param("id");
  const upd = await db.execute({
    sql: "UPDATE Video SET likes = likes + 1 WHERE id = ?",
    args: [id],
  });
  if (upd.rowsAffected === 0) {
    return c.json({ error: "video not found", id }, 404);
  }
  const sel = await db.execute({
    sql: "SELECT likes FROM Video WHERE id = ?",
    args: [id],
  });
  const likes = Number(sel.rows[0]?.likes ?? 0);
  return c.json({ id, likes });
});

// POST /api/mashahd/videos/:id/view  → increments views, returns new count
app.post("/api/mashahd/videos/:id/view", async (c) => {
  const id = c.req.param("id");
  const upd = await db.execute({
    sql: "UPDATE Video SET views = views + 1 WHERE id = ?",
    args: [id],
  });
  if (upd.rowsAffected === 0) {
    return c.json({ error: "video not found", id }, 404);
  }
  const sel = await db.execute({
    sql: "SELECT views FROM Video WHERE id = ?",
    args: [id],
  });
  const views = Number(sel.rows[0]?.views ?? 0);
  return c.json({ id, views });
});

// GET /api/mashahd/channels  → list all channels
app.get("/api/mashahd/channels", async (c) => {
  const res = await db.execute({
    sql: "SELECT * FROM Channel ORDER BY subscribers DESC, createdAt ASC",
    args: [],
  });
  const channels = res.rows.map((r: any) => mapChannel(r));
  return c.json({ channels, count: channels.length });
});

// GET /api/mashahd/channels/:id/videos  → videos by channel
app.get("/api/mashahd/channels/:id/videos", async (c) => {
  const id = c.req.param("id");
  const chRes = await db.execute({
    sql: "SELECT * FROM Channel WHERE id = ? LIMIT 1",
    args: [id],
  });
  if (chRes.rows.length === 0) {
    return c.json({ error: "channel not found", id }, 404);
  }
  const channel = mapChannel(chRes.rows[0]);

  const vRes = await db.execute({
    sql: `
      SELECT * FROM Video
      WHERE channelId = ?
      ORDER BY createdAt DESC
    `,
    args: [id],
  });
  const videos = vRes.rows.map((r: any) => mapVideo(r, channel));
  return c.json({ channel, videos, count: videos.length });
});

// Root healthcheck (not under /api/mashahd — convenience for ops)
app.get("/", (c) =>
  c.json({ ok: true, service: "mashahd", port: PORT, routes: ["/api/mashahd/health", "/api/mashahd/videos", "/api/mashahd/channels"] })
);

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
async function main() {
  try {
    await discoverSchema();
    const vc = await db.execute("SELECT COUNT(*) AS c FROM Video");
    const cc = await db.execute("SELECT COUNT(*) AS c FROM Channel");
    console.log(
      `[mashahd] Turso connected. videos=${vc.rows[0]?.c} channels=${cc.rows[0]?.c}`
    );
  } catch (e) {
    console.error("[mashahd] FATAL: cannot reach Turso DB:", e);
    process.exit(1);
  }

  const server = Bun.serve({
    port: PORT,
    fetch: app.fetch,
  });
  console.log(`[mashahd] listening on http://localhost:${PORT}`);
  console.log(`[mashahd] routes:`);
  console.log(`  GET  /api/mashahd/health`);
  console.log(`  GET  /api/mashahd/videos?category=X&limit=20`);
  console.log(`  GET  /api/mashahd/videos/:id`);
  console.log(`  POST /api/mashahd/videos/:id/like`);
  console.log(`  POST /api/mashahd/videos/:id/view`);
  console.log(`  GET  /api/mashahd/channels`);
  console.log(`  GET  /api/mashahd/channels/:id/videos`);

  const shutdown = (sig: string) => {
    console.log(`[mashahd] received ${sig}, shutting down...`);
    server.stop(true);
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main();
