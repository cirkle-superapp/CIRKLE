"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface MailEmail {
  id: string;
  threadId: string;
  fromName: string;
  fromEmail: string;
  toEmails: string;
  subject: string;
  body: string;
  snippet: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  folder: string;
  labels: string;
  hasAttachment: boolean;
  attachmentName: string;
  intent: string;
}

async function mfetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`/api/mail${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
  });
  if (!res.ok) throw new Error(`Mail request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export function useMailEmails(folder?: string) {
  return useQuery<MailEmail[]>({
    queryKey: ["mail", "emails", folder || "ALL"],
    queryFn: () =>
      mfetch<{ emails: MailEmail[] }>(`/emails?folder=${folder || "ALL"}`).then((r) => r.emails),
    refetchInterval: 30000,
  });
}

export function useMailStats() {
  return useQuery<{ inbox: number; unread: number; starred: number; sent: number }>({
    queryKey: ["mail", "stats"],
    queryFn: () => mfetch("/stats"),
    refetchInterval: 30000,
  });
}

export function useSendMail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { subject: string; body: string; toEmails: string }) =>
      mfetch<{ ok: true }>("/send", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mail"] });
    },
  });
}

export function useToggleStar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { id: string; action?: string }) =>
      mfetch<{ ok: true }>("/star", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mail"] });
    },
  });
}
