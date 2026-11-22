/**
 * compose.js
 * Handles the post composition box, 280-character limit validation, and publishing new posts.
 */

const MAX_LENGTH = 280;
const RING_CIRCUMFERENCE = 2 * Math.PI * 10.5; // r="10.5" in SVG

/**
 * Set up the post box and its character counter.
 * @param {{ currentUser: object, onPublish: (postText: string) => void }} options
 */
export function initComposeBox({ onPublish }) {
  const form = document.getElementById('compose-form');
  const input = document.getElementById('compose-input');
  const submitBtn = document.getElementById('compose-submit');
  const counterWrap = document.getElementById('compose-counter-wrap');
  const counterText = document.getElementById('char-counter-text');
  const counterRing = document.getElementById('char-counter-ring');

  if (!form || !input || !submitBtn || !counterWrap || !counterText || !counterRing) {
    return;
  }

  function updateCounter() {
    // Do not allow more than 280 characters, even when text is pasted.
    if (input.value.length > MAX_LENGTH) {
      input.value = input.value.slice(0, MAX_LENGTH);
    }

    const length = input.value.length;
    const trimmedLength = input.value.trim().length;

    counterText.textContent = `${length} / ${MAX_LENGTH}`;
    submitBtn.disabled = trimmedLength === 0 || length > MAX_LENGTH;

    const ratio = Math.min(length / MAX_LENGTH, 1);
    const offset = RING_CIRCUMFERENCE * (1 - ratio);
    counterRing.style.strokeDashoffset = String(offset);

    counterWrap.classList.toggle('is-warning', length >= 250 && length < MAX_LENGTH);
    counterWrap.classList.toggle('is-limit', length >= MAX_LENGTH);
  }

  input.addEventListener('input', updateCounter);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const content = input.value.trim();
    if (!content || content.length > MAX_LENGTH) {
      return;
    }

    onPublish(content);
    input.value = '';
    updateCounter();
    input.focus();
  });

  // Show the correct counter when the page opens.
  updateCounter();
}
