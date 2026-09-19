"use client";

import * as React from "react";
import {
  X,
  Loader2,
  Bookmark,
  Radio,
  Pencil,
  Check,
  MessageCircle,
  UserPlus,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { CirkleAvatar } from "@/components/brand/cirkle-avatar";
import { CirkleMark } from "@/components/brand/cirkle-logo";
import type { AvatarColor, SocialPost } from "@/lib/social/types";
import { CURRENT_USER_ID } from "@/lib/social/types";
import {
  useProfile,
  useUpdateMe,
  useSavedPosts,
  useSendFriendRequest,
} from "@/hooks/use-discover";
import { useToast } from "@/hooks/use-toast";
import { timeAgo } from "@/lib/social/time";
import { cn } from "@/lib/utils";
import { PostCard } from "./post-card";
import { Constellation } from "./constellation";

interface ProfilePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  onOpenChat: (friendId?: string) => void;
  onOpenProfile?: (userId: string) => void;
}

type Tab = "echoes" | "saved";

const AVATAR_SWATCHES: { key: AvatarColor; cls: string }[] = [
  { key: "teal", cls: "bg-gradient-to-br from-[hsl(195_56%_43%)] to-[hsl(195_56%_18%)]" },
  { key: "rose", cls: "bg-gradient-to-br from-[hsl(351_51%_66%)] to-[hsl(351_51%_46%)]" },
  { key: "steel", cls: "bg-gradient-to-br from-[hsl(211_30%_52%)] to-[hsl(211_30%_32%)]" },
  { key: "gold", cls: "bg-gradient-to-br from-[hsl(39_55%_67%)] to-[hsl(39_45%_47%)]" },
  { key: "charcoal", cls: "bg-gradient-to-br from-[hsl(60_8%_22%)] to-[hsl(60_8%_9%)]" },
];

