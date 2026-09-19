"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  Bell,
  MessageCircle,
  Plus,
  Compass,
} from "lucide-react";
import { CirkleLogo } from "@/components/brand/cirkle-logo";
import { CirkleAvatar } from "@/components/brand/cirkle-avatar";
import { useNotifications, useMarkNotificationsRead, useCurrentUser } from "@/hooks/use-social-data";
import { CURRENT_USER_ID } from "@/lib/social/types";
import { timeAgo } from "@/lib/social/time";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TopBarProps {
  onOpenChat: () => void;
  onOpenProfile: (userId: string) => void;
  onOpenSearch: (initialQuery?: string) => void;
  onOpenDiscover: () => void;
}

/**
 * Returns true only after the component has mounted on the client.
 * Used to gate Radix Popover (which generates random aria-controls IDs
 * that mismatch between server and client) so the server renders a plain
 * button and the Popover mounts only on the client — eliminating the
 * hydration-mismatch warning entirely.
 */
function useMounted() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return mounted;
}

export function TopBar({ onOpenChat, onOpenProfile, onOpenSearch, onOpenDiscover }: TopBarProps) {
  const { data: me } = useCurrentUser();
  const { data: notifData } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const [notifOpen, setNotifOpen] = React.useState(false);
  const mounted = useMounted();
  const unread = notifData?.unreadCount ?? 0;
  const [searchValue, setSearchValue] = React.useState("");

  const triggerButton = (
    <button
      title="Signals"
      aria-label="Notifications"
      className="relative grid h-10 w-10 place-items-center rounded-full bg-muted/60 text-foreground transition hover:bg-muted"
    >
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose px-1 text-[10px] font-bold text-white ring-2 ring-background">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );

  return (
    <header className="sticky top-0 z-40 glass-strong border-b border-gold/20">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4 md:gap-4">
        {/* Logo + wordmark */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link href="/" aria-label="Cirkle home" className="shrink-0">
            <CirkleLogo size={32} animated />
          </Link>
          <Link
            href="/"
            className="hidden sm:flex flex-col leading-none"
            aria-label="Cirkle"
          >
            <span className="font-display text-lg font-semibold tracking-tight gradient-text-gold">
              Cirkle
            </span>
            <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              your connected world
            </span>
          </Link>
        </div>

        {/* Search pill (center, hidden on small) */}
        <div className="relative hidden mx-auto w-full max-w-md sm:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() => onOpenSearch(searchValue)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onOpenSearch(searchValue);
              }
            }}
            placeholder="Search your circle…"
            aria-label="Search Cirkle"
            className="h-10 w-full cursor-pointer rounded-full border-0 bg-muted/50 pl-10 pr-4 text-sm outline-none ring-1 ring-transparent transition focus:bg-background focus:ring-gold/40"
          />
        </div>

        {/* Mobile search button */}
        <button
          onClick={() => onOpenSearch()}
          aria-label="Search"
          title="Search"
          className="grid h-10 w-10 place-items-center rounded-full bg-muted/60 text-foreground transition hover:bg-muted sm:hidden"
        >
          <Search className="h-5 w-5" />
        </button>

        {/* Right actions */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
          <button
            title="Create"
            aria-label="Share a new moment"
            onClick={() => window.dispatchEvent(new CustomEvent("cirkle:open-composer"))}
            className="grid h-10 w-10 place-items-center rounded-full bg-gradient-gold text-charcoal shadow-soft transition hover:opacity-90"
          >
            <Plus className="h-5 w-5" strokeWidth={2.4} />
          </button>

          {/* Notifications — mount-gated to avoid Radix aria-controls SSR mismatch */}
          {mounted ? (
            <Popover
              open={notifOpen}
              onOpenChange={(o) => {
                setNotifOpen(o);
                if (o && unread > 0) setTimeout(() => markRead.mutate(), 1200);
              }}
            >
              <PopoverTrigger asChild>
                {triggerButton}
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0 glass-strong border-gold/20">
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                  <h3 className="font-display text-lg font-semibold">Signals</h3>
                  {unread > 0 && (
                    <span className="rounded-full bg-rose/15 px-2 py-0.5 text-xs font-medium text-rose">
                      {unread} new
                    </span>
                  )}
                </div>
                <ScrollArea className="max-h-96">
                  <div className="divide-y divide-border/50">
                    {(notifData?.notifications ?? []).map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          "flex gap-3 px-4 py-3 transition hover:bg-muted/40",
                          !n.read && "bg-gold/5"
                        )}
                      >
                        {n.actor ? (
                          <CirkleAvatar name={n.actor.name} color={n.actor.avatarColor} size="sm" verified={n.actor.verified} />
                        ) : (
                          <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-gold text-charcoal">
                            <Bell className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-snug">{n.content}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(n.createdAt)} ago</p>
                        </div>
                        {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose" />}
                      </div>
                    ))}
                    {(!notifData?.notifications || notifData.notifications.length === 0) && (
                      <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                        No signals yet.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          ) : (
            triggerButton
          )}

          <button
            onClick={onOpenDiscover}
            title="Discover"
            aria-label="Discover people and trending echoes"
            className="grid h-10 w-10 place-items-center rounded-full bg-muted/60 text-foreground transition hover:bg-muted"
          >
            <Compass className="h-5 w-5" />
          </button>

          <button
            onClick={onOpenChat}
            title="Wasl"
            aria-label="Open Wasl chat"
            className="grid h-10 w-10 place-items-center rounded-full bg-muted/60 text-foreground transition hover:bg-muted"
          >
            <MessageCircle className="h-5 w-5" />
          </button>

          {me && (
            <button
              onClick={() => onOpenProfile(CURRENT_USER_ID)}
              aria-label="Your profile"
              title="Your profile"
              className="rounded-full ring-2 ring-transparent transition hover:ring-gold/40"
            >
              <CirkleAvatar
                name={me.name}
                color={me.avatarColor}
                size="md"
                verified={me.verified}
                className="rounded-full"
              />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
