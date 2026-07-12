import { db } from '../../src/firebase/config.js';
import { getShipments } from '../../src/firebase/db.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderNewShipment } from './pages/newShipment.js';
import { renderShipments } from './pages/shipments.js';
import { renderDrivers } from './pages/drivers.js';

// ─────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────
const PAGES = {
  'dashboard':    renderDashboard,
  'new-shipment': renderNewShipment,
  'shipments':    renderShipments,
  'drivers':      renderDrivers,
};

export function navigate(page, params = {}) {
  // Update nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // Load page
  const container = document.getElementById('page-container');
  container.innerHTML = '<div class="loader"><div class="spinner"></div></div>';

  const renderer = PAGES[page];
  if (renderer) {
    renderer(container, params);
  } else {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">صفحة غير موجودة</div></div>';
  }

  window._currentPage = page;
}

// ─────────────────────────────────────────────
// TOAST NOTIFICATIONS
// ─────────────────────────────────────────────
export function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ─────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────
export function showModal(title, content, actions = []) {
  const overlay = document.getElementById('modal-overlay');
  const box = document.getElementById('modal-box');
  const actionsHtml = actions.map(a =>
    `<button class="btn ${a.class || 'btn-ghost'}" onclick="${a.onclick}">${a.label}</button>`
  ).join('');
  box.innerHTML = `
    <div class="modal-title">${title}</div>
    <div class="modal-body">${content}</div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
      ${actionsHtml}
    </div>`;
  overlay.classList.remove('hidden');
}

export function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}
window.closeModal = closeModal;

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
export async function initApp() {
  // Load badge counts
  try {
    const shipments = await getShipments(100);
    const pending = shipments.filter(s => s.status === 'draft' || s.status === 'sent_broker').length;
    const badge = document.getElementById('badge-shipments');
    if (badge) badge.textContent = shipments.length;
  } catch(e) { console.warn('Badge load failed', e); }

  // Navigate to dashboard on load
  navigate('dashboard');
}

// Global navigate so HTML onclick works
window.navigate = navigate;
