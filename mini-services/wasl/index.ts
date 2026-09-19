import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { Hono } from 'hono'
import { createClient, type Client } from '@libsql/client'
import { Server as IoServer, type Socket } from 'socket.io'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PORT = 3004

const TURSO_URL =
  process.env.TURSO_DATABASE_URL ||
  'libsql://wasl-fortleem.aws-us-east-1.turso.io'

// Working Turso auth token (confirmed: 18 users / 3 convs / 39 messages).
// Override at deploy time with TURSO_AUTH_TOKEN env var.
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || ''

// The real Wasl cloud DB has real users. The frontend uses the symbolic id
// `u_current` (see src/lib/wasl/types.ts). We translate that to the real demo
// user (the @demo account that created the seeded conversations) so the
// frontend keeps working unchanged.
const CURRENT_USER_ID = 'cmtxkjucf0001sqvxlgnpf3y1'
const FRONTEND_CURRENT_USER_ID = 'u_current'

/**
 * Resolve any user id the frontend sends to the real Wasl DB user id.
 * `u_current` -> CURRENT_USER_ID. Everything else passes through.
 */
function resolveUserId(userId: string | undefined | null): string {
  if (!userId) return ''
  if (userId === FRONTEND_CURRENT_USER_ID) return CURRENT_USER_ID
  return userId
}

/**
 * Map a real Wasl DB hex avatar color (e.g. "#075E54") to the Cirkle color
 * name the frontend CirkleAvatar component understands.
 */
type AvatarColor = 'teal' | 'rose' | 'steel' | 'gold' | 'charcoal'

const HEX_COLOR_MAP: Record<string, AvatarColor> = {
  '#128C7E': 'teal',
  '#075E54': 'teal',
  '#34B7F1': 'teal',
  '#FF6B6B': 'rose',
  '#F97316': 'rose',
  '#F59E0B': 'rose',
  '#ECE5DD': 'gold',
  '#84CC16': 'steel',
}

function mapHexColor(hex: string | null | undefined): AvatarColor {
  if (!hex) return 'teal'
  const h = hex.trim().toUpperCase()
  if (HEX_COLOR_MAP[h]) return HEX_COLOR_MAP[h]
  // Try to parse #RRGGBB and classify by hue + lightness
  const m = h.match(/^#?([0-9A-Fa-f]{6})$/)
  if (!m) return 'teal'
  const r = parseInt(m[1].slice(0, 2), 16)
  const g = parseInt(m[1].slice(2, 4), 16)
  const b = parseInt(m[1].slice(4, 6), 16)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2 / 255
  if (max === min) {
    // grayscale
    return l < 0.4 ? 'charcoal' : l > 0.8 ? 'gold' : 'steel'
  }
  if (l < 0.22) return 'charcoal'
  const d = max - min
  let hue = 0
  if (max === r) hue = ((g - b) / d) % 6
  else if (max === g) hue = (b - r) / d + 2
  else hue = (r - g) / d + 4
  hue *= 60
  if (hue < 0) hue += 360
  // Greens → steel or teal
  if (hue >= 60 && hue < 180) return b > r ? 'teal' : 'steel'
  // Cyans/blues → teal
  if (hue >= 180 && hue < 270) return 'teal'
  // Reds/oranges → rose (dark) or gold (light yellow)
  if (hue < 45 || hue >= 330) return l > 0.75 ? 'gold' : 'rose'
  // Yellows → gold
  if (hue >= 45 && hue < 70) return 'gold'
  return 'teal'
}

// ---------------------------------------------------------------------------
// DB — Turso cloud only (no local fallback). Real schema already has tables
// and data; we MUST NOT create/alter/seed anything.
// ---------------------------------------------------------------------------
let db: Client

async function initDb(): Promise<void> {
  db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })
  try {
    await db.execute('SELECT 1')
    console.log('[wasl] connected to Turso cloud DB (real Wasl data).')
  } catch (err: any) {
    const msg = String(err?.message || err)
    console.error(`[wasl] FATAL: Turso connection failed: ${msg}`)
    console.error('[wasl] Refusing to fall back to a local DB — real data is required.')
    throw err
  }
}

