"use client";

import * as React from "react";
import {
  Home,
  MessageCircle,
  Play,
  Moon,
  Sun,
  Compass,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { CirkleAvatar } from "@/components/brand/cirkle-avatar";
import { CirkleMark } from "@/components/brand/cirkle-logo";
import { useTheme } from "@/components/providers/theme-provider";
import { useCurrentUser } from "@/hooks/use-social-data";
import { CURRENT_USER_ID } from "@/lib/social/types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface IconDockProps {
  onOpenChat: () => void;
  onOpenMashahd?: () => void;
  onOpenProfile?: (userId: string) => void;
  onOpenDiscover?: () => void;
  onOpenAI?: () => void;
}

interface DockItem {
  icon: LucideIcon;
  label: string;
  pillar?: string;
}

export function IconDock({ onOpenChat, onOpenMashahd, onOpenProfile, onOpenDiscover, onOpenAI }: IconDockProps) {
  const { theme, toggleTheme } = useTheme();
  const { data: me } = useCurrentUser();
  const [active, setActive] = React.useState<string>("Home");

  const top: DockItem[] = [
    { icon: Home, label: "Home", pillar: "The Circle" },
    { icon: Compass, label: "Discover", pillar: "Explore" },
    { icon: MessageCircle, label: "Wasl", pillar: "Chat" },
    { icon: Play, label: "Mashahd", pillar: "Watch" },
    { icon: Sparkles, label: "Cirkle AI", pillar: "Companion" },
  ];

  const handleClick = (label: string) => {
    setActive(label);
    if (label === "Wasl") onOpenChat();
    if (label === "Mashahd" && onOpenMashahd) onOpenMashahd();
    if (label === "Discover" && onOpenDiscover) onOpenDiscover();
    if (label === "Cirkle AI" && onOpenAI) onOpenAI();
  };

  return (
    <aside
      className={cn(
        "sticky top-14 z-30 hidden h-[calc(100vh-3.5rem)] w-16 shrink-0 md:flex",
        "flex-col items-center gap-1.5 py-4",
        "glass rounded-r-2xl border-r border-y border-gold/15"
      )}
      aria-label="Primary navigation"
    >
      {/* Brand mark at top — opens your profile */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onOpenProfile?.(CURRENT_USER_ID)}
            aria-label="Your profile"
            className="group mb-1 grid h-9 w-9 place-items-center rounded-2xl transition hover:bg-muted/60"
          >
            <CirkleMark size={22} className="transition group-hover:scale-110" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          <span className="font-semibold">Your profile</span>
        </TooltipContent>
      </Tooltip>

      {/* Pillar icons */}
      <nav className="flex flex-1 flex-col items-center gap-1.5">
        {top.map((it) => {
          const isActive = active === it.label;
          return (
            <Tooltip key={it.label}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleClick(it.label)}
                  aria-label={it.label}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group relative grid h-11 w-11 place-items-center rounded-2xl transition",
                    isActive
                      ? "bg-gradient-gold text-charcoal shadow-soft"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <it.icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} />
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute -left-2 top-1/2 h-5 -translate-y-1/2 rounded-full bg-gradient-to-b from-[hsl(39_45%_57%)] via-[hsl(351_41%_56%)] to-[hsl(195_56%_23%)] p-0.5"
                    />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                <span className="font-semibold">{it.label}</span>
                {it.pillar && (
                  <span className="ml-1 text-primary-foreground/70">· {it.pillar}</span>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* Bottom: theme toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="grid h-11 w-11 place-items-center rounded-2xl text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {theme === "dark" ? "Light" : "Dark"} mode
        </TooltipContent>
      </Tooltip>

      {/* Profile avatar */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onOpenProfile?.(CURRENT_USER_ID)}
            aria-label="Your profile"
            title="Your profile"
            className="mt-1 rounded-full ring-2 ring-transparent transition hover:ring-gold/40"
          >
            {me ? (
              <CirkleAvatar
                name={me.name}
                color={me.avatarColor}
                size="md"
                verified={me.verified}
                className="rounded-full"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-muted" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {me?.name ?? "Profile"}
        </TooltipContent>
      </Tooltip>
    </aside>
  );
}
