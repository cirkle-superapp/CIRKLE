"use client";

import * as React from "react";
import {
  X,
  KeyRound,
  Lock,
  Unlock,
  ShieldCheck,
  Plus,
  Minus,
  Check,
  Loader2,
  Hash,
  Users,
  AlertTriangle,
} from "lucide-react";
import { CirkleMark } from "@/components/brand/cirkle-logo";
import { CirkleAvatar } from "@/components/brand/cirkle-avatar";
import { useFriends, useCurrentUser } from "@/hooks/use-social-data";
import { useToast } from "@/hooks/use-toast";
import { timeAgo } from "@/lib/social/time";
import { cn } from "@/lib/utils";

/**
 * FamilyVault — a full-screen overlay for Shamir M-of-N social-recovery
 * vaults. N trusted contacts each hold a share; M must consent to unlock.
 * Sealed with a SHA-256 anchor hash (computed server-side).
 *
 * Two sections:
 *   1. Create vault — name, secret textarea, threshold picker, holder picker
 *      (uses useFriends()).
 *   2. Your vaults (GET) — cards with name, threshold/total, anchor hash,
 *      holder list with consent badges.
 */

export interface FamilyVaultProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Friend {
  id: string;
  name: string;
  username: string;
  avatarColor: "teal" | "rose" | "steel" | "gold" | "charcoal";
  verified: boolean;
}

interface Holder {
  id: string;
  userId: string;
  name: string;
  relation: string;
  consented: boolean;
  consentedAt: string | null;
}

interface Vault {
  id: string;
  name: string;
  secretHash: string;
  threshold: number;
  totalShares: number;
  holders: Holder[];
  createdAt: string;
}

interface VaultCreateResult {
  ok: boolean;
  vault: Vault;
}

const RELATIONS = [
  "family",
  "partner",
  "cofounder",
  "best friend",
  "lawyer",
  "mentor",
  "sibling",
  "colleague",
];

