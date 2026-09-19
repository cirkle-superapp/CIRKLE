import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { Server, type Socket } from 'socket.io'

// Fixed port — do NOT use env var (per spec)
const PORT = 3003

// ---------------------------------------------------------------------------
// Payload types
// ---------------------------------------------------------------------------
interface JoinPayload {
  userId: string
}

interface SendMessagePayload {
  fromId: string
  toId: string
  content: string
  createdAt: string
}

interface TypingPayload {
  fromId: string
  toId: string
}

// ---------------------------------------------------------------------------
// HTTP server with a simple healthcheck GET /
// ---------------------------------------------------------------------------
const httpServer = createServer(
  (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === 'GET' && req.url?.split('?')[0] === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({ ok: true, service: 'cirkle-chat', port: PORT }),
      )
      return
    }

    // socket.io handles /socket.io/* paths itself; anything else 404s
    if (!req.url?.startsWith('/socket.io')) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'Not found' }))
    }
  },
)

// ---------------------------------------------------------------------------
// socket.io — default path `/`, CORS open to all origins
// (Caddy gateway forwards io("/?XTransformPort=3003") to this port)
// ---------------------------------------------------------------------------
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ---------------------------------------------------------------------------
// Connection lifecycle
// ---------------------------------------------------------------------------
io.on('connection', (socket: Socket) => {
  console.log(`[chat] socket connected: ${socket.id}`)

  // -- join: subscribe to a personal room so we can target this user ---------
  socket.on('join', (payload: JoinPayload) => {
    try {
      const userId = String(payload?.userId ?? '').trim()
      if (!userId) {
        socket.emit('error', { event: 'join', message: 'userId is required' })
        return
      }
      const room = `user:${userId}`
      socket.join(room)
      // Track the userId on the socket for cleanup on disconnect
      ;(socket.data as { userId?: string }).userId = userId
      socket.emit('joined', { userId, room })
      console.log(`[chat] ${socket.id} joined room ${room}`)
    } catch (err) {
      console.error('[chat] join error:', err)
    }
  })

  // -- send_message: relay to recipient, echo back to sender -----------------
  socket.on('send_message', (payload: SendMessagePayload) => {
    try {
      if (!payload || !payload.toId || !payload.fromId) {
        socket.emit('error', {
          event: 'send_message',
          message: 'fromId, toId are required',
        })
        return
      }

      const messagePayload = {
        fromId: payload.fromId,
        toId: payload.toId,
        content: payload.content ?? '',
        createdAt: payload.createdAt ?? new Date().toISOString(),
      }

      // Deliver to the recipient's personal room
      io.to(`user:${payload.toId}`).emit('new_message', messagePayload)

      // Echo back to the sender so the UI can confirm delivery
      socket.emit('message_sent', messagePayload)

      console.log(
        `[chat] message ${payload.fromId} -> ${payload.toId} (${messagePayload.content.length} chars)`,
      )
    } catch (err) {
      console.error('[chat] send_message error:', err)
    }
  })

  // -- typing ----------------------------------------------------------------
  socket.on('typing', (payload: TypingPayload) => {
    try {
      if (!payload?.fromId || !payload?.toId) return
      io.to(`user:${payload.toId}`).emit('typing', { fromId: payload.fromId })
    } catch (err) {
      console.error('[chat] typing error:', err)
    }
  })

  // -- stop_typing -----------------------------------------------------------
  socket.on('stop_typing', (payload: TypingPayload) => {
    try {
      if (!payload?.fromId || !payload?.toId) return
      io.to(`user:${payload.toId}`).emit('stop_typing', {
        fromId: payload.fromId,
      })
    } catch (err) {
      console.error('[chat] stop_typing error:', err)
    }
  })

  // -- disconnect ------------------------------------------------------------
  socket.on('disconnect', (reason: string) => {
    const userId = (socket.data as { userId?: string }).userId
    console.log(
      `[chat] socket disconnected: ${socket.id}` +
        (userId ? ` (user:${userId})` : '') +
        ` reason=${reason}`,
    )
  })

  socket.on('error', (err: unknown) => {
    console.error(`[chat] socket error (${socket.id}):`, err)
  })
})

// ---------------------------------------------------------------------------
// Boot + graceful shutdown
// ---------------------------------------------------------------------------
httpServer.listen(PORT, () => {
  console.log(`[cirkle-chat] listening on http://localhost:${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('[cirkle-chat] SIGTERM received, shutting down...')
  io.close(() => {
    httpServer.close(() => process.exit(0))
  })
})

process.on('SIGINT', () => {
  console.log('[cirkle-chat] SIGINT received, shutting down...')
  io.close(() => {
    httpServer.close(() => process.exit(0))
  })
})
