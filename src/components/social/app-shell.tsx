"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QueryProvider } from "@/components/providers/query-provider";
import { ChatSocketProvider, type WaslIncomingMessage } from "@/hooks/use-chat-socket";
import { waslKeys } from "@/hooks/use-wasl";
import { TopBar } from "./top-bar";
import { IconDock } from "./icon-dock";
import { RightSidebar as PulsePanel } from "./right-sidebar";
import { Feed } from "./feed";
import { ChatWidget } from "./chat-widget";
import { MashahdPanel } from "./mashahd-panel";
import { ProfilePanel } from "./profile-panel";
import { SearchOverlay } from "./search-overlay";
import { DiscoverPanel } from "./discover-panel";
import { AIAssistantPanel } from "./ai-assistant-panel";
import { Footer } from "./footer";
import { CommandPalette } from "./command-palette";
import { CapsuleComposer } from "./capsule-composer";
import { WhisperPanel } from "./whisper-panel";
import { PulseRibbon } from "./pulse-ribbon";
import { CulturalInterpreter } from "./cultural-interpreter";
import { PrivacySimulator } from "./privacy-simulator";
import { FamilyVault } from "./family-vault";
import { TicketWallet } from "./ticket-wallet";
import { useToast } from "@/hooks/use-toast";
import { Home, MessageCircle, Play, Compass } from "lucide-react";

