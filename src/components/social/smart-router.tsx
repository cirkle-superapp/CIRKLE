"use client";

import * as React from "react";
import {
  Sparkles,
  MessageSquare,
  Image as ImageIcon,
  Megaphone,
  Mail,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SmartRouter — a subtle inline hint rendered inside the composer that
 * analyzes the text AS YOU TYPE and suggests which pillar it belongs to.
 *
 * Rules (first match wins):
 *   - DM shape: starts with @ or "hey"/"hi"/"to" + has question mark + < 140 chars → Wasl
 *   - Link + short note: has URL + < 200 chars → Lamahat
 *   - Long-form: > 320 chars + 2+ newlines → Channel
 *   - Code: contains ``` or function/class/=> → Mail
 *   - Otherwise: null (no suggestion)
 *
 * Only renders when text length >= 16. Subtle styling: gold-tinted pill,
 * Sparkles icon, 11px text. When `onRoute` is provided, the hint is a
 * clickable button that routes the user to the suggested pillar.
 */

interface Suggestion {
  icon: LucideIcon;
  text: string;
  accent: string;
  pillar: "Wasl" | "Lamahat" | "Channel" | "Mail";
  cta: string;
}

const URL_RE = /(https?:\/\/[^\s]+|\b[a-z0-9-]+\.(?:com|net|org|io|app|dev|co|ai|ly|me|so|news)\b)/i;
const CODE_RE = /(```|function\s+\w+|class\s+\w+|=>|const\s+\w+\s*=)/;

function analyze(text: string): Suggestion | null {
  const trimmed = text.trim();
  if (trimmed.length < 16) return null;

  // Code — checked first because a code block can also be long-form.
  if (CODE_RE.test(trimmed)) {
    return {
      icon: Mail,
      text: "Code is easier to read in mail",
      accent: "text-steel",
      pillar: "Mail",
      cta: "Open Mail",
    };
  }

  const lower = trimmed.toLowerCase();
  const isDmShape =
    (trimmed.startsWith("@") || /^(hey|hi|to)\b/.test(lower)) &&
    trimmed.includes("?") &&
    trimmed.length < 140;
  if (isDmShape) {
    return {
      icon: MessageSquare,
      text: "Looks like a direct conversation — send via Wasl",
      accent: "text-teal",
      pillar: "Wasl",
      cta: "Open Wasl",
    };
  }

  // Link + short note
  if (URL_RE.test(trimmed) && trimmed.length < 200) {
    return {
      icon: ImageIcon,
      text: "A link with a short note works better as a Lamahat moment",
      accent: "text-rose",
      pillar: "Lamahat",
      cta: "Keep as moment",
    };
  }

  // Long-form
  const newlineCount = (trimmed.match(/\n/g) || []).length;
  if (trimmed.length > 320 && newlineCount >= 2) {
    return {
      icon: Megaphone,
      text: "This reads like an article — publish to a channel",
      accent: "text-gold",
      pillar: "Channel",
      cta: "Keep as moment",
    };
  }

  return null;
}

export interface SmartRouterProps {
  text: string;
  className?: string;
  onRoute?: (pillar: Suggestion["pillar"]) => void;
}

export function SmartRouter({ text, className, onRoute }: SmartRouterProps) {
  // analyze is deterministic + cheap — no memo needed, but it keeps the
  // render output stable across parent re-renders.
  const suggestion = React.useMemo(() => analyze(text), [text]);
  if (!suggestion) return null;

  const Icon = suggestion.icon;

  // Clickable hint pill — wraps the analysis text + a CTA arrow.
  if (onRoute) {
    return (
      <button
        type="button"
        onClick={() => onRoute(suggestion.pillar)}
        aria-label={`Smart router: ${suggestion.text}. ${suggestion.cta}.`}
        title={suggestion.cta}
        className={cn(
          "mt-2 group flex w-full items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-[11px] font-medium text-foreground/90 transition hover:border-gold/60 hover:bg-gold/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
          className
        )}
      >
        <Sparkles className="h-3 w-3 shrink-0 text-gold" strokeWidth={2.4} />
        <Icon className={cn("h-3 w-3 shrink-0", suggestion.accent)} strokeWidth={2.4} />
        <span className="truncate text-left">{suggestion.text}</span>
        <span className="ml-auto flex shrink-0 items-center gap-0.5 font-semibold text-gold opacity-80 transition group-hover:opacity-100">
          {suggestion.cta}
          <ArrowRight className="h-3 w-3" strokeWidth={2.4} />
        </span>
      </button>
    );
  }

  // Backward-compatible non-clickable hint (the original pill).
  return (
    <div
      role="note"
      aria-live="polite"
      className={cn(
        "mt-2 flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-3 py-1.5 text-[11px] font-medium text-foreground/80 transition",
        className
      )}
    >
      <Sparkles className="h-3 w-3 shrink-0 text-gold" strokeWidth={2.4} />
      <Icon className={cn("h-3 w-3 shrink-0", suggestion.accent)} strokeWidth={2.4} />
      <span className="truncate">{suggestion.text}</span>
    </div>
  );
}