// ---------------------------------------------------------------------------
// Row mappers (real Wasl schema -> API contract, camelCase preserved)
// ---------------------------------------------------------------------------
interface ApiUser {
  id: string
  username: string
  name: string
  avatarColor: string
  verified: boolean
  online: boolean
  about: string
}
interface ApiMessage {
  id: string
  conversationId: string
  senderId: string
  content: string
  type: string
  status: string
  createdAt: string
}
interface ApiConversation {
  id: string
  name: string | null
  isGroup: boolean
  avatarColor: string | null
  otherParticipant: ApiUser | null
  lastMessage: ApiMessage | null
  unreadCount: number
}

// Real schema columns (camelCase): id, username, name, avatarColor, verified,
// online, about.
function mapUser(r: any): ApiUser {
  return {
    id: String(r.id),
    username: String(r.username ?? ''),
    name: String(r.name ?? ''),
    avatarColor: mapHexColor(r.avatarColor as string | undefined),
    verified: Number(r.verified ?? 0) === 1,
    online: Number(r.online ?? 0) === 1,
    about: String(r.about ?? 'Hey there! I am using Wasl.'),
  }
}

// Real Message columns: id, conversationId, senderId, content, type, status,
// replyToId, commitId, senderLabel, senderLabelColor, senderAvatarPath,
// fromPhone, createdAt, protected, edited, pinned.
function mapMessage(r: any): ApiMessage {
  return {
    id: String(r.id),
    conversationId: String(r.conversationId),
    senderId: String(r.senderId),
    content: String(r.content ?? ''),
    type: String(r.type ?? 'text'),
    status: String(r.status ?? 'sent'),
    createdAt: String(r.createdAt),
  }
}

// ---------------------------------------------------------------------------
// Hono HTTP API (mounted under /api/wasl/*)
// ---------------------------------------------------------------------------
const app = new Hono()

app.get('/api/wasl/health', async (c) => {
  let userCount = -1
  let conversationCount = -1
  let messageCount = -1
  try {
    const u = await db.execute('SELECT COUNT(*) AS n FROM User')
    userCount = Number(u.rows?.[0]?.n ?? 0)
  } catch {
    /* ignore */
  }
  try {
    const cv = await db.execute('SELECT COUNT(*) AS n FROM Conversation')
    conversationCount = Number(cv.rows?.[0]?.n ?? 0)
  } catch {
    /* ignore */
  }
  try {
    const m = await db.execute('SELECT COUNT(*) AS n FROM Message')
    messageCount = Number(m.rows?.[0]?.n ?? 0)
  } catch {
    /* ignore */
  }
  return c.json({
    ok: true,
    service: 'wasl',
    db: 'turso',
    port: PORT,
    userCount,
    conversationCount,
    messageCount,
  })
})

app.get('/api/wasl/users', async (c) => {
  const res = await db.execute(
    `SELECT id, username, name, avatarColor, verified, online, about
       FROM "User"
       ORDER BY name ASC`,
  )
  return c.json(res.rows.map(mapUser))
})

