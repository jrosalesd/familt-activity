// =============================================================================
// kid-login.js — PIN pad logic for kids-picker.ejs
// Loaded only on the kids picker page via this.scripts(res, 'kid-login')
// =============================================================================

const KidLogin = (() => {

  // ─── State ────────────────────────────────────────────────────────────────
  let selectedId    = null;
  let selectedName  = null;
  let pinLength     = 4;
  let pinDigits     = [];
  let isSubmitting  = false;

  // ─── DOM refs ─────────────────────────────────────────────────────────────
  const modal     = () => document.getElementById('pin-modal');
  const display   = () => document.getElementById('pin-display');
  const nameEl    = () => document.getElementById('pin-name');
  const hintEl    = () => document.getElementById('pin-hint');
  const familyId  = () => document.querySelector('#pin-form [name="family_id"]')?.value;

  // ─── Public: open modal for a child ───────────────────────────────────────
  function selectChild(id, name, length = 4) {
    selectedId   = id;
    selectedName = name;
    pinLength    = parseInt(length) || 4;
    pinDigits    = [];
    isSubmitting = false;

    // Update name in header
    const el = nameEl();
    if (el) el.textContent = name;

    // Update hint
    const hint = hintEl();
    if (hint) hint.textContent = `Enter your ${pinLength}-digit PIN`;

    // Clear any previous error
    _clearError();

    // Build dots for this child's PIN length
    _buildDots();

    // Show modal
    modal().style.display = 'flex';
  }

  // ─── Public: close modal ──────────────────────────────────────────────────
  function closePin() {
    modal().style.display = 'none';
    pinDigits    = [];
    selectedId   = null;
    isSubmitting = false;
    _buildDots();
    _clearError();
  }

  // ─── Public: add a digit ──────────────────────────────────────────────────
  function addPin(digit) {
    if (isSubmitting)              return;
    if (pinDigits.length >= pinLength) return;

    pinDigits.push(String(digit));
    _updateDots();

    if (pinDigits.length === pinLength) {
      setTimeout(_submit, 200);
    }
  }

  // ─── Public: remove last digit ────────────────────────────────────────────
  function clearPin() {
    if (isSubmitting) return;
    pinDigits.pop();
    _updateDots();
  }

  // ─── Public: manually trigger submit (ok button / Enter key) ─────────────
  function submitPin() {
    if (pinDigits.length === pinLength) _submit();
  }

  // ─── Private: build dot elements for current pinLength ───────────────────
  function _buildDots() {
    const el = display();
    if (!el) return;
    el.innerHTML = Array.from({ length: pinLength }, (_, i) =>
      `<span class="pin-dot" id="dot-${i}"></span>`
    ).join('');
  }

  // ─── Private: toggle filled class on existing dots ────────────────────────
  function _updateDots() {
    for (let i = 0; i < pinLength; i++) {
      const dot = document.getElementById(`dot-${i}`);
      if (dot) dot.classList.toggle('filled', i < pinDigits.length);
    }
  }

  // ─── Private: submit PIN via fetch ────────────────────────────────────────
  async function _submit() {
    if (isSubmitting || pinDigits.length !== pinLength) return;
    isSubmitting = true;

    try {
      // Always fetch a fresh CSRF token — prevents stale token after session rotate
      const tokenRes  = await fetch(`/csrf-token?t=${Date.now()}`);
      const { token } = await tokenRes.json();

      const body = new URLSearchParams({
        _csrf:     token,
        family_id: familyId(),
        member_id: selectedId,
        pin:       pinDigits.join(''),
      });

      const res  = await fetch('/login/pin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });

      const data = await res.json();

      if (data.success) {
        window.location.href = data.redirect;
      } else {
        _showError(data.message);
        pinDigits    = [];
        isSubmitting = false;
        _updateDots();
      }

    } catch (err) {
      console.error('[KidLogin] submit error:', err);
      _showError('Something went wrong. Please try again.');
      pinDigits    = [];
      isSubmitting = false;
      _updateDots();
    }
  }

  // ─── Private: show error below PIN pad ────────────────────────────────────
  function _showError(message) {
    _clearError();
    const el         = document.createElement('p');
    el.id            = 'pin-error';
    el.textContent   = message;
    el.style.cssText = [
      'text-align:center',
      'color:#e74c3c',
      'font-size:0.88rem',
      'font-weight:600',
      'margin-top:0.75rem',
      'animation:fadeIn 0.2s ease',
    ].join(';');

    const pad = document.querySelector('#pin-modal .pin-pad');
    if (pad) pad.insertAdjacentElement('afterend', el);

    // Auto-clear after 3s
    setTimeout(_clearError, 3000);
  }

  function _clearError() {
    document.getElementById('pin-error')?.remove();
  }

  // ─── Keyboard support ─────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (!modal() || modal().style.display === 'none') return;
    if (isSubmitting) return;

    if (e.key >= '0' && e.key <= '9') {
      addPin(e.key);
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault(); // prevent browser back navigation
      clearPin();
    } else if (e.key === 'Enter') {
      submitPin();
    } else if (e.key === 'Escape') {
      closePin();
    }
  });

  // ─── Click outside modal to close ─────────────────────────────────────────
  document.addEventListener('click', (e) => {
    if (e.target === modal()) closePin();
  });

  // ─── Expose public API ────────────────────────────────────────────────────
  return { selectChild, closePin, addPin, clearPin, submitPin };

})();

// Expose to global scope so inline onclick attributes work
window.selectChild = KidLogin.selectChild;
window.closePin    = KidLogin.closePin;
window.addPin      = KidLogin.addPin;
window.clearPin    = KidLogin.clearPin;
window.submitPin   = KidLogin.submitPin;