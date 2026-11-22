/**
 * main.js
 * Starts the app and connects its main parts.
 */

import { fetchInitialData } from './api.js';
import { indexComments } from './comments.js';
import {
  createAvatarElement,
  prependPostToFeed,
  renderFeedPosts,
} from './feed.js';
import {
  initializeInteractions,
  isUserFollowed,
  registerPostInteractions,
  toggleFollowUser,
} from './interactions.js';
import { initComposeBox } from './compose.js';
import { renderUserProfile } from './profile.js';
import { initAiChat } from './ai-chat.js';

const LOGGED_IN_USER_ID = 1;

const state = {
  users: [],
  usersById: new Map(),
  posts: [],
  activeView: 'home', // 'home' | 'profile'
  viewedProfileUserId: LOGGED_IN_USER_ID,
  nextLocalPostId: 1001,
};

let aiController = null;

// DOM references
const homeViewEl = document.getElementById('home-view');
const profileViewEl = document.getElementById('profile-view');
const profileContainerEl = document.getElementById('profile-container');
const feedStatusEl = document.getElementById('feed-status');
const feedListEl = document.getElementById('feed-list');
const suggestedUsersEl = document.getElementById('suggested-users-list');

const headerBackBtn = document.getElementById('header-back-btn');
const headerTitleEl = document.getElementById('header-title');
const headerSubtitleEl = document.getElementById('header-subtitle');

const navButtons = document.querySelectorAll('[data-nav]');

/**
 * Mix posts from different users so one user does not fill the whole feed.
 * @param {Array} posts
 * @returns {Array}
 */
function buildTimelineOrder(posts) {
  const buckets = new Map();
  for (const post of posts) {
    if (!buckets.has(post.userId)) {
      buckets.set(post.userId, []);
    }
    buckets.get(post.userId).push(post);
  }

  const ordered = [];
  const queues = Array.from(buckets.values());
  let added = true;
  let index = 0;

  while (added) {
    added = false;
    for (const queue of queues) {
      if (index < queue.length) {
        ordered.push(queue[index]);
        added = true;
      }
    }
    index += 1;
  }

  return ordered;
}

/**
 * Show which navigation tab is active.
 * @param {'home' | 'profile'} activeTab
 */
function updateNavIndicators(activeTab) {
  for (const button of navButtons) {
    const target = button.getAttribute('data-nav');
    if (target === 'ai') continue;
    const isActive = target === activeTab;
    button.classList.toggle('is-active', isActive);
    if (isActive) {
      button.setAttribute('aria-current', 'page');
    } else {
      button.removeAttribute('aria-current');
    }
  }
}

/**
 * Show the Home feed and refresh the posts.
 */
function showHomeView() {
  state.activeView = 'home';
  homeViewEl.classList.remove('is-hidden');
  profileViewEl.classList.add('is-hidden');

  headerBackBtn.classList.add('is-hidden');
  headerTitleEl.textContent = 'Home';
  headerSubtitleEl.classList.add('is-hidden');
  headerSubtitleEl.textContent = '';

  updateNavIndicators('home');

  if (state.posts.length > 0) {
    renderFeedPosts(feedListEl, state.posts, state.usersById, {
      onSelectUser: showProfileView,
      onSummarizePost: handleSummarizePost,
    });
  }

  window.scrollTo({ top: 0, behavior: 'auto' });
}

/**
 * Open a user profile.
 * @param {number} userId
 */
function showProfileView(userId = LOGGED_IN_USER_ID) {
  const user = state.usersById.get(userId);
  if (!user) return;

  state.activeView = 'profile';
  state.viewedProfileUserId = user.id;

  homeViewEl.classList.add('is-hidden');
  profileViewEl.classList.remove('is-hidden');

  const userPostCount = state.posts.filter((p) => p.userId === user.id).length;
  headerBackBtn.classList.remove('is-hidden');
  headerTitleEl.textContent = user.name;
  headerSubtitleEl.textContent = `${userPostCount} ${userPostCount === 1 ? 'Post' : 'Posts'}`;
  headerSubtitleEl.classList.remove('is-hidden');

  updateNavIndicators(user.id === LOGGED_IN_USER_ID ? 'profile' : 'home');

  renderUserProfile({
    container: profileContainerEl,
    user,
    posts: state.posts,
    usersById: state.usersById,
    loggedInUserId: LOGGED_IN_USER_ID,
    onFollowChange: renderSuggestedUsers,
    onSelectUser: showProfileView,
    onSummarizePost: handleSummarizePost,
  });

  window.scrollTo({ top: 0, behavior: 'auto' });
}

