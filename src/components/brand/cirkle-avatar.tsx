import { cn } from "@/lib/utils";

type AvatarColor = "teal" | "rose" | "steel" | "gold" | "charcoal";

const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-xl",
  "2xl": "h-20 w-20 text-2xl",
} as const;

const GRADIENTS: Record<AvatarColor, string> = {
  teal: "from-[hsl(195_56%_33%)] to-[hsl(195_56%_18%)]",
  rose: "from-[hsl(351_51%_66%)] to-[hsl(351_51%_46%)]",
  steel: "from-[hsl(211_30%_52%)] to-[hsl(211_30%_32%)]",
  gold: "from-[hsl(39_55%_67%)] to-[hsl(39_45%_47%)]",
  charcoal: "from-[hsl(60_8%_22%)] to-[hsl(60_8%_9%)]",
};

interface CirkleAvatarProps {
  name: string;
  color?: AvatarColor;
  size?: keyof typeof SIZES;
  ring?: boolean;
  verified?: boolean;
  online?: boolean;
  className?: string;
  src?: string;
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function CirkleAvatar({
  name,
  color = "teal",
  size = "md",
  ring = false,
  verified = false,
  online = false,
  className,
  src,
}: CirkleAvatarProps) {
  return (
    <div className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          "relative grid place-items-center overflow-hidden rounded-full bg-gradient-to-br text-cream font-semibold uppercase tracking-wide shadow-[0_2px_8px_-2px_rgba(0,0,0,0.2)]",
          SIZES[size],
          GRADIENTS[color],
          ring && "ring-2 ring-[hsl(var(--gold))] ring-offset-2 ring-offset-background"
        )}
        title={name}
      >
        {src ? (
           
          <img src={src} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="drop-shadow-sm">{initialsOf(name)}</span>
        )}
      </div>
      {verified && (
        <span
          className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-[hsl(var(--gold))] text-[8px] font-bold text-charcoal ring-2 ring-background"
          title="Cirkle Verified"
        >
          ✓
        </span>
      )}
      {online && (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
      )}
    </div>
  );
}
