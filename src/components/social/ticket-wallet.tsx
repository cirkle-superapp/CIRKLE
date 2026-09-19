"use client";

import * as React from "react";
import {
  X,
  Ticket,
  Send,
  Loader2,
  Hash,
  QrCode,
  Crown,
  Megaphone,
  Sparkles,
  Calendar,
  MapPin,
  Check,
  Ban,
  ShieldCheck,
  ArrowRightLeft,
} from "lucide-react";
import { CirkleMark } from "@/components/brand/cirkle-logo";
import { CirkleAvatar } from "@/components/brand/cirkle-avatar";
import { useFriends } from "@/hooks/use-social-data";
import { useToast } from "@/hooks/use-toast";
import { timeAgo } from "@/lib/social/time";
import { cn } from "@/lib/utils";

/**
 * TicketWallet — a full-screen overlay for cryptographically-anchored
 * event passes. Each ticket has a SHA-256 anchor hash + rotating QR seed.
 *
 * Two sections:
 *   1. Mint ticket — event name, date, venue, tier picker (general/vip/press/free).
 *   2. Your tickets (GET) — event-pass-styled cards with tier badges,
 *      state badges, anchor hash, and a faux-QR grid rendered from qrSeed.
 */

export interface TicketWalletProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Tier = "general" | "vip" | "press" | "free";
type TicketState = "issued" | "validated" | "used" | "revoked" | "transferred";

interface Ticket {
  id: string;
  eventName: string;
  eventDate: string;
  venue: string;
  tier: Tier;
  anchorHash: string;
  qrSeed: string;
  state: TicketState;
  createdAt: string;
}

interface MintResult {
  ok: boolean;
  ticket: Ticket;
}

const TIERS: { id: Tier; label: string; icon: typeof Crown; color: string; bg: string }[] = [
  { id: "general", label: "General", icon: Ticket, color: "text-steel", bg: "bg-steel/15" },
  { id: "vip", label: "VIP", icon: Crown, color: "text-gold", bg: "bg-gold/15" },
  { id: "press", label: "Press", icon: Megaphone, color: "text-rose", bg: "bg-rose/15" },
  { id: "free", label: "Free", icon: Sparkles, color: "text-teal", bg: "bg-teal/15" },
];

const STATE_BADGES: Record<TicketState, { label: string; cls: string }> = {
  issued: { label: "Issued", cls: "bg-teal/15 text-teal" },
  validated: { label: "Validated", cls: "bg-emerald-500/15 text-emerald-500" },
  used: { label: "Used", cls: "bg-muted/60 text-muted-foreground" },
  revoked: { label: "Revoked", cls: "bg-rose/15 text-rose" },
  transferred: { label: "Transferred", cls: "bg-steel/15 text-steel" },
};

