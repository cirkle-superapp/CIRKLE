"use client";

import * as React from "react";
import { Sparkles, X, Send, Loader2, Wand2 } from "lucide-react";
import { CirkleLogo } from "@/components/brand/cirkle-logo";
import { useAIAssistant, useSuggestPost, type AIMessage } from "@/hooks/use-ai";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AIAssistantPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUICK_PROMPTS = [
  "Summarize my circle in a sentence",
  "Suggest a post about my morning",
  "What should I share today?",
  "Draft a warm reply to a friend",
];

export function AIAssistantPanel({ open, onOpenChange }: AIAssistantPanelProps) {
  const assistant = useAIAssistant();
  const suggest = useSuggestPost();
  const { toast } = useToast();
  const [messages, setMessages] = React.useState<AIMessage[]>([]);
  const [input, setInput] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, assistant.isPending]);

  React.useEffect(() => {
    if (!open) {
      setMessages([]);
      setInput("");
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || assistant.isPending) return;
    const userMsg: AIMessage = { role: "user", content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    try {
      const res = await assistant.mutateAsync(next);
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch (e) {
      toast({
        title: "AI unavailable",
        description: e instanceof Error ? e.message.slice(0, 80) : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const onSuggestPosts = async () => {
    try {
      const res = await suggest.mutateAsync();
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Here are some post ideas for your circle:\n\n${res.suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n\n")}` },
      ]);
    } catch (e) {
      toast({ title: "Couldn't generate ideas", variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-gold/20 px-4 py-3 glass-strong">
        <div className="relative">
          <CirkleLogo size={32} animated />
          <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-gradient-gold text-charcoal">
            <Sparkles className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
        </div>
        <div className="flex flex-col leading-none">
          <span className="font-display text-lg font-semibold gradient-text-gold">Cirkle AI</span>
          <span className="text-[10px] text-muted-foreground">
            {assistant.isPending ? "thinking…" : "your intelligent companion"}
          </span>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          aria-label="Close AI assistant"
          className="ml-auto grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="relative mb-4">
                <div className="absolute inset-0 animate-pulse-glow rounded-full" />
                <div className="relative grid h-16 w-16 place-items-center rounded-full bg-gradient-gold/20">
                  <Sparkles className="h-8 w-8 text-gold" />
                </div>
              </div>
              <h2 className="font-display text-2xl font-semibold">How can I help?</h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                I can draft posts, suggest replies, summarize your circle, or spark ideas. Powered by the Cirkle AI engine.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="rounded-full border border-border/60 bg-card/70 px-4 py-2 text-sm transition hover:border-gold/40 hover:bg-card"
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                onClick={onSuggestPosts}
                disabled={suggest.isPending}
                className="mt-4 flex items-center gap-2 rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-charcoal shadow-soft transition hover:opacity-90 disabled:opacity-50"
              >
                {suggest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                Suggest post ideas
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
                  {m.role === "assistant" && (
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-gold/20">
                      <Sparkles className="h-4 w-4 text-gold" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-soft",
                      m.role === "user"
                        ? "rounded-br-sm bg-gradient-gold text-charcoal"
                        : "rounded-bl-sm bg-muted/70 text-foreground"
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {assistant.isPending && (
                <div className="flex gap-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-gold/20">
                    <Sparkles className="h-4 w-4 text-gold" />
                  </div>
                  <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-muted/70 px-4 py-3.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-gold/20 glass-strong">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask the Cirkle AI…"
            className="h-11 flex-1 rounded-full bg-muted/60 px-5 text-sm outline-none ring-1 ring-transparent transition focus:bg-background focus:ring-gold/40"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || assistant.isPending}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-gold text-charcoal transition hover:opacity-90 disabled:opacity-40"
            aria-label="Send"
          >
            {assistant.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
