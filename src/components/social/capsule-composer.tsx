"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Hourglass,
  Lock,
  Unlock,
  Loader2,
  Send,
  Globe,
  User,
  Check,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { CirkleMark } from "@/components/brand/cirkle-logo";
import { CirkleAvatar } from "@/components/brand/cirkle-avatar";
import { useCurrentUser } from "@/hooks/use-social-data";
import { useToast } from "@/hooks/use-toast";
import { timeAgo } from "@/lib/social/time";
import { cn } from "@/lib/utils";

interface CapsuleComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Capsule {
  id: string;
  authorId: string;
  payload: string;
  anchorHash: string;
  sealedAt: string;
  unsealAt: string;
  unsealed: boolean;
  visibility: string;
  createdAt: string;
}

interface Preset {
  label: string;
  days: number;
  sub: string;
}

const PRESETS: Preset[] = [
  { label: "Tomorrow", days: 1, sub: "1 day" },
  { label: "1 week", days: 7, sub: "7 days" },
  { label: "1 month", days: 30, sub: "30 days" },
  { label: "1 year", days: 365, sub: "365 days" },
  { label: "5 years", days: 1825, sub: "1,825 days" },
];

export function CapsuleComposer({ open, onOpenChange }: CapsuleComposerProps) {
  const { data: me } = useCurrentUser();
  const { toast } = useToast();
  const [payload, setPayload] = React.useState("");
  const [days, setDays] = React.useState(7);
  const [visibility, setVisibility] = React.useState<"public" | "self">("public");
  const [submitting, setSubmitting] = React.useState(false);
  const [lastSealed, setLastSealed] = React.useState<{ anchorHash: string; unsealAt: string } | null>(null);

  // Close on Escape + lock scroll.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onOpenChange]);

  // Reset on close.
  React.useEffect(() => {
    if (!open) {
      setPayload("");
      setDays(7);
      setVisibility("public");
      setLastSealed(null);
    }
  }, [open]);

  const seal = async () => {
    const text = payload.trim();
    if (!text) {
      toast({ title: "Write something first", description: "Your future self deserves a message." });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/capsules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: text, days, visibility }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Failed (${res.status})`);
      }
      const data = (await res.json()) as { ok: boolean; anchorHash: string; unsealAt: string; id: string };
      setLastSealed({ anchorHash: data.anchorHash, unsealAt: data.unsealAt });
      setPayload("");
      const d = new Date(data.unsealAt);
      toast({
        title: "Time-capsule sealed",
        description: `Unseals on ${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}.`,
      });
      // Bump a "refresh" key so the list re-fetches.
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast({
        title: "Could not seal capsule",
        description: e instanceof Error ? e.message.slice(0, 80) : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const [refreshKey, setRefreshKey] = React.useState(0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-gold/20 px-4 py-3 glass-strong sm:px-6">
        <CirkleMark size={24} />
        <div className="flex flex-col leading-none">
          <span className="font-display text-lg font-semibold gradient-text-gold">Time Capsule</span>
          <span className="text-[10px] text-muted-foreground">sealed with a proof-of-time anchor</span>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          aria-label="Close Time Capsule"
          className="ml-auto grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
          {/* Hero */}
          <div className="mb-6 rounded-3xl border border-gold/20 bg-gradient-to-br from-gold/5 via-card/40 to-teal/5 p-5 shadow-soft sm:p-7">
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-gold text-charcoal shadow-soft">
                <Hourglass className="h-6 w-6" strokeWidth={2.2} />
              </span>
              <div>
                <h1 className="font-display text-xl font-semibold sm:text-2xl">Seal a message for the future</h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Write now, unseal later. Anchored with a SHA-256 proof-of-time hash.
                </p>
              </div>
            </div>

            {/* Success card */}
            <AnimatePresence>
              {lastSealed && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-4 flex items-start gap-3 rounded-2xl border border-teal/40 bg-teal/5 p-3.5"
                >
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal text-cream">
                    <Lock className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Capsule sealed & anchored</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Unseals on{" "}
                      <span className="font-medium text-foreground">
                        {new Date(lastSealed.unsealAt).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      .
                    </p>
                    <p className="mt-1.5 truncate font-mono text-[10px] text-muted-foreground">
                      sha256:{lastSealed.anchorHash.slice(0, 24)}…
                    </p>
                  </div>
                  <button
                    onClick={() => setLastSealed(null)}
                    className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                    aria-label="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Textarea */}
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Your future message
            </label>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="Dear future me, or future us…"
              className="w-full resize-none rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-base outline-none ring-1 ring-transparent transition placeholder:text-muted-foreground focus:border-gold/40 focus:ring-gold/40"
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{payload.length.toLocaleString()} / 4,000</span>
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-gold" />
                Encrypted-at-rest feel via SHA-256 anchor
              </span>
            </div>

            {/* Unseal presets */}
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Unseal in
              </p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => {
                  const sel = days === p.days;
                  return (
                    <button
                      key={p.days}
                      onClick={() => setDays(p.days)}
                      aria-pressed={sel}
                      className={cn(
                        "flex flex-col items-start rounded-full border px-3.5 py-1.5 text-left transition",
                        sel
                          ? "border-gold bg-gradient-gold text-charcoal shadow-soft"
                          : "border-border/60 bg-muted/40 text-foreground hover:bg-muted"
                      )}
                    >
                      <span className="text-xs font-semibold leading-tight">{p.label}</span>
                      <span className={cn("text-[10px] leading-tight", sel ? "text-charcoal/70" : "text-muted-foreground")}>
                        {p.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visibility */}
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Visibility
              </p>
              <div className="grid grid-cols-2 gap-2">
                <VisibilityOption
                  active={visibility === "public"}
                  onClick={() => setVisibility("public")}
                  icon={Globe}
                  label="Public"
                  desc="Anyone can read when unsealed"
                />
                <VisibilityOption
                  active={visibility === "self"}
                  onClick={() => setVisibility("self")}
                  icon={User}
                  label="Private"
                  desc="Only you can unseal"
                />
              </div>
            </div>

            {/* Seal button */}
            <button
              onClick={seal}
              disabled={submitting || !payload.trim()}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-gold text-charcoal shadow-soft transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Lock className="h-4 w-4" strokeWidth={2.4} />
                  <span className="font-display text-base font-semibold">Seal capsule</span>
                </>
              )}
            </button>
          </div>

          {/* Sealed capsules list */}
          <SealedCapsules refreshKey={refreshKey} currentUserId={me?.id ?? "u_current"} />
        </div>
      </div>
    </div>
  );
}

function VisibilityOption({
  active,
  onClick,
  icon: Icon,
  label,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-start gap-2.5 rounded-2xl border p-3 text-left transition",
        active
          ? "border-gold/60 bg-gold/5 ring-1 ring-gold/40"
          : "border-border/60 bg-muted/30 hover:bg-muted/60"
      )}
    >
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-xl transition",
          active ? "bg-gradient-gold text-charcoal" : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight">{label}</p>
        <p className="text-[11px] leading-tight text-muted-foreground">{desc}</p>
      </div>
    </button>
  );
}

function SealedCapsules({ refreshKey, currentUserId }: { refreshKey: number; currentUserId: string }) {
  const { data, isLoading, error } = useCapsules(refreshKey);
  const capsules = data?.capsules ?? [];

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-border/60 bg-card/40 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Hourglass className="h-4 w-4 text-gold" />
          <h2 className="font-display text-base font-semibold">Sealed capsules</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose/30 bg-rose/5 p-4 text-sm text-rose">
        Couldn’t load capsules. {String(error).slice(0, 80)}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border/60 bg-card/40 p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Hourglass className="h-4 w-4 text-gold" />
        <h2 className="font-display text-base font-semibold">Sealed capsules</h2>
        <span className="ml-auto rounded-full bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
          {capsules.length} sealed
        </span>
      </div>

      {capsules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
          <Hourglass className="mx-auto mb-2 h-8 w-8 text-gold/70" />
          <p className="font-display text-base font-semibold">No capsules yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Seal your first message to the future.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {capsules.map((c) => (
            <CapsuleCard key={c.id} capsule={c} currentUserId={currentUserId} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CapsuleCard({ capsule, currentUserId }: { capsule: Capsule; currentUserId: string }) {
  const now = Date.now();
  const unsealMs = new Date(capsule.unsealAt).getTime();
  const isUnsealed = capsule.unsealed || unsealMs <= now;
  const isMine = capsule.authorId === currentUserId;
  // Only show payload if unsealed OR (mine AND still sealed-but-time-passed already? no — sealed means hidden)
  // Per the API: sealed ones show anchorHash but NOT payload until unsealAt.
  const showPayload = isUnsealed;

  const unsealDate = new Date(capsule.unsealAt);
  const sealedDate = new Date(capsule.sealedAt);
  const daysLeft = Math.max(0, Math.ceil((unsealMs - now) / 86_400_000));

  return (
    <li className="rounded-2xl border border-border/60 bg-background/60 p-4 transition hover:border-gold/30">
      <div className="mb-2 flex items-center gap-2">
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            isUnsealed
              ? "bg-teal/15 text-teal"
              : "bg-gold/15 text-gold"
          )}
        >
          {isUnsealed ? (
            <>
              <Unlock className="h-3 w-3" /> Unsealed
            </>
          ) : (
            <>
              <Lock className="h-3 w-3" /> Sealed
            </>
          )}
        </span>
        {!isUnsealed && (
          <span className="text-[11px] text-muted-foreground">
            Unseals in {daysLeft === 0 ? "<1 day" : `${daysLeft}d`} ·{" "}
            {unsealDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </span>
        )}
        {isUnsealed && (
          <span className="text-[11px] text-muted-foreground">
            Unsealed on {unsealDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </span>
        )}
        {!isMine && (
          <span className="ml-auto rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
            Public
          </span>
        )}
        {isMine && (
          <span className="ml-auto rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
            {capsule.visibility === "self" ? "Private" : "Public"}
          </span>
        )}
      </div>

      {showPayload ? (
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
          {capsule.payload}
        </p>
      ) : (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 px-3 py-3">
          <p className="text-sm italic text-muted-foreground">
            Sealed — content hidden until{" "}
            <span className="font-medium not-italic text-foreground">
              {unsealDate.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
            </span>
            .
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1" title="Sealed at">
          <Check className="h-3 w-3 text-gold" />
          Sealed {timeAgo(capsule.sealedAt)} ago
        </span>
        <span className="truncate font-mono text-[10px]">
          sha256:{capsule.anchorHash.slice(0, 18)}…
        </span>
      </div>
    </li>
  );
}

// Local fetch hook for capsules list.
function useCapsules(refreshKey: number) {
  const [data, setData] = React.useState<{ capsules: Capsule[] } | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetch("/api/capsules")
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
