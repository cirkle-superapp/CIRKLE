import type {
  AvatarColor,
  SocialComment,
  SocialMessage,
  SocialNotification,
  SocialPost,
  SocialStory,
  SocialUser,
} from "./types";
import { CURRENT_USER_ID } from "./types";
import type {
  Comment,
  Friendship,
  Like,
  Message,
  Notification,
  Post,
  Story,
  User,
} from "@prisma/client";

/**
 * Map a Prisma User row to the SocialUser shape.
 * Accepts the plain user object as returned by Prisma (without relations).
 */
export function mapUser(u: User): SocialUser {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    bio: u.bio,
    avatarColor: (u.avatarColor as AvatarColor) ?? "teal",
    verified: u.verified,
    coverUrl: u.coverUrl,
    createdAt: u.createdAt.toISOString(),
  };
}

type PostWithRelations = Post & {
  author: User;
  likes: Like[];
  _count?: { comments?: number };
  comments?: Comment[];
};

/**
 * Map a Prisma Post (with author + likes included) to SocialPost.
 * `likedByMe` is computed against CURRENT_USER_ID.
 */
export function mapPost(p: PostWithRelations): SocialPost {
  const likesCount = p.likes.length;
  const likedByMe = p.likes.some((l) => l.userId === CURRENT_USER_ID);
  const commentsCount = p._count?.comments ?? p.comments?.length ?? 0;
  return {
    id: p.id,
    authorId: p.authorId,
    author: mapUser(p.author),
    content: p.content,
    imageUrl: p.imageUrl,
    feeling: p.feeling,
    location: p.location,
    createdAt: p.createdAt.toISOString(),
    likesCount,
    commentsCount,
    likedByMe,
  };
}

type CommentWithAuthor = Comment & { author: User };

export function mapComment(c: CommentWithAuthor): SocialComment {
  return {
    id: c.id,
    postId: c.postId,
    author: mapUser(c.author),
    content: c.content,
    createdAt: c.createdAt.toISOString(),
  };
}

type StoryWithAuthor = Story & { author: User };

export function mapStory(s: StoryWithAuthor): SocialStory {
  return {
    id: s.id,
    author: mapUser(s.author),
    imageUrl: s.imageUrl,
    caption: s.caption,
    createdAt: s.createdAt.toISOString(),
  };
}

type NotificationWithActor = Notification & { actor: User | null };

export function mapNotification(n: NotificationWithActor): SocialNotification {
  return {
    id: n.id,
    type: n.type as SocialNotification["type"],
    content: n.content,
    actor: n.actor ? mapUser(n.actor) : null,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  };
}

export function mapMessage(m: Message): SocialMessage {
  return {
    id: m.id,
    fromId: m.fromId,
    toId: m.toId,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    read: m.read,
  };
}

/**
 * Compute a stable pseudo-random boolean from a string id.
 * Used for the "online" status of friends in /api/friends.
 */
export function stableOnline(id: string): boolean {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  // ~58% of ids will be "online" — looks lively but not everyone.
  return ((h >>> 0) % 100) < 58;
}

export type FriendshipWithReceiver = Friendship & { receiver: User };
export type FriendshipWithInitiator = Friendship & { initiator: User };
