/**
 * api.js
 * Responsible for fetching users, posts, and comments from JSONPlaceholder.
 * Uses Promise.all for parallel loading and caches comments so they are fetched only once.
 */

const BASE_URL = 'https://jsonplaceholder.typicode.com';

// Module-level cache to avoid re-fetching comments repeatedly
let cachedComments = null;

/**
 * Get data from a link. Show an error if the request fails.
 * @param {string} url
 * @returns {Promise<any>}
 */
async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

/**
 * Get all users.
 * @returns {Promise<Array>}
 */
export async function fetchUsers() {
  return fetchJson(`${BASE_URL}/users`);
}

/**
 * Get all posts.
 * @returns {Promise<Array>}
 */
export async function fetchPosts() {
  return fetchJson(`${BASE_URL}/posts`);
}

/**
 * Get comments once and reuse them.
 * @returns {Promise<Array>}
 */
export async function fetchCommentsOnce() {
  if (cachedComments !== null) {
    return cachedComments;
  }
  const comments = await fetchJson(`${BASE_URL}/comments`);
  cachedComments = comments;
  return cachedComments;
}

/**
 * Get users, posts and comments at the same time.
 * @returns {Promise<{ users: Array, posts: Array, comments: Array }>}
 */
export async function fetchInitialData() {
  const [[users, posts], comments] = await Promise.all([
    Promise.all([fetchUsers(), fetchPosts()]),
    fetchCommentsOnce(),
  ]);

  return { users, posts, comments };
}
