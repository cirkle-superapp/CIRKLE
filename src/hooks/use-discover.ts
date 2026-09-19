"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SocialPost, SocialUser } from "@/lib/social/types";

async function jfetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

// ---------- Profile ----------
export interface ProfileData {
  user: SocialUser;
  postsCount: number;
  friendsCount: number;
  posts: SocialPost[];
  isFriend: boolean;
  isCurrentUser: boolean;
}

export function useProfile(userId: string | null) {
  return useQuery<ProfileData>({
    queryKey: ["profile", userId],
    queryFn: () => jfetch<ProfileData>(`/api/profile/${userId}`),
    enabled: !!userId,
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; bio?: string; coverUrl?: string; avatarColor?: SocialUser["avatarColor"] }) =>
      jfetch<{ user: SocialUser }>("/api/me", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (data) => {
      qc.setQueryData(["me"], data.user);
      qc.invalidateQueries({ queryKey: ["profile", "u_current"] });
    },
  });
}

// ---------- Search ----------
export function useSearch(q: string) {
  return useQuery<{ users: SocialUser[]; posts: SocialPost[]; total: number }>({
    queryKey: ["search", q],
    queryFn: () => jfetch(`/api/search?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length >= 2,
  });
}

// ---------- Friend suggestions ----------
// NOTE: /api/friends/suggestions returns SocialUser[] directly (not wrapped
// in { users: [...] }), so we cast the response without unwrapping.
export function useFriendSuggestions() {
  return useQuery<SocialUser[]>({
    queryKey: ["friends", "suggestions"],
    queryFn: () => jfetch<SocialUser[]>("/api/friends/suggestions"),
  });
}

// ---------- Friend requests ----------
interface FriendRequest {
  friendship: { id: string; initiatorId: string; receiverId: string; status: string; createdAt: string };
  user: SocialUser;
}

export function useFriendRequests() {
  return useQuery<{ requests: FriendRequest[] }>({
    queryKey: ["friends", "requests"],
    queryFn: () => jfetch<{ requests: FriendRequest[] }>("/api/friends/requests"),
    refetchInterval: 30_000,
  });
}

export function useSendFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      jfetch<{ ok: true }>("/api/friends/request", { method: "POST", body: JSON.stringify({ userId }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friends", "suggestions"] });
    },
  });
}

export function useAcceptFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      jfetch<{ ok: true }>("/api/friends/accept", { method: "POST", body: JSON.stringify({ userId }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friends", "requests"] });
      qc.invalidateQueries({ queryKey: ["friends"] });
    },
  });
}

// ---------- Saved posts ----------
export function useSavedPosts() {
  return useQuery<SocialPost[]>({
    queryKey: ["saved"],
    queryFn: () => jfetch<{ posts: SocialPost[] }>("/api/saved").then((r) => r.posts),
  });
}

export function useToggleSave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) =>
      jfetch<{ saved: boolean }>(`/api/posts/${postId}/save`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved"] });
    },
  });
}

// ---------- Trending ----------
export function useTrending(limit = 10) {
  return useQuery<SocialPost[]>({
    queryKey: ["trending", limit],
    queryFn: () => jfetch<{ posts: SocialPost[] }>(`/api/trending?limit=${limit}`).then((r) => r.posts),
  });
}
