import { getShipments } from '../../src/firebase/db.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderNewShipment } from './pages/newShipment.js';
import { renderShipments } from './pages/shipments.js';
import { renderDrivers } from './pages/drivers.js';
import { renderShipmentView } from './pages/shipmentView.js';

const PAGES = {
  'dashboard':     renderDashboard,
  'new-shipment':  renderNewShipment,
  'shipments':     renderShipments,
  'drivers':       renderDrivers,
  'shipment-view': renderShipmentView,
};

export function navigate(page, params = {}) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
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

export function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

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

export async function updateBadges() {
  try {
    const shipments = await getShipments(100);
    const badge = document.getElementById('badge-shipments');
    if (badge) badge.textContent = shipments.length || '0';
  } catch(e) {}
}

export async function initApp() {
  await updateBadges();
  navigate('dashboard');
}

window.navigate = navigate;
window.updateBadges = updateBadges;