app.get('/api/wasl/conversations', async (c) => {
  const rawUserId = c.req.query('userId')
  if (!rawUserId) {
    return c.json({ error: 'userId query param is required' }, 400)
  }
  const userId = resolveUserId(rawUserId)

  const res = await db.execute({
    sql: `SELECT c.id AS id, c.name AS name, c."isGroup" AS isGroup,
                 c."avatarColor" AS avatarColor,
                 c."createdAt" AS createdAt, c."updatedAt" AS updatedAt
            FROM "Conversation" c
            JOIN "Participant" p ON p."conversationId" = c.id
           WHERE p."userId" = ?
           ORDER BY c."updatedAt" DESC NULLS LAST`,
    args: [userId],
  })

  const out: ApiConversation[] = []
  for (const row of res.rows as any[]) {
    const convId = String(row.id)
    const isGroup = Number(row.isGroup ?? 0) === 1

    // For DMs: fetch the OTHER participant. For groups: otherParticipant = null
    // (the frontend uses conversation.name instead).
    let otherParticipant: ApiUser | null = null
    if (!isGroup) {
      const otherRes = await db.execute({
        sql: `SELECT u.id AS id, u.username AS username, u.name AS name,
                     u."avatarColor" AS avatarColor, u.verified AS verified,
                     u.online AS online, u.about AS about
                FROM "Participant" p
                JOIN "User" u ON u.id = p."userId"
               WHERE p."conversationId" = ? AND p."userId" != ?
               LIMIT 1`,
        args: [convId, userId],
      })
      otherParticipant =
        otherRes.rows.length > 0 ? mapUser(otherRes.rows[0]) : null
    }

    // Last message in this conversation
    const lastRes = await db.execute({
      sql: `SELECT id, "conversationId" AS "conversationId",
                   "senderId" AS "senderId", content, type, status,
                   "createdAt" AS "createdAt"
              FROM "Message"
             WHERE "conversationId" = ?
             ORDER BY "createdAt" DESC
             LIMIT 1`,
      args: [convId],
    })
    const lastMessage =
      lastRes.rows.length > 0 ? mapMessage(lastRes.rows[0]) : null

    // Unread count: messages after this user's lastReadAt, sender != this user
    const unreadRes = await db.execute({
      sql: `SELECT COUNT(*) AS n
              FROM "Message" m
              LEFT JOIN "Participant" p
                ON p."conversationId" = m."conversationId"
               AND p."userId" = ?
             WHERE m."conversationId" = ?
               AND m."senderId" != ?
               AND m."createdAt" > COALESCE(p."lastReadAt", '1970-01-01')`,
      args: [userId, convId, userId],
    })
    const unreadCount = Number(unreadRes.rows?.[0]?.n ?? 0)

    // Avatar color: pass through hex for groups (frontend may render the
    // group's chosen color), but for DMs the other participant's color is
    // what the frontend renders anyway. We keep the raw hex string here so
    // the API stays backwards-compatible with the previous nullable string.
    const avatarColor = row.avatarColor ?? null

    out.push({
      id: convId,
      name: row.name ?? null,
      isGroup,
      avatarColor,
      otherParticipant,
      lastMessage,
      unreadCount,
    })
  }

  return c.json(out)
})

