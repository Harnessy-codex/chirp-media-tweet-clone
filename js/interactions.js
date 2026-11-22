/**
 * interactions.js
 * Manages local session state for likes, retweets, and user follow relationships.
 */

const likedPostIds = new Set();
const retweetedPostIds = new Set();
const followedUserIds = new Set();

const likeCounts = new Map();
const retweetCounts = new Map();

// Demonstration baseline follower/following counts per user ID (not provided by JSONPlaceholder)
const demoStatsByUserId = new Map();

/**
 * Set starting counts for posts and users.
 * Newly composed posts start with 0 likes and 0 retweets.
 * @param {Array} posts
 * @param {Array} users
 */
export function initializeInteractions(posts, users) {
  for (const post of posts) {
    if (!likeCounts.has(post.id)) {
      const baseLikes = post.isLocal ? 0 : ((post.id * 3) % 19) + 1;
      likeCounts.set(post.id, baseLikes);
    }
    if (!retweetCounts.has(post.id)) {
      const baseRetweets = post.isLocal ? 0 : (post.id * 2) % 9;
      retweetCounts.set(post.id, baseRetweets);
    }
  }

  for (const user of users) {
    if (!demoStatsByUserId.has(user.id)) {
      demoStatsByUserId.set(user.id, {
        following: 120 + user.id * 94,
        followers: 480 + user.id * 135,
      });
    }
  }
}

/**
 * Give a new post zero likes and retweets.
 * @param {number} postId
 */
export function registerPostInteractions(postId) {
  if (!likeCounts.has(postId)) {
    likeCounts.set(postId, 0);
  }
  if (!retweetCounts.has(postId)) {
    retweetCounts.set(postId, 0);
  }
}

export function isPostLiked(postId) {
  return likedPostIds.has(postId);
}

export function getLikeCount(postId) {
  return likeCounts.get(postId) ?? 0;
}

export function toggleLike(postId) {
  const currentCount = getLikeCount(postId);
  if (likedPostIds.has(postId)) {
    likedPostIds.delete(postId);
    likeCounts.set(postId, Math.max(0, currentCount - 1));
    return { active: false, count: likeCounts.get(postId) };
  }
  likedPostIds.add(postId);
  likeCounts.set(postId, currentCount + 1);
  return { active: true, count: likeCounts.get(postId) };
}

export function isPostRetweeted(postId) {
  return retweetedPostIds.has(postId);
}

export function getRetweetCount(postId) {
  return retweetCounts.get(postId) ?? 0;
}

export function toggleRetweet(postId) {
  const currentCount = getRetweetCount(postId);
  if (retweetedPostIds.has(postId)) {
    retweetedPostIds.delete(postId);
    retweetCounts.set(postId, Math.max(0, currentCount - 1));
    return { active: false, count: retweetCounts.get(postId) };
  }
  retweetedPostIds.add(postId);
  retweetCounts.set(postId, currentCount + 1);
  return { active: true, count: retweetCounts.get(postId) };
}

export function isUserFollowed(userId) {
  return followedUserIds.has(userId);
}

export function toggleFollowUser(userId) {
  if (followedUserIds.has(userId)) {
    followedUserIds.delete(userId);
    return false;
  }
  followedUserIds.add(userId);
  return true;
}

/**
 * Get the follower and following counts for a user.
 * @param {number} userId
 * @param {number} loggedInUserId
 * @returns {{ following: number, followers: number }}
 */
export function getUserFollowStats(userId, loggedInUserId) {
  const base = demoStatsByUserId.get(userId) || { following: 140, followers: 620 };
  const isFollowed = isUserFollowed(userId);
  const followers = base.followers + (isFollowed ? 1 : 0);
  const following =
    userId === loggedInUserId ? base.following + followedUserIds.size : base.following;

  return { following, followers };
}
