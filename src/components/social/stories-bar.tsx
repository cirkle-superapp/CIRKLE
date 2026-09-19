"use client";

import * as React from "react";
import { Plus, X, ChevronLeft, ChevronRight, Camera } from "lucide-react";
import { CirkleAvatar } from "@/components/brand/cirkle-avatar";
import { CirkleMark } from "@/components/brand/cirkle-logo";
import { useStories, useCurrentUser } from "@/hooks/use-social-data";
import type { SocialStory } from "@/lib/social/types";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
} from "@/components/ui/dialog";

export function StoriesBar() {
  const { data: stories = [] } = useStories();
  const { data: me } = useCurrentUser();
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState<SocialStory | null>(null);

  const scroll = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 280, behavior: "smooth" });
  };

  return (
    <section className="relative">
      {/* Section header */}
      <div className="mb-2.5 flex items-center gap-2 px-0.5">
        <CirkleMark size={14} />
        <h2 className="font-display text-sm font-semibold tracking-tight text-foreground">
          Echoes
        </h2>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          fading in 24h
        </span>
      </div>

      <div ref={scrollerRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {/* Add Echo (Create) card */}
        <button
          className="group relative h-48 w-32 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-card text-left shadow-soft transition hover:shadow-glass"
          aria-label="Add Echo"
        >
          <div className="h-[5.5rem] w-full bg-gradient-to-br from-[hsl(195_56%_33%)] to-[hsl(195_56%_18%)]" />
          <div className="absolute inset-x-0 top-[4.5rem] h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
          {me && (
            <div className="absolute left-1/2 top-[5rem] -translate-x-1/2">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-gold text-charcoal ring-4 ring-card">
                <Plus className="h-5 w-5" strokeWidth={2.5} />
              </div>
            </div>
          )}
          <div className="pt-7 text-center">
            <p className="font-display text-xs font-semibold">Add Echo</p>
            <p className="mt-0.5 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
              <Camera className="h-3 w-3" /> tap to capture
            </p>
          </div>
        </button>

        {/* Echo cards */}
        {stories.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s)}
            className="group relative h-48 w-32 shrink-0 overflow-hidden rounded-2xl border border-border/60 shadow-soft transition hover:shadow-glass"
            aria-label={`View ${s.author.name}'s echo`}
          >
            <img
              src={s.imageUrl}
              alt={s.caption ?? s.author.name}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/30" />
            {/* 3-ring gradient avatar frame */}
            <div className="absolute left-2 top-2">
              <div className="rounded-full bg-gradient-to-br from-[hsl(39_45%_57%)] via-[hsl(351_41%_56%)] to-[hsl(195_56%_23%)] p-0.5">
                <div className="rounded-full ring-2 ring-black/30">
                  <CirkleAvatar name={s.author.name} color={s.author.avatarColor} size="sm" verified={s.author.verified} />
                </div>
              </div>
            </div>
            <p className="absolute bottom-2 left-2 right-2 truncate text-left font-display text-xs font-semibold text-white drop-shadow">
              {s.author.name}
            </p>
          </button>
        ))}
      </div>

      {/* Scroll buttons (desktop) */}
      <button
        onClick={() => scroll(-1)}
        className="absolute -left-3 top-[calc(50%+0.75rem)] hidden -translate-y-1/2 place-items-center rounded-full bg-card p-1.5 shadow-soft ring-1 ring-border/60 hover:bg-muted lg:grid"
        aria-label="Scroll echoes left"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={() => scroll(1)}
        className="absolute -right-3 top-[calc(50%+0.75rem)] hidden -translate-y-1/2 place-items-center rounded-full bg-card p-1.5 shadow-soft ring-1 ring-border/60 hover:bg-muted lg:grid"
        aria-label="Scroll echoes right"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Echo viewer */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-md overflow-hidden p-0 border-gold/30" aria-describedby={undefined}>
          <DialogTitle className="sr-only">
            {active ? `${active.author.name}'s echo` : "Echo viewer"}
          </DialogTitle>
          {active && (
            <div className="relative">
              <img src={active.imageUrl} alt={active.caption ?? "Echo"} className="max-h-[70vh] w-full object-cover" />
              <div className="absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-black/60 to-transparent p-3">
                <div className="rounded-full bg-gradient-to-br from-[hsl(39_45%_57%)] via-[hsl(351_41%_56%)] to-[hsl(195_56%_23%)] p-0.5">
                  <CirkleAvatar name={active.author.name} color={active.author.avatarColor} size="sm" verified={active.author.verified} />
                </div>
                <div className="text-white">
                  <p className="font-display text-sm font-semibold drop-shadow">{active.author.name}</p>
                </div>
                <DialogClose className="ml-auto grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white hover:bg-black/60">
                  <X className="h-4 w-4" />
                </DialogClose>
              </div>
              {active.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <p className="font-display text-sm text-white drop-shadow">{active.caption}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
