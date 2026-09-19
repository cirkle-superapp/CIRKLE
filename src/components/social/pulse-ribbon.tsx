"use client";

import * as React from "react";
import { Activity, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PulseRibbon — a thin live-activity heat strip that sits under the TopBar.
 * Renders one proportional segment per pillar (wasl / feed / mashahd …).
 * Polls /api/pulse every 30s. Self-hides when there is no data and shows
 * a subtle "quiet" state instead.
 *
 * The ribbon is intentionally restrained — it's ambient information,
 * never a primary surface.
 */

interface Pillar {
  pillar: string;
  count: number;
  weight: number;
  kinds: Record<string, number>;
}

interface PulseData {
  total: number;
  pillars: Pillar[];
  windowMinutes: number;
}

const PILLAR_META: Record<
  string,
  { label: string; color: string; ring: string }
> = {
  wasl: { label: "Wasl", color: "bg-teal", ring: "bg-teal/80" },
  feed: { label: "Feed", color: "bg-gold", ring: "bg-gold/80" },
  mashahd: { label: "Mashahd", color: "bg-rose", ring: "bg-rose/80" },
  stories: { label: "Stories", color: "bg-steel", ring: "bg-steel/80" },
  whispers: { label: "Whispers", color: "bg-rose/70", ring: "bg-rose/60" },
  capsules: { label: "Capsules", color: "bg-steel/70", ring: "bg-steel/60" },
};

function metaFor(pillar: string) {
  return (
    PILLAR_META[pillar.toLowerCase()] ?? {
      label: pillar.charAt(0).toUpperCase() + pillar.slice(1),
      color: "bg-charcoal/60",
      ring: "bg-charcoal/40",
    }
  );
}

export interface PulseRibbonProps {
  onNavigate?: (pillar: string) => void;
}

export function PulseRibbon({ onNavigate }: PulseRibbonProps = {}) {
  const { data, isLoading } = usePulse();

  // Don't render the ribbon at all while the first fetch is in flight —
  // this avoids a flash of empty bar on initial page load.
  if (isLoading && !data) return null;

  const pillars = data?.pillars ?? [];
  const total = data?.total ?? 0;
  const windowMinutes = data?.windowMinutes ?? 60;

  // Quiet state — show a subtle "all calm" strip so the ribbon doesn't
  // disappear entirely when there's no recent activity.
  if (total === 0 || pillars.length === 0) {
    return (
      <div
        className="border-b border-gold/10 bg-card/40 backdrop-blur-sm"
        role="status"
        aria-label="Activity pulse — quiet"
      >
        <div className="mx-auto flex h-7 max-w-6xl items-center gap-2 px-3 sm:px-4">
          <Activity className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={2.4} />
          <span className="text-[11px] text-muted-foreground">
            Quiet for now — no circle activity in the last {windowMinutes}m.
          </span>
          <span className="ml-auto hidden items-center gap-1.5 text-[10px] text-muted-foreground/70 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
            live
          </span>
        </div>
      </div>
    );
  }

  // Sort pillars by weight descending so the heaviest activity lands left.
  const sorted = [...pillars].sort((a, b) => b.weight - a.weight);
  const maxWeight = Math.max(...sorted.map((p) => p.weight), 1);

  const handleNavigate = (pillar: string) => {
    if (!onNavigate) return;
    onNavigate(pillar);
  };

  return (
    <div
      className="border-b border-gold/10 bg-card/40 backdrop-blur-sm"
      role="status"
      aria-label={`Activity pulse — ${total} events in the last ${windowMinutes} minutes`}
    >
      <div className="mx-auto flex h-7 max-w-6xl items-center gap-3 px-3 sm:px-4">
        <Activity className="h-3 w-3 shrink-0 text-gold" strokeWidth={2.4} />
        <span className="hidden text-[11px] font-medium text-muted-foreground sm:inline">
          {total} event{total === 1 ? "" : "s"} / {windowMinutes}m
        </span>

        {/* Proportional segmented bar — each segment is a button when onNavigate is provided. */}
        <div className="relative flex h-2 flex-1 items-stretch overflow-hidden rounded-full bg-muted/40">
          {sorted.map((p, i) => {
            const m = metaFor(p.pillar);
            const share = (p.weight / maxWeight) * 100;
            // Each segment is at least 6px wide so the smallest pillar is visible.
            const width = `max(${share}%, 6px)`;
            const label = `${m.label}: ${p.count} event${p.count === 1 ? "" : "s"}${onNavigate ? " · click to open" : ""}`;
            const content = (
              <>
                {/* shimmer for the heaviest pillar */}
                {i === 0 && (
                  <span className="pointer-events-none absolute inset-0 -translate-x-full animate-[pulseRibbon_2.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                )}
              </>
            );
            if (onNavigate) {
              return (
                <button
                  key={p.pillar}
                  type="button"
                  onClick={() => handleNavigate(p.pillar)}
                  aria-label={`Open ${m.label} — ${p.count} event${p.count === 1 ? "" : "s"}`}
                  title={label}
                  className={cn(
                    "relative flex h-full items-center justify-center overflow-hidden transition-all duration-500 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                    m.color,
                    i > 0 && "border-l border-background/40"
                  )}
                  style={{ width, flexGrow: 1, flexBasis: 0 }}
                >
                  {content}
                </button>
              );
            }
            return (
              <div
                key={p.pillar}
                title={label}
                className={cn(
                  "relative flex h-full items-center justify-center overflow-hidden transition-all duration-500",
                  m.color,
                  i > 0 && "border-l border-background/40"
                )}
                style={{ width, flexGrow: 1, flexBasis: 0 }}
              >
                {content}
              </div>
            );
          })}
        </div>

        {/* Legend (xl+) */}
        <div className="ml-1 hidden items-center gap-2.5 xl:flex">
          {sorted.slice(0, 4).map((p) => {
            const m = metaFor(p.pillar);
            const legend = (
              <>
                <span className={cn("h-2 w-2 rounded-sm", m.color)} />
                {m.label}
                <span className="font-mono text-muted-foreground/70">{p.count}</span>
              </>
            );
            if (onNavigate) {
              return (
                <button
                  key={p.pillar}
                  type="button"
                  onClick={() => handleNavigate(p.pillar)}
                  aria-label={`Open ${m.label}`}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background rounded"
                >
                  {legend}
                </button>
              );
            }
            return (
              <span key={p.pillar} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                {legend}
              </span>
            );
          })}
        </div>

        <span className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground/70 sm:ml-0">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold/80" />
          live
        </span>
      </div>

    </div>
  );
}

function usePulse() {
  const [data, setData] = React.useState<PulseData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/pulse", { cache: "no-store" })
        .then((r) => {
          if (!r.ok) throw new Error(`Failed (${r.status})`);
          return r.json() as Promise<PulseData>;
        })
        .then((d) => {
          if (!cancelled) {
            setData(d);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) setIsLoading(false);
        });
    };
    load();
    const t = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return { data, isLoading };
}
