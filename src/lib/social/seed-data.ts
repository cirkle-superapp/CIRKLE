import { db } from "@/lib/db";
import { CURRENT_USER_ID } from "./types";

/**
 * Idempotent seed routine for Cirkle Social.
 * Deletes every row first (clean slate), then re-creates demo content.
 *
 * Safe to call multiple times.
 *
 * Returns counts of every created entity.
 */
export async function seedDatabase() {
  // --- 1. Clean slate -------------------------------------------------------
  await db.$transaction([
    db.notification.deleteMany(),
    db.message.deleteMany(),
    db.like.deleteMany(),
    db.comment.deleteMany(),
    db.story.deleteMany(),
    db.post.deleteMany(),
    db.friendship.deleteMany(),
    db.user.deleteMany(),
  ]);

  // --- 2. Users -------------------------------------------------------------
  const current = await db.user.create({
    data: {
      id: CURRENT_USER_ID,
      name: "You",
      username: "you",
      email: "you@cirkle.app",
      avatarColor: "gold",
      verified: true,
      bio: "Building my circle, one connection at a time.",
      coverUrl: "https://picsum.photos/id/577/1600/600.jpg",
    },
  });

  type FriendSeed = {
    id: string;
    name: string;
    username: string;
    email: string;
    avatarColor: "teal" | "rose" | "steel" | "gold" | "charcoal";
    verified?: boolean;
    bio?: string;
    coverUrl?: string;
  };

  const friendSeeds: FriendSeed[] = [
    {
      id: "u_aisha",
      name: "Aisha Khan",
      username: "aishak",
      email: "aisha@cirkle.app",
      avatarColor: "teal",
      verified: true,
      bio: "Designer & weekend painter. Tea over coffee, always.",
      coverUrl: "https://picsum.photos/id/544/1600/600.jpg",
    },
    {
      id: "u_marco",
      name: "Marco Rossi",
      username: "marcorossi",
      email: "marco@cirkle.app",
      avatarColor: "steel",
      bio: "Cyclist, amateur chef, father of two tiny humans.",
      coverUrl: "https://picsum.photos/id/612/1600/600.jpg",
    },
    {
      id: "u_yuki",
      name: "Yuki Tanaka",
      username: "yukit",
      email: "yuki@cirkle.app",
      avatarColor: "rose",
      bio: "Sound engineer. I collect old cassette tapes.",
      coverUrl: "https://picsum.photos/id/718/1600/600.jpg",
    },
    {
      id: "u_layla",
      name: "Layla Hassan",
      username: "laylah",
      email: "layla@cirkle.app",
      avatarColor: "gold",
      verified: true,
      bio: "Astrophysicist in training. The universe is mostly patience.",
      coverUrl: "https://picsum.photos/id/177/1600/600.jpg",
    },
    {
      id: "u_james",
      name: "James Okafor",
      username: "jameso",
      email: "james@cirkle.app",
      avatarColor: "charcoal",
      bio: "Marathon runner. Lagos → London → wherever next.",
      coverUrl: "https://picsum.photos/id/496/1600/600.jpg",
    },
    {
      id: "u_sofia",
      name: "Sofia Garcia",
      username: "sofiag",
      email: "sofia@cirkle.app",
      avatarColor: "teal",
      bio: "Pastry chef. Currently obsessed with miso caramel.",
      coverUrl: "https://picsum.photos/id/1022/1600/600.jpg",
    },
    {
      id: "u_omar",
      name: "Omar Farouk",
      username: "omarf",
      email: "omar@cirkle.app",
      avatarColor: "rose",
      verified: true,
      bio: "Architect & ukulele noodler. Designing slowly.",
      coverUrl: "https://picsum.photos/id/893/1600/600.jpg",
    },
    {
      id: "u_mei",
      name: "Mei Chen",
      username: "meic",
      email: "mei@cirkle.app",
      avatarColor: "steel",
      bio: "Botanist. Talk to me about ferns.",
      coverUrl: "https://picsum.photos/id/280/1600/600.jpg",
    },
  ];

  const friends = await Promise.all(
    friendSeeds.map((f) =>
      db.user.create({
        data: {
          id: f.id,
          name: f.name,
          username: f.username,
          email: f.email,
          avatarColor: f.avatarColor,
          verified: f.verified ?? false,
          bio: f.bio ?? null,
          coverUrl: f.coverUrl ?? null,
        },
      }),
    ),
  );

  const allUsers = [current, ...friends];

  // --- 3. Friendships (current ↔ each friend, single row per pair) ----------
  await db.friendship.createMany({
    data: friends.map((f) => ({
      initiatorId: CURRENT_USER_ID,
      receiverId: f.id,
      status: "accepted",
    })),
  });

  // --- 4. Posts -------------------------------------------------------------
  type PostSeed = {
    authorId: string;
    content: string;
    imageUrl?: string;
    feeling?: string;
    location?: string;
    daysAgo: number;
    hoursAgo?: number;
  };

  const postSeeds: PostSeed[] = [
    {
      authorId: "u_aisha",
      content:
        "Spent the morning reorganizing my paint shelf by hue. My brain feels like a tidy little rainbow now.",
      imageUrl: "https://picsum.photos/id/701/1200/800.jpg",
      feeling: "feeling inspired",
      location: "Lisbon, Portugal",
      daysAgo: 0,
      hoursAgo: 2,
    },
    {
      authorId: CURRENT_USER_ID,
      content:
        "Two years ago I almost gave up on this side project. Today it shipped to its first thousand people. Stay with it.",
      feeling: "feeling grateful",
      daysAgo: 0,
      hoursAgo: 5,
    },
    {
      authorId: "u_marco",
      content:
        "Cooked my grandmother's ragù recipe for the kids tonight. They asked for seconds. Tiny win, big feelings.",
      location: "Bologna, Italy",
      daysAgo: 0,
      hoursAgo: 9,
    },
    {
      authorId: "u_yuki",
      content:
        "Found a working Walkman at the flea market. The first tape I popped in was my dad's old mix. I cried in public.",
      imageUrl: "https://picsum.photos/id/702/1200/800.jpg",
      feeling: "feeling nostalgic",
      location: "Tokyo, Japan",
      daysAgo: 1,
    },
    {
      authorId: "u_layla",
      content:
        "Spent four hours on a single equation tonight and it finally collapsed into something beautiful. Math is just patience with style.",
      feeling: "feeling accomplished",
      location: "Cairo, Egypt",
      daysAgo: 1,
    },
    {
      authorId: "u_james",
      content:
        "Long run before sunrise. The city belongs to the early people — and the street cleaners. Both waved back.",
      imageUrl: "https://picsum.photos/id/703/1200/800.jpg",
      location: "London, UK",
      daysAgo: 1,
    },
    {
      authorId: "u_sofia",
      content:
        "Miso caramel is officially in the croquembouche. I will be taking no further questions at this time.",
      imageUrl: "https://picsum.photos/id/704/1200/800.jpg",
      feeling: "feeling triumphant",
      location: "Mexico City, Mexico",
      daysAgo: 2,
    },
    {
      authorId: "u_omar",
      content:
        "Sketching a tiny courtyard building today. The brief is 'quiet.' I think I might leave one wall completely blank.",
      imageUrl: "https://picsum.photos/id/705/1200/800.jpg",
      location: "Amman, Jordan",
      daysAgo: 2,
    },
    {
      authorId: "u_mei",
      content:
        "The fern I rescued last winter unfurled its first new frond today. We are both very emotional about it.",
      imageUrl: "https://picsum.photos/id/706/1200/800.jpg",
      feeling: "feeling tender",
      daysAgo: 3,
    },
    {
      authorId: CURRENT_USER_ID,
      content:
        "Question for my circle: what's a small ritual that changed your year? Mine was writing one sentence before bed.",
      daysAgo: 3,
    },
    {
      authorId: "u_aisha",
      content:
        "Reminder: rest is not a reward you earn. It's the soil everything else grows out of. Taking my own advice today.",
      feeling: "feeling reflective",
      daysAgo: 4,
    },
    {
      authorId: "u_marco",
      content:
        "Bike number five is officially mine. She's a 1987 steel frame with chipped paint and a soul. I'll call her Penelope.",
      imageUrl: "https://picsum.photos/id/707/1200/800.jpg",
      location: "Bologna, Italy",
      daysAgo: 4,
    },
    {
      authorId: "u_yuki",
      content:
        "Recorded a thunderstorm from my balcony last night. 47 minutes of pure low-end. Going to score something to it.",
      feeling: "feeling electric",
      location: "Tokyo, Japan",
      daysAgo: 5,
    },
    {
      authorId: "u_layla",
      content:
        "Hot take: the night sky is the only place where 'nothing happening' is the most exciting thing that can happen.",
      imageUrl: "https://picsum.photos/id/708/1200/800.jpg",
      feeling: "feeling small (in a good way)",
      location: "Western Desert, Egypt",
      daysAgo: 5,
    },
    {
      authorId: "u_sofia",
      content:
        "Three fails on the croissant today. Buttery, delicious fails. Tomorrow we laminate again.",
      daysAgo: 6,
    },
    {
      authorId: CURRENT_USER_ID,
      content:
        "Closed my laptop at 6pm and went outside. Revolutionary act, I know. Highly recommend.",
      imageUrl: "https://picsum.photos/id/709/1200/800.jpg",
      feeling: "feeling light",
      daysAgo: 6,
    },
  ];

  const now = Date.now();
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;

  const posts = await Promise.all(
    postSeeds.map((p) =>
      db.post.create({
        data: {
          authorId: p.authorId,
          content: p.content,
          imageUrl: p.imageUrl ?? null,
          feeling: p.feeling ?? null,
          location: p.location ?? null,
          createdAt: new Date(
            now - p.daysAgo * DAY - (p.hoursAgo ?? 0) * HOUR,
          ),
        },
      }),
    ),
  );

  // --- 5. Likes -------------------------------------------------------------
  // Make sure current user has liked 2-3 posts, then sprinkle other likes.
  const userIds = allUsers.map((u) => u.id);

  // Pick first 3 posts authored by others for current user to like.
  const otherAuthoredPosts = posts.filter((p) => p.authorId !== CURRENT_USER_ID);
  const currentUserLikedPostIds = new Set(
    otherAuthoredPosts.slice(0, 3).map((p) => p.id),
  );

  const likePairs: { postId: string; userId: string }[] = [];
  for (const likedId of currentUserLikedPostIds) {
    likePairs.push({ postId: likedId, userId: CURRENT_USER_ID });
  }

  // Sprinkle random likes from friends (deterministic-ish for stable demo).
  for (const post of posts) {
    // ~3-7 friend likes per post
    const n = 3 + ((post.id.charCodeAt(0) + post.id.charCodeAt(1)) % 5);
    for (let i = 0; i < n; i++) {
      const friend = friends[(i + post.id.charCodeAt(2)) % friends.length];
      if (friend.id === post.authorId) continue;
      const exists = likePairs.some(
        (lp) => lp.postId === post.id && lp.userId === friend.id,
      );
      if (!exists) likePairs.push({ postId: post.id, userId: friend.id });
    }
  }

  // Deduplicate just in case (unique constraint protects us anyway).
  const seen = new Set<string>();
  const deduped = likePairs.filter((lp) => {
    const k = `${lp.postId}|${lp.userId}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  await db.like.createMany({
    data: deduped.map((lp) => ({
      postId: lp.postId,
      userId: lp.userId,
      createdAt: new Date(
        now -
          (1 + (lp.userId.charCodeAt(0) % 6)) * HOUR -
          lp.postId.charCodeAt(0) % 50,
      ),
    })),
  });

  // --- 6. Comments ----------------------------------------------------------
  const commentBank: string[] = [
    "This made my morning, thank you for sharing.",
    "Needed to read exactly this today.",
    "Okay this is going on my wall.",
    "Sending so much love.",
    "Wait — tell me everything. How did it feel?",
    "You always know how to put words to it.",
    "Adding this to my list of reasons to keep going.",
    "First thing I've smiled at all day.",
    "Bookmarked. Coming back to this later.",
    "The detail about the wall is gorgeous.",
    "We need a longer post about this, honestly.",
    "Cheering for you from a different time zone.",
    "This is the energy I'm bringing into tomorrow.",
    "Quietly proud of you.",
    "That last line. Wow.",
  ];

  const commentRows: {
    postId: string;
    authorId: string;
    content: string;
    createdAt: Date;
  }[] = [];

  for (const post of posts) {
    // 2-4 comments per post
    const n = 2 + ((post.id.charCodeAt(3) ?? 0) % 3);
    for (let i = 0; i < n; i++) {
      const author = allUsers[(i + (post.id.charCodeAt(4) ?? 0)) % allUsers.length];
      // Avoid the post author commenting on their own post where possible,
      // but allow current user to comment on a few.
      const content = commentBank[(i + post.id.charCodeAt(0)) % commentBank.length];
      commentRows.push({
        postId: post.id,
        authorId: author.id,
        content,
        createdAt: new Date(
          post.createdAt.getTime() + (i + 1) * 47 * 60 * 1000,
        ),
      });
    }
  }

  await db.comment.createMany({ data: commentRows });

  // --- 7. Stories -----------------------------------------------------------
  type StorySeed = {
    authorId: string;
    imageUrl: string;
    caption?: string;
    hoursAgo: number;
  };

  const storySeeds: StorySeed[] = [
    {
      authorId: "u_aisha",
      imageUrl: "https://picsum.photos/seed/story-aisha/900/1600",
      caption: "studio light at 6am hits different",
      hoursAgo: 1,
    },
    {
      authorId: "u_yuki",
      imageUrl: "https://picsum.photos/seed/story-yuki/900/1600",
      caption: "the walkman lives",
      hoursAgo: 3,
    },
    {
      authorId: "u_marco",
      imageUrl: "https://picsum.photos/seed/story-marco/900/1600",
      caption: "penelope, day one",
      hoursAgo: 5,
    },
    {
      authorId: "u_sofia",
      imageUrl: "https://picsum.photos/seed/story-sofia/900/1600",
      caption: "miso caramel, round two",
      hoursAgo: 7,
    },
    {
      authorId: "u_omar",
      imageUrl: "https://picsum.photos/seed/story-omar/900/1600",
      caption: "the blank wall wins",
      hoursAgo: 9,
    },
    {
      authorId: "u_mei",
      imageUrl: "https://picsum.photos/seed/story-mei/900/1600",
      caption: "she unfurled 🌿",
      hoursAgo: 12,
    },
  ];

  const stories = await Promise.all(
    storySeeds.map((s) =>
      db.story.create({
        data: {
          authorId: s.authorId,
          imageUrl: s.imageUrl,
          caption: s.caption ?? null,
          createdAt: new Date(now - s.hoursAgo * HOUR),
          expiresAt: new Date(now - s.hoursAgo * HOUR + 24 * HOUR),
        },
      }),
    ),
  );

  // --- 8. Notifications for current user -----------------------------------
  const aisha = friends.find((f) => f.id === "u_aisha")!;
  const layla = friends.find((f) => f.id === "u_layla")!;
  const marco = friends.find((f) => f.id === "u_marco")!;
  const yuki = friends.find((f) => f.id === "u_yuki")!;
  const sofia = friends.find((f) => f.id === "u_sofia")!;
  const james = friends.find((f) => f.id === "u_james")!;

  // Current user's own posts (to attach notifications to).
  const myPosts = posts.filter((p) => p.authorId === CURRENT_USER_ID);

  const notifRows = [
    {
      userId: CURRENT_USER_ID,
      type: "like",
      content: "Aisha Khan liked your post.",
      actorId: aisha.id,
      read: false,
      createdAt: new Date(now - 25 * 60 * 1000),
    },
    {
      userId: CURRENT_USER_ID,
      type: "comment",
      content: "Marco Rossi commented: \"Needed to read exactly this today.\"",
      actorId: marco.id,
      read: false,
      createdAt: new Date(now - 90 * 60 * 1000),
    },
    {
      userId: CURRENT_USER_ID,
      type: "friend",
      content: "Layla Hassan is now in your circle.",
      actorId: layla.id,
      read: false,
      createdAt: new Date(now - 3 * HOUR),
    },
    {
      userId: CURRENT_USER_ID,
      type: "message",
      content: "Yuki Tanaka sent you a message.",
      actorId: yuki.id,
      read: true,
      createdAt: new Date(now - 6 * HOUR),
    },
    {
      userId: CURRENT_USER_ID,
      type: "like",
      content: "Sofia Garcia and 2 others liked your post.",
      actorId: sofia.id,
      read: true,
      createdAt: new Date(now - 9 * HOUR),
    },
    {
      userId: CURRENT_USER_ID,
      type: "mention",
      content: "James Okafor mentioned you in a comment.",
      actorId: james.id,
      read: true,
      createdAt: new Date(now - 22 * HOUR),
    },
  ];

  await db.notification.createMany({ data: notifRows });

  // --- 9. Messages ----------------------------------------------------------
  const messageRows: {
    fromId: string;
    toId: string;
    content: string;
    createdAt: Date;
    read: boolean;
  }[] = [
    // Conversation with Aisha
    {
      fromId: "u_aisha",
      toId: CURRENT_USER_ID,
      content: "Did you end up shipping it today? :)",
      createdAt: new Date(now - 2 * HOUR),
      read: false,
    },
    {
      fromId: CURRENT_USER_ID,
      toId: "u_aisha",
      content: "YES. finally. one thousand people and counting.",
      createdAt: new Date(now - 118 * 60 * 1000),
      read: true,
    },
    {
      fromId: "u_aisha",
      toId: CURRENT_USER_ID,
      content: "you absolute legend. proud of you.",
      createdAt: new Date(now - 110 * 60 * 1000),
      read: false,
    },
    // Conversation with Yuki
    {
      fromId: "u_yuki",
      toId: CURRENT_USER_ID,
      content: "found the tape. it works. i'm a wreck.",
      createdAt: new Date(now - 6 * HOUR),
      read: true,
    },
    {
      fromId: CURRENT_USER_ID,
      toId: "u_yuki",
      content: "send me the recording when you score it?",
      createdAt: new Date(now - 5 * HOUR - 40 * 60 * 1000),
      read: true,
    },
    // Conversation with Marco
    {
      fromId: CURRENT_USER_ID,
      toId: "u_marco",
      content: "the ragù recipe. you have to send it.",
      createdAt: new Date(now - 1 * DAY),
      read: true,
    },
    {
      fromId: "u_marco",
      toId: CURRENT_USER_ID,
      content: "ha. it's a family secret. but for you, ok.",
      createdAt: new Date(now - 23 * HOUR),
      read: false,
    },
  ];

  await db.message.createMany({ data: messageRows });

  // --- 10. Counts -----------------------------------------------------------
  const [
    usersCount,
    postsCount,
    commentsCount,
    likesCount,
    storiesCount,
    notificationsCount,
    messagesCount,
  ] = await Promise.all([
    db.user.count(),
    db.post.count(),
    db.comment.count(),
    db.like.count(),
    db.story.count(),
    db.notification.count(),
    db.message.count(),
  ]);

  // Suppress unused warning for myPosts (kept for clarity / future use).
  void myPosts;
  void userIds;

  return {
    ok: true,
    counts: {
      users: usersCount,
      posts: postsCount,
      comments: commentsCount,
      likes: likesCount,
      stories: storiesCount,
      notifications: notificationsCount,
      messages: messagesCount,
    },
  };
}
