"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { WaslConversation, WaslMessage, WaslUser } from "@/lib/wasl/types";
import { WASL_CURRENT_USER_ID } from "@/lib/wasl/types";

const BASE = "/api/wasl";

async function wfetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
  });
  if (!res.ok) throw new Error(`Wasl request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const waslKeys = {
  conversations: ["wasl", "conversations"] as const,
  messages: (conversationId: string) => ["wasl", "messages", conversationId] as const,
};

// ---------- Conversations ----------
export function useWaslConversations() {
  return useQuery<WaslConversation[]>({
    queryKey: waslKeys.conversations,
    queryFn: () =>
      wfetch<WaslConversation[]>(`/conversations?userId=${WASL_CURRENT_USER_ID}`),
    refetchInterval: 20_000,
  });
}

export function useFindOrCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (otherUserId: string) =>
      wfetch<WaslConversation>("/conversations", {
        method: "POST",
        body: JSON.stringify({ userId: WASL_CURRENT_USER_ID, otherUserId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: waslKeys.conversations });
    },
  });
}

// ---------- Messages ----------
export function useWaslMessages(conversationId: string | null) {
  return useQuery<WaslMessage[]>({
    queryKey: waslKeys.messages(conversationId ?? "noop"),
    queryFn: () =>
      wfetch<WaslMessage[]>(`/messages?conversationId=${conversationId}`),
    enabled: !!conversationId,
    refetchInterval: 5000, // Poll every 5s for new messages (replaces socket.io on Vercel)
  });
}

export function useSendWaslMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      wfetch<WaslMessage>("/messages", {
        method: "POST",
        body: JSON.stringify({ conversationId, senderId: WASL_CURRENT_USER_ID, content }),
      }),
    onSuccess: (data) => {
      qc.setQueryData<WaslMessage[]>(waslKeys.messages(conversationId), (old = []) => [...old, data]);
      qc.invalidateQueries({ queryKey: waslKeys.conversations });
      // Emit a pulse event so the PulseRibbon reflects Wasl activity.
      fetch("/api/pulse/emit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pillar: "wasl", kind: "message" }),
      }).catch(() => {});
    },
  });
}

export function useMarkWaslRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      wfetch<{ ok: true }>("/read", {
        method: "POST",
        body: JSON.stringify({ conversationId, userId: WASL_CURRENT_USER_ID }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: waslKeys.conversations });
    },
  });
}

// ---------- Users (for "new chat" picker) ----------
export function useWaslUsers() {
  return useQuery<WaslUser[]>({
    queryKey: ["wasl", "users"],
    queryFn: () => wfetch<{ users: WaslUser[] }>("/users").then((r) => r.users),
  });
}
