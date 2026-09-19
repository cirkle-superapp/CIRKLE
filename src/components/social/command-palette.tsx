"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Plus,
  MessageCircle,
  Play,
  Sparkles,
  Hourglass,
  Flame,
  User,
  Home,
  Compass,
  Sun,
  Moon,
  Activity,
  Globe2,
  ShieldAlert,
  KeyRound,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import { CirkleMark } from "@/components/brand/cirkle-logo";
import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenChat: () => void;
  onOpenMashahd: () => void;
  onOpenAI: () => void;
  onOpenProfile: (userId: string) => void;
  onOpenCapsule: () => void;
  onOpenWhisper: () => void;
  onOpenPulse: () => void;
  onOpenCultural: () => void;
  onOpenPrivacy: () => void;
  onOpenVault: () => void;
  onOpenTickets: () => void;
}

interface CmdItem {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  iconColor: string;
  section: "actions" | "navigation";
  run: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  onOpenChat,
  onOpenMashahd,
  onOpenAI,
  onOpenProfile,
  onOpenCapsule,
  onOpenWhisper,
  onOpenPulse,
  onOpenCultural,
  onOpenPrivacy,
  onOpenVault,
  onOpenTickets,
}: CommandPaletteProps) {
  const { theme, toggleTheme } = useTheme();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);

  // Reset on open + autofocus
  React.useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      // Wait a frame so the input is mounted.
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Lock body scroll while open.
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const items = React.useMemo<CmdItem[]>(() => {
    const close = () => onOpenChange(false);
    return [
      // Quick actions
      {
        id: "share-moment",
        label: "Share a moment",
        hint: "Composer",
        icon: Plus,
        iconColor: "text-gold",
        section: "actions",
        run: () => {
          close();
          window.dispatchEvent(new CustomEvent("cirkle:open-composer"));
        },
      },
      {
        id: "open-wasl",
        label: "Open Wasl",
        hint: "Chat",
        icon: MessageCircle,
        iconColor: "text-teal",
        section: "actions",
        run: () => {
          close();
          onOpenChat();
        },
      },
      {
        id: "open-mashahd",
        label: "Open Mashahd",
        hint: "Watch",
        icon: Play,
        iconColor: "text-rose",
        section: "actions",
        run: () => {
          close();
          onOpenMashahd();
        },
      },
      {
        id: "open-ai",
        label: "Open Cirkle AI",
        hint: "Companion",
        icon: Sparkles,
        iconColor: "text-gold",
        section: "actions",
        run: () => {
          close();
          onOpenAI();
        },
      },
      {
        id: "seal-capsule",
        label: "Seal a time capsule",
        hint: "Future",
        icon: Hourglass,
        iconColor: "text-steel",
        section: "actions",
        run: () => {
          close();
          onOpenCapsule();
        },
      },
      {
        id: "send-whisper",
        label: "Send a whisper",
        hint: "Ephemeral",
        icon: Flame,
        iconColor: "text-rose",
        section: "actions",
        run: () => {
          close();
          onOpenWhisper();
        },
      },
      {
        id: "activity-pulse",
        label: "Activity pulse",
        hint: "Live heat",
        icon: Activity,
        iconColor: "text-gold",
        section: "actions",
        run: () => {
          close();
          onOpenPulse();
        },
      },
      {
        id: "cultural-guide",
        label: "Cultural guide",
        hint: "8 cities",
        icon: Globe2,
        iconColor: "text-teal",
        section: "actions",
        run: () => {
          close();
          onOpenCultural();
        },
      },
      {
        id: "privacy-simulator",
        label: "Privacy simulator",
        hint: "Who sees what",
        icon: ShieldAlert,
        iconColor: "text-steel",
        section: "actions",
        run: () => {
          close();
          onOpenPrivacy();
        },
      },
      {
        id: "family-vault",
        label: "Family vault",
        hint: "M-of-N recovery",
        icon: KeyRound,
        iconColor: "text-gold",
        section: "actions",
        run: () => {
          close();
          onOpenVault();
        },
      },
      {
        id: "ticket-wallet",
        label: "Ticket wallet",
        hint: "Anchored passes",
        icon: Ticket,
        iconColor: "text-rose",
        section: "actions",
        run: () => {
          close();
          onOpenTickets();
        },
      },
      {
        id: "view-profile",
        label: "View profile",
        hint: "You",
        icon: User,
        iconColor: "text-teal",
        section: "actions",
        run: () => {
          close();
          onOpenProfile("u_current");
        },
      },
      {
        id: "toggle-theme",
        label: theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
        hint: "Theme",
        icon: theme === "dark" ? Sun : Moon,
        iconColor: "text-gold",
        section: "actions",
        run: () => {
          close();
          toggleTheme();
        },
      },
      // Navigation
      {
        id: "nav-home",
        label: "Home",
        hint: "Feed",
        icon: Home,
        iconColor: "text-gold",
        section: "navigation",
        run: () => {
          close();
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
      },
      {
        id: "nav-discover",
        label: "Discover",
        hint: "People & trending",
        icon: Compass,
        iconColor: "text-rose",
        section: "navigation",
        run: () => {
          close();
          window.dispatchEvent(new CustomEvent("cirkle:open-discover"));
        },
      },
      {
        id: "nav-wasl",
        label: "Wasl",
        hint: "Chat",
        icon: MessageCircle,
        iconColor: "text-teal",
        section: "navigation",
        run: () => {
          close();
          onOpenChat();
        },
      },
      {
        id: "nav-mashahd",
        label: "Mashahd",
        hint: "Watch",
        icon: Play,
        iconColor: "text-rose",
        section: "navigation",
        run: () => {
          close();
          onOpenMashahd();
        },
      },
      {
        id: "nav-ai",
        label: "Cirkle AI",
        hint: "Companion",
        icon: Sparkles,
        iconColor: "text-gold",
        section: "navigation",
        run: () => {
          close();
          onOpenAI();
        },
      },
      {
        id: "nav-profile",
        label: "Profile",
        hint: "You",
        icon: User,
        iconColor: "text-teal",
        section: "navigation",
        run: () => {
          close();
          onOpenProfile("u_current");
        },
      },
    ];
  }, [
    onOpenChange,
    onOpenChat,
    onOpenMashahd,
    onOpenAI,
    onOpenCapsule,
    onOpenWhisper,
    onOpenProfile,
    onOpenPulse,
    onOpenCultural,
    onOpenPrivacy,
    onOpenVault,
    onOpenTickets,
    theme,
    toggleTheme,
  ]);

  // Fuzzy filter: case-insensitive contains on label.
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.label.toLowerCase().includes(q) || it.hint?.toLowerCase().includes(q));
  }, [items, query]);

  // Clamp active index when filtered changes.
  React.useEffect(() => {
    if (active >= filtered.length) setActive(0);
  }, [filtered.length, active]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onOpenChange(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (filtered.length === 0 ? 0 : (i + 1) % filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (filtered.length === 0 ? 0 : (i - 1 + filtered.length) % filtered.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[active];
      if (item) item.run();
    }
  };

  // Group filtered items by section for rendering.
  const actionItems = filtered.filter((i) => i.section === "actions");
  const navItems = filtered.filter((i) => i.section === "navigation");

  // Map flat index for selection.
  const flat = filtered;
  const isSelected = (item: CmdItem) => flat[active]?.id === item.id;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center p-4 sm:pt-24"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
            aria-hidden
          />

          <motion.div
            initial={{ y: -8, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -8, scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-gold/25 bg-card/95 shadow-float glass-strong"
          >
            {/* Search row */}
            <div className="flex items-center gap-3 border-b border-gold/15 px-4 py-3.5">
              <CirkleMark size={20} className="shrink-0" />
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Type a command or search Cirkle…"
                aria-label="Command input"
                aria-controls="cmd-list"
                aria-activedescendant={flat[active] ? `cmd-${flat[active].id}` : undefined}
                className="h-8 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd
                className="hidden shrink-0 rounded-md border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block"
                aria-hidden
              >
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div
              id="cmd-list"
              role="listbox"
              aria-label="Commands"
              className="max-h-[60vh] overflow-y-auto px-2 py-2"
            >
              {flat.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="font-display text-base font-semibold text-foreground">No matches</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try “capsule”, “whisper”, “vault”, “privacy”, or “tickets”.
                  </p>
                </div>
              ) : (
                <>
                  {actionItems.length > 0 && (
                    <SectionLabel>Quick actions</SectionLabel>
                  )}
                  {actionItems.map((item) => (
                    <CmdRow
                      key={item.id}
                      item={item}
                      selected={isSelected(item)}
                      onSelect={() => {
                        const idx = flat.findIndex((f) => f.id === item.id);
                        if (idx >= 0) setActive(idx);
                      }}
                      onRun={item.run}
                    />
                  ))}
                  {navItems.length > 0 && (
                    <div className="mt-2">
                      <SectionLabel>Navigation</SectionLabel>
                    </div>
                  )}
                  {navItems.map((item) => (
                    <CmdRow
                      key={item.id}
                      item={item}
                      selected={isSelected(item)}
                      onSelect={() => {
                        const idx = flat.findIndex((f) => f.id === item.id);
                        if (idx >= 0) setActive(idx);
                      }}
                      onRun={item.run}
                    />
                  ))}
                </>
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center justify-between gap-3 border-t border-gold/15 bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-2">
                <KeyHint>
                  <ArrowUp className="h-3 w-3" />
                  <ArrowDown className="h-3 w-3" />
                </KeyHint>
                navigate
              </span>
              <span className="flex items-center gap-2">
                <KeyHint>
                  <CornerDownLeft className="h-3 w-3" />
                </KeyHint>
                run
              </span>
              <span className="flex items-center gap-2">
                <KeyHint>ESC</KeyHint>
                close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </div>
  );
}

function CmdRow({
  item,
  selected,
  onSelect,
  onRun,
}: {
  item: CmdItem;
  selected: boolean;
  onSelect: () => void;
  onRun: () => void;
}) {
  return (
    <div
      id={`cmd-${item.id}`}
      role="option"
      aria-selected={selected}
      onMouseEnter={onSelect}
      onClick={onRun}
      className={cn(
        "group flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 transition",
        selected
          ? "bg-gradient-gold/10 ring-1 ring-gold/40"
          : "hover:bg-muted/50"
      )}
    >
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition",
          selected ? "bg-gradient-gold text-charcoal" : "bg-muted/60 text-muted-foreground"
        )}
      >
        <item.icon className={cn("h-4 w-4", selected ? "text-charcoal" : item.iconColor)} strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium leading-tight",
            selected ? "text-foreground" : "text-foreground/90"
          )}
        >
          {item.label}
        </p>
        {item.hint && (
          <p className="truncate text-[11px] text-muted-foreground">{item.hint}</p>
        )}
      </div>
      {selected && (
        <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
      )}
    </div>
  );
}

function KeyHint({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center gap-0.5 rounded-md border border-border/60 bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}
