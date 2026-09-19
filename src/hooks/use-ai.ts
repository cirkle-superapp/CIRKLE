"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

async function aifetch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/ai/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ---------- Assistant chat ----------
export function useAIAssistant() {
  return useMutation({
    mutationFn: (messages: AIMessage[]) =>
      aifetch<{ reply: string; provider: string; ms: number }>("assistant", { messages }),
  });
}

// ---------- Post suggestions ----------
export function useSuggestPost() {
  return useMutation({
    mutationFn: (topic?: string) =>
      aifetch<{ suggestions: string[]; provider: string; ms: number }>("suggest-post", { topic }),
  });
}

// ---------- Smart replies (Wasl) ----------
export function useSmartReply() {
  return useMutation({
    mutationFn: (conversationId: string) =>
      aifetch<{ replies: string[]; provider: string; ms: number }>("smart-reply", { conversationId }),
  });
}

// ---------- Image generation ----------
export function useGenerateImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prompt: string) =>
      aifetch<{ imageUrl: string; model: string; ms: number }>("generate-image", { prompt }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai"] });
    },
  });
}
