/**
 * feed.js
 * Renders social media post cards, user avatars with initials fallback,
 * and handles prepending newly composed posts to the top of the feed.
 */

import {
  createCommentsDrawer,
  getCommentsByPostId,
  toggleCommentsDrawer,
} from './comments.js';
import {
  getLikeCount,
  getRetweetCount,
  isPostLiked,
  isPostRetweeted,
  toggleLike,
  toggleRetweet,
} from './interactions.js';

const AVATAR_COLOR_CLASSES = [
  'avatar-blue',
  'avatar-green',
  'avatar-amber',
  'avatar-violet',
  'avatar-rose',
];

/**
 * Get one or two capital letters from a name.
 * @param {string} name
 * @returns {string}
 */
export function getUserInitials(name = '') {
  const cleaned = name.replace(/^(mr|mrs|ms|dr)\.?\s+/i, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Choose the same avatar color for each user.
 * @param {number} userId
 * @returns {string}
 */
export function getAvatarColorClass(userId) {
  const index = Math.abs((Number(userId) || 1) - 1) % AVATAR_COLOR_CLASSES.length;
  return AVATAR_COLOR_CLASSES[index];
}

/**
 * Make a round user picture. Show initials if the picture cannot load.
 * @param {{ id: number, name: string, avatarUrl?: string }} user
 * @param {'avatar-sm' | 'avatar-md' | 'avatar-lg'} sizeClass
 * @returns {HTMLElement}
 */
export function createAvatarElement(user, sizeClass = 'avatar-md') {
  const wrapper = document.createElement('span');
  const colorClass = getAvatarColorClass(user?.id ?? 1);
  wrapper.className = `avatar ${sizeClass} ${colorClass}`;

  const initials = getUserInitials(user?.name || 'User');
  const initialsSpan = document.createElement('span');
  initialsSpan.textContent = initials;
  wrapper.appendChild(initialsSpan);

  if (user?.avatarUrl) {
    const img = document.createElement('img');
    img.src = user.avatarUrl;
    img.alt = `${user.name} avatar`;
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('load', () => {
      initialsSpan.classList.add('is-hidden');
    });
    img.addEventListener('error', () => {
      img.remove();
      initialsSpan.classList.remove('is-hidden');
    });
    wrapper.appendChild(img);
  }

  return wrapper;
}

/**
 * Helper to create a clean inline SVG icon element.
 * @param {string} pathData
 * @param {{ fill?: string, stroke?: string }} options
 * @returns {SVGSVGElement}
 */
function createIconSvg(pathData, { fill = 'none', stroke = 'currentColor' } = {}) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('post-action-icon');

  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', pathData);
  path.setAttribute('fill', fill);
  if (stroke !== 'none') {
    path.setAttribute('stroke', stroke);
    path.setAttribute('stroke-width', '1.8');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
  }
  svg.appendChild(path);
  return svg;
}

/**
 * Build one post card.
 * @param {object} post
 * @param {Map<number, object>} usersById
 * @param {{ onSelectUser: (userId: number) => void, onSummarizePost: (post: object, author: object, comments: Array) => void }} callbacks
 * @returns {HTMLElement}
 */
export function createPostCard(post, usersById, { onSelectUser, onSummarizePost }) {
  const author = usersById.get(post.userId) || {
    id: post.userId || 1,
    name: 'Unknown User',
    username: 'user',
  };
  const comments = getCommentsByPostId(post.id);

  const article = document.createElement('article');
  article.className = 'post-card';
  article.dataset.postId = String(post.id);

  // Clickable author avatar
  const avatarBtn = document.createElement('button');
  avatarBtn.type = 'button';
  avatarBtn.className = 'post-avatar-btn';
  avatarBtn.setAttribute('aria-label', `View ${author.name}'s profile`);
  avatarBtn.appendChild(createAvatarElement(author, 'avatar-md'));
  avatarBtn.addEventListener('click', () => onSelectUser(author.id));

  const mainCol = document.createElement('div');
  mainCol.className = 'post-main';

  // Author row
  const authorRow = document.createElement('div');
  authorRow.className = 'post-author-row';

  const authorBtn = document.createElement('button');
  authorBtn.type = 'button';
  authorBtn.className = 'post-author-btn';

  const nameSpan = document.createElement('span');
  nameSpan.className = 'post-author-name';
  nameSpan.textContent = author.name;

  const handleSpan = document.createElement('span');
  handleSpan.className = 'post-author-handle';
  handleSpan.textContent = `@${author.username}`;

  authorBtn.append(nameSpan, handleSpan);
  authorBtn.addEventListener('click', () => onSelectUser(author.id));
  authorRow.appendChild(authorBtn);

  if (post.createdAt) {
    const dot = document.createElement('span');
    dot.className = 'post-dot';
    dot.setAttribute('aria-hidden', 'true');
    dot.textContent = '·';

    const timeSpan = document.createElement('span');
    timeSpan.className = 'post-timestamp';
    timeSpan.textContent = post.createdAt;
    authorRow.append(dot, timeSpan);
  }

  mainCol.appendChild(authorRow);

  // Post title (JSONPlaceholder posts include a title; locally composed posts may omit it)
  if (post.title) {
    const titleEl = document.createElement('h2');
    titleEl.className = 'post-title';
    titleEl.textContent = post.title;
    mainCol.appendChild(titleEl);
  }

  // Post body
  const bodyEl = document.createElement('p');
  bodyEl.className = 'post-body';
  bodyEl.textContent = post.body;
  mainCol.appendChild(bodyEl);

  // Action bar
  const actionsBar = document.createElement('div');
  actionsBar.className = 'post-actions';

  // Comments toggle button
  const commentsBtn = document.createElement('button');
  commentsBtn.type = 'button';
  commentsBtn.className = 'post-action-btn post-action-comments';
  commentsBtn.setAttribute('aria-expanded', 'false');
  const commentIcon = createIconSvg(
    'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z'
  );
  const commentsLabel = document.createElement('span');
  commentsLabel.textContent = `Comments (${comments.length})`;
  commentsBtn.append(commentIcon, commentsLabel);

  // Retweet button
  const retweetBtn = document.createElement('button');
  retweetBtn.type = 'button';
  retweetBtn.className = 'post-action-btn post-action-retweet';
  if (isPostRetweeted(post.id)) {
    retweetBtn.classList.add('is-active');
  }
  retweetBtn.setAttribute('aria-pressed', String(isPostRetweeted(post.id)));
  retweetBtn.setAttribute('aria-label', 'Retweet');
  const retweetIcon = createIconSvg(
    'M17 2l4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3'
  );
  const retweetCountSpan = document.createElement('span');
  retweetCountSpan.textContent = String(getRetweetCount(post.id));
  retweetBtn.append(retweetIcon, retweetCountSpan);

  retweetBtn.addEventListener('click', () => {
    const result = toggleRetweet(post.id);
    retweetBtn.classList.toggle('is-active', result.active);
    retweetBtn.setAttribute('aria-pressed', String(result.active));
    retweetCountSpan.textContent = String(result.count);
  });

  // Like button
  const likeBtn = document.createElement('button');
  likeBtn.type = 'button';
  likeBtn.className = 'post-action-btn post-action-like';
  const initiallyLiked = isPostLiked(post.id);
  if (initiallyLiked) {
    likeBtn.classList.add('is-active');
  }
  likeBtn.setAttribute('aria-pressed', String(initiallyLiked));
  likeBtn.setAttribute('aria-label', 'Like');

  const heartPath =
    'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z';
  let likeIcon = createIconSvg(heartPath, {
    fill: initiallyLiked ? 'currentColor' : 'none',
    stroke: 'currentColor',
  });
  const likeCountSpan = document.createElement('span');
  likeCountSpan.textContent = String(getLikeCount(post.id));
  likeBtn.append(likeIcon, likeCountSpan);

  likeBtn.addEventListener('click', () => {
    const result = toggleLike(post.id);
    likeBtn.classList.toggle('is-active', result.active);
    likeBtn.setAttribute('aria-pressed', String(result.active));
    likeCountSpan.textContent = String(result.count);

    const updatedIcon = createIconSvg(heartPath, {
      fill: result.active ? 'currentColor' : 'none',
      stroke: 'currentColor',
    });
    likeBtn.replaceChild(updatedIcon, likeIcon);
    likeIcon = updatedIcon;
  });

  // Summarize with AI button
  const aiBtn = document.createElement('button');
  aiBtn.type = 'button';
  aiBtn.className = 'post-action-btn post-action-ai';
  const aiIcon = createIconSvg(
    'M12 3l1.9 4.7L18.5 9.5l-4.6 1.8L12 16l-1.9-4.7L5.5 9.5l4.6-1.8L12 3ZM5 18l.9 2.1L8 21l-2.1.9L5 24l-.9-2.1L2 21l2.1-.9L5 18Z'
  );
  const aiLabel = document.createElement('span');
  aiLabel.textContent = 'Summarize with AI';
  aiBtn.append(aiIcon, aiLabel);
  aiBtn.addEventListener('click', () => {
    onSummarizePost(post, author, comments);
  });

  actionsBar.append(commentsBtn, retweetBtn, likeBtn, aiBtn);
  mainCol.appendChild(actionsBar);

  // Collapsible Comments Drawer
  const commentsDrawer = createCommentsDrawer(post.id);
  commentsBtn.addEventListener('click', () => {
    toggleCommentsDrawer(commentsDrawer, commentsBtn);
  });
  mainCol.appendChild(commentsDrawer);

  article.append(avatarBtn, mainCol);
  return article;
}

/**
 * Show a list of posts.
 * @param {HTMLElement} container
 * @param {Array} posts
 * @param {Map<number, object>} usersById
 * @param {object} callbacks
 */
export function renderFeedPosts(container, posts, usersById, callbacks) {
  container.replaceChildren();
  const fragment = document.createDocumentFragment();
  for (const post of posts) {
    fragment.appendChild(createPostCard(post, usersById, callbacks));
  }
  container.appendChild(fragment);
}

/**
 * Prepend a newly composed post to the top of the feed container immediately.
 * @param {HTMLElement} container
 * @param {object} post
 * @param {Map<number, object>} usersById
 * @param {object} callbacks
 */
export function prependPostToFeed(container, post, usersById, callbacks) {
  const card = createPostCard(post, usersById, callbacks);
  container.prepend(card);
}
