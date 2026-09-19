"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  SocialPost,
  SocialStory,
  SocialNotification,
  SocialUser,
  SocialMessage,
  SocialComment,
} from "@/lib/social/types";

async function jfetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const socialKeys = {
  posts: ["posts"] as const,
  stories: ["stories"] as const,
  notifications: ["notifications"] as const,
  friends: ["friends"] as const,
  messages: (userId: string) => ["messages", userId] as const,
  comments: (postId: string) => ["comments", postId] as const,
};

// ---------- Posts ----------
export function usePosts() {
  return useQuery<SocialPost[]>({
    queryKey: socialKeys.posts,
    queryFn: () => jfetch<{ posts: SocialPost[] }>("/api/posts").then((r) => r.posts),
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { content: string; imageUrl?: string; feeling?: string; location?: string }) =>
      jfetch<{ post: SocialPost }>("/api/posts", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (data) => {
      qc.setQueryData<SocialPost[]>(socialKeys.posts, (old = []) => [data.post, ...old]);
    },
  });
}

// ---------- Like ----------
export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) =>
      jfetch<{ liked: boolean; likesCount: number }>(`/api/posts/${postId}/like`, { method: "POST" }),
    onMutate: async (postId) => {
      await qc.cancelQueries({ queryKey: socialKeys.posts });
      const prev = qc.getQueryData<SocialPost[]>(socialKeys.posts);
      qc.setQueryData<SocialPost[]>(socialKeys.posts, (old = []) =>
        old.map((p) =>
          p.id === postId
            ? {
                ...p,
                likedByMe: !p.likedByMe,
                likesCount: p.likedByMe ? p.likesCount - 1 : p.likesCount + 1,
              }
            : p
        )
      );
      return { prev };
    },
    onError: (_e, _postId, ctx) => {
      if (ctx?.prev) qc.setQueryData(socialKeys.posts, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: socialKeys.notifications });
    },
  });
}

// ---------- Comments ----------
export function useComments(postId: string | null) {
  return useQuery<SocialComment[]>({
    queryKey: socialKeys.comments(postId ?? "noop"),
    queryFn: () =>
      jfetch<{ comments: SocialComment[] }>(`/api/posts/${postId}/comments`).then((r) => r.comments),
    enabled: !!postId,
  });
}

export function useAddComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      jfetch<{ comment: SocialComment }>(`/api/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
    onSuccess: (data) => {
      qc.setQueryData<SocialComment[]>(socialKeys.comments(postId), (old = []) => [...old, data.comment]);
      qc.setQueryData<SocialPost[]>(socialKeys.posts, (old = []) =>
        old.map((p) => (p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p))
      );
    },
  });
}

// ---------- Stories ----------
export function useStories() {
  return useQuery<SocialStory[]>({
    queryKey: socialKeys.stories,
    queryFn: () => jfetch<{ stories: SocialStory[] }>("/api/stories").then((r) => r.stories),
  });
}

// ---------- Notifications ----------
export function useNotifications() {
  return useQuery<{ notifications: SocialNotification[]; unreadCount: number }>({
    queryKey: socialKeys.notifications,
    queryFn: () => jfetch<{ notifications: SocialNotification[]; unreadCount: number }>("/api/notifications"),
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => jfetch<{ ok: true }>("/api/notifications/read", { method: "POST" }),
    onSuccess: () => {
      qc.setQueryData<{ notifications: SocialNotification[]; unreadCount: number }>(socialKeys.notifications, (old) =>
        old
          ? {
              notifications: old.notifications.map((n) => ({ ...n, read: true })),
              unreadCount: 0,
            }
          : old
      );
    },
  });
}

// ---------- Friends ----------
export function useFriends() {
  return useQuery<(SocialUser & { online: boolean; lastMessage?: SocialMessage | null })[]>({
    queryKey: socialKeys.friends,
    queryFn: () => jfetch<{ friends: (SocialUser & { online: boolean; lastMessage?: SocialMessage | null })[] }>("/api/friends").then((r) => r.friends),
  });
}

// ---------- Messages ----------
export function useMessages(userId: string | null) {
  return useQuery<SocialMessage[]>({
    queryKey: socialKeys.messages(userId ?? "noop"),
    queryFn: () => jfetch<{ messages: SocialMessage[] }>(`/api/messages?userId=${userId}`).then((r) => r.messages),
    enabled: !!userId,
  });
}

export function useSendMessage(toId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      jfetch<{ message: SocialMessage }>("/api/messages", {
        method: "POST",
        body: JSON.stringify({ toId, content }),
      }),
    onSuccess: (data) => {
      qc.setQueryData<SocialMessage[]>(socialKeys.messages(toId), (old = []) => [...old, data.message]);
      qc.invalidateQueries({ queryKey: socialKeys.friends });
    },
  });
}

// ---------- Upload ----------
export function useUploadImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("upload failed");
      return res.json() as Promise<{ url: string }>;
    },
  });
}

// ---------- Current user ----------
export function useCurrentUser() {
  return useQuery<SocialUser | null>({
    queryKey: ["me"],
    queryFn: () => jfetch<{ user: SocialUser | null }>("/api/me").then((r) => r.user),
  });
}