export function TicketWallet({ open, onOpenChange }: TicketWalletProps) {
  const { toast } = useToast();

  const [eventName, setEventName] = React.useState("");
  const [eventDate, setEventDate] = React.useState("");
  const [venue, setVenue] = React.useState("");
  const [tier, setTier] = React.useState<Tier>("general");
  const [submitting, setSubmitting] = React.useState(false);
  const [lastMinted, setLastMinted] = React.useState<Ticket | null>(null);
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
      setEventName("");
      setEventDate("");
      setVenue("");
      setTier("general");
      setLastMinted(null);
    }
  }, [open]);

  // Default date = today + 7 days when first opened.
  React.useEffect(() => {
    if (open && !eventDate) {
      const d = new Date(Date.now() + 7 * 86_400_000);
      setEventDate(d.toISOString().slice(0, 10));
    }
  }, [open, eventDate]);

  const mint = async () => {
    if (!eventName.trim() || !eventDate || !venue.trim()) {
      toast({ title: "Fill in the event details", description: "Name, date, and venue are all required." });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventName: eventName.trim(), eventDate, venue: venue.trim(), tier }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Failed (${res.status})`);
      }
      const data = (await res.json()) as MintResult;
      setLastMinted(data.ticket);
      setEventName("");
      setVenue("");
      setTier("general");
      setRefreshKey((k) => k + 1);
      toast({
        title: "Pass minted",
        description: `${data.ticket.eventName} · anchored with SHA-256.`,
      });
    } catch (e) {
      toast({
        title: "Could not mint pass",
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
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-rose/25 px-4 py-3 glass-strong sm:px-6">
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-rose to-gold text-cream shadow-soft">
          <Ticket className="h-5 w-5" strokeWidth={2.4} />
        </span>
        <div className="flex flex-col leading-none">
          <span className="font-display text-lg font-semibold gradient-text-gold">Ticket Wallet</span>
          <span className="text-[10px] text-muted-foreground">cryptographically-anchored event passes</span>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          aria-label="Close Ticket Wallet"
          className="ml-auto grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          {/* Hero */}
          <div className="mb-6 rounded-3xl border border-rose/20 bg-gradient-to-br from-rose/5 via-card/40 to-gold/5 p-5 shadow-soft sm:p-7">
            <div className="mb-3 flex items-center gap-3">
              <CirkleMark size={28} className="shrink-0" />
              <div className="min-w-0">
                <h1 className="font-display text-xl font-semibold sm:text-2xl">Passes, not paper</h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Cryptographically-anchored event passes — SHA-256 proof + rotating QR. Transferable on a chain-of-custody. No fees, no scalper bots.
                </p>
              </div>
            </div>

            {/* Success card */}
            {lastMinted && (
              <div className="mb-4 flex items-start gap-3 rounded-2xl border border-teal/40 bg-teal/5 p-3.5">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal text-cream">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.6} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Pass minted & anchored</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {lastMinted.eventName} · {lastMinted.venue} · {new Date(lastMinted.eventDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  <p className="mt-1.5 truncate font-mono text-[10px] text-muted-foreground">
                    sha256:{lastMinted.anchorHash.slice(0, 24)}…
                  </p>
                </div>
                <button
                  onClick={() => setLastMinted(null)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                  aria-label="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Form */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Event name
                </label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  maxLength={80}
                  placeholder="e.g. Cirkle Launch Party · TEDxCairo · OSN Live"
                  className="h-11 w-full rounded-2xl border border-border/60 bg-background/80 px-3.5 text-sm outline-none ring-1 ring-transparent transition placeholder:text-muted-foreground focus:border-rose/40 focus:ring-rose/40"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Date
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-border/60 bg-background/80 px-3.5 text-sm outline-none ring-1 ring-transparent transition focus:border-rose/40 focus:ring-rose/40"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Venue
                </label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  maxLength={80}
                  placeholder="e.g. Cairo Opera House"
                  className="h-11 w-full rounded-2xl border border-border/60 bg-background/80 px-3.5 text-sm outline-none ring-1 ring-transparent transition placeholder:text-muted-foreground focus:border-rose/40 focus:ring-rose/40"
                />
              </div>
            </div>

            {/* Tier picker */}
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Tier
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {TIERS.map((t) => {
                  const Icon = t.icon;
                  const sel = tier === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTier(t.id)}
                      aria-pressed={sel}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition",
                        sel
                          ? "border-rose/60 bg-rose/5 ring-1 ring-rose/40"
                          : "border-border/60 bg-muted/30 hover:bg-muted/60"
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-9 w-9 place-items-center rounded-xl transition",
                          sel ? "bg-gradient-gold text-charcoal" : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className={cn("h-4 w-4", !sel && t.color)} strokeWidth={2.2} />
                      </span>
                      <span className="text-xs font-semibold">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mint button */}
            <button
              onClick={mint}
              disabled={submitting || !eventName.trim() || !eventDate || !venue.trim()}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose to-gold text-cream shadow-soft transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" strokeWidth={2.4} />
                  <span className="font-display text-base font-semibold">Mint pass</span>
                </>
              )}
            </button>
          </div>

          {/* Your tickets */}
          <TicketList refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
}

function TicketList({ refreshKey }: { refreshKey: number }) {
  const { data, isLoading, error } = useTickets(refreshKey);
  const tickets = data?.tickets ?? [];
  const [hiddenIds, setHiddenIds] = React.useState<Set<string>>(new Set());

  // Reset the hidden set whenever the underlying list changes (e.g. after a
  // refresh triggered by minting a new pass).
  React.useEffect(() => {
    setHiddenIds(new Set());
  }, [refreshKey]);

  const visibleTickets = tickets.filter((t) => !hiddenIds.has(t.id));

  return (
    <div className="rounded-3xl border border-border/60 bg-card/40 p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Ticket className="h-4 w-4 text-rose" />
        <h2 className="font-display text-base font-semibold">Your passes</h2>
        <span className="ml-auto rounded-full bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
          {visibleTickets.length} mint{visibleTickets.length === 1 ? "" : "s"}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-rose" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose/30 bg-rose/5 p-4 text-sm text-rose">
          Couldn’t load tickets. {String(error).slice(0, 80)}
        </div>
      ) : visibleTickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
          <Ticket className="mx-auto mb-2 h-8 w-8 text-rose/70" />
          <p className="font-display text-base font-semibold">No passes yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Mint your first pass above — every pass is anchored with a SHA-256 proof.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visibleTickets.map((t) => (
            <TicketCard
              key={t.id}
              ticket={t}
              onTransferred={(id) =>
                setHiddenIds((prev) => {
                  const next = new Set(prev);
                  next.add(id);
                  return next;
                })
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function TicketCard({
  ticket,
  onTransferred,
}: {
  ticket: Ticket;
  onTransferred?: (id: string) => void;
}) {
  const { toast } = useToast();
  const { data: friends = [] } = useFriends();
  const [localState, setLocalState] = React.useState<TicketState>(ticket.state);
  const [validating, setValidating] = React.useState(false);
  const [transferring, setTransferring] = React.useState(false);
  const [showPicker, setShowPicker] = React.useState(false);

  // Keep local state in sync if the parent refreshes the ticket.
  React.useEffect(() => {
    setLocalState(ticket.state);
  }, [ticket.state]);

  const tierMeta = TIERS.find((t) => t.id === ticket.tier) ?? TIERS[0];
  const TierIcon = tierMeta.icon;
  const stateMeta = STATE_BADGES[localState];

  const onValidate = async () => {
    setValidating(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/validate`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Failed (${res.status})`);
      }
      const data = (await res.json()) as { ok: boolean; state: TicketState };
      setLocalState(data.state);
      toast({ title: "Ticket validated ✓", description: `${ticket.eventName} is ready to scan.` });
    } catch (e) {
      toast({
        title: "Could not validate",
        description: e instanceof Error ? e.message.slice(0, 80) : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setValidating(false);
    }
  };

  const onTransfer = async (toUserId: string, toName: string) => {
    setTransferring(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Failed (${res.status})`);
      }
      const data = (await res.json()) as { ok: boolean; newTicketId: string };
      setLocalState("transferred");
      toast({
        title: "Ticket transferred",
        description: `${ticket.eventName} is now on its way to ${toName}.`,
      });
      // Hide this ticket locally — a fresh one was minted for the recipient.
      onTransferred?.(ticket.id);
      void data.newTicketId;
      setShowPicker(false);
    } catch (e) {
      toast({
        title: "Could not transfer",
        description: e instanceof Error ? e.message.slice(0, 80) : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setTransferring(false);
    }
  };

  return (
    <li className="overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card/80 to-muted/20 shadow-soft">
      {/* Top band — perforated edge feel */}
      <div className="relative flex items-center gap-3 border-b border-dashed border-border/60 bg-gradient-to-r from-rose/5 via-card/40 to-gold/5 px-4 py-3 sm:px-5">
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-2xl", tierMeta.bg, tierMeta.color)}>
          <TierIcon className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-semibold sm:text-lg">{ticket.eventName}</h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(ticket.eventDate).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {ticket.venue}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", tierMeta.bg, tierMeta.color)}>
            {tierMeta.label}
          </span>
          <StateBadge state={localState} />
        </div>
      </div>

      {/* Body — QR + anchor */}
      <div className="flex items-stretch gap-3 p-4 sm:p-5">
        <div className="shrink-0">
          <FauxQR seed={ticket.qrSeed} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Anchor proof
            </p>
            <p className="mt-1 break-all font-mono text-[11px] text-foreground/80">
              sha256:{ticket.anchorHash.slice(0, 32)}…
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Hash className="h-3 w-3 text-gold" />
            <span>QR seed</span>
            <span className="truncate font-mono">{ticket.qrSeed}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3 text-teal" />
            minted {timeAgo(ticket.createdAt)} ago
          </div>
        </div>
      </div>

      {/* Action row — validate + transfer */}
      <div className="border-t border-dashed border-border/60 bg-muted/20 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onValidate}
            disabled={validating || transferring || localState !== "issued"}
            aria-label={`Validate ${ticket.eventName} pass`}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
              localState === "validated"
                ? "bg-emerald-500/15 text-emerald-600"
                : "bg-gradient-gold text-charcoal shadow-soft hover:opacity-90"
            )}
          >
            {validating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.4} />
            )}
            {localState === "validated" ? "Validated" : "Validate"}
          </button>
          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            disabled={validating || transferring || localState === "transferred" || localState === "revoked"}
            aria-label={`Transfer ${ticket.eventName} pass to a friend`}
            aria-expanded={showPicker}
            className="flex h-9 items-center gap-1.5 rounded-full border border-rose/40 bg-rose/5 px-3.5 text-xs font-semibold text-rose transition hover:bg-rose/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {transferring ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ArrowRightLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
            )}
            Transfer
          </button>
          {friends.length === 0 && showPicker && (
            <span className="text-[11px] text-muted-foreground">
              Connect with friends in Discover to transfer a pass.
            </span>
          )}
        </div>

        {/* Recipient picker */}
        {showPicker && friends.length > 0 && (
          <div className="mt-3 rounded-2xl border border-border/60 bg-background/80 p-2">
            <p className="px-1.5 pb-1.5 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Pick a recipient
            </p>
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {friends.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => onTransfer(f.id, f.name)}
                    disabled={transferring}
                    aria-label={`Transfer ${ticket.eventName} pass to ${f.name}`}
                    className="flex w-full items-center gap-2 rounded-xl p-1.5 text-left transition hover:bg-gold/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:opacity-50"
                  >
                    <CirkleAvatar
                      name={f.name}
                      color={f.avatarColor}
                      size="sm"
                      verified={f.verified}
                      className="rounded-full"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-tight">{f.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">@{f.username}</p>
                    </div>
                    <ArrowRightLeft className="h-3.5 w-3.5 text-rose" strokeWidth={2.4} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </li>
  );
}

