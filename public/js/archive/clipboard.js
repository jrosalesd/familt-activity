/**
 * clipboard.js
 *
 * Reusable copy-to-clipboard utility.
 *
 * WHAT YOU'RE LEARNING:
 *   - Writing reusable vanilla JS utilities
 *   - The Clipboard API (modern browsers)
 *   - Visual feedback patterns (temporary state change)
 *   - Data attributes — storing config in HTML without JS variables
 *
 * USAGE OPTIONS:
 *
 *   1. By element ID:
 *      copyToClipboard({ sourceId: 'kids-link' })
 *
 *   2. Direct value:
 *      copyToClipboard({ value: 'https://example.com' })
 *
 *   3. From a data attribute on any element:
 *      <button data-copy="https://example.com">Copy</button>
 *      (automatically wired up — no JS call needed)
 *
 *   4. With a custom success message:
 *      copyToClipboard({ sourceId: 'kids-link', message: 'Link copied!' })
 *
 *   5. With a button to update while copying:
 *      copyToClipboard({ sourceId: 'kids-link', buttonId: 'copy-btn' })
 */

/**
 * Core copy function.
 * @param {object} options
 * @param {string} [options.sourceId]  — ID of element whose text to copy
 * @param {string} [options.value]     — direct string value to copy
 * @param {string} [options.buttonId]  — ID of button to show feedback on
 * @param {string} [options.message]   — success toast message
 */
async function copyToClipboard({ sourceId, value, buttonId, message } = {}) {
  // ── Get the text to copy ──────────────────────────────────────────────────
  let text = value;

  if (!text && sourceId) {
    const el = document.getElementById(sourceId);
    if (!el) return console.warn(`copyToClipboard: element #${sourceId} not found`);
    // Works for inputs/textareas (value) and regular elements (textContent)
    text = el.value !== undefined && el.tagName !== 'CODE'
      ? el.value
      : el.textContent.trim();
  }

  if (!text) return console.warn('copyToClipboard: nothing to copy');

  // ── Copy to clipboard ─────────────────────────────────────────────────────
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  // ── Visual feedback on button ─────────────────────────────────────────────
  if (buttonId) {
    const btn = document.getElementById(buttonId);
    if (btn) {
      const original = btn.innerHTML;
      btn.innerHTML = '<i class="bi bi-check-lg"></i> Copied!';
      btn.classList.add('btn-success');
      btn.disabled = true;
      setTimeout(() => {
        btn.innerHTML = original;
        btn.classList.remove('btn-success');
        btn.disabled = false;
      }, 2000);
    }
  }

  // ── Toast notification ────────────────────────────────────────────────────
  showToast(message || 'Copied to clipboard!');
}

/**
 * Show a temporary toast notification.
 * Creates and removes its own DOM element.
 */
function showToast(message) {
  // Remove any existing toast
  document.querySelector('.clipboard-toast')?.remove();

  const toast = document.createElement('div');
  toast.className = 'clipboard-toast';
  toast.innerHTML = `<i class="bi bi-check-circle-fill"></i> ${message}`;
  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('clipboard-toast--visible'));

  // Remove after 2.5 seconds
  setTimeout(() => {
    toast.classList.remove('clipboard-toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/**
 * Auto-wire any element with data-copy attribute.
 *
 * EXAMPLE IN HTML:
 *   <button data-copy="https://example.com" data-copy-message="Link copied!">
 *     Copy Link
 *   </button>
 *
 *   <button data-copy-source="kids-link" data-copy-button="copy-btn" id="copy-btn">
 *     Copy
 *   </button>
 */
function wireClipboardButtons() {
  document.querySelectorAll('[data-copy], [data-copy-source]').forEach(el => {
    el.addEventListener('click', () => {
      copyToClipboard({
        value: el.dataset.copy || null,
        sourceId: el.dataset.copySource || null,
        buttonId: el.dataset.copyButton || el.id || null,
        message: el.dataset.copyMessage || 'Copied!',
      });
    });
  });
}

// Auto-wire on DOM ready
document.addEventListener('DOMContentLoaded', wireClipboardButtons);

// Export for manual use
window.copyToClipboard = copyToClipboard;
