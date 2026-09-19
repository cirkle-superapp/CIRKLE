"use client";

import { CirkleAvatar } from "@/components/brand/cirkle-avatar";
import { CirkleMark } from "@/components/brand/cirkle-logo";
import { useFriends } from "@/hooks/use-social-data";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface RightSidebarProps {
  onOpenChat: (friendId?: string) => void;
}

const SPONSORED = [
  {
    title: "Cirkle Premium",
    subtitle: "Unlock exclusive circles & themes",
    motif: "from-[hsl(39_55%_67%)] to-[hsl(39_45%_47%)]",
  },
  {
    title: "Wasl Voice",
    subtitle: "Crystal-clear calls across your world",
    motif: "from-[hsl(195_56%_43%)] to-[hsl(195_56%_18%)]",
  },
];

const CIRCLES = [
  { name: "Design Circle", members: "2.4k members", tint: "from-[hsl(39_45%_67%)] to-[hsl(351_41%_56%)]" },
  { name: "Cairo Foodies", members: "8.1k members", tint: "from-[hsl(351_41%_66%)] to-[hsl(195_56%_33%)]" },
  { name: "AlUla 2026", members: "412 members", tint: "from-[hsl(195_56%_43%)] to-[hsl(211_30%_52%)]" },
];

export function RightSidebar({ onOpenChat }: RightSidebarProps) {
  const { data: friends = [] } = useFriends();
  const onlineFriends = friends.filter((f) => f.online);

  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-72 shrink-0 overflow-y-auto pl-2 pb-6 xl:block scrollbar-hide">
      {/* Pulse header */}
      <div className="mb-3 flex items-center gap-2 px-1">
        <CirkleMark size={16} />
        <h3 className="font-display text-base font-semibold">Pulse</h3>
        <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose" />
          </span>
          live
        </span>
      </div>

      {/* Active in your circle — horizontal pills */}
      <div className="mb-4">
        <p className="px-1 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          Active in your circle
        </p>
        <div className="flex flex-wrap gap-1.5">
          {onlineFriends.slice(0, 6).map((f) => (
            <button
              key={f.id}
              onClick={() => onOpenChat(f.id)}
              className="group flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 py-1 pl-1 pr-3 text-left transition hover:border-gold/40 hover:bg-card"
            >
              <CirkleAvatar name={f.name} color={f.avatarColor} size="xs" verified={f.verified} online />
              <span className="text-xs font-medium">{f.name.split(" ")[0]}</span>
            </button>
          ))}
          {onlineFriends.length === 0 && (
            <p className="px-1 text-xs text-muted-foreground">No one&apos;s active right now.</p>
          )}
        </div>
      </div>

      {/* Circles to join */}
      <div className="mb-4">
        <p className="px-1 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          Circles to join
        </p>
        <div className="space-y-2">
          {CIRCLES.map((c) => (
            <button
              key={c.name}
              className="group flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card/60 p-2.5 text-left transition hover:border-gold/40 hover:bg-card"
            >
              <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br", c.tint)}>
                <Users className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-semibold">{c.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{c.members}</p>
              </div>
              <span className="grid h-7 w-7 place-items-center rounded-full bg-muted/60 text-muted-foreground transition group-hover:bg-gradient-gold group-hover:text-charcoal">
                +
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 h-px bg-border/60" />

      {/* Sponsored */}
      <p className="px-1 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        Sponsored
      </p>
      <div className="space-y-2">
        {SPONSORED.map((s) => (
          <button
            key={s.title}
            className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card/60 p-2.5 text-left transition hover:border-gold/40 hover:bg-card"
          >
            <div className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br", s.motif)}>
              <CirkleMark size={20} className="opacity-90 mix-blend-overlay" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold">{s.title}</p>
              <p className="truncate text-[11px] text-muted-foreground">{s.subtitle}</p>
            </div>
          </button>
        ))}
      </div>

      <p className="mt-6 px-1 text-[10px] leading-relaxed text-muted-foreground/70">
        Cirkle · three rings, one circle ·{" "}
        <a href="#" className="hover:underline">Privacy</a> ·{" "}
        <a href="#" className="hover:underline">Terms</a>
      </p>
    </aside>
  );
}
