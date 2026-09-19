"use client";

import * as React from "react";
import { Search, X, Loader2, UserPlus, Radio } from "lucide-react";
import { CirkleAvatar } from "@/components/brand/cirkle-avatar";
import { CirkleMark } from "@/components/brand/cirkle-logo";
import { useSearch, useSendFriendRequest } from "@/hooks/use-discover";
import { useToast } from "@/hooks/use-toast";
import { timeAgo } from "@/lib/social/time";
import { cn } from "@/lib/utils";
import { PostCard } from "./post-card";

interface SearchOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery?: string;
  onOpenProfile: (userId: string) => void;
}

export function SearchOverlay({ open, onOpenChange, initialQuery = "", onOpenProfile }: SearchOverlayProps) {
  const [input, setInput] = React.useState(initialQuery);
  const [debounced, setDebounced] = React.useState(initialQuery);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // Sync incoming initialQuery when overlay opens.
  React.useEffect(() => {
    if (open) {
      setInput(initialQuery);
      setDebounced(initialQuery);
    }
  }, [open, initialQuery]);

  // Debounce: 250ms after last keystroke.
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(input.trim()), 250);
    return () => clearTimeout(t);
  }, [input]);

  // Autofocus on open.
  React.useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Escape to close.
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

  // Fetch results whenever the debounced query is long enough (hook is
  // called unconditionally — the hook itself no-ops when q < 2 chars).
  const { data, isLoading, isFetching } = useSearch(open ? debounced : "");
  const users = data?.users ?? [];
  const posts = data?.posts ?? [];
  const showResults = debounced.length >= 2;
  const hasResults = users.length > 0 || posts.length > 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 px-3 py-4 backdrop-blur-md sm:py-10">
      <div className="relative flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-gold/20 bg-card/95 shadow-float glass-strong">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <CirkleMark size={18} className="opacity-70" />
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search your circle…"
              aria-label="Search people and echoes"
              className="h-10 w-full rounded-full bg-muted/50 pl-9 pr-3 text-sm outline-none ring-1 ring-transparent transition focus:bg-background focus:ring-gold/40"
            />
          </div>
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close search"
            className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Results */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
          {!showResults ? (
            <EmptyState
              title="Search your circle"
              subtitle="Find people and echoes across Cirkle."
            />
          ) : isFetching && !data ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-gold" /> Searching…
            </div>
          ) : !hasResults ? (
            <EmptyState
              title={`No results for “${debounced}”`}
              subtitle="Try a different name, username, or phrase."
            />
          ) : (
            <div className="space-y-5">
              {/* People */}
              {users.length > 0 && (
                <section>
                  <h3 className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span>People</span>
                    <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">{users.length}</span>
                  </h3>
                  <div className="space-y-1.5">
                    {users.map((u) => (
                      <PersonRow
                        key={u.id}
                        userId={u.id}
                        name={u.name}
                        username={u.username}
                        color={u.avatarColor}
                        verified={u.verified}
                        onView={() => {
                          onOpenProfile(u.id);
                        }}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Echoes */}
              {posts.length > 0 && (
                <section>
                  <h3 className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Radio className="h-3 w-3" />
                    <span>Echoes</span>
                    <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">{posts.length}</span>
                  </h3>
                  <div className="space-y-3">
                    {posts.map((p) => (
                      <PostCard key={p.id} post={p} />
                    ))}
                  </div>
                </section>
              )}

              {isLoading && (
                <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-gold" /> Loading more…
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground">
          Press <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">Esc</kbd> to close · {timeAgo(new Date().toISOString())} live
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-gold/20 to-teal/20">
        <Search className="h-6 w-6 text-gold" />
      </div>
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function PersonRow({
  userId,
  name,
  username,
  color,
  verified,
  onView,
}: {
  userId: string;
  name: string;
  username: string;
  color: "teal" | "rose" | "steel" | "gold" | "charcoal";
  verified: boolean;
  onView: () => void;
}) {
  const send = useSendFriendRequest();
  const { toast } = useToast();
  const [sent, setSent] = React.useState(false);

  const onConnect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await send.mutateAsync(userId);
      setSent(true);
      toast({ title: "Connection sent", description: `Invitation sent to ${name}.` });
    } catch {
      toast({ title: "Could not send request", description: "Try again in a moment." });
    }
  };

  return (
    <button
      onClick={onView}
      className="group flex w-full items-center gap-3 rounded-2xl border border-transparent bg-card/40 px-2.5 py-2 text-left transition hover:border-gold/30 hover:bg-card"
    >
      <CirkleAvatar name={name} color={color} size="md" verified={verified} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-semibold leading-tight">{name}</p>
        <p className="truncate text-xs text-muted-foreground">@{username}</p>
      </div>
      <span
        role="button"
        tabIndex={0}
        onClick={onConnect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onConnect(e as unknown as React.MouseEvent);
          }
        }}
        className={cn(
          "flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition",
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
      </span>
    </button>
  );
}