app.post('/api/wasl/conversations', async (c) => {
  let body: any
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON body' }, 400)
  }
  const { userId: rawUserId, otherUserId: rawOtherUserId } = body ?? {}
  if (!rawUserId || !rawOtherUserId) {
    return c.json({ error: 'userId and otherUserId are required' }, 400)
  }
  const userId = resolveUserId(rawUserId)
  const otherUserId = resolveUserId(rawOtherUserId)
  if (!userId || !otherUserId) {
    return c.json({ error: 'userId and otherUserId are required' }, 400)
  }
  if (userId === otherUserId) {
    return c.json({ error: 'cannot create a conversation with yourself' }, 400)
  }

  // Look for an existing DM (isGroup = 0) where both users are participants
  const existing = await db.execute({
    sql: `SELECT c.id AS id, c.name AS name, c."isGroup" AS isGroup,
                 c."avatarColor" AS avatarColor
            FROM "Conversation" c
           WHERE c."isGroup" = 0
             AND EXISTS (SELECT 1 FROM "Participant" p
                          WHERE p."conversationId" = c.id
                            AND p."userId" = ?)
             AND EXISTS (SELECT 1 FROM "Participant" p
                          WHERE p."conversationId" = c.id
                            AND p."userId" = ?)
           LIMIT 1`,
    args: [userId, otherUserId],
  })

  let convId: string
  const nowIso = new Date().toISOString()

  if (existing.rows.length > 0) {
    convId = String((existing.rows[0] as any).id)
  } else {
    convId = crypto.randomUUID()
    await db.execute({
      sql: `INSERT INTO "Conversation"
                  (id, name, "isGroup", avatar, "avatarColor", "createdBy",
                   "createdAt", "updatedAt")
            VALUES (?, NULL, 0, NULL, NULL, ?, ?, ?)`,
      args: [convId, userId, nowIso, nowIso],
    })
    const p1 = crypto.randomUUID()
    const p2 = crypto.randomUUID()
    await db.execute({
      sql: `INSERT INTO "Participant"
                  (id, "conversationId", "userId", "joinedAt", "lastReadAt", muted)
            VALUES (?, ?, ?, ?, ?, 0)`,
      args: [p1, convId, userId, nowIso, nowIso],
    })
    await db.execute({
      sql: `INSERT INTO "Participant"
                  (id, "conversationId", "userId", "joinedAt", "lastReadAt", muted)
            VALUES (?, ?, ?, ?, ?, 0)`,
      args: [p2, convId, otherUserId, nowIso, nowIso],
    })
  }

  // Build response with otherParticipant
  const otherRes = await db.execute({
    sql: `SELECT id, username, name, "avatarColor" AS "avatarColor",
                 verified, online, about
            FROM "User" WHERE id = ?`,
    args: [otherUserId],
  })
  const otherParticipant =
    otherRes.rows.length > 0 ? mapUser(otherRes.rows[0]) : null

  return c.json({
    id: convId,
    name: null,
    isGroup: false,
    avatarColor: null,
    otherParticipant,
    lastMessage: null,
    unreadCount: 0,
  })
})

app.get('/api/wasl/messages', async (c) => {
  const conversationId = c.req.query('conversationId')
  if (!conversationId) {
    return c.json(
      { error: 'conversationId query param is required' },
      400,
    )
  }
  const res = await db.execute({
    sql: `SELECT id, "conversationId" AS "conversationId",
                 "senderId" AS "senderId", content, type, status,
                 "createdAt" AS "createdAt"
            FROM "Message"
           WHERE "conversationId" = ?
           ORDER BY "createdAt" ASC`,
    args: [conversationId],
  })
  return c.json(res.rows.map(mapMessage))
})

app.post('/api/wasl/messages', async (c) => {
  let body: any
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON body' }, 400)
  }
  const {
    conversationId,
    senderId: rawSenderId,
    content,
  } = body ?? {}
  if (!conversationId || !rawSenderId || !content) {
    return c.json(
      { error: 'conversationId, senderId, content are required' },
      400,
    )
  }
  const senderId = resolveUserId(rawSenderId)

  const id = crypto.randomUUID()
  const nowIso = new Date().toISOString()

  // Insert message. Real Message table has many columns; we only set the
  // ones the API cares about, and let the rest default (or be NULL).
  await db.execute({
    sql: `INSERT INTO "Message"
                (id, "conversationId", "senderId", content, type, status,
                 "replyToId", "commitId", "senderLabel", "senderLabelColor",
                 "senderAvatarPath", "fromPhone", "createdAt",
                 "protected", edited, pinned)
          VALUES (?, ?, ?, ?, 'text', 'sent',
                  NULL, NULL, NULL, NULL, NULL, NULL, ?,
                  0, 0, 0)`,
    args: [id, conversationId, senderId, String(content), nowIso],
  })

  // Bump Conversation.updatedAt
  await db.execute({
    sql: `UPDATE "Conversation" SET "updatedAt" = ? WHERE id = ?`,
    args: [nowIso, conversationId],
  })

  // Mark sender's Participant.lastReadAt so their own messages don't count
  // as unread for them.
  await db.execute({
    sql: `UPDATE "Participant" SET "lastReadAt" = ?
           WHERE "conversationId" = ? AND "userId" = ?`,
    args: [nowIso, conversationId, senderId],
  })

  const rowRes = await db.execute({
    sql: `SELECT id, "conversationId" AS "conversationId",
                 "senderId" AS "senderId", content, type, status,
                 "createdAt" AS "createdAt"
            FROM "Message" WHERE id = ?`,
    args: [id],
  })
  const message =
    rowRes.rows.length > 0 ? mapMessage(rowRes.rows[0]) : null

  // ---- socket.io delivery ----
  // Notify every OTHER participant in the conversation.
  try {
    const otherRes = await db.execute({
      sql: `SELECT "userId" AS userId
              FROM "Participant"
             WHERE "conversationId" = ? AND "userId" != ?`,
      args: [conversationId, senderId],
    })
    for (const row of otherRes.rows as any[]) {
      const otherUserId = String(row.userId)
      io.to(`user:${otherUserId}`).emit('new_message', {
        conversationId,
        senderId,
        content: String(content),
        createdAt: nowIso,
      })
    }
  } catch (err) {
    console.error('[wasl] socket delivery error:', err)
  }

  // Echo back to the sender's room so any of their other devices/tabs see it
  io.to(`user:${senderId}`).emit('message_sent', {
    conversationId,
    senderId,
    content: String(content),
    createdAt: nowIso,
  })

  return c.json(message)
})

