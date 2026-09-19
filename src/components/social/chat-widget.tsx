"use client";

import * as React from "react";
import { MessageCircle, X, Send, Phone, Video, Loader2, Search } from "lucide-react";
import { CirkleAvatar } from "@/components/brand/cirkle-avatar";
import { CirkleLogo } from "@/components/brand/cirkle-logo";
import {
  useWaslConversations,
  useWaslMessages,
  useSendWaslMessage,
  useFindOrCreateConversation,
  useMarkWaslRead,
  useWaslUsers,
} from "@/hooks/use-wasl";
import { useChatSocket, type WaslIncomingMessage } from "@/hooks/use-chat-socket";
import { useSmartReply } from "@/hooks/use-ai";
import { Sparkles } from "lucide-react";
import type { WaslConversation } from "@/lib/wasl/types";
import { WASL_CURRENT_USER_ID } from "@/lib/wasl/types";
import { timeAgo, formatTime } from "@/lib/social/time";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { waslKeys } from "@/hooks/use-wasl";

interface ChatWidgetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Friend (Wasl user) id to start a conversation with. */
  initialFriendId?: string | null;
}

export function ChatWidget({ open, onOpenChange, initialFriendId }: ChatWidgetProps) {
  const { data: conversations = [] } = useWaslConversations();
  const [activeConvId, setActiveConvId] = React.useState<string | null>(null);
  const [showNewChat, setShowNewChat] = React.useState(false);

  // When asked to open a specific friend, find/create the conversation.
  const findOrCreate = useFindOrCreateConversation();
  React.useEffect(() => {
    if (initialFriendId && open) {
      const existing = conversations.find((c) => c.otherParticipant?.id === initialFriendId);
      if (existing) {
        setActiveConvId(existing.id);
      } else {
        findOrCreate.mutate(initialFriendId);
      }
    }
  }, [initialFriendId, open]);  

  React.useEffect(() => {
    if (findOrCreate.data && !activeConvId) {
      setActiveConvId(findOrCreate.data.id);
    }
  }, [findOrCreate.data, activeConvId]);

  // Reset when closed.
  React.useEffect(() => {
    if (!open) {
      setActiveConvId(null);
      setShowNewChat(false);
    }
  }, [open]);

  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null;

  if (!open) return null;

  return (
    <div className="fixed bottom-0 right-0 z-50 flex items-end gap-3 p-3 sm:p-4">
      {/* Conversations rail */}
      <div className="hidden sm:block">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Conversations
          </span>
          <button
            onClick={() => onOpenChange(false)}
            className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Close Wasl"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex max-h-[60vh] w-56 flex-col overflow-y-auto rounded-2xl border border-border/60 bg-card/95 p-1 shadow-float backdrop-blur scrollbar-hide">
          <button
            onClick={() => setShowNewChat((v) => !v)}
            className="mb-1 flex items-center gap-2 rounded-xl bg-gradient-gold/15 p-2 text-left text-sm font-medium text-gold transition hover:bg-gradient-gold/25"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-gold text-charcoal">+</span>
            New Wasl chat
          </button>
          {showNewChat && <NewChatPicker onPick={(id) => { findOrCreate.mutate(id); setShowNewChat(false); }} />}
          {conversations.map((c) => (
            <ConversationRow
              key={c.id}
              conversation={c}
              active={activeConvId === c.id}
              onClick={() => setActiveConvId(c.id)}
            />
          ))}
          {conversations.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">No conversations yet.</p>
          )}
        </div>
      </div>

      {/* Active conversation */}
      {activeConv ? (
        <ConversationPanel
          conversation={activeConv}
          onClose={() => setActiveConvId(null)}
        />
      ) : (
        <div className="flex w-full max-w-sm flex-col rounded-2xl border border-border/60 bg-card/95 shadow-float backdrop-blur">
          <div className="flex items-center justify-between border-b border-border/60 p-3">
            <div className="flex items-center gap-2">
              <CirkleLogo size={26} animated />
              <span className="font-display font-semibold">Wasl</span>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-6 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-gradient-gold/20">
              <MessageCircle className="h-7 w-7 text-gold" />
            </div>
            <p className="font-display text-lg font-semibold">Your Wasl circle</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a conversation, or start a new Wasl chat.
            </p>
            <p className="mt-3 text-[11px] text-muted-foreground/70">
              Powered by the Wasl service · real-time + own database
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function NewChatPicker({ onPick }: { onPick: (userId: string) => void }) {
  const { data: users = [] } = useWaslUsers();
  const [q, setQ] = React.useState("");
  const filtered = users.filter(
    (u) => u.id !== WASL_CURRENT_USER_ID && u.name.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div className="mb-1 rounded-xl border border-border/60 bg-background/60 p-1">
      <div className="relative mb-1">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people…"
          className="h-7 w-full rounded-lg bg-muted/50 pl-7 pr-2 text-xs outline-none"
        />
      </div>
      <div className="max-h-40 overflow-y-auto scrollbar-hide">
        {filtered.map((u) => (
          <button
            key={u.id}
            onClick={() => onPick(u.id)}
            className="flex w-full items-center gap-2 rounded-lg p-1.5 text-left transition hover:bg-muted/60"
          >
            <CirkleAvatar name={u.name} color={u.avatarColor} size="xs" verified={u.verified} online={u.online} />
            <span className="truncate text-xs font-medium">{u.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ConversationRow({
  conversation,
  active,
  onClick,
}: {
  conversation: WaslConversation;
  active: boolean;
  onClick: () => void;
}) {
  const other = conversation.otherParticipant;
  if (!other) return null;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-xl p-2 text-left transition hover:bg-muted/60",
        active && "bg-muted/60"
      )}
    >
      <CirkleAvatar name={other.name} color={other.avatarColor} size="sm" verified={other.verified} online={other.online} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{other.name}</p>
        {conversation.lastMessage ? (
          <p className="truncate text-[11px] text-muted-foreground">
            {conversation.lastMessage.senderId === WASL_CURRENT_USER_ID ? "You: " : ""}
            {conversation.lastMessage.content}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">Say hello 👋</p>
        )}
      </div>
      {conversation.unreadCount > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rose px-1 text-[10px] font-bold text-white">
          {conversation.unreadCount}
        </span>
      )}
    </button>
  );
}

function ConversationPanel({
  conversation,
  onClose,
}: {
  conversation: WaslConversation;
  onClose: () => void;
}) {
  const { data: messages = [], isLoading } = useWaslMessages(conversation.id);
  const sendMessage = useSendWaslMessage(conversation.id);
  const markRead = useMarkWaslRead();
  const { emitTyping, emitStopTyping, connected } = useChatSocket();
  const [text, setText] = React.useState("");
  const [otherTyping, setOtherTyping] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const other = conversation.otherParticipant;
  const smartReply = useSmartReply();
  const [replies, setReplies] = React.useState<string[]>([]);

  // Fetch smart replies when the conversation opens (after messages load).
  React.useEffect(() => {
    setReplies([]);
    smartReply
      .mutateAsync(conversation.id)
      .then((r) => setReplies(r.replies))
      .catch(() => {});
     
  }, [conversation.id]);

  // Mark as read on open.
  React.useEffect(() => {
    markRead.mutate(conversation.id);
  }, [conversation.id]);  

  // Listen for incoming messages + typing for THIS conversation.
  React.useEffect(() => {
    const onIncoming = (m: WaslIncomingMessage) => {
      if (m.conversationId === conversation.id) {
        setOtherTyping(false);
        qc.invalidateQueries({ queryKey: waslKeys.messages(conversation.id) });
        qc.invalidateQueries({ queryKey: waslKeys.conversations });
        markRead.mutate(conversation.id);
      }
    };
    const onTyping = (convId: string, senderId: string) => {
      if (convId === conversation.id && senderId === other?.id) setOtherTyping(true);
    };
    const onStop = (convId: string, senderId: string) => {
      if (convId === conversation.id && senderId === other?.id) setOtherTyping(false);
    };
    window.addEventListener("wasl:new_message", onIncoming as EventListener);
    window.addEventListener("wasl:typing", ((e: CustomEvent) => onTyping(e.detail.convId, e.detail.senderId)) as EventListener);
    window.addEventListener("wasl:stop_typing", ((e: CustomEvent) => onStop(e.detail.convId, e.detail.senderId)) as EventListener);
    return () => {
      window.removeEventListener("wasl:new_message", onIncoming as EventListener);
      window.removeEventListener("wasl:typing", onIncoming as EventListener);
      window.removeEventListener("wasl:stop_typing", onIncoming as EventListener);
    };
  }, [conversation.id, other?.id, qc, markRead]);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, otherTyping]);

  const submit = async () => {
    const content = text.trim();
    if (!content || !other) return;
    setText("");
    // POST persists to Wasl's own DB; the backend also emits the realtime
    // `new_message` event to the other participant (no need to relay here).
    try {
      await sendMessage.mutateAsync(content);
    } catch {
      /* ignored */
    }
    emitStopTyping(conversation.id, WASL_CURRENT_USER_ID, other.id);
  };

  const typingTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChange = (v: string) => {
    setText(v);
    if (other) {
      emitTyping(conversation.id, WASL_CURRENT_USER_ID, other.id);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => emitStopTyping(conversation.id, WASL_CURRENT_USER_ID, other.id), 1500);
    }
  };

  if (!other) return null;

  return (
    <div className="flex h-[28rem] w-full max-w-sm flex-col rounded-2xl border border-border/60 bg-card/95 shadow-float backdrop-blur">
      <div className="flex items-center gap-2 border-b border-border/60 p-2.5">
        <CirkleAvatar name={other.name} color={other.avatarColor} size="sm" verified={other.verified} online={other.online} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{other.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {other.online ? "Active now" : "Offline"} · {connected ? "🟢 live" : "connecting…"}
          </p>
        </div>
        <button className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted" title="Call">
          <Phone className="h-4 w-4" />
        </button>
        <button className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted" title="Video">
          <Video className="h-4 w-4" />
        </button>
        <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted" aria-label="Close conversation">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3 scrollbar-hide">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}
        {messages.map((m, i) => {
          const mine = m.senderId === WASL_CURRENT_USER_ID;
          const prev = messages[i - 1];
          const showAvatar = !mine && (!prev || prev.senderId !== m.senderId);
          return (
            <div key={m.id} className={cn("flex items-end gap-1.5", mine && "flex-row-reverse")}>
              <div className="w-7">{showAvatar && <CirkleAvatar name={other.name} color={other.avatarColor} size="xs" />}</div>
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-soft",
                  mine ? "rounded-br-sm bg-gradient-gold text-charcoal" : "rounded-bl-sm bg-muted/70 text-foreground"
                )}
              >
                <p className="leading-snug">{m.content}</p>
                <p className={cn("mt-0.5 text-[10px]", mine ? "text-charcoal/60" : "text-muted-foreground")}>
                  {formatTime(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        {otherTyping && (
          <div className="flex items-end gap-1.5">
            <CirkleAvatar name={other.name} color={other.avatarColor} size="xs" />
            <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-muted/70 px-3 py-2.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Smart reply chips */}
      {replies.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-border/40 px-2 pt-2">
          {replies.map((r) => (
            <button
              key={r}
              onClick={() => {
                setText(r);
                // send immediately
                const content = r;
                setText("");
                if (other) {
                  sendMessage.mutate(content);
                  emitStopTyping(conversation.id, WASL_CURRENT_USER_ID, other.id);
                }
                setReplies([]);
              }}
              className="flex items-center gap-1 rounded-full border border-gold/30 bg-gold/5 px-2.5 py-1 text-xs text-foreground transition hover:border-gold/50 hover:bg-gold/10"
            >
              <Sparkles className="h-2.5 w-2.5 text-gold" />
              {r}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-border/60 p-2">
        <input
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Aa"
          className="h-9 flex-1 rounded-full bg-muted/60 px-4 text-sm outline-none ring-1 ring-transparent transition focus:bg-background focus:ring-gold/40"
        />
        <button
          onClick={submit}
          disabled={!text.trim()}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-gold text-charcoal transition hover:opacity-90 disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