export function ProfilePanel({ open, onOpenChange, userId, onOpenChat, onOpenProfile }: ProfilePanelProps) {
  const { data: profile, isLoading } = useProfile(open ? userId : null);
  const [tab, setTab] = React.useState<Tab>("echoes");
  const [editing, setEditing] = React.useState(false);

  // Reset state when the panel closes or switches user.
  React.useEffect(() => {
    if (!open) {
      setTab("echoes");
      setEditing(false);
    }
  }, [open]);

  // Close on Escape.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  // Lock body scroll while open.
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const user = profile?.user;
  const isCurrentUser = profile?.isCurrentUser ?? userId === CURRENT_USER_ID;
  const isFriend = profile?.isFriend ?? false;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl">
      {/* Top accent strip + close */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-gold/20 px-3 py-2.5 glass-strong sm:px-4">
        <CirkleMark size={20} className="opacity-70" />
        <span className="font-display text-sm font-semibold gradient-text-gold">Profile</span>
        <button
          onClick={() => onOpenChange(false)}
          aria-label="Close profile"
          className="ml-auto grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {isLoading || !user ? (
          <ProfileSkeleton />
        ) : (
          <div className="mx-auto max-w-3xl">
            {/* Cover */}
            <div className="relative h-40 w-full overflow-hidden sm:h-52 md:h-60">
              {user.coverUrl ? (
                <img src={user.coverUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    background:
                      "radial-gradient(ellipse at 20% 20%, hsl(39 45% 57% / 0.85), transparent 55%)," +
                      "radial-gradient(ellipse at 80% 30%, hsl(351 41% 56% / 0.85), transparent 55%)," +
                      "radial-gradient(ellipse at 50% 100%, hsl(195 56% 23% / 0.95), transparent 65%)," +
                      "linear-gradient(135deg, hsl(39 45% 57%) 0%, hsl(351 41% 56%) 50%, hsl(195 56% 23%) 100%)",
                  }}
                />
              )}
              {/* Cirkle ring watermark */}
              <span
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-8 opacity-20"
              >
                <CirkleMark size={160} />
              </span>
              {/* Subtle dark gradient at bottom for legibility */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent"
              />
            </div>

            {/* Identity row */}
            <div className="relative px-4 sm:px-6">
              <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-end gap-3">
                  <div className="rounded-full ring-4 ring-background">
                    <CirkleAvatar
                      name={user.name}
                      color={user.avatarColor}
                      size="2xl"
                      ring
                      verified={user.verified}
                      className="rounded-full"
                    />
                  </div>
                  <div className="pb-1">
                    <h1 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">
                      {user.name}
                    </h1>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pb-1">
                  {isCurrentUser ? (
                    <>
                      <button
                        onClick={() => setEditing((v) => !v)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition",
                          editing
                            ? "border-gold/40 bg-gold/10 text-gold"
                            : "border-gold/40 text-foreground hover:bg-gold/5"
                        )}
                      >
                        {editing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                        {editing ? "Done" : "Edit profile"}
                      </button>
                      <button
                        onClick={() =>
                          window.dispatchEvent(new CustomEvent("cirkle:open-privacy"))
                        }
                        aria-label="See how others see you — open the Privacy Simulator"
                        title="See how others see you"
                        className="flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/5 px-4 py-2 text-sm font-medium text-gold transition hover:bg-gold/10"
                      >
                        <ShieldAlert className="h-4 w-4" />
                        See how others see you
                      </button>
                    </>
                  ) : isFriend ? (
                    <button
                      onClick={() => onOpenChat(user.id)}
                      className="flex items-center gap-1.5 rounded-full bg-gradient-gold px-5 py-2 text-sm font-semibold text-charcoal shadow-soft transition hover:opacity-90"
                    >
                      <MessageCircle className="h-4 w-4" strokeWidth={2.2} />
                      Wasl
                    </button>
                  ) : (
                    <ConnectButton userId={user.id} />
                  )}
                </div>
              </div>

              {/* Bio */}
              {user.bio ? (
                <p className="mt-4 max-w-prose text-sm leading-relaxed text-foreground/90">
                  {user.bio}
                </p>
              ) : isCurrentUser ? (
                <p className="mt-4 text-sm italic text-muted-foreground">
                  No bio yet — tap “Edit profile” to introduce yourself.
                </p>
              ) : null}

              {/* Joined */}
              <p className="mt-2 text-xs text-muted-foreground">
                Joined Cirkle · {timeAgo(user.createdAt)} ago
              </p>

              {/* Stats */}
              <div className="mt-4 flex items-center gap-5 border-b border-border/60 pb-3">
                <Stat label="Resonances" value={profile?.postsCount ?? 0} icon={<Radio className="h-3.5 w-3.5" />} />
                <span className="h-6 w-px bg-border/60" />
                <Stat label="Connections" value={profile?.friendsCount ?? 0} icon={<Sparkles className="h-3.5 w-3.5" />} />
              </div>

              {/* Constellation viz — orbital map of message-volume contacts */}
              <Constellation
                userId={user.id}
                onOpenProfile={onOpenProfile}
                onOpenChat={onOpenChat}
              />

              {/* Edit form */}
              {editing && isCurrentUser && (
                <EditProfileForm
                  currentName={user.name}
                  currentBio={user.bio ?? ""}
                  currentColor={user.avatarColor}
                  onDone={() => setEditing(false)}
                />
              )}

              {/* Tabs */}
              {isCurrentUser && (
                <div className="mt-4 flex items-center gap-1.5">
                  <TabButton active={tab === "echoes"} onClick={() => setTab("echoes")} icon={<Radio className="h-3.5 w-3.5" />}>
                    Echoes
                  </TabButton>
                  <TabButton active={tab === "saved"} onClick={() => setTab("saved")} icon={<Bookmark className="h-3.5 w-3.5" />}>
                    Saved
                  </TabButton>
                </div>
              )}

              {/* Posts list */}
              <div className="mt-4 space-y-4 pb-12">
                {tab === "echoes" ? (
                  <EchoesTab posts={profile?.posts ?? []} />
                ) : (
                  <SavedTab />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="flex items-center gap-1 text-lg font-semibold font-display gradient-text-gold">
        {value}
      </span>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </span>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition",
        active
          ? "bg-gradient-gold text-charcoal shadow-soft"
          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function ConnectButton({ userId }: { userId: string }) {
  const send = useSendFriendRequest();
  const { toast } = useToast();
  const [sent, setSent] = React.useState(false);

  const onClick = async () => {
    try {
      await send.mutateAsync(userId);
      setSent(true);
      toast({ title: "Connection sent", description: "Your invitation is on its way." });
    } catch {
      toast({ title: "Could not send request", description: "Try again in a moment." });
    }
  };

  if (sent) {
    return (
      <button
        disabled
        className="flex items-center gap-1.5 rounded-full bg-muted/60 px-5 py-2 text-sm font-medium text-muted-foreground"
      >
        <Check className="h-4 w-4" />
        Request sent
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={send.isPending}
      className="flex items-center gap-1.5 rounded-full bg-gradient-gold px-5 py-2 text-sm font-semibold text-charcoal shadow-soft transition hover:opacity-90 disabled:opacity-50"
    >
      <UserPlus className="h-4 w-4" strokeWidth={2.2} />
      {send.isPending ? "Sending…" : "Connect"}
    </button>
  );
}

function EditProfileForm({
  currentName,
  currentBio,
  currentColor,
  onDone,
}: {
  currentName: string;
  currentBio: string;
  currentColor: AvatarColor;
  onDone: () => void;
}) {
  const update = useUpdateMe();
  const { toast } = useToast();
  const [name, setName] = React.useState(currentName);
  const [bio, setBio] = React.useState(currentBio);
  const [color, setColor] = React.useState<AvatarColor>(currentColor);

  const dirty = name !== currentName || bio !== currentBio || color !== currentColor;

  const save = async () => {
    try {
      await update.mutateAsync({
        name: name.trim() || currentName,
        bio: bio.trim(),
        avatarColor: color,
      });
      toast({ title: "Profile updated", description: "Your circle sees the new you." });
      onDone();
    } catch {
      toast({ title: "Update failed", description: "Try again in a moment." });
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-soft">
      <h3 className="mb-3 font-display text-base font-semibold">Edit your profile</h3>

      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Name
      </label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mb-3 h-10 w-full rounded-xl bg-background px-3 text-sm outline-none ring-1 ring-transparent transition focus:ring-gold/40"
      />

      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Bio
      </label>
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        rows={3}
        placeholder="A line or two about you…"
        className="mb-3 w-full resize-none rounded-xl bg-background px-3 py-2 text-sm outline-none ring-1 ring-transparent transition focus:ring-gold/40"
      />

      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Avatar color
      </label>
      <div className="flex items-center gap-2">
        {AVATAR_SWATCHES.map((s) => (
          <button
            key={s.key}
            onClick={() => setColor(s.key)}
            aria-label={`Avatar color ${s.key}`}
            className={cn(
              "h-8 w-8 rounded-full bg-gradient-to-br transition",
              s.cls,
              color === s.key
                ? "ring-2 ring-offset-2 ring-offset-card ring-gold"
                : "opacity-80 hover:opacity-100"
            )}
          >
            {color === s.key && (
              <Check className="mx-auto h-4 w-4 text-white drop-shadow-sm" />
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          onClick={onDone}
          className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={!dirty || update.isPending}
          className="flex items-center gap-1.5 rounded-full bg-gradient-gold px-5 py-2 text-sm font-semibold text-charcoal shadow-soft transition hover:opacity-90 disabled:opacity-50"
        >
          {update.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Save changes
        </button>
      </div>
    </div>
  );
}

function EchoesTab({ posts }: { posts: SocialPost[] }) {
  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-10 text-center">
        <Radio className="mx-auto mb-2 h-8 w-8 text-gold/70" />
        <p className="font-display text-lg font-semibold">No echoes yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          When this circle shares a moment, it will appear here.
        </p>
      </div>
    );
  }
  return (
    <>
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </>
  );
}

function SavedTab() {
  const { data: saved = [], isLoading } = useSavedPosts();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  if (saved.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-10 text-center">
        <Bookmark className="mx-auto mb-2 h-8 w-8 text-gold/70" />
        <p className="font-display text-lg font-semibold">Nothing saved yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap the bookmark on any echo to keep it here for later.
        </p>
      </div>
    );
  }

  return (
    <>
      {saved.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="h-40 w-full skeleton-shimmer sm:h-56" />
      <div className="px-4 sm:px-6">
        <div className="-mt-12 flex items-end gap-3">
          <div className="h-20 w-20 rounded-full ring-4 ring-background bg-muted skeleton-shimmer" />
          <div className="space-y-2 pb-2">
            <div className="h-5 w-32 rounded bg-muted skeleton-shimmer" />
            <div className="h-3 w-24 rounded bg-muted skeleton-shimmer" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-3 w-full rounded bg-muted skeleton-shimmer" />
          <div className="h-3 w-4/5 rounded bg-muted skeleton-shimmer" />
        </div>
        <div className="mt-4 h-8 w-64 rounded bg-muted skeleton-shimmer" />
      </div>
    </div>
  );
}
