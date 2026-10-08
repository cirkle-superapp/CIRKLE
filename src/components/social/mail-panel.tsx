"use client";

import * as React from "react";
import { Mail, X, Send, Star, Inbox, Clock, AlertCircle, Loader2, Paperclip } from "lucide-react";
import { CirkleLogo } from "@/components/brand/cirkle-logo";
import { useMailEmails, useMailStats, useSendMail, useToggleStar, type MailEmail } from "@/hooks/use-mail";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface MailPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FOLDERS = [
  { key: "INBOX", label: "Inbox", icon: Inbox },
  { key: "SENT", label: "Sent", icon: Send },
  { key: "STARRED", label: "Starred", icon: Star },
];

export function MailPanel({ open, onOpenChange }: MailPanelProps) {
  const [folder, setFolder] = React.useState("INBOX");
  const [selected, setSelected] = React.useState<MailEmail | null>(null);
  const [composing, setComposing] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setSelected(null);
      setComposing(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const queryFolder = folder === "STARRED" ? "ALL" : folder;
  const { data: emails = [], isLoading } = useMailEmails(open ? queryFolder : "__noop__");
  const { data: stats } = useMailStats();
  const filtered = folder === "STARRED" ? emails.filter((e) => e.isStarred) : emails;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-gold/20 px-4 py-3 glass-strong">
        <CirkleLogo size={28} animated />
        <div className="flex flex-col leading-none">
          <span className="font-display text-lg font-semibold gradient-text-gold">Cirkle Mail</span>
          <span className="text-[10px] text-muted-foreground">
            {stats ? `${stats.unread} unread · ${stats.inbox} inbox` : "loading…"}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => { setComposing(true); setSelected(null); }}
            className="flex items-center gap-1.5 rounded-full bg-gradient-gold px-4 py-2 text-sm font-semibold text-charcoal shadow-soft transition hover:opacity-90"
          >
            <Send className="h-4 w-4" /> Compose
          </button>
          <button onClick={() => onOpenChange(false)} aria-label="Close Mail" className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Folder sidebar */}
        <nav className="hidden w-48 shrink-0 border-r border-border/60 p-3 sm:block">
          {FOLDERS.map((f) => (
            <button
              key={f.key}
              onClick={() => { setFolder(f.key); setSelected(null); setComposing(false); }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition",
                folder === f.key ? "bg-gradient-gold/15 font-semibold text-gold" : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              <f.icon className="h-4 w-4" />
              {f.label}
              {f.key === "INBOX" && stats?.unread ? (
                <span className="ml-auto rounded-full bg-rose px-1.5 text-[10px] font-bold text-white">{stats.unread}</span>
              ) : null}
            </button>
          ))}
        </nav>

        {/* Email list + reader */}
        <div className="flex flex-1 overflow-hidden">
          {composing ? (
            <ComposeView onClose={() => setComposing(false)} />
          ) : selected ? (
            <EmailReader email={selected} onBack={() => setSelected(null)} />
          ) : (
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading emails…
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <Mail className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="font-display text-lg font-semibold">No emails here</p>
                  <p className="mt-1 text-sm text-muted-foreground">Your inbox is clear.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {filtered.map((email) => (
                    <EmailRow
                      key={email.id}
                      email={email}
                      onClick={() => setSelected(email)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmailRow({ email, onClick }: { email: MailEmail; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-muted/30",
        !email.isRead && "bg-gold/5"
      )}
    >
      <div className="mt-0.5">
        {email.isStarred ? (
          <Star className="h-4 w-4 fill-gold text-gold" />
        ) : (
          <div className={cn("h-2 w-2 rounded-full", email.isRead ? "bg-transparent" : "bg-rose")} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn("truncate text-sm", !email.isRead ? "font-bold" : "font-medium")}>{email.fromName}</p>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {new Date(email.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        </div>
        <p className={cn("truncate text-sm", !email.isRead ? "font-semibold" : "text-muted-foreground")}>{email.subject}</p>
        <p className="truncate text-xs text-muted-foreground">{email.snippet}</p>
        <div className="mt-1 flex items-center gap-1.5">
          {email.isImportant && <span className="rounded bg-rose/15 px-1.5 text-[10px] font-medium text-rose">Important</span>}
          {email.hasAttachment && <Paperclip className="h-3 w-3 text-muted-foreground" />}
          {email.labels && <span className="rounded bg-muted px-1.5 text-[10px] text-muted-foreground">{email.labels}</span>}
        </div>
      </div>
    </button>
  );
}

function EmailReader({ email, onBack }: { email: MailEmail; onBack: () => void }) {
  const toggleStar = useToggleStar();
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex items-center gap-2 border-b border-border/60 p-3">
        <button onClick={onBack} className="text-sm text-muted-foreground transition hover:text-foreground">← Back</button>
        <button
          onClick={() => toggleStar.mutate({ id: email.id })}
          className="ml-auto grid h-8 w-8 place-items-center rounded-full transition hover:bg-muted"
        >
          <Star className={cn("h-4 w-4", email.isStarred && "fill-gold text-gold")} />
        </button>
      </div>
      <div className="p-6">
        <h1 className="font-display text-xl font-semibold">{email.subject}</h1>
        <div className="mt-3 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-teal to-steel text-sm font-bold text-cream">
            {email.fromName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold">{email.fromName}</p>
            <p className="text-xs text-muted-foreground">{email.fromEmail}</p>
          </div>
          <span className="ml-auto text-xs text-muted-foreground">
            {new Date(email.date).toLocaleString()}
          </span>
        </div>
        <div className="mt-6 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: email.body }} />
        {email.hasAttachment && email.attachmentName && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 p-3">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{email.attachmentName}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ComposeView({ onClose }: { onClose: () => void }) {
  const sendMail = useSendMail();
  const { toast } = useToast();
  const [to, setTo] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");

  const submit = async () => {
    if (!subject.trim() || !body.trim()) return;
    try {
      await sendMail.mutateAsync({ subject, body, toEmails: to || "you@cirkle.mail" });
      toast({ title: "Email sent", description: "Your message is on its way." });
      onClose();
    } catch (e) {
      toast({ title: "Failed to send", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-2xl">
        <h2 className="mb-4 font-display text-xl font-semibold">Compose</h2>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="To: you@cirkle.mail"
          className="mb-3 h-10 w-full rounded-xl border border-border/60 bg-card px-4 text-sm outline-none focus:ring-gold/40"
        />
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="mb-3 h-10 w-full rounded-xl border border-border/60 bg-card px-4 text-sm outline-none focus:ring-gold/40"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your message…"
          className="min-h-48 w-full rounded-xl border border-border/60 bg-card p-4 text-sm outline-none focus:ring-gold/40"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-5 py-2 text-sm text-muted-foreground transition hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={sendMail.isPending || !subject.trim() || !body.trim()}
            className="flex items-center gap-2 rounded-full bg-gradient-gold px-5 py-2 text-sm font-semibold text-charcoal shadow-soft transition hover:opacity-90 disabled:opacity-50"
          >
            {sendMail.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
