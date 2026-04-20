/**
 * Admin.js - Member management and Delete Modals
 */

window._confirmForm = null;

function confirmDelete(form, name) {
    window._confirmForm = form;
    document.getElementById('confirm-title').textContent = `Remove ${name}?`;
    document.getElementById('confirm-modal').style.display = 'flex';
}

function toggleMemberFields() {
    const select = document.getElementById('role-select');
    if (!select) return;
    const option = select.options[select.selectedIndex];
    const usesPin = option.dataset.usesPin === 'true';

    const pinFields = document.getElementById('pin-fields');
    const passwordFields = document.getElementById('password-fields');

    if (pinFields) pinFields.style.display = usesPin ? 'block' : 'none';
    if (passwordFields) passwordFields.style.display = usesPin ? 'none' : 'block';
}

function toggleExpiry() {
    const checkbox = document.getElementById('is_temporary');
    const field = document.getElementById('expiry-field');
    if (checkbox && field) {
        field.style.display = checkbox.checked ? 'block' : 'none';
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    const roleSelect = document.getElementById('role-select');
    if (roleSelect) {
        roleSelect.addEventListener('change', toggleMemberFields);
        toggleMemberFields();
    }
});

window.confirmDelete = confirmDelete;