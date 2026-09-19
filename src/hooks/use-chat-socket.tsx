"use client";

import * as React from "react";
import { io, type Socket } from "socket.io-client";
import { WASL_CURRENT_USER_ID } from "@/lib/wasl/types";

/**
 * Wasl real-time socket (port 3004 — the Wasl mini-service).
 * Event shapes match the Wasl backend:
 *  - send_message { conversationId, senderId, content, createdAt }
 *  - typing / stop_typing { conversationId, senderId, toUserId }
 *  - incoming new_message { conversationId, senderId, content, createdAt }
 */
interface WaslSocket {
  socket: Socket | null;
  connected: boolean;
  /** Relay a message via socket (in addition to HTTP persistence). */
  relayMessage: (conversationId: string, senderId: string, content: string, toUserId: string) => void;
  emitTyping: (conversationId: string, senderId: string, toUserId: string) => void;
  emitStopTyping: (conversationId: string, senderId: string, toUserId: string) => void;
}

export interface WaslIncomingMessage {
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

const SocketCtx = React.createContext<WaslSocket | null>(null);

export function ChatSocketProvider({
  children,
  onIncoming,
  onTyping,
  onStopTyping,
}: {
  children: React.ReactNode;
  onIncoming?: (m: WaslIncomingMessage) => void;
  onTyping?: (conversationId: string, senderId: string) => void;
  onStopTyping?: (conversationId: string, senderId: string) => void;
}) {
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    // Try to connect to the local socket.io (works in dev with the Wasl mini-service).
    // On Vercel (serverless), this will fail gracefully — chat uses polling instead.
    let s: Socket | null = null;
    try {
      s = io("/, {
        transports: ["websocket", "polling"],
        reconnection: false,
        timeout: 3000,
      });
      setSocket(s);

      s.on("connect", () => {
        setConnected(true);
        s!.emit("join", { userId: WASL_CURRENT_USER_ID });
      });
      s.on("disconnect", () => setConnected(false));
      s.on("connect_error", () => setConnected(false));

      if (onIncoming) s.on("new_message", onIncoming);
      if (onTyping) s.on("typing", (p: { conversationId: string; senderId: string }) => onTyping(p.conversationId, p.senderId));
      if (onStopTyping) s.on("stop_typing", (p: { conversationId: string; senderId: string }) => onStopTyping(p.conversationId, p.senderId));
    } catch {
      // Socket.io not available (Vercel production) — chat works via polling.
      setConnected(false);
    }

    return () => {
      if (s) {
        s.removeAllListeners();
        s.disconnect();
      }
    };
     
  }, []);

  const value = React.useMemo<WaslSocket>(
    () => ({
      socket,
      connected,
      relayMessage: (conversationId, senderId, content, toUserId) => {
        const payload = {
          conversationId,
          senderId,
          content,
          createdAt: new Date().toISOString(),
        };
        socket?.emit("send_message", { ...payload, toUserId });
      },
      emitTyping: (conversationId, senderId, toUserId) =>
        socket?.emit("typing", { conversationId, senderId, toUserId }),
      emitStopTyping: (conversationId, senderId, toUserId) =>
        socket?.emit("stop_typing", { conversationId, senderId, toUserId }),
    }),
    [socket, connected]
  );

  return <SocketCtx.Provider value={value}>{children}</SocketCtx.Provider>;
}

export function useChatSocket() {
  const ctx = React.useContext(SocketCtx);
  if (!ctx)
    return {
      socket: null,
      connected: false,
      relayMessage: () => {},
      emitTyping: () => {},
      emitStopTyping: () => {},
    };
  return ctx;
}
