/**
 * Core.js - Global utilities for all pages
 */

// CSRF: auto-inject current token into every form on submit
document.addEventListener('submit', (e) => {
    const csrfInput = e.target.querySelector('input[name="_csrf"]');
    if (!csrfInput) return;
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.content;
    if (metaToken) csrfInput.value = metaToken;
}, true);

document.addEventListener('DOMContentLoaded', () => {
    // Auto-dismiss flash messages
    document.querySelectorAll('.flash').forEach(el => {
        setTimeout(() => {
            el.style.transition = 'opacity 0.4s';
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 400);
        }, 4000);
    });
});