app.post('/api/wasl/read', async (c) => {
  let body: any
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON body' }, 400)
  }
  const { conversationId, userId: rawUserId } = body ?? {}
  if (!conversationId || !rawUserId) {
    return c.json(
      { error: 'conversationId and userId are required' },
      400,
    )
  }
  const userId = resolveUserId(rawUserId)
  const nowIso = new Date().toISOString()
  await db.execute({
    sql: `UPDATE "Participant" SET "lastReadAt" = ?
           WHERE "conversationId" = ? AND "userId" = ?`,
    args: [nowIso, conversationId, userId],
  })
  return c.json({ ok: true })
})

// 404 fallback for non-API paths
app.all('*', (c) => c.json({ ok: false, error: 'Not found' }, 404))

// ---------------------------------------------------------------------------
// HTTP server (used by both Hono and socket.io)
// ---------------------------------------------------------------------------
const httpServer = createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    // socket.io owns /socket.io/* — let it handle those.
    if (req.url?.startsWith('/socket.io')) {
      return // fall through to socket.io engine
    }
    // Otherwise, delegate to Hono.
    const url = `http://localhost:${PORT}${req.url ?? '/'}`
    const headers = new Headers()
    for (const [k, v] of Object.entries(req.headers)) {
      if (Array.isArray(v)) v.forEach((x) => headers.append(k, x))
      else if (v != null) headers.set(k, v)
    }
    const method = req.method ?? 'GET'
    const init: RequestInit = { method, headers }
    if (method !== 'GET' && method !== 'HEAD') {
      const bufs: Buffer[] = []
      for await (const chunk of req as any) {
        bufs.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      }
      init.body = Buffer.concat(bufs)
    }
    const webReq = new Request(url, init)
    const webRes = await app.fetch(webReq)
    res.statusCode = webRes.status
    webRes.headers.forEach((v, k) => res.setHeader(k, v))
    const buf = Buffer.from(await webRes.arrayBuffer())
    res.end(buf)
  },
)

// ---------------------------------------------------------------------------
// socket.io on the SAME server/port — CORS *, default path `/socket.io/`
// ---------------------------------------------------------------------------
const io = new IoServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60_000,
  pingInterval: 25_000,
})

