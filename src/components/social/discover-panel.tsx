"use client";

import * as React from "react";
import {
  X,
  Compass,
  Loader2,
  Check,
  UserPlus,
  Radio,
  MessageCircle,
  Heart,
  Users,
} from "lucide-react";
import { CirkleAvatar } from "@/components/brand/cirkle-avatar";
import { CirkleLogo } from "@/components/brand/cirkle-logo";
import {
  useFriendRequests,
  useFriendSuggestions,
  useTrending,
  useSendFriendRequest,
  useAcceptFriendRequest,
} from "@/hooks/use-discover";
import { useToast } from "@/hooks/use-toast";
import { timeAgo } from "@/lib/social/time";
import { cn } from "@/lib/utils";

interface DiscoverPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenProfile: (userId: string) => void;
  onOpenChat: (friendId?: string) => void;
}

export function DiscoverPanel({ open, onOpenChange, onOpenProfile, onOpenChat }: DiscoverPanelProps) {
  // Close on Escape.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  // Lock body scroll.
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-gold/20 px-4 py-3 glass-strong sm:px-6">
        <CirkleLogo size={32} animated />
        <div className="flex flex-col leading-none">
          <span className="font-display text-lg font-semibold gradient-text-gold">Discover</span>
          <span className="text-[10px] text-muted-foreground">your circle, expanded</span>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          aria-label="Close Discover"
          className="ml-auto grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:px-6">
          <FriendRequestsSection onOpenProfile={onOpenProfile} />
          <SuggestionsSection onOpenProfile={onOpenProfile} />
          <TrendingSection />
        </div>
      </div>
    </div>
  );
}

/* ----------------------- Friend requests ----------------------- */

