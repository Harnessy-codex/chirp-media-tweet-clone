/**
 * profile.js
 * Renders user profile views with cover banner, avatar, bio, company/city/website/email,
 * live follower/following stats, Follow button, and posts published by that user.
 */

import { createAvatarElement, renderFeedPosts } from './feed.js';
import { getUserFollowStats, isUserFollowed, toggleFollowUser } from './interactions.js';

// Reasonable demonstration bios mapped by user ID (clearly separate from JSONPlaceholder fields)
const DEMO_BIOS = {
  1: 'Coffee first, code second. Building small things with JavaScript.',
  2: 'Exploring distributed web systems, developer tooling, and clean UI design.',
  3: 'Product designer & front-end tinkerer. Always sketching new interactions.',
  4: 'Writing notes on architecture, open standards, and quiet productivity.',
  5: 'Curious mind tracking startups, typography, and weekend cycling routes.',
  6: 'Data visualization enthusiast turning messy tables into clear stories.',
  7: 'Full-stack learner experimenting with APIs and responsive web layouts.',
  8: 'Systems thinker, avid reader, and collector of minimalist desk setups.',
  9: 'Building community software and sharing lessons from side projects.',
  10: 'Documenting daily engineering habits, performance tips, and web craft.',
};

/**
 * Make a safe website link.
 * Blocks unsafe schemes like javascript: or data:.
 * @param {string} rawWebsite
 * @returns {string | null}
 */
function buildSafeWebsiteUrl(rawWebsite) {
  if (!rawWebsite || typeof rawWebsite !== 'string') return null;
  const trimmed = rawWebsite.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Make one profile detail, such as company or city.
 * @param {string} label
 * @param {string | null} href
 * @returns {HTMLElement}
 */
function createMetaItem(label, href = null) {
  const item = document.createElement('span');
  item.className = 'profile-meta-item';

  if (href) {
    const link = document.createElement('a');
    link.className = 'profile-meta-link';
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = label;
    item.appendChild(link);
  } else {
    const text = document.createElement('span');
    text.textContent = label;
    item.appendChild(text);
  }

  return item;
}

/**
 * Show a user profile inside the profile area.
 * @param {{
 *   container: HTMLElement,
 *   user: object,
 *   posts: Array,
 *   usersById: Map<number, object>,
 *   loggedInUserId: number,
 *   onFollowChange: () => void,
 *   onSelectUser: (userId: number) => void,
 *   onSummarizePost: (post: object, author: object, comments: Array) => void
 * }} options
 */
export function renderUserProfile({
  container,
  user,
  posts,
  usersById,
  loggedInUserId,
  onFollowChange,
  onSelectUser,
  onSummarizePost,
}) {
  container.replaceChildren();

  const userPosts = posts.filter((post) => post.userId === user.id);
  const firstName = (user.name || 'User').replace(/^(mr|mrs|ms|dr)\.?\s+/i, '').split(' ')[0];

  // Cover banner
  const banner = document.createElement('div');
  banner.className = 'profile-banner';

  // Details block
  const details = document.createElement('div');
  details.className = 'profile-details';

  const avatarActionsRow = document.createElement('div');
  avatarActionsRow.className = 'profile-avatar-actions';

  const avatarFrame = document.createElement('div');
  avatarFrame.className = 'profile-avatar-frame';
  avatarFrame.appendChild(createAvatarElement(user, 'avatar-lg'));
  avatarActionsRow.appendChild(avatarFrame);

  // Follow button (for other users) or own profile label
  if (user.id === loggedInUserId) {
    const ownLabel = document.createElement('span');
    ownLabel.className = 'profile-own-label';
    ownLabel.textContent = 'Your Profile';
    avatarActionsRow.appendChild(ownLabel);
  } else {
    const followBtn = document.createElement('button');
    followBtn.type = 'button';
    followBtn.className = 'btn-follow';

    const updateFollowBtnText = (following) => {
      followBtn.classList.toggle('is-following', following);
      followBtn.textContent = following ? 'Following' : 'Follow';
      followBtn.setAttribute('aria-pressed', String(following));
    };

    updateFollowBtnText(isUserFollowed(user.id));

    followBtn.addEventListener('click', () => {
      const nowFollowing = toggleFollowUser(user.id);
      updateFollowBtnText(nowFollowing);
      const updatedStats = getUserFollowStats(user.id, loggedInUserId);
      followersVal.textContent = updatedStats.followers.toLocaleString();
      onFollowChange();
    });

    avatarActionsRow.appendChild(followBtn);
  }

  details.appendChild(avatarActionsRow);

  // Full name and @username
  const fullName = document.createElement('h2');
  fullName.className = 'profile-name';
  fullName.textContent = user.name;

  const handle = document.createElement('p');
  handle.className = 'profile-handle';
  handle.textContent = `@${user.username}`;

  // Demonstration bio
  const bio = document.createElement('p');
  bio.className = 'profile-bio';
  bio.textContent =
    DEMO_BIOS[user.id] || 'Sharing updates, ideas, and conversations on Chirp.';

  details.append(fullName, handle, bio);

  // Metadata row from JSONPlaceholder (company, city, website, email)
  const metaList = document.createElement('div');
  metaList.className = 'profile-meta-list';

  if (user.company?.name) {
    metaList.appendChild(createMetaItem(`Works at ${user.company.name}`));
  }
  if (user.address?.city) {
    metaList.appendChild(createMetaItem(user.address.city));
  }
  if (user.website) {
    const safeUrl = buildSafeWebsiteUrl(user.website);
    metaList.appendChild(createMetaItem(user.website, safeUrl));
  }
  if (user.email) {
    metaList.appendChild(createMetaItem(user.email));
  }

  details.appendChild(metaList);

  // Stats row (Following, Followers, Posts)
  const stats = getUserFollowStats(user.id, loggedInUserId);
  const statsRow = document.createElement('div');
  statsRow.className = 'profile-stats';

  const followingStat = document.createElement('span');
  const followingVal = document.createElement('span');
  followingVal.className = 'profile-stat-value';
  followingVal.textContent = stats.following.toLocaleString();
  followingStat.append(followingVal, ' Following');

  const followersStat = document.createElement('span');
  const followersVal = document.createElement('span');
  followersVal.className = 'profile-stat-value';
  followersVal.textContent = stats.followers.toLocaleString();
  followersStat.append(followersVal, ' Followers');

  const postsStat = document.createElement('span');
  const postsVal = document.createElement('span');
  postsVal.className = 'profile-stat-value';
  postsVal.textContent = String(userPosts.length);
  postsStat.append(postsVal, userPosts.length === 1 ? ' Post' : ' Posts');

  statsRow.append(followingStat, followersStat, postsStat);
  details.appendChild(statsRow);

  // Posts by user section
  const postsHeading = document.createElement('h3');
  postsHeading.className = 'profile-posts-heading';
  postsHeading.textContent = `Posts by ${firstName}`;

  const postsContainer = document.createElement('div');
  postsContainer.className = 'feed-list';

  if (userPosts.length === 0) {
    const emptyEl = document.createElement('p');
    emptyEl.className = 'profile-empty-posts';
    emptyEl.textContent = `${firstName} has not published any posts yet.`;
    postsContainer.appendChild(emptyEl);
  } else {
    renderFeedPosts(postsContainer, userPosts, usersById, {
      onSelectUser,
      onSummarizePost,
    });
  }

  container.append(banner, details, postsHeading, postsContainer);
}
