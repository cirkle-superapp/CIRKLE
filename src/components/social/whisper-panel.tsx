"use client";

import * as React from "react";
import {
  X,
  Flame,
  Send,
  Loader2,
  Lock,
  Eye,
  Trash2,
  Clock,
  ChevronDown,
  Check,
} from "lucide-react";
import { CirkleMark } from "@/components/brand/cirkle-logo";
import { CirkleAvatar } from "@/components/brand/cirkle-avatar";
import { useFriends, useCurrentUser } from "@/hooks/use-social-data";
import { useToast } from "@/hooks/use-toast";
import { timeAgo } from "@/lib/social/time";
import { cn } from "@/lib/utils";

interface WhisperPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenChat: () => void;
}

interface Whisper {
  id: string;
  fromId: string;
  toId: string;
  body: string;
  ttlSeconds: number;
  viewCount: number;
  maxViews: number;
  burned: boolean;
  firstViewedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface Friend {
  id: string;
  name: string;
  username: string;
  avatarColor: "teal" | "rose" | "steel" | "gold" | "charcoal";
  verified: boolean;
}

const TTL_PRESETS = [
  { label: "10s", seconds: 10 },
  { label: "30s", seconds: 30 },
  { label: "1 min", seconds: 60 },
  { label: "5 min", seconds: 300 },
];

const VIEW_PRESETS = [1, 3, 5];

export function WhisperPanel({ open, onOpenChange }: WhisperPanelProps) {
  const { data: me } = useCurrentUser();
  const { data: friends = [] } = useFriends();
  const { toast } = useToast();

  const [body, setBody] = React.useState("");
  const [toId, setToId] = React.useState<string>("");
  const [ttl, setTtl] = React.useState(30);
  const [maxViews, setMaxViews] = React.useState(1);
  const [submitting, setSubmitting] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Close on Escape + lock scroll.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (pickerOpen) setPickerOpen(false);
        else onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onOpenChange, pickerOpen]);

  // Reset on close.
  React.useEffect(() => {
    if (!open) {
      setBody("");
      setToId("");
      setTtl(30);
      setMaxViews(1);
      setPickerOpen(false);
    }
  }, [open]);

  const send = async () => {
    const text = body.trim();
    if (!text) {
      toast({ title: "Whisper something first", description: "It can be one word — that’s enough." });
      return;
    }
    if (!toId) {
      toast({ title: "Pick a recipient", description: "Who should this whisper reach?" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/whispers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toId, body: text, ttlSeconds: ttl, maxViews }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Failed (${res.status})`);
      }
      toast({
        title: "Whisper sent",
        description: `Burns in ${ttl}s after first view · up to ${maxViews} view${maxViews === 1 ? "" : "s"}.`,
      });
      setBody("");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast({
        title: "Could not send whisper",
        description: e instanceof Error ? e.message.slice(0, 80) : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedFriend: Friend | undefined = friends.find((f) => f.id === toId);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-rose/25 px-4 py-3 glass-strong sm:px-6">
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-rose to-gold text-cream shadow-soft">
          <Flame className="h-5 w-5" strokeWidth={2.4} />
        </span>
        <div className="flex flex-col leading-none">
          <span className="font-display text-lg font-semibold text-rose">Whispers</span>
          <span className="text-[10px] text-muted-foreground">self-destructing messages</span>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          aria-label="Close Whispers"
          className="ml-auto grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
          {/* Send a whisper */}
          <section className="mb-6 rounded-3xl border border-rose/20 bg-gradient-to-br from-rose/5 via-card/40 to-gold/5 p-5 shadow-soft sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Send className="h-4 w-4 text-rose" />
              <h2 className="font-display text-lg font-semibold">Send a whisper</h2>
            </div>

            {/* Recipient picker */}
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              To
            </label>
            <div className="relative mb-4">
              <button
                onClick={() => setPickerOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={pickerOpen}
                className={cn(
                  "flex h-11 w-full items-center gap-2.5 rounded-2xl border bg-background/80 px-3 text-left transition",
                  pickerOpen ? "border-rose/60 ring-1 ring-rose/40" : "border-border/60 hover:bg-muted/40"
                )}
              >
                {selectedFriend ? (
                  <>
                    <CirkleAvatar
                      name={selectedFriend.name}
                      color={selectedFriend.avatarColor}
                      size="sm"
                      verified={selectedFriend.verified}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-tight">{selectedFriend.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">@{selectedFriend.username}</p>
                    </div>
                  </>
                ) : (
                  <span className="flex-1 text-sm text-muted-foreground">Choose a friend…</span>
                )}
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 text-muted-foreground transition", pickerOpen && "rotate-180")}
                />
              </button>
              {pickerOpen && (
                <div
                  role="listbox"
                  className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-2xl border border-border/60 bg-card p-1 shadow-float"
                >
                  {friends.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-muted-foreground">
                      No friends yet — connect with someone in Discover first.
                    </div>
                  ) : (
                    friends.map((f) => (
                      <button
                        key={f.id}
                        role="option"
                        aria-selected={f.id === toId}
                        onClick={() => {
                          setToId(f.id);
                          setPickerOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-muted/60",
                          f.id === toId && "bg-rose/5"
                        )}
                      >
                        <CirkleAvatar name={f.name} color={f.avatarColor} size="sm" verified={f.verified} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold leading-tight">{f.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">@{f.username}</p>
                        </div>
                        {f.id === toId && <Check className="h-4 w-4 text-rose" />}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Body */}
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Type something fleeting…"
              className="w-full resize-none rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-base outline-none ring-1 ring-transparent transition placeholder:text-muted-foreground focus:border-rose/40 focus:ring-rose/40"
            />
            <div className="mt-1 text-right text-[11px] text-muted-foreground">
              {body.length} / 500
            </div>

            {/* TTL */}
            <div className="mt-3">
              <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <Clock className="h-3 w-3" /> Burns in (after first view)
              </p>
              <div className="flex flex-wrap gap-2">
                {TTL_PRESETS.map((p) => {
                  const sel = ttl === p.seconds;
                  return (
                    <button
                      key={p.seconds}
                      onClick={() => setTtl(p.seconds)}
                      aria-pressed={sel}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                        sel
                          ? "border-rose bg-rose text-cream shadow-soft"
                          : "border-border/60 bg-muted/40 hover:bg-muted"
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Max views */}
            <div className="mt-4">
              <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <Eye className="h-3 w-3" /> Max views
              </p>
              <div className="flex flex-wrap gap-2">
                {VIEW_PRESETS.map((v) => {
                  const sel = maxViews === v;
                  return (
                    <button
                      key={v}
                      onClick={() => setMaxViews(v)}
                      aria-pressed={sel}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                        sel
                          ? "border-gold bg-gradient-gold text-charcoal shadow-soft"
                          : "border-border/60 bg-muted/40 hover:bg-muted"
                      )}
                    >
                      {v} view{v === 1 ? "" : "s"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Send */}
            <button
              onClick={send}
              disabled={submitting || !body.trim() || !toId}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose via-rose to-gold text-cream shadow-soft transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Flame className="h-4 w-4" strokeWidth={2.4} />
                  <span className="font-display text-base font-semibold">Send whisper</span>
                </>
              )}
            </button>
          </section>

          {/* Whispers received */}
          <ReceivedWhispers
            refreshKey={refreshKey}
            currentUserName={me?.name ?? "You"}
            friends={friends as Friend[]}
          />
        </div>
      </div>
    </div>
  );
}

function ReceivedWhispers({
  refreshKey,
  currentUserName,
  friends,
}: {
  refreshKey: number;
  currentUserName: string;
  friends: Friend[];
}) {
  const { data, isLoading, error } = useWhispers(refreshKey);
  const whispers = data?.whispers ?? [];

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-border/60 bg-card/40 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Lock className="h-4 w-4 text-rose" />
          <h2 className="font-display text-base font-semibold">Whispers received</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-rose" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose/30 bg-rose/5 p-4 text-sm text-rose">
        Couldn’t load whispers. {String(error).slice(0, 80)}
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-border/60 bg-card/40 p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Lock className="h-4 w-4 text-rose" />
        <h2 className="font-display text-base font-semibold">Whispers received</h2>
        <span className="ml-auto rounded-full bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
          {whispers.length} active
        </span>
      </div>

      {whispers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
          <Flame className="mx-auto mb-2 h-8 w-8 text-rose/70" />
          <p className="font-display text-base font-semibold">No whispers yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Send a self-destructing message to someone in your circle.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {whispers.map((w) => (
            <WhisperCard key={w.id} whisper={w} friends={friends} />
          ))}
        </ul>
      )}
    </section>
  );
}

function WhisperCard({ whisper, friends }: { whisper: Whisper; friends: Friend[] }) {
  const { toast } = useToast();
  const sender = friends.find((f) => f.id === whisper.fromId);
  const [revealed, setRevealed] = React.useState(false);
  const [revealedBody, setRevealedBody] = React.useState<string | null>(null);
  const [viewing, setViewing] = React.useState(false);
  const [localBurned, setLocalBurned] = React.useState(whisper.burned);
  const [expiresAt, setExpiresAt] = React.useState<string | null>(whisper.expiresAt);
  const [remainingViews, setRemainingViews] = React.useState<number>(
    Math.max(0, whisper.maxViews - whisper.viewCount)
  );
  const [now, setNow] = React.useState(Date.now());

  // Live countdown tick.
  React.useEffect(() => {
    if (!expiresAt || localBurned) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [expiresAt, localBurned]);

  const ttlMs = whisper.ttlSeconds * 1000;
  const totalLifespan = expiresAt ? new Date(expiresAt).getTime() - new Date(whisper.firstViewedAt || whisper.createdAt).getTime() : ttlMs;
  const remainingMs = expiresAt ? Math.max(0, new Date(expiresAt).getTime() - now) : ttlMs;
  const progress = totalLifespan > 0 ? Math.max(0, Math.min(100, (remainingMs / totalLifespan) * 100)) : 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  const onView = async () => {
    setViewing(true);
    try {
      const res = await fetch(`/api/whispers/${whisper.id}/view`, { method: "POST" });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data = (await res.json()) as {
        body: string | null;
        viewCount: number;
        maxViews: number;
        expiresAt: string | null;
        burned: boolean;
        remaining: number;
      };
      if (data.burned || data.body === null) {
        setLocalBurned(true);
        setRevealed(false);
        toast({
          title: "Whisper burned",
          description: "It self-destructed — the moment passed.",
        });
      } else {
        setRevealedBody(data.body);
        setRevealed(true);
        setExpiresAt(data.expiresAt);
        setRemainingViews(data.remaining);
      }
    } catch (e) {
      toast({
        title: "Could not open whisper",
        description: e instanceof Error ? e.message.slice(0, 80) : "Try again.",
        variant: "destructive",
      });
    } finally {
      setViewing(false);
    }
  };

  if (localBurned) {
    return (
      <li className="rounded-2xl border border-rose/30 bg-rose/5 p-4">
        <div className="flex items-center gap-3">
          {sender && (
            <CirkleAvatar name={sender.name} color={sender.avatarColor} size="sm" verified={sender.verified} />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">
              {sender?.name ?? "Someone"}
            </p>
            <p className="text-[11px] text-muted-foreground">{timeAgo(whisper.createdAt)} ago</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-rose/15 px-2.5 py-1 text-[11px] font-semibold text-rose">
            <Trash2 className="h-3 w-3" /> Burned
          </span>
        </div>
        <p className="mt-3 text-sm italic text-muted-foreground">
          This whisper has self-destructed. Nothing left but the memory.
        </p>
      </li>
    );
  }

  // Not yet viewed (firstViewedAt null + no reveal)
  if (!revealed && !whisper.firstViewedAt) {
    return (
      <li className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/5 to-card/40 p-4">
        <div className="flex items-center gap-3">
          {sender && (
            <CirkleAvatar name={sender.name} color={sender.avatarColor} size="sm" verified={sender.verified} />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">{sender?.name ?? "Someone"}</p>
            <p className="text-[11px] text-muted-foreground">
              {timeAgo(whisper.createdAt)} ago · {whisper.maxViews} view{whisper.maxViews === 1 ? "" : "s"} max
            </p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 text-[11px] font-semibold text-gold">
            <Lock className="h-3 w-3" /> Sealed
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">
            <Clock className="mr-1 inline h-3 w-3" />
            Tap to view — burns in {whisper.ttlSeconds}s after first view
          </p>
          <button
            onClick={onView}
            disabled={viewing}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-gold px-3.5 py-1.5 text-xs font-semibold text-charcoal shadow-soft transition hover:opacity-90 disabled:opacity-50"
          >
            {viewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" strokeWidth={2.4} />}
            View
          </button>
        </div>
      </li>
    );
  }

  // Revealed / active
  return (
    <li className="rounded-2xl border border-teal/30 bg-gradient-to-br from-teal/5 to-card/40 p-4">
      <div className="flex items-center gap-3">
        {sender && (
          <CirkleAvatar name={sender.name} color={sender.avatarColor} size="sm" verified={sender.verified} />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">{sender?.name ?? "Someone"}</p>
          <p className="text-[11px] text-muted-foreground">
            {timeAgo(whisper.createdAt)} ago · {remainingViews} view{remainingViews === 1 ? "" : "s"} left
          </p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-teal/15 px-2.5 py-1 text-[11px] font-semibold text-teal">
          <Flame className="h-3 w-3" /> Burning
        </span>
      </div>

      <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-background/70 px-3 py-2.5 text-sm leading-relaxed text-foreground/90">
        {revealedBody ?? whisper.body}
      </p>

      {/* Countdown bar */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Burns in {remainingSeconds}s
          </span>
          <span>{Math.round(progress)}% left</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-rose via-gold to-teal transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </li>
  );
}

function useWhispers(refreshKey: number) {
  const [data, setData] = React.useState<{ whispers: Whisper[] } | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetch("/api/whispers")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed (${r.status})`);
        return r.json();
      })
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return { data, error, isLoading };
}
