"use client";

import * as React from "react";
import { Sparkles, Orbit } from "lucide-react";
import { CirkleAvatar } from "@/components/brand/cirkle-avatar";
import { useCurrentUser } from "@/hooks/use-social-data";
import type { AvatarColor } from "@/lib/social/types";
import { cn } from "@/lib/utils";

interface ConstellationProps {
  userId: string;
  onOpenProfile?: (userId: string) => void;
  onOpenChat?: (friendId?: string) => void;
}

interface ConstellationContact {
  id: string;
  name: string;
  username: string;
  avatarColor: AvatarColor;
  verified: boolean;
  volume: number;
}

interface ConstellationData {
  total: number;
  orbits: {
    inner: ConstellationContact[];
    middle: ConstellationContact[];
    outer: ConstellationContact[];
  };
}

const SIZE = 360;
const CENTER = SIZE / 2;
const ORBIT_RADII = {
  inner: 70,
  middle: 120,
  outer: 165,
};

export function Constellation({ userId, onOpenProfile, onOpenChat }: ConstellationProps) {
  const { data: me } = useCurrentUser();
  const { data, isLoading } = useConstellation(userId);

  // Hide entirely while loading or if no contacts.
  if (isLoading || !data || data.total === 0) return null;

  const inner = data.orbits.inner ?? [];
  const middle = data.orbits.middle ?? [];
  const outer = data.orbits.outer ?? [];

  const placeOnOrbit = (contacts: ConstellationContact[], radius: number) => {
    const n = contacts.length;
    return contacts.map((c, i) => {
      const angle = (i / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2; // start at top
      const x = CENTER + radius * Math.cos(angle);
      const y = CENTER + radius * Math.sin(angle);
      return { contact: c, x, y };
    });
  };

  const innerPos = placeOnOrbit(inner, ORBIT_RADII.inner);
  const middlePos = placeOnOrbit(middle, ORBIT_RADII.middle);
  const outerPos = placeOnOrbit(outer, ORBIT_RADII.outer);

  return (
    <section
      className="mt-6 overflow-hidden rounded-3xl border border-gold/15 bg-card/40 p-4 sm:p-5"
      aria-label="Constellation"
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Orbit className="h-4 w-4 text-gold" />
        <h3 className="font-display text-base font-semibold">Constellation</h3>
        <span className="ml-auto flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-[11px] font-semibold text-gold">
          <Sparkles className="h-3 w-3" />
          {data.total} connection{data.total === 1 ? "" : "s"}
        </span>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">Your gravitational system — orbits by message volume.</p>

      <div className="mx-auto flex max-w-[400px] justify-center">
        <div
          className="relative"
          style={{ width: SIZE, height: SIZE }}
        >
          {/* SVG orbit rings */}
          <svg
            className="absolute inset-0"
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            fill="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="constellation-grad" x1="0" y1="0" x2={SIZE} y2={SIZE} gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="hsl(39 45% 57%)" />
                <stop offset="50%" stopColor="hsl(351 41% 56%)" />
                <stop offset="100%" stopColor="hsl(195 56% 33%)" />
              </linearGradient>
            </defs>
            {/* Outer */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={ORBIT_RADII.outer}
              stroke="url(#constellation-grad)"
              strokeWidth="1"
              strokeDasharray="3 6"
              opacity="0.35"
            />
            {/* Middle */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={ORBIT_RADII.middle}
              stroke="url(#constellation-grad)"
              strokeWidth="1"
              strokeDasharray="3 5"
              opacity="0.5"
            />
            {/* Inner */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={ORBIT_RADII.inner}
              stroke="url(#constellation-grad)"
              strokeWidth="1.25"
              strokeDasharray="2 4"
              opacity="0.7"
            />
            {/* Subtle radial glow at center */}
            <circle cx={CENTER} cy={CENTER} r="48" fill="url(#constellation-grad)" opacity="0.08" />
          </svg>

          {/* Outer-orbit contacts */}
          {outerPos.map(({ contact, x, y }) => (
            <OrbitContact
              key={contact.id}
              contact={contact}
              x={x}
              y={y}
              size="sm"
              onOpenProfile={onOpenProfile}
              onOpenChat={onOpenChat}
            />
          ))}

          {/* Middle-orbit contacts */}
          {middlePos.map(({ contact, x, y }) => (
            <OrbitContact
              key={contact.id}
              contact={contact}
              x={x}
              y={y}
              size="sm"
              onOpenProfile={onOpenProfile}
              onOpenChat={onOpenChat}
            />
          ))}

          {/* Inner-orbit contacts (closest) */}
          {innerPos.map(({ contact, x, y }) => (
            <OrbitContact
              key={contact.id}
              contact={contact}
              x={x}
              y={y}
              size="md"
              onOpenProfile={onOpenProfile}
              onOpenChat={onOpenChat}
            />
          ))}

          {/* Center: current user */}
          <div
            className="absolute z-10"
            style={{
              left: CENTER,
              top: CENTER,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="relative grid place-items-center">
              <span
                aria-hidden
                className="absolute h-20 w-20 rounded-full bg-gold/15 blur-md"
              />
              {me ? (
                <div className="relative rounded-full ring-2 ring-gold ring-offset-2 ring-offset-card">
                  <CirkleAvatar
                    name={me.name}
                    color={me.avatarColor}
                    size="lg"
                    verified={me.verified}
                    className="rounded-full"
                  />
                </div>
              ) : (
                <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-gold text-charcoal">
                  <Sparkles className="h-5 w-5" />
                </div>
              )}
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-card/90 px-2 py-0.5 text-[10px] font-semibold text-foreground shadow-soft">
                You
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        <LegendItem swatch="bg-gold" label="Inner — closest" />
        <LegendItem swatch="bg-rose" label="Middle" />
        <LegendItem swatch="bg-teal" label="Outer" />
      </div>
    </section>
  );
}

function OrbitContact({
  contact,
  x,
  y,
  size,
  onOpenProfile,
  onOpenChat,
}: {
  contact: ConstellationContact;
  x: number;
  y: number;
  size: "sm" | "md";
  onOpenProfile?: (userId: string) => void;
  onOpenChat?: (friendId?: string) => void;
}) {
  const clickable = !!onOpenProfile || !!onOpenChat;
  const tooltip = `${contact.name} · ${contact.volume} message${contact.volume === 1 ? "" : "s"}`;
  const handleActivate = () => {
    if (onOpenProfile) onOpenProfile(contact.id);
    else if (onOpenChat) onOpenChat(contact.id);
  };
  return (
    <div
      className={cn("group absolute z-[5]", clickable && "cursor-pointer")}
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div className="relative">
        <span
          aria-hidden
          className="absolute inset-0 -z-10 animate-ping rounded-full bg-gold/20 [animation-duration:3s]"
        />
        {clickable ? (
          <button
            type="button"
            onClick={handleActivate}
            aria-label={`Open ${contact.name}'s profile · ${contact.volume} messages`}
            title={tooltip}
            className="block rounded-full transition-transform duration-300 group-hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            <CirkleAvatar
              name={contact.name}
              color={contact.avatarColor}
              size={size}
              verified={contact.verified}
              className="rounded-full"
            />
          </button>
        ) : (
          <div title={tooltip} className="transition-transform duration-300 group-hover:scale-110">
            <CirkleAvatar
              name={contact.name}
              color={contact.avatarColor}
              size={size}
              verified={contact.verified}
              className="rounded-full"
            />
          </div>
        )}
        {/* Tooltip on hover */}
        <div
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-card/95 px-2.5 py-1 text-[11px] font-medium text-foreground opacity-0 shadow-soft ring-1 ring-gold/20 transition-opacity duration-200 group-hover:opacity-100"
        >
          <span className="font-semibold">{contact.name}</span>
          <span className="text-muted-foreground"> · {contact.volume} msg{contact.volume === 1 ? "" : "s"}</span>
          {clickable && (
            <span className="ml-1 text-gold">· open</span>
          )}
        </div>
      </div>
    </div>
  );
}

function LegendItem({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", swatch)} aria-hidden />
      {label}
    </span>
  );
}

function useConstellation(userId: string) {
  const [data, setData] = React.useState<ConstellationData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetch(`/api/constellation?userId=${encodeURIComponent(userId)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed (${r.status})`);
        return r.json();
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { data, isLoading };
}