function CirkleApp() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [chatOpen, setChatOpen] = React.useState(false);
  const [chatFriend, setChatFriend] = React.useState<string | null>(null);
  const [mashahdOpen, setMashahdOpen] = React.useState(false);

  // NEW: profile, search, discover overlays
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [profileUserId, setProfileUserId] = React.useState<string | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [discoverOpen, setDiscoverOpen] = React.useState(false);
  const [aiOpen, setAiOpen] = React.useState(false);

  // NEW: futuristic features — command palette, time capsule, whispers.
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false);
  const [capsuleOpen, setCapsuleOpen] = React.useState(false);
  const [whisperOpen, setWhisperOpen] = React.useState(false);

  // NEW: Tier-2 features — cultural interpreter, privacy simulator, family vault, ticket wallet.
  // (Pulse ribbon is always-on under the top bar — no overlay state needed; pulseScrollTarget
  // is a tiny nudge hook so the palette's "Activity pulse" action can briefly highlight the ribbon.)
  const [culturalOpen, setCulturalOpen] = React.useState(false);
  const [privacyOpen, setPrivacyOpen] = React.useState(false);
  const [vaultOpen, setVaultOpen] = React.useState(false);
  const [ticketsOpen, setTicketsOpen] = React.useState(false);
  const [pulseBumped, setPulseBumped] = React.useState(0);

  // Global Cmd/Ctrl+K to open the command palette.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setCommandPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openChat = React.useCallback((friendId?: string) => {
    if (friendId) setChatFriend(friendId);
    setChatOpen(true);
  }, []);

  const openProfile = React.useCallback((userId: string) => {
    setProfileUserId(userId);
    setProfileOpen(true);
    // Opening profile should close search overlay (Discover stays put).
    setSearchOpen(false);
  }, []);

  const openSearch = React.useCallback((initialQuery?: string) => {
    setSearchQuery(initialQuery ?? "");
    setSearchOpen(true);
  }, []);

  // Pulse action from the palette — just scroll the ribbon into view + nudge it.
  const onOpenPulse = React.useCallback(() => {
    setPulseBumped((n) => n + 1);
    // Scroll to top so the ribbon (under the top bar) is visible.
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // PulseRibbon navigation — clicking a pillar segment routes the user.
  const onPulseNavigate = React.useCallback((pillar: string) => {
    const p = pillar.toLowerCase();
    if (p === "wasl") {
      window.dispatchEvent(new CustomEvent("cirkle:open-wasl"));
      return;
    }
    if (p === "mashahd") {
      window.dispatchEvent(new CustomEvent("cirkle:open-mashahd"));
      return;
    }
    // Default — scroll the feed to top so the most-recent activity is visible.
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Listen for entry-point events from the composer chip + others.
  React.useEffect(() => {
    const openCapsule = () => setCapsuleOpen(true);
    const openWhisper = () => setWhisperOpen(true);
    const openDiscover = () => setDiscoverOpen(true);
    const openWasl = () => openChat();
    const openMashahd = () => setMashahdOpen(true);
    const openPrivacy = () => setPrivacyOpen(true);
    window.addEventListener("cirkle:open-capsule", openCapsule);
    window.addEventListener("cirkle:open-whisper", openWhisper);
    window.addEventListener("cirkle:open-discover", openDiscover);
    window.addEventListener("cirkle:open-wasl", openWasl);
    window.addEventListener("cirkle:open-mashahd", openMashahd);
    window.addEventListener("cirkle:open-privacy", openPrivacy);
    return () => {
      window.removeEventListener("cirkle:open-capsule", openCapsule);
      window.removeEventListener("cirkle:open-whisper", openWhisper);
      window.removeEventListener("cirkle:open-discover", openDiscover);
      window.removeEventListener("cirkle:open-wasl", openWasl);
      window.removeEventListener("cirkle:open-mashahd", openMashahd);
      window.removeEventListener("cirkle:open-privacy", openPrivacy);
    };
  }, [openChat]);

  // Wasl socket handlers — messages now flow through the Wasl service (port 3004).
  const onIncoming = React.useCallback(
    (m: WaslIncomingMessage) => {
      // Invalidate the specific conversation's messages + the conversation list.
      qc.invalidateQueries({ queryKey: waslKeys.messages(m.conversationId) });
      qc.invalidateQueries({ queryKey: waslKeys.conversations });
      // Dispatch a window event the open conversation panel listens for.
      window.dispatchEvent(new CustomEvent("wasl:new_message", { detail: m }));
      toast({
        title: "New Wasl message",
        description: `${m.content.slice(0, 60)}${m.content.length > 60 ? "…" : ""}`,
      });
    },
    [qc, toast]
  );
  const onTyping = React.useCallback((conversationId: string, senderId: string) => {
    window.dispatchEvent(new CustomEvent("wasl:typing", { detail: { convId: conversationId, senderId } }));
  }, []);
  const onStopTyping = React.useCallback((conversationId: string, senderId: string) => {
    window.dispatchEvent(new CustomEvent("wasl:stop_typing", { detail: { convId: conversationId, senderId } }));
  }, []);

  return (
    <ChatSocketProvider onIncoming={onIncoming} onTyping={onTyping} onStopTyping={onStopTyping}>
      <div className="flex min-h-screen flex-col">
        <TopBar
          onOpenChat={() => openChat()}
          onOpenProfile={openProfile}
          onOpenSearch={openSearch}
          onOpenDiscover={() => setDiscoverOpen(true)}
        />

        {/* Pulse ribbon — thin live-activity heat strip under the top bar */}
        <PulseRibbon key={pulseBumped} onNavigate={onPulseNavigate} />

        <div className="flex flex-1 pb-24 md:pb-0">
          {/* Slim icon dock — hidden on mobile */}
          <IconDock
            onOpenChat={() => openChat()}
            onOpenMashahd={() => setMashahdOpen(true)}
            onOpenProfile={openProfile}
            onOpenDiscover={() => setDiscoverOpen(true)}
            onOpenAI={() => setAiOpen(true)}
          />

          {/* Center column */}
          <main className="min-w-0 flex-1">
            <Feed />
          </main>

          {/* Pulse panel — hidden below xl */}
          <PulsePanel onOpenChat={openChat} />
        </div>

        <Footer />

        {/* Mobile bottom nav */}
        <MobileNav
          onOpenChat={() => openChat()}
          onOpenMashahd={() => setMashahdOpen(true)}
          onOpenDiscover={() => setDiscoverOpen(true)}
        />

        {/* Wasl chat widget */}
        <ChatWidget open={chatOpen} onOpenChange={setChatOpen} initialFriendId={chatFriend} />

        {/* Mashahd video panel */}
        <MashahdPanel open={mashahdOpen} onOpenChange={setMashahdOpen} />

        {/* Profile overlay */}
        <ProfilePanel
          open={profileOpen}
          onOpenChange={setProfileOpen}
          userId={profileUserId}
          onOpenChat={openChat}
          onOpenProfile={openProfile}
        />

        {/* Search overlay */}
        <SearchOverlay
          open={searchOpen}
          onOpenChange={setSearchOpen}
          initialQuery={searchQuery}
          onOpenProfile={openProfile}
        />

        {/* Discover overlay */}
        <DiscoverPanel
          open={discoverOpen}
          onOpenChange={setDiscoverOpen}
          onOpenProfile={openProfile}
          onOpenChat={openChat}
        />

        {/* Cirkle AI assistant overlay */}
        <AIAssistantPanel open={aiOpen} onOpenChange={setAiOpen} />

        {/* Futuristic features */}
        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          onOpenChat={() => openChat()}
          onOpenMashahd={() => setMashahdOpen(true)}
          onOpenAI={() => setAiOpen(true)}
          onOpenProfile={(id) => openProfile(id)}
          onOpenCapsule={() => setCapsuleOpen(true)}
          onOpenWhisper={() => setWhisperOpen(true)}
          onOpenPulse={onOpenPulse}
          onOpenCultural={() => setCulturalOpen(true)}
          onOpenPrivacy={() => setPrivacyOpen(true)}
          onOpenVault={() => setVaultOpen(true)}
          onOpenTickets={() => setTicketsOpen(true)}
        />
        <CapsuleComposer open={capsuleOpen} onOpenChange={setCapsuleOpen} />
        <WhisperPanel
          open={whisperOpen}
          onOpenChange={setWhisperOpen}
          onOpenChat={() => openChat()}
        />

        {/* Tier-2 overlays */}
        <CulturalInterpreter open={culturalOpen} onOpenChange={setCulturalOpen} />
        <PrivacySimulator open={privacyOpen} onOpenChange={setPrivacyOpen} />
        <FamilyVault open={vaultOpen} onOpenChange={setVaultOpen} />
        <TicketWallet open={ticketsOpen} onOpenChange={setTicketsOpen} />

        {/* Floating Wasl button when closed (hidden while any overlay is open) */}
        {!chatOpen &&
          !profileOpen &&
          !searchOpen &&
          !discoverOpen &&
          !aiOpen &&
          !commandPaletteOpen &&
          !capsuleOpen &&
          !whisperOpen &&
          !culturalOpen &&
          !privacyOpen &&
          !vaultOpen &&
          !ticketsOpen && (
          <button
            onClick={() => openChat()}
            title="Open Wasl"
            aria-label="Open Wasl chat"
            className="fixed bottom-20 right-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-gradient-gold text-charcoal shadow-float transition hover:scale-105 sm:bottom-4"
          >
            <span aria-hidden className="absolute inset-0 -z-10 animate-ping rounded-full bg-gold/30" />
            <MessageCircle className="h-5 w-5" strokeWidth={2.2} />
          </button>
        )}
      </div>
    </ChatSocketProvider>
  );
}

function MobileNav({
  onOpenChat,
  onOpenMashahd,
  onOpenDiscover,
}: {
  onOpenChat: () => void;
  onOpenMashahd: () => void;
  onOpenDiscover: () => void;
}) {
  const items = [
    { icon: Home, label: "Home", active: true },
    { icon: Compass, label: "Discover", action: "discover" as const },
    { icon: MessageCircle, label: "Wasl", action: "chat" as const },
    { icon: Play, label: "Mashahd", action: "mashahd" as const },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-4 border-t border-gold/20 bg-card/95 backdrop-blur md:hidden">
      {items.map((it) => (
        <button
          key={it.label}
          onClick={
            it.action === "chat"
              ? onOpenChat
              : it.action === "mashahd"
                ? onOpenMashahd
                : it.action === "discover"
                  ? onOpenDiscover
                  : undefined
          }
          className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition ${
            it.active ? "text-gold" : "text-muted-foreground"
          }`}
          aria-label={it.label}
          aria-current={it.active ? "page" : undefined}
        >
          <span className={`grid h-7 w-7 place-items-center rounded-xl transition ${it.active ? "bg-gradient-gold text-charcoal" : ""}`}>
            <it.icon className="h-4 w-4" strokeWidth={it.active ? 2.4 : 2} />
          </span>
          {it.label}
        </button>
      ))}
    </nav>
  );
}

export function AppShell() {
  return (
    <QueryProvider>
      <CirkleApp />
    </QueryProvider>
  );
}