/**
 * Send a post and its comments to the AI for a short summary.
 */
function handleSummarizePost(post, author, comments) {
  if (aiController) {
    aiController.summarizePost(post, author, comments);
  }
}

/**
 * Update the signed-in demo user's details in the page.
 */
function syncLoggedInUserWidgets() {
  const currentUser = state.usersById.get(LOGGED_IN_USER_ID);
  if (!currentUser) return;

  const sidebarAvatar = document.getElementById('sidebar-account-avatar');
  const sidebarName = document.getElementById('sidebar-account-name');
  const sidebarHandle = document.getElementById('sidebar-account-handle');
  const composeAvatar = document.getElementById('compose-user-avatar');
  const mobileAvatar = document.getElementById('mobile-header-avatar');

  if (sidebarName) sidebarName.textContent = currentUser.name;
  if (sidebarHandle) sidebarHandle.textContent = `@${currentUser.username}`;

  if (sidebarAvatar) {
    sidebarAvatar.replaceWith(
      Object.assign(createAvatarElement(currentUser, 'avatar-sm'), {
        id: 'sidebar-account-avatar',
      })
    );
  }
  if (composeAvatar) {
    composeAvatar.replaceWith(
      Object.assign(createAvatarElement(currentUser, 'avatar-md'), {
        id: 'compose-user-avatar',
      })
    );
  }
  if (mobileAvatar) {
    mobileAvatar.replaceWith(
      Object.assign(createAvatarElement(currentUser, 'avatar-sm'), {
        id: 'mobile-header-avatar',
      })
    );
  }
}

/**
 * Show suggested users and their Follow buttons.
 */
function renderSuggestedUsers() {
  if (!suggestedUsersEl) return;
  suggestedUsersEl.replaceChildren();

  const suggestions = state.users
    .filter((u) => u.id !== LOGGED_IN_USER_ID)
    .slice(0, 4);

  if (suggestions.length === 0) {
    const emptyText = document.createElement('p');
    emptyText.className = 'suggested-loading-text';
    emptyText.textContent = 'No suggestions available.';
    suggestedUsersEl.appendChild(emptyText);
    return;
  }

  for (const user of suggestions) {
    const row = document.createElement('div');
    row.className = 'suggested-user-row';

    const userLinkBtn = document.createElement('button');
    userLinkBtn.type = 'button';
    userLinkBtn.className = 'suggested-user-link';
    userLinkBtn.addEventListener('click', () => showProfileView(user.id));

    const avatar = createAvatarElement(user, 'avatar-sm');

    const info = document.createElement('span');
    info.className = 'suggested-user-info';

    const name = document.createElement('span');
    name.className = 'suggested-user-name';
    name.textContent = user.name;

    const handle = document.createElement('span');
    handle.className = 'suggested-user-handle';
    handle.textContent = `@${user.username}`;

    info.append(name, handle);
    userLinkBtn.append(avatar, info);

    const followBtn = document.createElement('button');
    followBtn.type = 'button';
    followBtn.className = 'btn-follow';

    const updateBtn = (following) => {
      followBtn.classList.toggle('is-following', following);
      followBtn.textContent = following ? 'Following' : 'Follow';
      followBtn.setAttribute('aria-pressed', String(following));
    };

    updateBtn(isUserFollowed(user.id));

    followBtn.addEventListener('click', () => {
      const nowFollowing = toggleFollowUser(user.id);
      updateBtn(nowFollowing);

      // Keep open profile view synchronized if currently viewing this user or logged-in user
      if (
        state.activeView === 'profile' &&
        (state.viewedProfileUserId === user.id ||
          state.viewedProfileUserId === LOGGED_IN_USER_ID)
      ) {
        showProfileView(state.viewedProfileUserId);
      }
    });

    row.append(userLinkBtn, followBtn);
    suggestedUsersEl.appendChild(row);
  }
}

/**
 * Show a loading message while data is being loaded.
 */
