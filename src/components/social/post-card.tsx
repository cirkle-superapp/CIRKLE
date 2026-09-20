"use client";

import * as React from "react";
import {
  Radio,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Globe,
  MapPin,
  Loader2,
  Send,
  Heart,
  Sparkles,
  Brain,
  Bookmark,
} from "lucide-react";
import { CirkleAvatar } from "@/components/brand/cirkle-avatar";
import { CirkleMark } from "@/components/brand/cirkle-logo";
import type { SocialPost } from "@/lib/social/types";
import { useToggleLike, useComments, useAddComment, useCurrentUser } from "@/hooks/use-social-data";
import { useToggleSave, useSavedPosts } from "@/hooks/use-discover";
import { timeAgo } from "@/lib/social/time";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface PostCardProps {
  post: SocialPost;
  onOpenChat?: (friendId: string) => void;
}

// Resonance orbs: gold/rose/teal/steel — replace Facebook emoji reactions
const RESONANCES = [
  {
    key: "appreciate",
    label: "Appreciate",
    orb: "bg-gradient-to-br from-[hsl(39_55%_67%)] to-[hsl(39_45%_47%)]",
    icon: Sparkles,
    iconColor: "text-charcoal",
  },
  {
    key: "love",
    label: "Love",
    orb: "bg-gradient-to-br from-[hsl(351_51%_66%)] to-[hsl(351_51%_46%)]",
    icon: Heart,
    iconColor: "text-white",
  },
  {
    key: "resonate",
    label: "Resonate",
    orb: "bg-gradient-to-br from-[hsl(195_56%_43%)] to-[hsl(195_56%_18%)]",
    icon: Radio,
    iconColor: "text-white",
  },
  {
    key: "ponder",
    label: "Ponder",
    orb: "bg-gradient-to-br from-[hsl(211_30%_62%)] to-[hsl(211_30%_32%)]",
    icon: Brain,
    iconColor: "text-white",
  },
] as const;

