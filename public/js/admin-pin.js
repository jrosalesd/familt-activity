// ─────────────────────────────────────────────────────────────────────────────
// Admin PIN pad — context-aware for both child and parent PIN pads
// Replaces the old single-context adminPin functions in app.js
// ─────────────────────────────────────────────────────────────────────────────

// State per context — 'child' and 'parent' are independent
const adminPinState = {
  child:  { digits: [], length: 4 },
  parent: { digits: [], length: 4 },
};

// Map context → DOM element IDs (must match pin-pad.ejs partial)
const adminPinIds = {
  child: {
    display:  'child-pin-display',
    hint:     'child-pin-hint',
    ok:       'child-pin-ok',
    value:    'child-pin-value',
    length:   'child-pin-length',
  },
  parent: {
    display:  'parent-pin-display',
    hint:     'parent-pin-hint',
    ok:       'parent-pin-ok',
    value:    'parent-pin-value',
    length:   'parent-pin-length',
  },
};

function setAdminPinLength(length, context = 'child') {
  const state = adminPinState[context];
  const ids   = adminPinIds[context];


  if (!state || !ids) return;

  state.length = length;
  state.digits = [];

  
  // Update active length button for this context only
  document.querySelectorAll(`.pin-length-btn[data-context="${context}"]`).forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.length) === length);
  });

  // Update hidden length input
  const lenInput = document.getElementById(ids.length);
  if (lenInput) lenInput.value = length;

  // Clear pin value and disable ok
  const pinInput = document.getElementById(ids.value);
  if (pinInput) pinInput.value = '';

  const okBtn = document.getElementById(ids.ok);
  if (okBtn) { okBtn.disabled = true; okBtn.style.opacity = '0.4'; }

  // Update hint
  const hint = document.getElementById(ids.hint);
  if (hint) hint.textContent = `Enter a ${length}-digit PIN`;

  _updateAdminPinDisplay(context);
}

function addAdminPin(digit, context = 'child') {
  const state = adminPinState[context];
  const ids   = adminPinIds[context];
  if (!state || !ids) return;
  if (state.digits.length >= state.length) return;

  state.digits.push(String(digit));
  _updateAdminPinDisplay(context);

  if (state.digits.length === state.length) {
    const pinInput = document.getElementById(ids.value);
    if (pinInput) pinInput.value = state.digits.join('');
    const okBtn = document.getElementById(ids.ok);
    if (okBtn) { okBtn.disabled = false; okBtn.style.opacity = '1'; }
  }
}

function clearAdminPin(context = 'child') {
  const state = adminPinState[context];
  const ids   = adminPinIds[context];
  if (!state || !ids) return;

  state.digits.pop();

  const pinInput = document.getElementById(ids.value);
  if (pinInput) pinInput.value = '';

  const okBtn = document.getElementById(ids.ok);
  if (okBtn) { okBtn.disabled = true; okBtn.style.opacity = '0.4'; }

  _updateAdminPinDisplay(context);
}

function _updateAdminPinDisplay(context) {
  const state   = adminPinState[context];
  const ids     = adminPinIds[context];
  const display = document.getElementById(ids.display);
  if (!display) return;

  display.innerHTML = Array.from({ length: state.length }, (_, i) => {
    const filled = i < state.digits.length ? 'filled' : '';
    return `<span class="pin-dot ${filled}" style="width:14px;height:14px"></span>`;
  }).join('');
}

function toggleQuickAccessPin() {
  const section = document.getElementById('qa-pin-section');
  const btn     = document.getElementById('qa-toggle-btn');
  if (!section) return;

  const isVisible = section.style.display !== 'none';
  section.style.display = isVisible ? 'none' : 'block';

  if (btn) {
    btn.innerHTML = isVisible
      ? '<i class="bi bi-shield-lock"></i> Add Quick Access PIN'
      : '<i class="bi bi-shield-lock-fill"></i> Hide PIN Setup';
  }

  if (!isVisible) {
    // Section just became visible — build dots now
    _updateAdminPinDisplay('parent');  // ← ADD
  } else {
    // Reset when hiding
    adminPinState.parent.digits = [];
    const pinInput = document.getElementById(adminPinIds.parent.value);
    if (pinInput) pinInput.value = '';
    const okBtn = document.getElementById(adminPinIds.parent.ok);
    if (okBtn) { okBtn.disabled = true; okBtn.style.opacity = '0.4'; }
  }
}

// Initialise both contexts on page load
document.addEventListener('DOMContentLoaded', () => {
  ['child', 'parent'].forEach(context => {
    const lenInput = document.getElementById(adminPinIds[context].length);
    if (lenInput) {
      adminPinState[context].length = parseInt(lenInput.value) || 4;
      _updateAdminPinDisplay(context);
    }
  });
});

document.addEventListener('keydown', (e) => {
  // Only activate when a PIN section is visible
  const childVisible  = document.getElementById('pin-fields')?.style.display  !== 'none';
  const parentVisible = document.getElementById('qa-pin-section')?.style.display !== 'none';
  if (!childVisible && !parentVisible) return;

  // Determine active context
  const context = parentVisible ? 'parent' : 'child';

  if (e.key >= '0' && e.key <= '9') {
    addAdminPin(e.key, context);
  } else if (e.key === 'Backspace') {
    e.preventDefault();
    clearAdminPin(context);
  } else if (e.key === 'Enter') {
    const state = adminPinState[context];
    if (state.digits.length === state.length) {
      document.getElementById(adminPinIds[context].ok)?.click();
    }
  } else if (e.key === 'Escape') {
    if (parentVisible) toggleQuickAccessPin();
  }
});
