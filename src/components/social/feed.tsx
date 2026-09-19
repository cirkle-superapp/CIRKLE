"use client";

import * as React from "react";
import { Hourglass, Hash } from "lucide-react";
import { usePosts } from "@/hooks/use-social-data";
import { timeAgo } from "@/lib/social/time";
import { StoriesBar } from "./stories-bar";
import { CreatePost } from "./create-post";
import { PostCard } from "./post-card";

/**
 * Feed — interleaves regular posts with unsealed time capsules.
 *
 * Capsules are fetched from `/api/capsules` (already filtered to public +
 * unsealed + unsealAt <= now, plus the current user's own). They are merged
 * with posts from `/api/posts` into a single timeline, sorted by date desc.
 * A capsule is rendered as a distinct gold-bordered card so it visually
 * stands apart from a regular echo.
 */

interface Capsule {
  id: string;
  payload: string;
  anchorHash: string;
  sealedAt: string;
  unsealAt: string;
  unsealed: boolean;
  visibility: string;
  createdAt: string;
}

type FeedItem =
  | { type: "post"; id: string; date: string; post: import("@/lib/social/types").SocialPost }
  | { type: "capsule"; id: string; date: string; capsule: Capsule };

export function Feed() {
  const { data: posts, isLoading: postsLoading, isError: postsError } = usePosts();
  const [capsules, setCapsules] = React.useState<Capsule[]>([]);
  const [capsulesLoading, setCapsulesLoading] = React.useState(true);
  const [capsulesError, setCapsulesError] = React.useState(false);

  // Fetch capsules in parallel — only unsealed public ones (or our own) are
  // returned by the endpoint. We filter to those whose unsealAt has actually
  // passed (defensive — the API already filters but the response shape is
  // still authoritative).
  React.useEffect(() => {
    let cancelled = false;
    setCapsulesLoading(true);
    fetch("/api/capsules", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed (${r.status})`);
        return r.json() as Promise<{ capsules: Capsule[] }>;
      })
      .then((d) => {
        if (cancelled) return;
        const now = Date.now();
        const visible = (d.capsules ?? []).filter(
          (c) => c.unsealed && new Date(c.unsealAt).getTime() <= now
        );
        setCapsules(visible);
        setCapsulesError(false);
      })
      .catch(() => {
        if (!cancelled) setCapsulesError(true);
      })
      .finally(() => {
        if (!cancelled) setCapsulesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Merge posts + capsules into a single timeline sorted by date desc.
  const items = React.useMemo<FeedItem[]>(() => {
    const postItems: FeedItem[] = (posts ?? []).map((p) => ({
      type: "post",
      id: p.id,
      date: p.createdAt,
      post: p,
    }));
    const capsuleItems: FeedItem[] = capsules.map((c) => ({
      type: "capsule",
      id: c.id,
      // Sort capsules by their unsealAt (the moment they "happened" in the feed)
      date: c.unsealAt,
      capsule: c,
    }));
    return [...postItems, ...capsuleItems].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [posts, capsules]);

  const isLoading = postsLoading || capsulesLoading;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <StoriesBar />
      <CreatePost />

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/60 bg-card/80 p-4">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-full bg-muted skeleton-shimmer" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-32 rounded bg-muted skeleton-shimmer" />
                  <div className="h-2 w-20 rounded bg-muted skeleton-shimmer" />
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="h-3 w-full rounded bg-muted skeleton-shimmer" />
                <div className="h-3 w-4/5 rounded bg-muted skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      )}

      {postsError && (
        <div className="rounded-2xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
          Could not load posts. Please refresh.
        </div>
      )}

      {items.map((item) =>
        item.type === "post" ? (
          <PostCard key={`post-${item.id}`} post={item.post} />
        ) : (
          <CapsuleCard key={`capsule-${item.id}`} capsule={item.capsule} />
        )
      )}

      {items.length === 0 && !isLoading && (
        <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
          <p className="font-display text-xl font-semibold">Your circle is quiet</p>
          <p className="mt-1 text-sm text-muted-foreground">Be the first to share something.</p>
        </div>
      )}

      <p className="py-4 text-center text-xs text-muted-foreground">
        You&apos;re all caught up · <span className="gradient-text-gold font-semibold">Cirkle</span>
      </p>
    </div>
  );
}

function CapsuleCard({ capsule }: { capsule: Capsule }) {
  const sealedDate = new Date(capsule.sealedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const unsealedDate = new Date(capsule.unsealAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return (
    <article
      className="rounded-2xl border-2 border-gold/50 bg-gradient-to-br from-gold/5 via-card/80 to-rose/5 p-4 shadow-soft backdrop-blur sm:p-5"
      aria-label="Time capsule echo"
    >
      <header className="mb-2 flex flex-wrap items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-gold text-charcoal shadow-soft">
          <Hourglass className="h-4 w-4" strokeWidth={2.4} />
        </span>
        <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">
          <Hourglass className="h-3 w-3" />
          Time Capsule
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground">
          unsealed {timeAgo(capsule.unsealAt)} ago
        </span>
      </header>

      <p className="mb-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
        {capsule.payload}
      </p>

      <p className="text-[11px] text-muted-foreground">
        Sealed on <span className="font-medium text-foreground/80">{sealedDate}</span>
        {" · "}unsealed <span className="font-medium text-foreground/80">{unsealedDate}</span>
      </p>

      <footer className="mt-2 flex items-center gap-1.5 rounded-xl bg-muted/40 px-2.5 py-1.5">
        <Hash className="h-3 w-3 shrink-0 text-gold" />
        <span className="truncate font-mono text-[10px] text-muted-foreground">
          sha256:{capsule.anchorHash.slice(0, 32)}…
        </span>
        <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold/80">
          proof-of-time
        </span>
      </footer>
    </article>
  );
}
