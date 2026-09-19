"use client";

import * as React from "react";
import { ImagePlus, Smile, MapPin, X, Loader2, Sparkles, Send, Hourglass } from "lucide-react";
import { CirkleAvatar } from "@/components/brand/cirkle-avatar";
import { CirkleMark } from "@/components/brand/cirkle-logo";
import { SmartRouter } from "./smart-router";
import { useCurrentUser, useCreatePost, useUploadImage } from "@/hooks/use-social-data";
import { useSuggestPost, useGenerateImage } from "@/hooks/use-ai";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const FEELINGS = ["feeling happy", "feeling inspired", "feeling grateful", "feeling blessed", "feeling excited", "feeling thoughtful"];

export function CreatePost() {
  const { data: me } = useCurrentUser();
  const createPost = useCreatePost();
  const upload = useUploadImage();
  const suggest = useSuggestPost();
  const generateImage = useGenerateImage();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [feeling, setFeeling] = React.useState<string | null>(null);
  const [location, setLocation] = React.useState<string | null>(null);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Listen for the top-bar "Share a new moment" button to open the composer.
  React.useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("cirkle:open-composer", handler);
    return () => window.removeEventListener("cirkle:open-composer", handler);
  }, []);

  const onPickImage = () => fileRef.current?.click();

  const onSuggest = async () => {
    try {
      const res = await suggest.mutateAsync(text.trim() || undefined);
      setSuggestions(res.suggestions);
    } catch (e) {
      toast({ title: "Couldn't generate ideas", description: e instanceof Error ? e.message.slice(0, 60) : undefined, variant: "destructive" });
    }
  };

  const onGenerateImage = async () => {
    const prompt = text.trim() || "an artistic moment to share";
    try {
      const res = await generateImage.mutateAsync(prompt);
      if (res.imageUrl.startsWith("http")) {
        // Pollinations returns a direct URL — use it as-is.
        setImageUrl(res.imageUrl);
      } else {
        // HuggingFace returns a data URI — save it to /uploads for persistence.
        const blob = await (await fetch(res.imageUrl)).blob();
        const fd = new FormData();
        fd.append("file", blob, `ai-${Date.now()}.png`);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        if (!up.ok) throw new Error("upload failed");
        const { url } = await up.json();
        setImageUrl(url);
      }
      toast({ title: "Image generated", description: "AI-crafted image added to your moment." });
    } catch (e) {
      toast({ title: "Image generation failed", description: e instanceof Error ? e.message.slice(0, 60) : "Try again in a moment.", variant: "destructive" });
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const { url } = await upload.mutateAsync(f);
      setImageUrl(url);
    } catch {
      toast({ title: "Upload failed", description: "Please try a smaller image.", variant: "destructive" });
    }
    e.target.value = "";
  };

  const submit = async () => {
    if (!text.trim() && !imageUrl) return;
    try {
      await createPost.mutateAsync({
        content: text.trim(),
        imageUrl: imageUrl ?? undefined,
        feeling: feeling ?? undefined,
        location: location ?? undefined,
      });
      setText("");
      setImageUrl(null);
      setFeeling(null);
      setLocation(null);
      setOpen(false);
      toast({ title: "Sent to your circle", description: "Your moment is now live." });
    } catch {
      toast({ title: "Could not post", description: "Something went wrong.", variant: "destructive" });
    }
  };

  if (!me) return null;
  const firstName = me.name.split(" ")[0];

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-3 shadow-soft backdrop-blur sm:p-4">
      {/* collapsed row */}
      <div className="flex items-center gap-2.5">
        <CirkleAvatar name={me.name} color={me.avatarColor} size="md" verified={me.verified} />
        <button
          onClick={() => setOpen(true)}
          className="h-11 flex-1 rounded-full bg-muted/60 px-4 text-left text-sm text-muted-foreground transition hover:bg-muted"
        >
          Share something with your circle, {firstName}?
        </button>
        <button
          onClick={() => setOpen(true)}
          title="Share a moment"
          aria-label="Share a moment"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-gold text-charcoal shadow-soft transition hover:opacity-90"
        >
          <Sparkles className="h-5 w-5" strokeWidth={2.2} />
        </button>
      </div>

      {open && (
        <div className="mt-3 rounded-2xl border border-border/60 bg-card p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CirkleMark size={18} />
              <h3 className="font-display text-lg font-semibold">New moment</h3>
            </div>
            <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted" aria-label="Close composer">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-2 flex items-center gap-2">
            <CirkleAvatar name={me.name} color={me.avatarColor} size="sm" verified={me.verified} />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">{me.name}</p>
              {feeling && (
                <button
                  onClick={() => setFeeling(null)}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  is {feeling} ✕
                </button>
              )}
              {location && !feeling && (
                <button
                  onClick={() => setLocation(null)}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  📍 {location} ✕
                </button>
              )}
            </div>
          </div>

          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share a moment with your circle…"
            className="min-h-24 w-full resize-none rounded-xl bg-transparent text-lg outline-none placeholder:text-muted-foreground"
          />

          {/* SmartRouter hint — analyzes text and suggests a pillar */}
          <SmartRouter
            text={text}
            onRoute={(pillar) => {
              if (pillar === "Wasl") {
                // Copy current text to clipboard so the user can paste in Wasl.
                const trimmed = text.trim();
                if (trimmed) {
                  navigator.clipboard?.writeText(trimmed).then(
                    () => {
                      toast({
                        title: "Draft copied to clipboard",
                        description: "Paste it into your Wasl conversation.",
                      });
                    },
                    () => {
                      /* clipboard unavailable — silently fall through */
                    }
                  );
                }
                // Close the composer so Wasl becomes the focal surface.
                setOpen(false);
                // Ask the app shell to open Wasl.
                window.dispatchEvent(new CustomEvent("cirkle:open-wasl"));
                return;
              }
              // Lamahat / Channel / Mail aren't built out yet — keep the text
              // in the composer so the user can keep editing and post it as
              // a regular moment. Just close the smart-router hint by clearing
              // an internal flag isn't possible without state, so we simply
              // toast a gentle "keep going" hint.
              toast({
                title: "Stays here for now",
                description: "Keep it as a moment — that pillar is coming soon.",
              });
            }}
          />

          {imageUrl && (
            <div className="relative mt-2 overflow-hidden rounded-xl border border-border/60">
              <img src={imageUrl} alt="upload preview" className="max-h-72 w-full object-cover" />
              <button
                onClick={() => setImageUrl(null)}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* attachment chips */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
            <span className="mr-auto text-xs font-semibold text-muted-foreground">Add to your moment</span>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            <ChipBtn icon={ImagePlus} label="Photo" color="text-teal" onClick={onPickImage} loading={upload.isPending} />
            <ChipBtn icon={Smile} label="Feeling" color="text-rose" onClick={() => setFeeling(FEELINGS[Math.floor(Math.random() * FEELINGS.length)])} />
            <ChipBtn icon={MapPin} label="Check-in" color="text-steel" onClick={() => setLocation("Cairo, Egypt")} />
            <ChipBtn icon={Hourglass} label="Time capsule" color="text-steel" onClick={() => window.dispatchEvent(new CustomEvent("cirkle:open-capsule"))} />
            <ChipBtn icon={Sparkles} label="AI image" color="text-rose" onClick={onGenerateImage} loading={generateImage.isPending} />
            <ChipBtn icon={Sparkles} label="AI suggest" color="text-gold" onClick={onSuggest} loading={suggest.isPending} />
          </div>

          {/* AI suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-3 rounded-xl border border-gold/30 bg-gold/5 p-2.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gold">
                <Sparkles className="h-3.5 w-3.5" /> AI suggestions
                <button onClick={() => setSuggestions([])} className="ml-auto text-muted-foreground hover:text-foreground">×</button>
              </div>
              <div className="space-y-1.5">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setText(s); setSuggestions([]); }}
                    className="block w-full rounded-lg bg-card/80 p-2 text-left text-sm transition hover:bg-card hover:ring-1 hover:ring-gold/30"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={submit}
            disabled={createPost.isPending || (!text.trim() && !imageUrl)}
            className={cn(
              "mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl font-semibold transition",
              "bg-gradient-gold text-charcoal shadow-soft hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            {createPost.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" strokeWidth={2.4} />
            )}
            Send to circle
          </button>
        </div>
      )}
    </div>
  );
}

function ChipBtn({
  icon: Icon,
  label,
  onClick,
  loading,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  loading?: boolean;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="flex h-9 items-center gap-1.5 rounded-full bg-muted/60 px-3 text-xs font-medium transition hover:bg-muted"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin text-teal" /> : <Icon className={cn("h-4 w-4", color)} />}
      {label}
    </button>
  );
}
