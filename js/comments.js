/**
 * comments.js
 * Organizes comments by postId and manages expanding/collapsing post replies.
 */

let commentsByPostId = new Map();

/**
 * Put each post's comments together.
 * @param {Array} comments
 */
export function indexComments(comments) {
  commentsByPostId = new Map();
  for (const comment of comments) {
    const existing = commentsByPostId.get(comment.postId);
    if (existing) {
      existing.push(comment);
    } else {
      commentsByPostId.set(comment.postId, [comment]);
    }
  }
}

/**
 * Get comments for one post.
 * @param {number} postId
 * @returns {Array}
 */
export function getCommentsByPostId(postId) {
  return commentsByPostId.get(postId) || [];
}

/**
 * Build the comments area for one post.
 * Use textContent to show data safely.
 * @param {number} postId
 * @returns {HTMLElement}
 */
export function createCommentsDrawer(postId) {
  const drawer = document.createElement('div');
  drawer.className = 'comments-section is-hidden';
  drawer.dataset.commentsFor = String(postId);

  const comments = getCommentsByPostId(postId);

  if (comments.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.className = 'comments-empty';
    emptyMsg.textContent = 'No comments yet for this post.';
    drawer.appendChild(emptyMsg);
    return drawer;
  }

  const list = document.createElement('div');
  list.className = 'comments-list';

  for (const comment of comments) {
    const item = document.createElement('article');
    item.className = 'comment-item';

    const header = document.createElement('div');
    header.className = 'comment-header';

    const authorName = document.createElement('span');
    authorName.className = 'comment-author';
    authorName.textContent = comment.name;

    const authorEmail = document.createElement('span');
    authorEmail.className = 'comment-email';
    authorEmail.textContent = comment.email;

    header.append(authorName, authorEmail);

    const body = document.createElement('p');
    body.className = 'comment-body';
    body.textContent = comment.body;

    item.append(header, body);
    list.appendChild(item);
  }

  drawer.appendChild(list);
  return drawer;
}

/**
 * Open or close the comments and update the button.
 * @param {HTMLElement} drawer
 * @param {HTMLButtonElement} toggleButton
 */
export function toggleCommentsDrawer(drawer, toggleButton) {
  const isCurrentlyHidden = drawer.classList.contains('is-hidden');
  drawer.classList.toggle('is-hidden', !isCurrentlyHidden);
  toggleButton.classList.toggle('is-open', isCurrentlyHidden);
  toggleButton.setAttribute('aria-expanded', String(isCurrentlyHidden));
}
