"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Mashahd types (port 3005 — the Mashahd video service / Turso DB).
export interface MashahdChannel {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  avatarColor: string | null;
  subscriberCount: number;
  verified: boolean;
}

export interface MashahdVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  durationSec: number;
  views: number;
  likes: number;
  dislikes: number;
  category: string;
  tags: string[];
  createdAt: string;
  channel: MashahdChannel | null;
}

export interface MashahdComment {
  id: string;
  content: string;
  authorName: string | null;
  authorColor: string | null;
  createdAt: string;
}

export interface MashahdVideoDetail extends MashahdVideo {
  comments: MashahdComment[];
}

const BASE = "/api/mashahd";

async function mfetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
  });
  if (!res.ok) throw new Error(`Mashahd request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const mashahdKeys = {
  videos: ["mashahd", "videos"] as const,
  video: (id: string) => ["mashahd", "video", id] as const,
  channels: ["mashahd", "channels"] as const,
};

export function useMashahdVideos(category?: string) {
  return useQuery<MashahdVideo[]>({
    queryKey: category ? ["mashahd", "videos", category] : mashahdKeys.videos,
    queryFn: () => {
      const q = category ? `?category=${encodeURIComponent(category)}` : "?limit=24";
      return mfetch<{ videos: MashahdVideo[] }>(`/videos${q}`).then((r) => r.videos);
    },
  });
}

export function useMashahdVideo(id: string | null) {
  return useQuery<MashahdVideoDetail | null>({
    queryKey: mashahdKeys.video(id ?? "noop"),
    queryFn: () => mfetch<MashahdVideoDetail>(`/videos/${id}`),
    enabled: !!id,
  });
}

export function useMashahdLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (videoId: string) =>
      mfetch<{ likes: number }>(`/videos/${videoId}/like`, { method: "POST" }),
    onSuccess: (data, videoId) => {
      qc.setQueryData<MashahdVideo[]>(mashahdKeys.videos, (old = []) =>
        old.map((v) => (v.id === videoId ? { ...v, likes: data.likes } : v))
      );
    },
  });
}

export function useMashahdView() {
  return useMutation({
    mutationFn: (videoId: string) =>
      mfetch<{ views: number }>(`/videos/${videoId}/view`, { method: "POST" }),
  });
}

export function useMashahdChannels() {
  return useQuery<MashahdChannel[]>({
    queryKey: mashahdKeys.channels,
    queryFn: () => mfetch<{ channels: MashahdChannel[] }>("/channels").then((r) => r.channels),
  });
}
