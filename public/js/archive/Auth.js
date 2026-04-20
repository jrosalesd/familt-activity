/**
 * Auth.js - Login, PIN pad, and Password visibility
 */

let pinDigits = [];
let selectedId = null;
let pinSubmitting = false;
let pinLength = 4;

function togglePassword() {
    const field = document.getElementById('password-field');
    const icon = document.getElementById('toggle-icon');
    if (!field || !icon) return;
    const isHidden = field.type === 'password';
    field.type = isHidden ? 'text' : 'password';
    icon.className = isHidden ? 'bi bi-eye-slash' : 'bi bi-eye';
}

function selectChild(id, name, length = 4) {
    selectedId = id;
    pinLength = length;
    pinDigits = [];
    pinSubmitting = false;

    const nameEl = document.getElementById('pin-name');
    if (nameEl) nameEl.textContent = name;

    const hint = document.getElementById('pin-hint');
    if (hint) hint.textContent = `Enter your ${length}-digit PIN`;

    document.getElementById('pin-modal').style.display = 'flex';
    updateDots();
}

function updateDots() {
    const display = document.getElementById('pin-display');
    if (!display) return;

    if (display.children.length !== pinLength) {
        display.innerHTML = Array.from({ length: pinLength }, (_, i) =>
            `<span class="pin-dot" id="dot-${i}"></span>`
        ).join('');
    }

    for (let i = 0; i < pinLength; i++) {
        const dot = document.getElementById(`dot-${i}`);
        if (dot) dot.classList.toggle('filled', i < pinDigits.length);
    }
}

async function submitPin() {
    if (pinDigits.length !== pinLength) return;
    if (pinSubmitting) return;
    pinSubmitting = true;

    try {
        const tokenRes = await fetch(`/csrf-token?t=${Date.now()}`);
        const { token } = await tokenRes.json();

        const formData = new URLSearchParams({
            _csrf: token,
            family_id: document.querySelector('#pin-form [name="family_id"]').value,
            member_id: selectedId,
            pin: pinDigits.join(''),
        });

        const res = await fetch('/login/pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData,
        });
        const data = await res.json();

        if (data.success) {
            window.location.href = data.redirect;
        } else {
            showPinError(data.message);
            pinDigits = [];
            pinSubmitting = false;
            updateDots();
        }
    } catch (err) {
        console.error('PIN submit error:', err);
        pinSubmitting = false;
    }
}

// Global scope bindings for EJS onclick calls
window.selectChild = selectChild;
window.togglePassword = togglePassword;