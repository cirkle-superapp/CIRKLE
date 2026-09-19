"use client";

import * as React from "react";
import {
  X,
  ShieldAlert,
  UserX,
  Users,
  Briefcase,
  BarChart3,
  Landmark,
  Play,
  Loader2,
  History,
  Gauge,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { CirkleMark } from "@/components/brand/cirkle-logo";
import { timeAgo } from "@/lib/social/time";
import { cn } from "@/lib/utils";

/**
 * PrivacySimulator — a full-screen overlay that lets you simulate how
 * much of your profile is visible to different viewer kinds (stranger,
 * friend, employer, advertiser, state). Backed by /api/privacy/sim.
 *
 * The score is a 0-100 "visibility index" — higher = more exposed.
 * Color: green ≤20, amber 21-50, red >50.
 */

export interface PrivacySimulatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ViewerKind {
  id: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  accent: string;
}

const VIEWER_KINDS: ViewerKind[] = [
  { id: "stranger", label: "Stranger", desc: "Anyone on the open web", icon: UserX, accent: "text-steel" },
  { id: "friend", label: "Friend", desc: "Someone in your circle", icon: Users, accent: "text-teal" },
  { id: "employer", label: "Employer", desc: "Verified professional viewer", icon: Briefcase, accent: "text-gold" },
  { id: "advertiser", label: "Advertiser", desc: "Aggregated ad network", icon: BarChart3, accent: "text-rose" },
  { id: "state", label: "State", desc: "Government data request", icon: Landmark, accent: "text-charcoal" },
];

interface SimRun {
  id: string;
  viewerKind: string;
  score: number;
  fields: string[];
  recommendations: string[];
  createdAt: string;
}

interface Summary {
  totalRuns: number;
  avgScore: number;
  lowest: number;
  highest: number;
}

interface SimResult {
  ok: boolean;
  id: string;
  viewerKind: string;
  score: number;
  fields: string[];
  recommendations: string[];
}

function scoreColor(score: number): { text: string; bg: string; ring: string; label: string; tone: "good" | "warn" | "bad" } {
  if (score <= 20) {
    return { text: "text-teal", bg: "bg-teal", ring: "ring-teal/40", label: "Low exposure", tone: "good" };
  }
  if (score <= 50) {
    return { text: "text-gold", bg: "bg-gold", ring: "ring-gold/40", label: "Moderate exposure", tone: "warn" };
  }
  return { text: "text-rose", bg: "bg-rose", ring: "ring-rose/40", label: "High exposure", tone: "bad" };
}

function labelFor(kind: string): string {
  return VIEWER_KINDS.find((v) => v.id === kind)?.label ?? kind;
}

export function PrivacySimulator({ open, onOpenChange }: PrivacySimulatorProps) {
  const [selected, setSelected] = React.useState<string>("stranger");
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<SimResult | null>(null);
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
      setResult(null);
      setSelected("stranger");
    }
  }, [open]);

  const run = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/privacy/sim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewerKind: selected }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Failed (${res.status})`);
      }
      const data = (await res.json()) as SimResult;
      setResult(data);
      setRefreshKey((k) => k + 1);
    } catch {
      // swallow — toast could be added but the overlay state is enough
    } finally {
      setRunning(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-gold/25 px-4 py-3 glass-strong sm:px-6">
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-steel to-teal text-cream shadow-soft">
          <ShieldAlert className="h-5 w-5" strokeWidth={2.4} />
        </span>
        <div className="flex flex-col leading-none">
          <span className="font-display text-lg font-semibold gradient-text-gold">Privacy Simulator</span>
          <span className="text-[10px] text-muted-foreground">see what each viewer can actually see</span>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          aria-label="Close Privacy Simulator"
          className="ml-auto grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          {/* Hero */}
          <div className="mb-5 rounded-3xl border border-steel/20 bg-gradient-to-br from-steel/5 via-card/40 to-teal/5 p-5 shadow-soft sm:p-6">
            <div className="flex items-start gap-3">
              <CirkleMark size={28} className="shrink-0" />
              <div className="min-w-0">
                <h1 className="font-display text-xl font-semibold sm:text-2xl">Who sees what?</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick a viewer kind and run a simulated view of your profile. You get a 0–100 visibility
                  score, the exact fields they can see, and prescriptive recommendations — all from a
                  deterministic, auditable rules engine.
                </p>
              </div>
            </div>
          </div>

          {/* Viewer kind picker */}
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Who is looking?
          </p>
          <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {VIEWER_KINDS.map((v) => {
              const Icon = v.icon;
              const sel = selected === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setSelected(v.id)}
                  aria-pressed={sel}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-2xl border p-3 text-left transition",
                    sel
                      ? "border-gold/60 bg-gold/5 ring-1 ring-gold/40"
                      : "border-border/60 bg-muted/30 hover:bg-muted/60"
                  )}
                >
                  <span
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition",
                      sel ? "bg-gradient-gold text-charcoal" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", !sel && v.accent)} strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">{v.label}</p>
                    <p className="text-[11px] leading-tight text-muted-foreground">{v.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Run button */}
          <button
            onClick={run}
            disabled={running}
            className="mb-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-gold text-charcoal shadow-soft transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Play className="h-4 w-4" strokeWidth={2.4} />
                <span className="font-display text-base font-semibold">Run simulation</span>
              </>
            )}
          </button>

          {/* Result */}
          {result && <ResultCard result={result} />}

          {/* History */}
          <RunHistory refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: SimResult }) {
  const c = scoreColor(result.score);
  const Icon = VIEWER_KINDS.find((v) => v.id === result.viewerKind)?.icon ?? UserX;
  // Circular gauge parameters
  const R = 56;
  const C = 2 * Math.PI * R;
  const offset = C - (result.score / 100) * C;

  return (
    <div className="mb-6 overflow-hidden rounded-3xl border border-border/60 bg-card/40 shadow-soft">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
        {/* Gauge */}
        <div className="flex shrink-0 items-center justify-center">
          <div className="relative h-36 w-36">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 140 140" aria-hidden>
              <circle
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="10"
              />
              <circle
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke="currentColor"
                className={c.text}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 600ms ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("font-display text-4xl font-bold tabular-nums", c.text)}>{result.score}</span>
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">/ 100</span>
            </div>
          </div>
        </div>

        {/* Title + verdict */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Icon className={cn("h-4 w-4", c.text)} strokeWidth={2.2} />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {labelFor(result.viewerKind)} can see
            </span>
          </div>
          <h2 className="font-display text-xl font-semibold sm:text-2xl">{c.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.score === 0
              ? "Effectively invisible — they see nothing identifying."
              : result.score <= 20
                ? "Surface-area only — your core data is sealed."
                : result.score <= 50
                  ? "Partial visibility — review the fields below."
                  : "Wide visibility — consider tightening your privacy settings."}
          </p>
        </div>
      </div>

      {/* Fields */}
      <div className="border-t border-border/40 px-5 py-4 sm:px-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Visible fields ({result.fields.length})
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {result.fields.map((f) => (
            <li
              key={f}
              className="flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-[11px] text-foreground/80"
            >
              <CheckCircle2 className={cn("h-3 w-3", c.text)} strokeWidth={2.4} />
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Recommendations */}
      <div className="border-t border-border/40 bg-muted/20 px-5 py-4 sm:px-6">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <Gauge className="h-3.5 w-3.5" />
          Recommendations
        </p>
        <ul className="space-y-2">
          {result.recommendations.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-foreground/90">
              <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", c.bg)} />
              {r}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function RunHistory({ refreshKey }: { refreshKey: number }) {
  const { data, isLoading, error } = useHistory(refreshKey);
  const runs = data?.runs ?? [];
  const summary = data?.summary;

  return (
    <div className="rounded-3xl border border-border/60 bg-card/40 p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <History className="h-4 w-4 text-gold" />
        <h2 className="font-display text-base font-semibold">History</h2>
        {summary && summary.totalRuns > 0 && (
          <span className="ml-auto rounded-full bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
            {summary.totalRuns} run{summary.totalRuns === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {/* Summary stats */}
      {summary && summary.totalRuns > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          <Stat label="Avg score" value={summary.avgScore} />
          <Stat label="Lowest" value={summary.lowest} tone="good" />
          <Stat label="Highest" value={summary.highest} tone="bad" />
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose/30 bg-rose/5 p-4 text-sm text-rose">
          Couldn’t load history. {String(error).slice(0, 80)}
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
          <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-gold/70" />
          <p className="font-display text-base font-semibold">No simulations yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Run your first simulation above to start a history.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {runs.map((r) => {
            const c = scoreColor(r.score);
            return (
              <li
                key={r.id}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/60 px-3.5 py-2.5"
              >
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted/60 font-display text-sm font-bold", c.text)}>
                  {r.score}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{labelFor(r.viewerKind)}</p>
                  <p className="text-[11px] text-muted-foreground">{timeAgo(r.createdAt)} ago</p>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", c.bg, "text-cream")}>
                  {c.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "good" | "warn" | "bad" }) {
  const c =
    tone === "good"
      ? "text-teal"
      : tone === "bad"
        ? "text-rose"
        : "text-gold";
  return (
    <div className="rounded-2xl border border-border/60 bg-background/60 p-3 text-center">
      <p className={cn("font-display text-2xl font-bold tabular-nums", c)}>{value}</p>
      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
    </div>
  );
}

interface HistoryData {
  runs: SimRun[];
  summary: Summary;
}

function useHistory(refreshKey: number) {
  const [data, setData] = React.useState<HistoryData | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetch("/api/privacy/sim", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed (${r.status})`);
        return r.json() as Promise<HistoryData>;
      })
      .then((d) => {
        if (!cancelled) {
          // The API returns fields + recommendations as JSON strings — parse them.
          const runs = d.runs.map((r) => ({
            ...r,
            fields: Array.isArray(r.fields) ? r.fields : safeParse(r.fields as unknown as string),
            recommendations: Array.isArray(r.recommendations)
              ? r.recommendations
              : safeParse(r.recommendations as unknown as string),
          }));
          setData({ runs, summary: d.summary });
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

function safeParse(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
