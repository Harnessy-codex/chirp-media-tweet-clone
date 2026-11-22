
const conversationHistory = [];
let isRequestPending = false;

/**
 * Initialize the AI chat UI and return controller methods.
 * @returns {{ openPanel: () => void, closePanel: () => void, togglePanel: () => void, summarizePost: (post: object, author: object, comments: Array) => void }}
 */
export function initAiChat() {
  const fab = document.getElementById('ai-fab');
  const panel = document.getElementById('ai-chat-panel');
  const closeBtn = document.getElementById('ai-close-btn');
  const clearBtn = document.getElementById('ai-clear-btn');
  const messagesEl = document.getElementById('ai-messages');
  const thinkingEl = document.getElementById('ai-thinking');
  const errorEl = document.getElementById('ai-error');
  const form = document.getElementById('ai-form');
  const input = document.getElementById('ai-input');
  const sendBtn = document.getElementById('ai-send-btn');

  function showIntroIfEmpty() {
    if (conversationHistory.length > 0) return;
    messagesEl.replaceChildren();
    const intro = document.createElement('div');
    intro.className = 'ai-empty-intro';

    const heading = document.createElement('strong');
    heading.textContent = 'Ask AI anything';

    const copy = document.createElement('span');
    copy.textContent =
      'Ask general questions or click "Summarize with AI" on any post in the feed to summarize the post and its replies.';

    intro.append(heading, copy);
    messagesEl.appendChild(intro);
  }

  function appendBubble(role, text) {
    // Remove empty intro state before appending first real bubble
    const intro = messagesEl.querySelector('.ai-empty-intro');
    if (intro) {
      intro.remove();
    }

    const bubble = document.createElement('div');
    bubble.className = `ai-bubble ${role === 'user' ? 'ai-bubble-user' : 'ai-bubble-assistant'}`;
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setError(message) {
    if (!message) {
      errorEl.textContent = '';
      errorEl.classList.add('is-hidden');
      return;
    }
    errorEl.textContent = message;
    errorEl.classList.remove('is-hidden');
  }

  function setLoading(loading) {
    isRequestPending = loading;
    thinkingEl.classList.toggle('is-hidden', !loading);
    sendBtn.disabled = loading;
    input.disabled = loading;
    if (loading) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  function openPanel() {
    panel.classList.remove('is-hidden');
    fab.setAttribute('aria-expanded', 'true');
    showIntroIfEmpty();
    input.focus();
  }

  function closePanel() {
    panel.classList.add('is-hidden');
    fab.setAttribute('aria-expanded', 'false');
  }

  function togglePanel() {
    if (panel.classList.contains('is-hidden')) {
      openPanel();
    } else {
      closePanel();
    }
  }

  /**
   * Send the chat history to the server.
   * @param {string} displayMessage - Text shown in the user bubble
   * @param {string} promptMessage - Full prompt sent to the AI model
   */
  async function sendToOpenRouter(displayMessage, promptMessage) {
    if (isRequestPending) return;

    setError('');
    appendBubble('user', displayMessage);

    // Push user turn onto conversationHistory so OpenRouter retains full context
    conversationHistory.push({ role: 'user', content: promptMessage });
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: conversationHistory,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Roll back the failed user turn so subsequent retries stay clean
        conversationHistory.pop();
        throw new Error(data.error || `AI request failed with status ${response.status}.`);
      }

      const assistantReply = data.reply;
      conversationHistory.push({ role: 'assistant', content: assistantReply });
      appendBubble('assistant', assistantReply);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong contacting OpenRouter.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Ask the AI to sum up a post and its comments.
   * @param {object} post
   * @param {object} author
   * @param {Array} comments
   */
  function summarizePost(post, author, comments) {
    openPanel();

    const firstName = (author?.name || 'User').split(' ')[0];
    const displayText = `Summarize ${firstName}'s post.`;

    const commentLines =
      comments.length > 0
        ? comments
            .map((c, index) => `${index + 1}. ${c.name} (${c.email}): ${c.body}`)
            .join('\n')
        : 'No comments on this post yet.';

    const fullPrompt = [
      `Please summarize the following social media post and its comments concisely.`,
      `Author: ${author?.name || 'Unknown'} (@${author?.username || 'user'})`,
      post.title ? `Title: ${post.title}` : null,
      `Post: ${post.body}`,
      `Comments (${comments.length}):`,
      commentLines,
    ]
      .filter(Boolean)
      .join('\n\n');

    sendToOpenRouter(displayText, fullPrompt);
  }

  // Event bindings
  fab.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', closePanel);

  clearBtn.addEventListener('click', () => {
    conversationHistory.length = 0;
    setError('');
    showIntroIfEmpty();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const userQuestion = input.value.trim();
    if (!userQuestion || isRequestPending) return;
    input.value = '';
    sendToOpenRouter(userQuestion, userQuestion);
  });

  // Close panel with Escape key for accessibility
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.classList.contains('is-hidden')) {
      closePanel();
    }
  });

  showIntroIfEmpty();

  return {
    openPanel,
    closePanel,
    togglePanel,
    summarizePost,
  };
}