function FriendRequestsSection({ onOpenProfile }: { onOpenProfile: (id: string) => void }) {
  const { data, isLoading } = useFriendRequests();
  const requests = data?.requests ?? [];
  const accept = useAcceptFriendRequest();
  const { toast } = useToast();

  const onAccept = async (userId: string, name: string) => {
    try {
      await accept.mutateAsync(userId);
      toast({ title: "Connection accepted", description: `${name} is now in your circle.` });
    } catch {
      toast({ title: "Could not accept", description: "Try again in a moment." });
    }
  };

  const onDecline = () => {
    // The API doesn't expose decline; we leave it as a soft action.
    toast({ title: "Declined", description: "Request dismissed — it remains pending on the server." });
  };

  return (
    <Section
      icon={<Users className="h-4 w-4" />}
      title="Connection requests"
      subtitle="People who want into your circle"
    >
      {isLoading ? (
        <SectionSkeleton rows={2} />
      ) : requests.length === 0 ? (
        <EmptyHint
          icon={<Users className="h-7 w-7" />}
          title="No pending requests"
          subtitle="When someone wants to connect, they appear here."
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {requests.map(({ friendship, user }) => (
            <div
              key={friendship.id}
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-3 shadow-soft"
            >
              <button
                onClick={() => onOpenProfile(user.id)}
                className="shrink-0"
                aria-label={`Open ${user.name}'s profile`}
              >
                <CirkleAvatar name={user.name} color={user.avatarColor} size="md" verified={user.verified} />
              </button>
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => onOpenProfile(user.id)}
                  className="block max-w-full truncate text-left font-display text-sm font-semibold hover:underline"
                >
                  {user.name}
                </button>
                <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => onAccept(user.id, user.name)}
                  disabled={accept.isPending}
                  aria-label="Accept request"
                  className="flex items-center gap-1 rounded-full bg-gradient-gold px-3 py-1.5 text-xs font-semibold text-charcoal shadow-soft transition hover:opacity-90 disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
                  Accept
                </button>
                <button
                  onClick={onDecline}
                  aria-label="Decline request"
                  className="rounded-full px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ----------------------- Suggestions ----------------------- */

function SuggestionsSection({ onOpenProfile }: { onOpenProfile: (id: string) => void }) {
  const { data: suggestions = [], isLoading } = useFriendSuggestions();
  const send = useSendFriendRequest();
  const { toast } = useToast();
  const [sentIds, setSentIds] = React.useState<Set<string>>(new Set());

  const onConnect = async (id: string, name: string) => {
    try {
      await send.mutateAsync(id);
      setSentIds((prev) => new Set(prev).add(id));
      toast({ title: "Connection sent", description: `${name} has been invited.` });
    } catch {
      toast({ title: "Could not send request", description: "Try again in a moment." });
    }
  };

  return (
    <Section
      icon={<Compass className="h-4 w-4" />}
      title="People you may know"
      subtitle="Expand your circle with new connections"
    >
      {isLoading ? (
        <SectionSkeleton rows={3} />
      ) : suggestions.length === 0 ? (
        <EmptyHint
          icon={<Compass className="h-7 w-7" />}
          title="You're all connected"
          subtitle="Everyone in your circle is already a friend. Try searching for someone new."
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {suggestions.map((u) => {
            const sent = sentIds.has(u.id);
            return (
              <div
                key={u.id}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card/70 p-4 text-center shadow-soft"
              >
                <button
                  onClick={() => onOpenProfile(u.id)}
                  aria-label={`Open ${u.name}'s profile`}
                >
                  <CirkleAvatar name={u.name} color={u.avatarColor} size="lg" verified={u.verified} />
                </button>
                <div className="min-w-0">
                  <button
                    onClick={() => onOpenProfile(u.id)}
                    className="block max-w-full truncate font-display text-sm font-semibold hover:underline"
                  >
                    {u.name}
                  </button>
                  <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
                </div>
                <button
                  onClick={() => onConnect(u.id, u.name)}
                  disabled={sent || send.isPending}
                  className={cn(
                    "flex w-full items-center justify-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    sent
                      ? "bg-muted/60 text-muted-foreground"
                      : "bg-gradient-gold text-charcoal shadow-soft hover:opacity-90"
                  )}
                >
                  {sent ? (
                    <>Request sent</>
                  ) : (
                    <>
                      <UserPlus className="h-3.5 w-3.5" strokeWidth={2.2} />
                      Connect
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

/* ----------------------- Trending ----------------------- */

function TrendingSection() {
  const { data: posts = [], isLoading } = useTrending(6);

  return (
    <Section
      icon={<Radio className="h-4 w-4" />}
      title="Trending echoes"
      subtitle="What your circle is resonating with right now"
    >
      {isLoading ? (
        <SectionSkeleton rows={3} />
      ) : posts.length === 0 ? (
        <EmptyHint
          icon={<Radio className="h-7 w-7" />}
          title="No trending echoes yet"
          subtitle="Resonate and reply to posts to shape what's trending."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {posts.map((p) => (
            <div
              key={p.id}
              className="group rounded-2xl border border-border/60 bg-card/70 p-3 shadow-soft transition hover:border-gold/30 hover:shadow-glass"
            >
              <div className="flex items-center gap-2.5">
                <CirkleAvatar
                  name={p.author.name}
                  color={p.author.avatarColor}
                  size="sm"
                  verified={p.author.verified}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold leading-tight">{p.author.name}</p>
                  <p className="text-[10px] text-muted-foreground">{timeAgo(p.createdAt)} ago</p>
                </div>
                <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold">
                  trending
                </span>
              </div>
              {p.content && (
                <p className="mt-2 line-clamp-2 text-sm leading-snug text-foreground/90">
                  {p.content}
                </p>
              )}
              {p.imageUrl && (
                <div className="mt-2 overflow-hidden rounded-xl">
                  <img
                    src={p.imageUrl}
                    alt=""
                    className="max-h-32 w-full object-cover transition group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {p.likesCount}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {p.commentsCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ----------------------- Helpers ----------------------- */

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-gold text-charcoal">
          {icon}
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/40 p-3"
        >
          <div className="h-10 w-10 rounded-full bg-muted skeleton-shimmer" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-28 rounded bg-muted skeleton-shimmer" />
            <div className="h-2.5 w-20 rounded bg-muted skeleton-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyHint({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/40 px-6 py-10 text-center">
      <div className="mb-2 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-gold/20 to-teal/20 text-gold">
        {icon}
      </div>
      <p className="font-display text-base font-semibold">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
