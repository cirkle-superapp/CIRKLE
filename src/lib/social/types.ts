// Shared social types used across frontend & API.

export type AvatarColor = "teal" | "rose" | "steel" | "gold" | "charcoal";

export interface SocialUser {
  id: string;
  name: string;
  username: string;
  email: string;
  bio: string | null;
  avatarColor: AvatarColor;
  verified: boolean;
  coverUrl: string | null;
  createdAt: string;
}

export interface SocialPost {
  id: string;
  authorId: string;
  author: SocialUser;
  content: string;
  imageUrl: string | null;
  feeling: string | null;
  location: string | null;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
}

export interface SocialComment {
  id: string;
  postId: string;
  author: SocialUser;
  content: string;
  createdAt: string;
}

export interface SocialStory {
  id: string;
  author: SocialUser;
  imageUrl: string;
  caption: string | null;
  createdAt: string;
}

export interface SocialNotification {
  id: string;
  type: "like" | "comment" | "friend" | "mention" | "message";
  content: string;
  actor: SocialUser | null;
  read: boolean;
  createdAt: string;
}

export interface SocialMessage {
  id: string;
  fromId: string;
  toId: string;
  content: string;
  createdAt: string;
  read: boolean;
}

// The "current user" id used across the app (single-user demo session).
export const CURRENT_USER_ID = "u_current";
