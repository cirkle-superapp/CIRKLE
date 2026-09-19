// Wasl (chat pillar) types — matches the Wasl mini-service (port 3004).

export type AvatarColor = "teal" | "rose" | "steel" | "gold" | "charcoal";

export interface WaslUser {
  id: string;
  username: string;
  name: string;
  avatarColor: AvatarColor;
  verified: boolean;
  online: boolean;
  about: string;
}

export interface WaslMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  status: string;
  createdAt: string;
}

export interface WaslConversation {
  id: string;
  name: string | null;
  isGroup: boolean;
  avatarColor: string | null;
  otherParticipant: WaslUser | null;
  lastMessage: WaslMessage | null;
  unreadCount: number;
}

// The "current user" id in the Wasl service (matches the seeded user).
export const WASL_CURRENT_USER_ID = "u_current";