export function PostCard({ post }: PostCardProps) {
  const toggleLike = useToggleLike();
  const [showComments, setShowComments] = React.useState(false);
  const [showResonances, setShowResonances] = React.useState(false);
  const { toast } = useToast();

  const liked = post.likedByMe;

  const onResonate = () => {
    toggleLike.mutate(post.id);
  };

  const onRipple = () => {
    navigator.clipboard?.writeText(post.content.slice(0, 100)).catch(() => {});
    toast({ title: "Rippled", description: "Echo this post across your circle." });
  };

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-border/60 bg-card/90 shadow-soft backdrop-blur transition hover:shadow-glass">
      {/* Subtle gold left accent on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-3 left-0 w-0.5 rounded-r bg-gradient-to-b from-[hsl(39_45%_57%)] via-[hsl(351_41%_56%)] to-[hsl(195_56%_23%)] opacity-0 transition group-hover:opacity-100"
      />
      {/* Tiny CirkleMark watermark in corner */}
      <span aria-hidden className="pointer-events-none absolute right-3 top-3 opacity-[0.07] transition group-hover:opacity-[0.12]">
        <CirkleMark size={36} />
      </span>

      {/* Header */}
      <div className="flex items-center gap-2.5 p-3 sm:p-4">
        <CirkleAvatar name={post.author.name} color={post.author.avatarColor} size="md" verified={post.author.verified} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-semibold leading-tight">{post.author.name}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>{timeAgo(post.createdAt)}</span>
            <span>·</span>
            <Globe className="h-3 w-3" />
            {post.feeling && <span>· is {post.feeling}</span>}
          </div>
          {post.location && (
            <p className="mt-0.5 flex items-center gap-0.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {post.location}
            </p>
          )}
        </div>
        <SaveButton postId={post.id} />
        <button
          className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted"
          aria-label="More options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      {post.content && (
        <p className="whitespace-pre-wrap px-3 pb-3 text-sm leading-relaxed sm:px-4 sm:pb-4">{post.content}</p>
      )}

      {post.imageUrl && (
        <div className="relative w-full overflow-hidden bg-muted">
          <img
            src={post.imageUrl}
            alt=""
            className="max-h-[34rem] w-full object-cover"
            loading="lazy"
            decoding="async"
            onLoad={(e) => {
              // Auto-adjust container height to image aspect ratio
              const img = e.currentTarget;
              img.parentElement!.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
            }}
          />
        </div>
      )}

      {/* Counts */}
      {(post.likesCount > 0 || post.commentsCount > 0) && (
        <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground sm:px-4">
          {post.likesCount > 0 ? (
            <div className="flex items-center gap-1.5">
              {/* gradient ring with count instead of thumbs-up */}
              <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-[hsl(39_45%_57%)] via-[hsl(351_41%_56%)] to-[hsl(195_56%_23%)] p-[2px]">
                <span className="grid h-full w-full place-items-center rounded-full bg-card text-[9px] font-bold text-foreground">
                  {post.likesCount}
                </span>
              </span>
              <span>resonances</span>
            </div>
          ) : (
            <span />
          )}
          {post.commentsCount > 0 && (
            <button onClick={() => setShowComments((v) => !v)} className="hover:underline">
              {post.commentsCount} {post.commentsCount !== 1 ? "replies" : "reply"}
            </button>
          )}
        </div>
      )}

      {/* Action bar — pill buttons */}
      <div className="flex items-center gap-1.5 border-t border-border/60 px-2 py-1.5 sm:px-3">
        {/* Resonate */}
        <div
          className="relative flex-1"
          onMouseEnter={() => setShowResonances(true)}
          onMouseLeave={() => setShowResonances(false)}
        >
          <button
            onClick={onResonate}
            aria-pressed={liked}
            className={cn(
              "flex h-9 w-full items-center justify-center gap-1.5 rounded-full text-sm font-medium transition",
              liked
                ? "bg-gradient-gold text-charcoal shadow-soft"
                : "text-muted-foreground hover:bg-muted/60"
            )}
          >
            <Radio className={cn("h-4 w-4", liked && "animate-pulse")} />
            <span>{liked ? "Resonated" : "Resonate"}</span>
          </button>
          {showResonances && (
            <div className="absolute -top-12 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border/60 bg-card p-1.5 shadow-float">
              {RESONANCES.map((r) => (
                <button
                  key={r.key}
                  onClick={onResonate}
                  title={r.label}
                  aria-label={r.label}
                  className="group/orb grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br transition hover:scale-110"
                >
                  <span className={cn("grid h-9 w-9 place-items-center rounded-full", r.orb)}>
                    <r.icon className={cn("h-4 w-4", r.iconColor)} />
                  </span>
                  <span className="pointer-events-none absolute -bottom-5 whitespace-nowrap rounded-full bg-card px-1.5 py-0.5 text-[10px] font-medium text-foreground opacity-0 shadow-soft transition group-hover/orb:opacity-100">
                    {r.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reply */}
        <button
          onClick={() => setShowComments((v) => !v)}
          aria-expanded={showComments}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-medium text-muted-foreground transition hover:bg-muted/60"
        >
          <MessageCircle className="h-4 w-4" />
          <span>Reply</span>
        </button>

        {/* Ripple */}
        <button
          onClick={onRipple}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-medium text-muted-foreground transition hover:bg-muted/60"
        >
          <Share2 className="h-4 w-4" />
          <span>Ripple</span>
        </button>
      </div>

      {/* Replies */}
      {showComments && <ReplyThread postId={post.id} />}
    </article>
  );
}

function ReplyThread({ postId }: { postId: string }) {
  const { data: comments = [], isLoading } = useComments(postId);
  const addComment = useAddComment(postId);
  const { data: me } = useCurrentUser();
  const [text, setText] = React.useState("");

  const submit = async () => {
    if (!text.trim() || !me) return;
    try {
      await addComment.mutateAsync(text.trim());
      setText("");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="border-t border-border/60 bg-muted/20 p-3 sm:p-4">
      <div className="mb-2 flex items-center gap-1.5">
        <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Replies</span>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading replies…
        </div>
      ) : (
        <div className="space-y-2.5">
          {comments.map((c) => {
            const mine = c.author.id === me?.id;
            return (
              <div key={c.id} className={cn("flex gap-2", mine && "flex-row-reverse")}>
                <CirkleAvatar name={c.author.name} color={c.author.avatarColor} size="sm" verified={c.author.verified} />
                <div className={cn("min-w-0 flex-1", mine && "flex flex-col items-end")}>
                  <div
                    className={cn(
                      "inline-block rounded-2xl px-3 py-2 shadow-soft",
                      mine
                        ? "rounded-tr-sm bg-gradient-gold text-charcoal"
                        : "rounded-tl-sm bg-card"
                    )}
                  >
                    {!mine && <p className="text-xs font-semibold leading-tight">{c.author.name}</p>}
                    <p className="mt-0.5 text-sm leading-snug">{c.content}</p>
                  </div>
                  <p className={cn("mt-1 pl-2 text-[11px] text-muted-foreground", mine && "pr-2 pl-0 text-right")}>
                    {timeAgo(c.createdAt)} ago
                  </p>
                </div>
              </div>
            );
          })}
          {comments.length === 0 && (
            <p className="py-2 text-center text-xs text-muted-foreground">No replies yet. Start the resonance.</p>
          )}
        </div>
      )}

      {me && (
        <div className="mt-3 flex items-center gap-2">
          <CirkleAvatar name={me.name} color={me.avatarColor} size="sm" verified={me.verified} />
          <div className="relative flex-1">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Add a reply…"
              aria-label="Add a reply"
              className="h-9 w-full rounded-full bg-card px-4 pr-10 text-sm outline-none ring-1 ring-transparent transition focus:ring-gold/40"
            />
            <button
              onClick={submit}
              disabled={!text.trim() || addComment.isPending}
              aria-label="Send reply"
              className="absolute right-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-gradient-gold text-charcoal transition hover:opacity-90 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Save toggle (bookmark) — appears in the post header.
 * Optimistically reflects the saved state by checking the cached
 * `useSavedPosts()` query data; mutation toggles on the server and
 * invalidates the cached list.
 */
function SaveButton({ postId }: { postId: string }) {
  const toggle = useToggleSave();
  const { data: saved = [] } = useSavedPosts();
  const { toast } = useToast();

  // Track an optimistic state so the UI flips immediately on click
  // even before react-query invalidates.
  const [optimistic, setOptimistic] = React.useState<boolean | null>(null);

  const serverSaved = saved.some((p) => p.id === postId);
  const saved_ = optimistic ?? serverSaved;

  const onClick = async () => {
    const next = !saved_;
    setOptimistic(next);
    try {
      const res = await toggle.mutateAsync(postId);
      setOptimistic(res.saved);
      toast({
        title: res.saved ? "Saved" : "Removed",
        description: res.saved
          ? "Echo saved to your collection."
          : "Echo removed from saved.",
      });
    } catch {
      setOptimistic(null);
      toast({ title: "Could not save", description: "Try again in a moment." });
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={toggle.isPending}
      aria-pressed={saved_}
      aria-label={saved_ ? "Remove from saved" : "Save echo"}
      title={saved_ ? "Saved" : "Save"}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-full transition",
        saved_
          ? "text-gold hover:bg-gold/10"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Bookmark
        className={cn("h-4 w-4 transition", saved_ && "fill-current")}
        strokeWidth={2}
      />
    </button>
  );
}

