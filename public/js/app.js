// ─────────────────────────────────────────────────────────────────────────────
// app.js — global application scripts
// ─────────────────────────────────────────────────────────────────────────────

// ─── CSRF: auto-inject current token into every form on submit ────────────────
document.addEventListener('submit', (e) => {
  const csrfInput = e.target.querySelector('input[name="_csrf"]');
  if (!csrfInput) return;
  const metaToken = document.querySelector('meta[name="csrf-token"]')?.content;
  if (metaToken) csrfInput.value = metaToken;
}, true); // capture phase — fires before the form submits


document.addEventListener('DOMContentLoaded', () => {

  // ── Auto-dismiss flash messages ─────────────────────────────────────────────
  document.querySelectorAll('.flash').forEach(el => {
    setTimeout(() => {
      el.style.transition = 'opacity 0.4s';
      el.style.opacity    = '0';
      setTimeout(() => el.remove(), 400);
    }, 4000);
  });

  // ── Confirm delete modal (admin layout) ─────────────────────────────────────
  const confirmModal = document.getElementById('confirm-modal');
  if (confirmModal) {
    document.getElementById('confirm-ok').addEventListener('click', () => {
      if (window._confirmForm) window._confirmForm.submit();
    });
    confirmModal.addEventListener('click', function(e) {
      if (e.target === this) closeConfirm();
    });
  }

  // ── Member form: role toggle (create & edit pages) ──────────────────────────
  const roleSelect = document.getElementById('role-select');
  if (roleSelect) {
    roleSelect.addEventListener('change', toggleMemberFields);
    toggleMemberFields();
  }

  const isTemporary = document.getElementById('is_temporary');
  if (isTemporary) {
    isTemporary.addEventListener('change', toggleExpiry);
    toggleExpiry();
  }

  // ── Password visibility toggle ───────────────────────────────────────────────
  const togglePasswordBtn = document.querySelector('.toggle-password');
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', togglePassword);
  }

  // ── Family home modals (home.ejs) ────────────────────────────────────────────
  if (document.querySelector('.two-doors')) {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', e => {
        if (e.target === modal) closeModals();
      });
    });
  }

});


// ─────────────────────────────────────────────────────────────────────────────
// Confirm delete modal
// ─────────────────────────────────────────────────────────────────────────────

window._confirmForm = null;

function confirmDelete(form, name) {
  window._confirmForm = form;
  document.getElementById('confirm-title').textContent   = `Remove ${name}?`;
  document.getElementById('confirm-message').textContent = `This will deactivate ${name}'s account. This action can be undone by an admin.`;
  document.getElementById('confirm-modal').style.display = 'flex';
}

function closeConfirm() {
  document.getElementById('confirm-modal').style.display = 'none';
  window._confirmForm = null;
}


// ─────────────────────────────────────────────────────────────────────────────
// Member form: role / PIN / password field toggling
// NOTE: rolesData injected by EJS as:
//   <script>const rolesData = <%- JSON.stringify(roles) %>;</script>
// ─────────────────────────────────────────────────────────────────────────────

function toggleMemberFields() {
  const select = document.getElementById('role-select');
  if (!select) return;
  const option  = select.options[select.selectedIndex];
  const usesPin = option.dataset.usesPin === 'true';
  const role    = typeof rolesData !== 'undefined'
    ? rolesData.find(r => r.value === select.value)
    : null;

  const pinFields      = document.getElementById('pin-fields');
  const passwordFields = document.getElementById('password-fields');
  if (pinFields)      pinFields.style.display      = usesPin ? 'block' : 'none';
  if (passwordFields) passwordFields.style.display = usesPin ? 'none'  : 'block';

  const hint = document.getElementById('role-hint');
  if (hint && role) hint.textContent = role.description || '';
}

function toggleExpiry() {
  const checkbox = document.getElementById('is_temporary');
  const field    = document.getElementById('expiry-field');
  if (checkbox && field) {
    field.style.display = checkbox.checked ? 'block' : 'none';
  }
}

function togglePassword() {
  const field = document.getElementById('password-field');
  const icon  = document.getElementById('toggle-icon');
  if (!field || !icon) return;
  const isHidden = field.type === 'password';
  field.type     = isHidden ? 'text'            : 'password';
  icon.className = isHidden ? 'bi bi-eye-slash' : 'bi bi-eye';
}


// ─────────────────────────────────────────────────────────────────────────────
// Family home modals (home.ejs)
// ─────────────────────────────────────────────────────────────────────────────

function showAdultLogin() {
  closeModals();
  document.getElementById('adult-modal').style.display = 'flex';
}

function showKidsLogin() {
  closeModals();
  document.getElementById('kids-modal').style.display = 'flex';
}

function closeModals() {
  ['adult-modal', 'kids-modal', 'pin-modal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function backToKids() {
  document.getElementById('pin-modal').style.display  = 'none';
  document.getElementById('kids-modal').style.display = 'flex';
  pinDigits = [];
  updateDots();
}

