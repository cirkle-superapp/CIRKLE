"use client";

import * as React from "react";
import {
  X,
  Globe2,
  Handshake,
  Coffee,
  Shirt,
  AlertTriangle,
  ChevronDown,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { CirkleMark } from "@/components/brand/cirkle-logo";
import { cn } from "@/lib/utils";

/**
 * CulturalInterpreter — a full-screen overlay with a city picker and a
 * cultural guide card. Hardcoded profiles for 8 cities. Each profile has
 * expandable sections (Greeting, Tipping, Dress, Taboos) with icons.
 */

export interface CulturalInterpreterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CityProfile {
  city: string;
  emoji: string;
  greeting: string;
  tip: { restaurants: string; taxi: string; hotel: string };
  dress: string;
  taboo: string;
}

const CITIES: CityProfile[] = [
  {
    city: "Cairo",
    emoji: "🕌",
    greeting: "السلام عليكم (As-salāmu ʿalaykum) — peace be upon you. Reply with wa ʿalaykum as-salām.",
    tip: {
      restaurants: "10–15% is appreciated at sit-down places; cash is king. Round up at street food.",
      taxi: "Round up the meter fare; for haggled rides, agree the price before you get in.",
      hotel: "20–50 EGP per bag for porters; 20–50 EGP/night for housekeeping.",
    },
    dress: "Modest — shoulders and knees covered when visiting mosques or older neighborhoods. Loose linen works in summer.",
    taboo: "Don't discuss politics or religion bluntly. Public drinking is frowned on. Use your right hand for eating and greetings.",
  },
  {
    city: "Beirut",
    emoji: "🌴",
    greeting: "Marhaba (مرحبا) — hello. Kifak? (how are you?) is the universal icebreaker.",
    tip: {
      restaurants: "10–15% standard; many places add service charge — check the bill.",
      taxi: "Round up or 1–2 USD; apps (Careem, Bolt) are easier than haggling.",
      hotel: "5–10 USD/night for housekeeping; 2 USD/bag for porters.",
    },
    dress: "Cosmopolitan — anything goes in Mar Mikhaël and Gemmayzeh. Cover shoulders for religious sites.",
    taboo: "Avoid taking photos of military or checkpoints. Don't comment on sectarian politics — it's personal.",
  },
  {
    city: "Tokyo",
    emoji: "🗼",
    greeting: "Konnichiwa (こんにちは) — hello. Bow slightly; depth signals respect. A short 15° bow is polite for strangers.",
    tip: {
      restaurants: "No tipping — ever. It can feel insulting. Pay the exact amount.",
      taxi: "No tip; doors open automatically. Have the address written in Japanese.",
      hotel: "No tipping. A small omiyage (souvenir) from your hometown is a lovely gesture.",
    },
    dress: "Clean and understated. Avoid strong scents. Black/grey/cream are foolproof. Tattoos may bar you from onsen.",
    taboo: "Don't tip. Don't eat while walking. Don't pour your own drink — pour for others, let them pour for you. Don't stick chopsticks upright in rice.",
  },
  {
    city: "Riyadh",
    emoji: "🕋",
    greeting: "Assalāmu ʿalaykum — peace be upon you. Shake hands only with the same gender unless a hand is offered first.",
    tip: {
      restaurants: "Service is included. Tipping is appreciated but not expected — 10% is generous.",
      taxi: "Round up; apps (Careem, Uber) are the norm. Sit in the back.",
      hotel: "10–20 SAR per bag; 10–20 SAR/night for housekeeping.",
    },
    dress: "Abaya for women in public (head cover optional for non-Muslims but respectful). Men: long trousers, covered shoulders. Avoid tight or sheer clothing.",
    taboo: "No public displays of affection. No alcohol. Don't photograph women without consent. Don't point the soles of your feet at anyone.",
  },
  {
    city: "Istanbul",
    emoji: "🌊",
    greeting: "Merhaba — hello. Selâmün aleyküm is the warmer, traditional greeting. Shake hands firmly.",
    tip: {
      restaurants: "10% is common at sit-down places; round up at lokantas.",
      taxi: "Round up; insist on the meter (taksimetre) — never agree a flat fare.",
      hotel: "20–50 TRY per bag; 20–50 TRY/night for housekeeping.",
    },
    dress: "Smart-casual. Cover shoulders and knees at mosques (women cover hair with a provided scarf). Remove shoes before prayer rugs.",
    taboo: "Don't discuss Kurdish issues or Erdoğan bluntly with strangers. Avoid pointing the soles of your shoes at anyone. Don't blow your nose at the table.",
  },
  {
    city: "Marrakech",
    emoji: "🫖",
    greeting: "Salamu ʿalaykum — peace be upon you. Labas? (how are you?) opens any conversation. Right hand only.",
    tip: {
      restaurants: "10% standard; round up at street stalls. Cash only outside big hotels.",
      taxi: "Agree the price before you start — petits taxis rarely use meters honestly.",
      hotel: "20–30 MAD per bag; 20–30 MAD/night for housekeeping. Riad staff appreciate it.",
    },
    dress: "Cover shoulders, chest and knees. Loose cotton/linen. Women don't need a headscarf but a scarf helps in medinas.",
    taboo: "Don't drink tap water. Don't refuse mint tea — it's a hospitality ritual. Don't photograph people without asking (especially women). Haggling expected in souks; never accept the first price.",
  },
  {
    city: "Dubai",
    emoji: "🏙️",
    greeting: "Assalāmu ʿalaykum — peace be upon you. Hello also works universally. Shake hands same-gender unless offered.",
    tip: {
      restaurants: "10–15% standard at sit-down; service charge often added — check the bill.",
      taxi: "Round up; meters always on. Apps (Careem, Uber, Hala) ubiquitous.",
      hotel: "15–25 AED per bag; 15–25 AED/night for housekeeping.",
    },
    dress: "Modest in public — cover shoulders and knees. Beachwear only at the beach or pool. Sheer/offensive slogans can get you stopped.",
    taboo: "No public displays of affection. No swearing or rude gestures — can lead to jail. Don't photograph people (especially women) without consent. No alcohol outside licensed venues. During Ramadan, no eating/drinking in public during daylight.",
  },
  {
    city: "Paris",
    emoji: "🥐",
    greeting: "Bonjour (always start with this — skipping it is rude). Bonsoir in the evening. Merci when leaving any shop.",
    tip: {
      restaurants: "Service is included (15% by law). Round up or leave €1–2 for good service. Never tip at the counter.",
      taxi: "Service included; round up to nearest euro. App taxis (G7) have fixed airport rates.",
      hotel: "€1–2 per bag; €1–2/night for housekeeping, left in the room.",
    },
    dress: "Smart and understated. Avoid athletic wear and visible logos. Scarves and dark colours blend in. Black is the unofficial uniform.",
    taboo: "Always say bonjour before any interaction. Don't ask for splits bills at restaurants. Don't talk loudly on the metro. Don't assume everyone speaks English — try a few French words first.",
  },
];

export function CulturalInterpreter({ open, onOpenChange }: CulturalInterpreterProps) {
  const [selected, setSelected] = React.useState<CityProfile>(CITIES[0]);
  const [pickerOpen, setPickerOpen] = React.useState(false);

  // Close on Escape + lock scroll.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (pickerOpen) setPickerOpen(false);
        else onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onOpenChange, pickerOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-teal/25 px-4 py-3 glass-strong sm:px-6">
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-teal to-gold text-cream shadow-soft">
          <Globe2 className="h-5 w-5" strokeWidth={2.4} />
        </span>
        <div className="flex flex-col leading-none">
          <span className="font-display text-lg font-semibold gradient-text-gold">Cultural Interpreter</span>
          <span className="text-[10px] text-muted-foreground">a city-by-city field guide</span>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          aria-label="Close Cultural Interpreter"
          className="ml-auto grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          {/* Hero */}
          <div className="mb-5 rounded-3xl border border-teal/20 bg-gradient-to-br from-teal/5 via-card/40 to-gold/5 p-5 shadow-soft sm:p-6">
            <div className="flex items-start gap-3">
              <CirkleMark size={28} className="shrink-0" />
              <div className="min-w-0">
                <h1 className="font-display text-xl font-semibold sm:text-2xl">Travel like a local, not a tourist</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  A pocket cultural guide for {CITIES.length} cities. Greetings, tipping, dress, and the things you
                  really shouldn't do — written by people who live there.
                </p>
              </div>
            </div>
          </div>

          {/* City picker (pill grid on desktop, dropdown on mobile) */}
          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Choose a city
            </p>
            {/* Mobile dropdown */}
            <div className="relative sm:hidden">
              <button
                onClick={() => setPickerOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={pickerOpen}
                className={cn(
                  "flex h-11 w-full items-center gap-2.5 rounded-2xl border bg-background/80 px-3 text-left transition",
                  pickerOpen ? "border-teal/60 ring-1 ring-teal/40" : "border-border/60 hover:bg-muted/40"
                )}
              >
                <span className="text-xl">{selected.emoji}</span>
                <span className="flex-1 text-sm font-semibold">{selected.city}</span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition", pickerOpen && "rotate-180")} />
              </button>
              {pickerOpen && (
                <div
                  role="listbox"
                  className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-2xl border border-border/60 bg-card p-1 shadow-float"
                >
                  {CITIES.map((c) => (
                    <button
                      key={c.city}
                      role="option"
                      aria-selected={c.city === selected.city}
                      onClick={() => {
                        setSelected(c);
                        setPickerOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-muted/60",
                        c.city === selected.city && "bg-teal/5"
                      )}
                    >
                      <span className="text-xl">{c.emoji}</span>
                      <span className="flex-1 text-sm font-semibold">{c.city}</span>
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Desktop pill grid */}
            <div className="hidden flex-wrap gap-2 sm:flex">
              {CITIES.map((c) => {
                const sel = c.city === selected.city;
                return (
                  <button
                    key={c.city}
                    onClick={() => setSelected(c)}
                    aria-pressed={sel}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition",
                      sel
                        ? "border-teal bg-gradient-to-br from-teal to-gold text-cream shadow-soft"
                        : "border-border/60 bg-muted/40 hover:bg-muted"
                    )}
                  >
                    <span className="text-base leading-none">{c.emoji}</span>
                    {c.city}
                  </button>
                );
              })}
            </div>
          </div>

          {/* City guide card */}
          <CityGuide city={selected} />

          <p className="mt-6 text-center text-[11px] text-muted-foreground">
            Local norms change — be observant, lead with respect, and when in doubt, ask.
          </p>
        </div>
      </div>
    </div>
  );
}

function CityGuide({ city }: { city: CityProfile }) {
  const [openSection, setOpenSection] = React.useState<string | null>("greeting");
  const toggle = (id: string) => setOpenSection((s) => (s === id ? null : id));

  const sections: { id: string; label: string; icon: LucideIcon; color: string; body: React.ReactNode }[] = [
    {
      id: "greeting",
      label: "Greeting",
      icon: Handshake,
      color: "text-gold",
      body: <p className="text-sm leading-relaxed text-foreground/90">{city.greeting}</p>,
    },
    {
      id: "tipping",
      label: "Tipping",
      icon: Coffee,
      color: "text-teal",
      body: (
        <ul className="space-y-2 text-sm leading-relaxed text-foreground/90">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-base">🍽️</span>
            <span>
              <span className="font-semibold">Restaurants: </span>
              {city.tip.restaurants}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-base">🚕</span>
            <span>
              <span className="font-semibold">Taxi: </span>
              {city.tip.taxi}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-base">🏨</span>
            <span>
              <span className="font-semibold">Hotel: </span>
              {city.tip.hotel}
            </span>
          </li>
        </ul>
      ),
    },
    {
      id: "dress",
      label: "Dress",
      icon: Shirt,
      color: "text-steel",
      body: <p className="text-sm leading-relaxed text-foreground/90">{city.dress}</p>,
    },
    {
      id: "taboo",
      label: "Taboos",
      icon: AlertTriangle,
      color: "text-rose",
      body: <p className="text-sm leading-relaxed text-foreground/90">{city.taboo}</p>,
    },
  ];

  return (
    <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/40 shadow-soft">
      {/* City header */}
      <div className="flex items-center gap-3 border-b border-border/60 bg-gradient-to-br from-card/60 to-muted/30 px-5 py-4 sm:px-6 sm:py-5">
        <span className="text-3xl leading-none sm:text-4xl">{city.emoji}</span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-semibold sm:text-2xl">{city.city}</h2>
          <p className="text-[11px] text-muted-foreground">Field guide · updated this season</p>
        </div>
        <span className="hidden items-center gap-1 rounded-full bg-teal/10 px-2.5 py-1 text-[10px] font-semibold text-teal sm:flex">
          <MapPin className="h-3 w-3" />
          Local-ready
        </span>
      </div>

      {/* Expandable sections */}
      <ul className="divide-y divide-border/40">
        {sections.map((s) => {
          const Icon = s.icon;
          const isOpen = openSection === s.id;
          return (
            <li key={s.id}>
              <button
                onClick={() => toggle(s.id)}
                aria-expanded={isOpen}
                aria-controls={`section-${s.id}`}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-muted/30 sm:px-6"
              >
                <span
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-xl transition",
                    isOpen ? "bg-gradient-gold text-charcoal" : "bg-muted/60 text-muted-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4", !isOpen && s.color)} strokeWidth={2.2} />
                </span>
                <span className="flex-1 text-sm font-semibold">{s.label}</span>
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 text-muted-foreground transition", isOpen && "rotate-180")}
                />
              </button>
              {isOpen && (
                <div
                  id={`section-${s.id}`}
                  className="px-5 pb-5 pl-[3.75rem] sm:px-6 sm:pl-[4.25rem]"
                >
                  {s.body}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