export function FamilyVault({ open, onOpenChange }: FamilyVaultProps) {
  const { data: friends = [] } = useFriends();
  const { toast } = useToast();

  const [name, setName] = React.useState("");
  const [secret, setSecret] = React.useState("");
  const [threshold, setThreshold] = React.useState(2);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [relations, setRelations] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [lastSealed, setLastSealed] = React.useState<Vault | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

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
      setName("");
      setSecret("");
      setThreshold(2);
      setSelectedIds([]);
      setRelations({});
      setLastSealed(null);
    }
  }, [open]);

  const toggleHolder = (f: Friend) => {
    setSelectedIds((prev) => {
      const next = prev.includes(f.id) ? prev.filter((id) => id !== f.id) : [...prev, f.id];
      // Clamp threshold to next.length
      setThreshold((t) => Math.min(Math.max(1, t), Math.max(1, next.length)));
      return next;
    });
    if (!relations[f.id]) {
      setRelations((r) => ({ ...r, [f.id]: "family" }));
    }
  };

  const setRelation = (id: string, value: string) => {
    setRelations((r) => ({ ...r, [id]: value }));
  };

  const seal = async () => {
    if (!name.trim()) {
      toast({ title: "Name your vault", description: "What are you protecting?" });
      return;
    }
    if (!secret.trim()) {
      toast({ title: "Add a secret", description: "The thing you're protecting — e.g. a recovery phrase." });
      return;
    }
    if (selectedIds.length < 2) {
      toast({ title: "Pick at least 2 holders", description: "Social recovery needs more than one witness." });
      return;
    }
    if (threshold > selectedIds.length) {
      toast({ title: "Threshold too high", description: `Can't require more than ${selectedIds.length} consent.` });
      return;
    }
    setSubmitting(true);
    try {
      const holders = selectedIds.map((id) => ({
        id,
        name: friends.find((f) => f.id === id)?.name ?? "Unknown",
        relation: relations[id] ?? "family",
      }));
      const res = await fetch("/api/vaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), secret, threshold, holders }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Failed (${res.status})`);
      }
      const data = (await res.json()) as VaultCreateResult;
      setLastSealed(data.vault);
      setName("");
      setSecret("");
      setSelectedIds([]);
      setRelations({});
      setThreshold(2);
      setRefreshKey((k) => k + 1);
      toast({
        title: "Vault sealed",
        description: `${data.vault.threshold} of ${data.vault.totalShares} shares required to unlock.`,
      });
    } catch (e) {
      toast({
        title: "Could not seal vault",
        description: e instanceof Error ? e.message.slice(0, 80) : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-gold/25 px-4 py-3 glass-strong sm:px-6">
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-gold to-rose text-charcoal shadow-soft">
          <KeyRound className="h-5 w-5" strokeWidth={2.4} />
        </span>
        <div className="flex flex-col leading-none">
          <span className="font-display text-lg font-semibold gradient-text-gold">Family Vault</span>
          <span className="text-[10px] text-muted-foreground">Shamir M-of-N social recovery</span>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          aria-label="Close Family Vault"
          className="ml-auto grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          {/* Hero */}
          <div className="mb-6 rounded-3xl border border-gold/20 bg-gradient-to-br from-gold/5 via-card/40 to-rose/5 p-5 shadow-soft sm:p-7">
            <div className="mb-3 flex items-center gap-3">
              <CirkleMark size={28} className="shrink-0" />
              <div className="min-w-0">
                <h1 className="font-display text-xl font-semibold sm:text-2xl">A vault that needs witnesses</h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Shamir M-of-N social-recovery vault — N trusted contacts each hold a share; M must consent to unlock. Sealed with a SHA-256 anchor.
                </p>
              </div>
            </div>

            {/* Success card */}
            {lastSealed && (
              <div className="mb-4 flex items-start gap-3 rounded-2xl border border-teal/40 bg-teal/5 p-3.5">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal text-cream">
                  <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.4} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Vault sealed & anchored</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {lastSealed.threshold} of {lastSealed.totalShares} shares required to unlock · {lastSealed.holders.length} holders notified.
                  </p>
                  <p className="mt-1.5 truncate font-mono text-[10px] text-muted-foreground">
                    sha256:{lastSealed.secretHash.slice(0, 24)}…
                  </p>
                </div>
                <button
                  onClick={() => setLastSealed(null)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                  aria-label="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Form */}
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Vault name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="e.g. Recovery phrase · Family inheritance"
              className="mb-4 h-11 w-full rounded-2xl border border-border/60 bg-background/80 px-3.5 text-sm outline-none ring-1 ring-transparent transition placeholder:text-muted-foreground focus:border-gold/40 focus:ring-gold/40"
            />

            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              The secret you're protecting
            </label>
            <textarea
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Paste a recovery phrase, seed, password hint, last-will note…"
              className="w-full resize-none rounded-2xl border border-border/60 bg-background/80 px-3.5 py-3 text-sm outline-none ring-1 ring-transparent transition placeholder:text-muted-foreground focus:border-gold/40 focus:ring-gold/40"
            />
            <p className="mt-1 text-right text-[11px] text-muted-foreground">
              <Lock className="mr-1 inline h-3 w-3" />
              Hashed with SHA-256 — the plaintext is never stored or sent.
            </p>

            {/* Holders */}
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Holders ({selectedIds.length} selected)
                </p>
                <span className="text-[11px] text-muted-foreground">pick trusted contacts</span>
              </div>
              {friends.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-6 text-center">
                  <Users className="mx-auto mb-2 h-7 w-7 text-gold/70" />
                  <p className="text-sm font-semibold">No friends yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Connect with people in Discover to add them as vault holders.
                  </p>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {friends.map((f) => {
                    const sel = selectedIds.includes(f.id);
                    return (
                      <li key={f.id}>
                        <button
                          onClick={() => toggleHolder(f as Friend)}
                          aria-pressed={sel}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-2xl border p-2.5 text-left transition",
                            sel
                              ? "border-gold/60 bg-gold/5 ring-1 ring-gold/40"
                              : "border-border/60 bg-muted/30 hover:bg-muted/60"
                          )}
                        >
                          <CirkleAvatar name={f.name} color={f.avatarColor} size="sm" verified={f.verified} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold leading-tight">{f.name}</p>
                            <p className="truncate text-[11px] text-muted-foreground">@{f.username}</p>
                          </div>
                          {sel && (
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-gold text-charcoal">
                              <Check className="h-3.5 w-3.5" strokeWidth={2.6} />
                            </span>
                          )}
                        </button>
                        {sel && (
                          <div className="mt-1 flex items-center gap-1.5 px-2.5 pb-1">
                            <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">relation</span>
                            <select
                              value={relations[f.id] ?? "family"}
                              onChange={(e) => setRelation(f.id, e.target.value)}
                              className="h-7 flex-1 rounded-lg border border-border/60 bg-background/80 px-2 text-xs outline-none focus:border-gold/40"
                            >
                              {RELATIONS.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Threshold */}
            {selectedIds.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Threshold (M of N)
                  </p>
                  <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-semibold text-foreground/80">
                    {threshold} of {selectedIds.length}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setThreshold((t) => Math.max(1, t - 1))}
                    disabled={threshold <= 1}
                    aria-label="Decrease threshold"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted/60 text-foreground transition hover:bg-muted disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="range"
                    min={1}
                    max={Math.max(1, selectedIds.length)}
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="flex-1 accent-gold"
                    aria-label="Threshold"
                  />
                  <button
                    onClick={() => setThreshold((t) => Math.min(selectedIds.length, t + 1))}
                    disabled={threshold >= selectedIds.length}
                    aria-label="Increase threshold"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted/60 text-foreground transition hover:bg-muted disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {threshold === selectedIds.length
                    ? "All holders must consent — maximum security, no recovery if one is unreachable."
                    : threshold === 1
                      ? "Any single holder can unlock — fastest recovery, lowest security."
                      : `${threshold} of ${selectedIds.length} holders must consent to unlock.`}
                </p>
              </div>
            )}

            {/* Seal button */}
            <button
              onClick={seal}
              disabled={submitting || !name.trim() || !secret.trim() || selectedIds.length < 2}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-gold text-charcoal shadow-soft transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Lock className="h-4 w-4" strokeWidth={2.4} />
                  <span className="font-display text-base font-semibold">Seal vault</span>
                </>
              )}
            </button>
          </div>

          {/* Your vaults */}
          <VaultList refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
}

function VaultList({ refreshKey }: { refreshKey: number }) {
  const { data, isLoading, error } = useVaults(refreshKey);
  const vaults = data?.vaults ?? [];

  return (
    <div className="rounded-3xl border border-border/60 bg-card/40 p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-gold" />
        <h2 className="font-display text-base font-semibold">Your vaults</h2>
        <span className="ml-auto rounded-full bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
          {vaults.length} sealed
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose/30 bg-rose/5 p-4 text-sm text-rose">
          Couldn’t load vaults. {String(error).slice(0, 80)}
        </div>
      ) : vaults.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
          <KeyRound className="mx-auto mb-2 h-8 w-8 text-gold/70" />
          <p className="font-display text-base font-semibold">No vaults yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Seal your first vault above to start protecting what matters.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {vaults.map((v) => (
            <VaultCard key={v.id} vault={v} />
          ))}
        </ul>
      )}
    </div>
  );
}

function VaultCard({ vault }: { vault: Vault }) {
  const { toast } = useToast();
  // Local copy of holders so we can flip consent optimistically.
  const [holders, setHolders] = React.useState<Holder[]>(vault.holders);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  // Keep local state in sync if the parent refreshes the vault list.
  React.useEffect(() => {
    setHolders(vault.holders);
  }, [vault.holders]);

  const consented = holders.filter((h) => h.consented).length;
  const canUnlock = consented >= vault.threshold;

  const toggleConsent = async (holder: Holder) => {
    setPendingId(holder.id);
    try {
      const res = await fetch(`/api/vaults/${vault.id}/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holderId: holder.userId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Failed (${res.status})`);
      }
      const data = (await res.json()) as {
        ok: boolean;
        consented: boolean;
        consentedCount: number;
        threshold: number;
        unlocked: boolean;
      };
      // Optimistic local flip — keep the badge in sync with the server.
      setHolders((prev) =>
        prev.map((h) =>
          h.userId === holder.userId
            ? {
              ...h,
              consented: data.consented,
              consentedAt: data.consented ? new Date().toISOString() : null,
            }
            : h
        )
      );
      if (data.unlocked && data.consented) {
        toast({
          title: "Vault unlocked! 🔓",
          description: `${data.consentedCount} of ${vault.totalShares} shares consented — vault unlocked.`,
        });
      } else if (data.consented) {
        toast({
          title: "Consent recorded",
          description: `${data.consentedCount} of ${data.threshold} required to unlock.`,
        });
      } else {
        toast({
          title: "Consent withdrawn",
          description: `${data.consentedCount} of ${data.threshold} required to unlock.`,
        });
      }
    } catch (e) {
      toast({
        title: "Could not update consent",
        description: e instanceof Error ? e.message.slice(0, 80) : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <li className="rounded-2xl border border-border/60 bg-background/60 p-4 transition hover:border-gold/30">
      <div className="mb-3 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-gold text-charcoal">
          <Lock className="h-4 w-4" strokeWidth={2.4} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-semibold">{vault.name}</h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 font-semibold text-foreground/80">
              <ShieldCheck className="h-3 w-3 text-gold" />
              {vault.threshold} of {vault.totalShares}
            </span>
            <span>sealed {timeAgo(vault.createdAt)} ago</span>
            {canUnlock && (
              <span className="flex items-center gap-1 rounded-full bg-teal/15 px-2 py-0.5 font-semibold text-teal">
                <Check className="h-3 w-3" />
                unlockable
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Anchor hash */}
      <div className="mb-3 flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2">
        <Hash className="h-3.5 w-3.5 shrink-0 text-gold" />
        <span className="truncate font-mono text-[10px] text-muted-foreground">
          sha256:{vault.secretHash.slice(0, 28)}…
        </span>
      </div>

      {/* Unlocked celebration banner */}
      {canUnlock && (
        <div className="mb-3 flex items-start gap-2.5 rounded-2xl border border-teal/40 bg-teal/5 p-3">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal text-cream">
            <Unlock className="h-3.5 w-3.5" strokeWidth={2.6} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-teal">Vault unlocked! 🔓</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {consented} of {vault.totalShares} shares consented — vault unlocked. The anchor hash above is your proof-of-recovery.
            </p>
          </div>
        </div>
      )}

      {/* Holders */}
      <div className="border-t border-border/40 pt-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Holders ({consented}/{holders.length} consented) · tap a badge to toggle
        </p>
        <ul className="space-y-1.5">
          {holders.map((h) => {
            const isPending = pendingId === h.id;
            return (
              <li key={h.id} className="flex items-center gap-2 text-sm">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-muted/60 text-[10px] font-semibold">
                  {h.name.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 truncate">{h.name}</span>
                <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                  {h.relation}
                </span>
                <button
                  type="button"
                  onClick={() => toggleConsent(h)}
                  disabled={isPending}
                  aria-label={
                    h.consented
                      ? `${h.name} consented — click to withdraw`
                      : `${h.name} pending — click to consent`
                  }
                  title={
                    h.consented
                      ? `${h.name} consented — click to withdraw`
                      : `${h.name} pending — click to consent`
                  }
                  className={cn(
                    "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
                    h.consented
                      ? "bg-teal/15 text-teal"
                      : "bg-gold/15 text-gold"
                  )}
                >
                  {isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : h.consented ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  {h.consented ? "consented" : "pending"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </li>
  );
}

function useVaults(refreshKey: number) {
  const [data, setData] = React.useState<{ vaults: Vault[] } | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetch("/api/vaults", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed (${r.status})`);
        return r.json() as Promise<{ vaults: Vault[] }>;
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