io.on('connection', (socket: Socket) => {
  console.log(`[wasl] socket connected: ${socket.id}`)

  socket.on('join', (payload: { userId?: string }) => {
    try {
      const raw = String(payload?.userId ?? '').trim()
      if (!raw) {
        socket.emit('error', {
          event: 'join',
          message: 'userId is required',
        })
        return
      }
      // Resolve u_current -> real demo user id so the room name matches
      // what the POST /api/wasl/messages handler emits to.
      const userId = resolveUserId(raw)
      const room = `user:${userId}`
      socket.join(room)
      ;(socket.data as any).userId = userId
      socket.emit('joined', { userId, room })
      console.log(`[wasl] ${socket.id} joined room ${room}`)
    } catch (err) {
      console.error('[wasl] join error:', err)
    }
  })

  socket.on(
    'send_message',
    (payload: {
      conversationId?: string
      senderId?: string
      content?: string
      createdAt?: string
    }) => {
      try {
        if (!payload?.conversationId || !payload?.senderId) {
          socket.emit('error', {
            event: 'send_message',
            message: 'conversationId and senderId are required',
          })
          return
        }
        ;(async () => {
          const conversationId = String(payload.conversationId)
          const senderId = resolveUserId(payload.senderId)
          const content = payload.content ?? ''
          const createdAt =
            payload.createdAt ?? new Date().toISOString()

          const otherRes = await db.execute({
            sql: `SELECT "userId" AS userId
                    FROM "Participant"
                   WHERE "conversationId" = ? AND "userId" != ?`,
            args: [conversationId, senderId],
          })
          for (const row of otherRes.rows as any[]) {
            const otherUserId = String(row.userId)
            io.to(`user:${otherUserId}`).emit('new_message', {
              conversationId,
              senderId,
              content,
              createdAt,
            })
          }
          socket.emit('message_sent', {
            conversationId,
            senderId,
            content,
            createdAt,
          })
        })().catch((err) =>
          console.error('[wasl] send_message handler error:', err),
        )
      } catch (err) {
        console.error('[wasl] send_message error:', err)
      }
    },
  )

  socket.on(
    'typing',
    (payload: {
      conversationId?: string
      senderId?: string
      toUserId?: string
    }) => {
      try {
        if (!payload?.toUserId) return
        const toUserId = resolveUserId(payload.toUserId)
        io.to(`user:${toUserId}`).emit('typing', {
          conversationId: payload.conversationId,
          senderId: resolveUserId(payload.senderId),
        })
      } catch (err) {
        console.error('[wasl] typing error:', err)
      }
    },
  )

  socket.on(
    'stop_typing',
    (payload: {
      conversationId?: string
      senderId?: string
      toUserId?: string
    }) => {
      try {
        if (!payload?.toUserId) return
        const toUserId = resolveUserId(payload.toUserId)
        io.to(`user:${toUserId}`).emit('stop_typing', {
          conversationId: payload.conversationId,
          senderId: resolveUserId(payload.senderId),
        })
      } catch (err) {
        console.error('[wasl] stop_typing error:', err)
      }
    },
  )

  socket.on('disconnect', (reason: string) => {
    const userId = (socket.data as any)?.userId
    console.log(
      `[wasl] socket disconnected: ${socket.id}` +
        (userId ? ` (user:${userId})` : '') +
        ` reason=${reason}`,
    )
  })

  socket.on('error', (err: unknown) => {
    console.error(`[wasl] socket error (${socket.id}):`, err)
  })
})

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
async function main() {
  await initDb()

  httpServer.listen(PORT, () => {
    console.log(
      `[wasl] service listening on http://localhost:${PORT} (db=turso, real Wasl data)`,
    )
  })
}

main().catch((err) => {
  console.error('[wasl] fatal boot error:', err)
  process.exit(1)
})

process.on('SIGTERM', () => {
  console.log('[wasl] SIGTERM received, shutting down...')
  io.close(() => httpServer.close(() => process.exit(0)))
})
process.on('SIGINT', () => {
  console.log('[wasl] SIGINT received, shutting down...')
  io.close(() => httpServer.close(() => process.exit(0)))
})
