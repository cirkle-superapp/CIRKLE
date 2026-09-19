"use client";

import * as React from "react";
import { X, Play, Eye, ThumbsUp, Clock, Loader2, ChevronLeft, Search } from "lucide-react";
import { CirkleLogo } from "@/components/brand/cirkle-logo";
import {
  useMashahdVideos,
  useMashahdVideo,
  useMashahdLike,
  useMashahdView,
  type MashahdVideo,
} from "@/hooks/use-mashahd";
import { timeAgo } from "@/lib/social/time";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface MashahdPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES = ["All", "Gaming", "Nature", "Tech", "Food", "Art", "Music", "Travel", "Sports"];

export function MashahdPanel({ open, onOpenChange }: MashahdPanelProps) {
  const [category, setCategory] = React.useState("All");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");

  const { data: videos = [], isLoading } = useMashahdVideos(category === "All" ? undefined : category);
  const filtered = query
    ? videos.filter(
        (v) =>
          v.title.toLowerCase().includes(query.toLowerCase()) ||
          v.channel?.name?.toLowerCase().includes(query.toLowerCase())
      )
    : videos;

  React.useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setQuery("");
      setCategory("All");
    }
  }, [open]);

  // Close on Escape.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedId) setSelectedId(null);
        else onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, selectedId, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-gold/20 px-4 py-3 glass-strong">
        <CirkleLogo size={32} animated />
        <div className="flex flex-col leading-none">
          <span className="font-display text-lg font-semibold gradient-text-gold">Mashahd</span>
          <span className="text-[10px] text-muted-foreground">your viewing circle · Turso-powered</span>
        </div>
        <div className="relative ml-auto hidden sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Mashahd…"
            className="h-9 w-56 rounded-full bg-muted/60 pl-9 pr-3 text-sm outline-none ring-1 ring-transparent transition focus:w-72 focus:bg-background focus:ring-gold/40"
          />
        </div>
        <button
          onClick={() => onOpenChange(false)}
          aria-label="Close Mashahd"
          className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {selectedId ? (
          <VideoPlayer videoId={selectedId} onBack={() => setSelectedId(null)} />
        ) : (
          <div className="mx-auto max-w-6xl px-4 py-6">
            {/* Category chips */}
            <div className="mb-5 flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-xs font-medium transition",
                    category === cat
                      ? "bg-gradient-gold text-charcoal shadow-soft"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                    <div className="aspect-video bg-muted skeleton-shimmer" />
                    <div className="space-y-2 p-3">
                      <div className="h-3 w-3/4 rounded bg-muted skeleton-shimmer" />
                      <div className="h-2.5 w-1/2 rounded bg-muted skeleton-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <p className="font-display text-xl font-semibold">No videos found</p>
                <p className="mt-1 text-sm text-muted-foreground">Try a different category or search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((v) => (
                  <VideoCard key={v.id} video={v} onClick={() => setSelectedId(v.id)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function VideoCard({ video, onClick }: { video: MashahdVideo; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group overflow-hidden rounded-2xl border border-border/60 bg-card text-left shadow-soft transition hover:shadow-glass"
    >
      <div className="relative aspect-video overflow-hidden">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-teal/30 to-steel/20 text-muted-foreground">
            <Play className="h-8 w-8 opacity-50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition group-hover:opacity-100" />
        <div className="absolute right-2 bottom-2 grid h-9 w-9 place-items-center rounded-full bg-gradient-gold text-charcoal opacity-0 shadow-float transition group-hover:opacity-100">
          <Play className="h-4 w-4 fill-current" />
        </div>
        <span className="absolute left-2 bottom-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {fmtDuration(video.durationSec)}
        </span>
      </div>
      <div className="flex gap-2.5 p-3">
        {video.channel && (
          <div
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-cream",
              video.channel.avatarColor
                ? `bg-gradient-to-br ${channelGradient(video.channel.avatarColor)}`
                : "bg-gradient-to-br from-teal to-steel"
            )}
          >
            {video.channel.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">{video.title}</p>
          {video.channel && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{video.channel.name}</p>
          )}
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {fmtCount(video.views)}</span>
            <span className="flex items-center gap-0.5"><ThumbsUp className="h-3 w-3" /> {fmtCount(video.likes)}</span>
            <span>· {timeAgo(video.createdAt)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function VideoPlayer({ videoId, onBack }: { videoId: string; onBack: () => void }) {
  const { data: video, isLoading } = useMashahdVideo(videoId);
  const like = useMashahdLike();
  const view = useMashahdView();
  const { toast } = useToast();
  const viewedRef = React.useRef(false);

  React.useEffect(() => {
    if (video && !viewedRef.current) {
      viewedRef.current = true;
      view.mutate(video.id);
    }
  }, [video, view]);

  const onLike = () => {
    if (!video) return;
    like.mutate(video.id);
    toast({ title: "Appreciated!", description: "Your like was recorded on Mashahd." });
  };

  if (isLoading || !video) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-5">
      <button
        onClick={onBack}
        className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Mashahd
      </button>

      {/* Player */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-black shadow-float">
        {video.videoUrl ? (
          <video
            src={video.videoUrl}
            poster={video.thumbnailUrl || undefined}
            controls
            autoPlay
            className="aspect-video w-full bg-black"
          />
        ) : (
          <div className="grid aspect-video w-full place-items-center bg-black text-muted-foreground">
            <div className="text-center">
              <Play className="mx-auto mb-2 h-10 w-10 opacity-40" />
              <p className="text-sm">Video source not available</p>
            </div>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="mt-4">
        <h1 className="font-display text-xl font-semibold leading-tight sm:text-2xl">{video.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {video.channel && (
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full text-[10px] font-bold text-cream",
                  video.channel.avatarColor
                    ? `bg-gradient-to-br ${channelGradient(video.channel.avatarColor)}`
                    : "bg-gradient-to-br from-teal to-steel"
                )}
              >
                {video.channel.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="font-medium text-foreground">{video.channel.name}</span>
              {video.channel.subscriberCount > 0 && (
                <span>· {fmtCount(video.channel.subscriberCount)} subscribers</span>
              )}
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={onLike}
            disabled={like.isPending}
            className="flex items-center gap-1.5 rounded-full bg-muted/60 px-4 py-1.5 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
          >
            <ThumbsUp className="h-4 w-4" /> {fmtCount(like.data?.likes ?? video.likes)}
          </button>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Eye className="h-4 w-4" /> {fmtCount(view.data?.views ?? video.views)} views
          </span>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" /> {timeAgo(video.createdAt)} ago
          </span>
          <span className="rounded-full bg-gold/15 px-2.5 py-1 text-xs font-medium text-gold">{video.category}</span>
        </div>

        {video.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {video.tags.map((t) => (
              <span key={t} className="rounded-full bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                #{t}
              </span>
            ))}
          </div>
        )}

        {video.description && (
          <p className="mt-4 whitespace-pre-wrap rounded-xl bg-muted/30 p-3 text-sm leading-relaxed">
            {video.description}
          </p>
        )}

        {/* Comments */}
        {video.comments.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2 font-display text-lg font-semibold">{video.comments.length} Replies</h3>
            <div className="space-y-2">
              {video.comments.map((c) => (
                <div key={c.id} className="rounded-xl bg-muted/30 p-3">
                  <p className="text-xs font-semibold">{c.authorName ?? "Anonymous"}</p>
                  <p className="mt-0.5 text-sm">{c.content}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(c.createdAt)} ago</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function channelGradient(color: string): string {
  const map: Record<string, string> = {
    gold: "from-[hsl(39_55%_67%)] to-[hsl(39_45%_47%)]",
    teal: "from-[hsl(195_56%_33%)] to-[hsl(195_56%_18%)]",
    rose: "from-[hsl(351_51%_66%)] to-[hsl(351_51%_46%)]",
    steel: "from-[hsl(211_30%_52%)] to-[hsl(211_30%_32%)]",
    charcoal: "from-[hsl(60_8%_22%)] to-[hsl(60_8%_9%)]",
  };
  return map[color] ?? "from-teal to-steel";
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