function showLoadingState() {
  feedStatusEl.replaceChildren();
  const wrapper = document.createElement('div');
  wrapper.className = 'loading-state';

  const spinner = document.createElement('div');
  spinner.className = 'spinner';
  spinner.setAttribute('aria-hidden', 'true');

  const label = document.createElement('p');
  label.textContent = 'Loading posts and users...';

  wrapper.append(spinner, label);
  feedStatusEl.appendChild(wrapper);
}

/**
 * Show an error message and a Retry button.
 * @param {string} errorMessage
 */
function showErrorState(errorMessage) {
  feedStatusEl.replaceChildren();
  const banner = document.createElement('div');
  banner.className = 'error-banner';
  banner.setAttribute('role', 'alert');

  const text = document.createElement('p');
  text.className = 'error-banner-text';
  text.textContent = errorMessage;

  const retryBtn = document.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = 'btn-retry';
  retryBtn.textContent = 'Retry';
  retryBtn.addEventListener('click', loadAppData);

  banner.append(text, retryBtn);
  feedStatusEl.appendChild(banner);
}

/**
 * Load the data and show the app.
 */
async function loadAppData() {
  showLoadingState();
  feedListEl.replaceChildren();

  try {
    const { users, posts, comments } = await fetchInitialData();

    state.users = users;
    state.usersById = new Map(users.map((user) => [user.id, user]));
    state.posts = buildTimelineOrder(posts);

    indexComments(comments);
    initializeInteractions(state.posts, state.users);

    feedStatusEl.replaceChildren();
    syncLoggedInUserWidgets();
    renderSuggestedUsers();

    renderFeedPosts(feedListEl, state.posts, state.usersById, {
      onSelectUser: showProfileView,
      onSummarizePost: handleSummarizePost,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? `Could not load feed data (${err.message}). Please check your connection and try again.`
        : 'Could not load feed data. Please try again.';
    showErrorState(message);
  }
}

/**
 * Add a new post to the top of the feed.
 * @param {string} text
 */
function handlePublishPost(text) {
  const currentUser = state.usersById.get(LOGGED_IN_USER_ID) || {
    id: LOGGED_IN_USER_ID,
    name: 'Leanne Graham',
    username: 'Bret',
  };

  if (!state.usersById.has(currentUser.id)) {
    state.usersById.set(currentUser.id, currentUser);
  }

  const newPost = {
    id: state.nextLocalPostId++,
    userId: currentUser.id,
    title: '',
    body: text,
    isLocal: true,
    createdAt: 'Just now',
  };

  registerPostInteractions(newPost.id);
  state.posts.unshift(newPost);

  prependPostToFeed(feedListEl, newPost, state.usersById, {
    onSelectUser: showProfileView,
    onSummarizePost: handleSummarizePost,
  });
}

/**
 * Make the navigation and profile buttons work.
 */
function bindNavigationEvents() {
  for (const button of navButtons) {
    button.addEventListener('click', () => {
      const target = button.getAttribute('data-nav');
      if (target === 'home') {
        showHomeView();
      } else if (target === 'profile') {
        showProfileView(LOGGED_IN_USER_ID);
      } else if (target === 'ai' && aiController) {
        aiController.togglePanel();
      }
    });
  }

  document.getElementById('brand-home-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    showHomeView();
  });

  headerBackBtn?.addEventListener('click', showHomeView);

  document
    .getElementById('sidebar-account-btn')
    ?.addEventListener('click', () => showProfileView(LOGGED_IN_USER_ID));

  document
    .getElementById('mobile-header-avatar-btn')
    ?.addEventListener('click', () => showProfileView(LOGGED_IN_USER_ID));
}



loadWelcomeMessage();



/**
 * Start the app.
 */
function initApp() {
  aiController = initAiChat();
  initComposeBox({ onPublish: handlePublishPost });
  bindNavigationEvents();
  loadAppData();

  loadWelcomeMessage(); // Load welcome message
}

// Load the welcome message from our endpoint
async function loadWelcomeMessage() {

    const welcomeMessage = document.getElementById("welcome-message");

    try {
        const response = await fetch("/api/hello");

        const data = await response.json();

        welcomeMessage.textContent = data.message;

    } catch (error) {
        console.log(error);
        welcomeMessage.textContent = "Could not load welcome message.";
    }

}
initApp();