function StateBadge({ state }: { state: TicketState }) {
  const meta = STATE_BADGES[state];
  return (
    <span className={cn("flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", meta.cls)}>
      {state === "issued" && <Check className="h-3 w-3" />}
      {state === "validated" && <ShieldCheck className="h-3 w-3" />}
      {state === "used" && <Check className="h-3 w-3" />}
      {state === "revoked" && <Ban className="h-3 w-3" />}
      {state === "transferred" && <ArrowRightLeft className="h-3 w-3" />}
      {meta.label}
    </span>
  );
}

/**
 * FauxQR — renders a 13x13 grid of black/cream squares deterministically
 * derived from the qrSeed hex string. NOT a real scannable QR (it's a
 * visual stand-in) but it looks convincingly QR-ish.
 */
function FauxQR({ seed }: { seed: string }) {
  const SIZE = 13;
  // Generate a deterministic boolean matrix from the seed.
  const cells: boolean[][] = [];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  let rng = hash || 1;
  for (let y = 0; y < SIZE; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < SIZE; x++) {
      // LCG for deterministic pseudo-random
      rng = (rng * 1664525 + 1013904223) >>> 0;
      row.push((rng & 1) === 1);
    }
    cells.push(row);
  }
  // Add three "finder patterns" (corners) so it really looks like a QR.
  const drawFinder = (cx: number, cy: number) => {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (cy + dy < 0 || cy + dy >= SIZE || cx + dx < 0 || cx + dx >= SIZE) continue;
        const onRing = Math.max(Math.abs(dx), Math.abs(dy)) === 2;
        const onCenter = dx === 0 && dy === 0;
        cells[cy + dy][cx + dx] = onRing || onCenter;
      }
    }
  };
  drawFinder(2, 2);
  drawFinder(SIZE - 3, 2);
  drawFinder(2, SIZE - 3);

  return (
    <div
      className="grid gap-[1px] rounded-xl bg-cream p-2"
      style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}
      aria-label={`QR seed: ${seed}`}
      role="img"
    >
      {cells.flat().map((on, i) => (
        <span
          key={i}
          className={cn(
            "h-2 w-2 rounded-[1px]",
            on ? "bg-charcoal" : "bg-cream"
          )}
        />
      ))}
    </div>
  );
}

function useTickets(refreshKey: number) {
  const [data, setData] = React.useState<{ tickets: Ticket[] } | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetch("/api/tickets", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed (${r.status})`);
        return r.json() as Promise<{ tickets: Ticket[] }>;
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
