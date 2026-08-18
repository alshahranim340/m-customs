// ══════════════════════════════════════════════════════════════
// COMMAND PALETTE — Ctrl+K / Cmd+K global search & actions
// Design: SDS navy/gold theme · Cairo + JetBrains Mono
// ══════════════════════════════════════════════════════════════

import { getShipments } from '../../src/firebase/db.js';
import { getAllDrivers } from '../../src/firebase/db.js';
import { getTransportRequests } from '../../src/firebase/transportDb.js';

let _shipments = [];
let _drivers = [];
let _requests = [];
let _navigate = null;
let _selectedIndex = 0;
let _currentResults = [];
let _loaded = false;
let _isOpen = false;

// ─────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────
export function initCommandPalette(navigateFn) {
  _navigate = navigateFn;

  // Global keyboard listener
  document.addEventListener('keydown', (e) => {
    // Ctrl+K or Cmd+K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openPalette();
      return;
    }
    // Escape to close
    if (e.key === 'Escape' && _isOpen) {
      e.preventDefault();
      closePalette();
      return;
    }
    if (_isOpen) {
      if (e.key === 'ArrowDown') { e.preventDefault(); moveSelection(1); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); moveSelection(-1); }
      if (e.key === 'Enter')     { e.preventDefault(); executeSelected(); }
    }
  });
}

// Expose to window for the floating search button
window._openCommandPalette = () => openPalette();

// ─────────────────────────────────────────────────
// DATA LOADING (cached)
// ─────────────────────────────────────────────────
async function loadDataIfNeeded() {
  if (_loaded) return;
  try {
    const [ships, drvs, reqs] = await Promise.all([
      getShipments(500).catch(() => []),
      getAllDrivers().catch(() => []),
      getTransportRequests(200).catch(() => [])
    ]);
    _shipments = ships;
    _drivers = drvs;
    _requests = reqs;
    _loaded = true;
  } catch (e) {
    console.error('Command palette: failed to load data', e);
  }
}

// Force reload (e.g. after user creates something new)
export function reloadCommandPaletteData() {
  _loaded = false;
}

// ─────────────────────────────────────────────────
// SEARCH
// ─────────────────────────────────────────────────
function normalize(s) {
  return String(s || '').toLowerCase().trim()
    // Normalize Arabic: alef variants, hamza, ta marbuta, ya variants
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي');
}

function matches(haystack, needle) {
  if (!needle) return true;
  return normalize(haystack).includes(normalize(needle));
}

// Quick actions (always shown, filter by query)
const QUICK_ACTIONS = [
  { icon: 'ti-package',       label: 'دفعة نقل جديدة',    en: 'New batch',        keywords: 'batch bulk دفعة جديدة',    action: () => { _navigate('transport-requests'); setTimeout(() => window._openBatchModal?.(), 200); } },
  { icon: 'ti-plus',          label: 'صف نقل جديد',       en: 'New transport row',keywords: 'new row transport طلب',    action: () => { _navigate('transport-requests'); setTimeout(() => window._addRow?.(), 200); } },
  { icon: 'ti-file-plus',     label: 'شحنة جديدة',        en: 'New shipment',     keywords: 'new shipment shipments',  action: () => _navigate('new-shipment') },
  { icon: 'ti-chart-bar',     label: 'التقارير',           en: 'Reports',          keywords: 'reports تقارير report',    action: () => { _navigate('transport-requests'); setTimeout(() => window._openReports?.(), 200); } },
  { icon: 'ti-truck',         label: 'طلبات النقل',        en: 'Transport requests', keywords: 'transport requests نقل', action: () => _navigate('transport-requests') },
  { icon: 'ti-clipboard-list',label: 'سجل الشحنات',        en: 'Shipments ledger', keywords: 'shipments ledger سجل',    action: () => _navigate('shipments-ledger') },
  { icon: 'ti-users',         label: 'السائقون',           en: 'Drivers',          keywords: 'drivers سائقين',           action: () => _navigate('drivers') },
  { icon: 'ti-layout-dashboard', label: 'لوحة التحكم',     en: 'Dashboard',        keywords: 'dashboard لوحة home',      action: () => _navigate('dashboard') },
  { icon: 'ti-settings',      label: 'إدارة القوائم',      en: 'Transport settings',keywords: 'settings dropdowns',      action: () => _navigate('transport-settings') },
];

function search(query) {
  const q = normalize(query);
  const results = [];

  // 1) Quick actions (highest priority when matched)
  QUICK_ACTIONS.forEach(a => {
    if (!q || matches(a.label + ' ' + a.en + ' ' + a.keywords, q)) {
      results.push({ type: 'action', ...a });
    }
  });

  if (q) {
    // 2) Shipments (search declaration_no, exporter, driver_snapshot.name, plate)
    _shipments.forEach(s => {
      const driverName = s.driver_snapshot?.name || '';
      const plate = s.driver_snapshot?.plate || '';
      const haystack = `${s.declaration_no || ''} ${s.exporter || ''} ${driverName} ${plate}`;
      if (matches(haystack, q)) {
        results.push({
          type: 'shipment',
          icon: 'ti-file-invoice',
          title: `#${s.declaration_no || '(بلا رقم)'} · ${s.exporter || '—'}`,
          subtitle: `${driverName || 'بلا سائق'} · ${plate || 'بلا لوحة'}`,
          badge: s.status,
          action: () => _navigate(`shipment/${s.id}`),
        });
      }
    });

    // 3) Drivers
    _drivers.forEach(d => {
      const names = `${d.name_en || ''} ${d.name_ar || ''} ${d.name || ''} ${d.iqama || ''} ${d.truck_number || ''}`;
      if (matches(names, q)) {
        results.push({
          type: 'driver',
          icon: 'ti-user',
          title: d.name_en || d.name_ar || d.name || '(بلا اسم)',
          subtitle: `الإقامة: ${d.iqama || '—'} · الشاحنة: ${d.truck_number || '—'} · ${d.nationality || '—'}`,
          action: () => _navigate('drivers'),
        });
      }
    });

    // 4) Transport requests
    _requests.forEach(r => {
      const haystack = `${r.customer || ''} ${r.driver_name || ''} ${r.truck_number || ''} ${r.delivery_number || ''}`;
      if (matches(haystack, q)) {
        results.push({
          type: 'request',
          icon: 'ti-truck-delivery',
          title: `${r.customer || '(بلا عميل)'} · ${r.driver_name || '(بلا سائق)'}`,
          subtitle: `شاحنة: ${r.truck_number || '—'} · كمية: ${r.quantity || 0}T · بوليصة: ${r.delivery_number || '—'}`,
          badge: r.status,
          action: () => _navigate('transport-requests'),
        });
      }
    });
  }

  // Cap results
  return results.slice(0, 40);
}

// ─────────────────────────────────────────────────
// UI RENDERING
// ─────────────────────────────────────────────────
function badgeColor(status) {
  const map = {
    draft:     { bg: '#F0EDE4', color: '#6B6659', text: 'DRAFT' },
    sent:      { bg: '#DBE9F7', color: '#1C4B8E', text: 'SENT' },
    converted: { bg: '#FEF6E7', color: '#8B6914', text: 'CONVERTED' },
    done:      { bg: '#E7F5EE', color: '#0F6338', text: 'DONE' },
    replied:   { bg: '#E7F5EE', color: '#0F6338', text: 'REPLIED' },
  };
  return map[status?.toLowerCase()] || { bg: '#F0EDE4', color: '#6B6659', text: (status || '').toUpperCase() };
}

function typeLabel(type) {
  return { action: 'إجراء', shipment: 'شحنة', driver: 'سائق', request: 'طلب نقل' }[type] || type;
}

async function openPalette() {
  if (_isOpen) return;
  _isOpen = true;
  _selectedIndex = 0;

  // Remove any stale palette
  document.getElementById('cp-root')?.remove();

  const root = document.createElement('div');
  root.id = 'cp-root';
  root.style.cssText = `
    position:fixed; inset:0; z-index:99999;
    background:rgba(14,26,46,0.55); backdrop-filter:blur(4px);
    display:flex; align-items:flex-start; justify-content:center;
    padding-top:12vh; font-family:'Tajawal',sans-serif;
    animation:cpFadeIn 0.15s ease-out;
  `;

  root.innerHTML = `
    <style>
      @keyframes cpFadeIn { from { opacity:0; } to { opacity:1; } }
      @keyframes cpSlideIn { from { transform:translateY(-12px); opacity:0; } to { transform:translateY(0); opacity:1; } }
      #cp-panel { animation: cpSlideIn 0.2s ease-out; }
      #cp-panel input::placeholder { color:#8A8578; opacity:1; }
      .cp-item { cursor:pointer; padding:12px 16px; display:flex; align-items:center; gap:12px; border-radius:6px; transition:background 0.08s; }
      .cp-item:hover, .cp-item.cp-sel { background:#F5F3EC; }
      .cp-item.cp-sel { box-shadow: inset 3px 0 0 #D4B266; }
      .cp-item .cp-icon-wrap { width:32px; height:32px; border-radius:6px; background:#F5F3EC; display:flex; align-items:center; justify-content:center; color:#0E1A2E; font-size:16px; flex-shrink:0; }
      .cp-item.cp-sel .cp-icon-wrap { background:#0E1A2E; color:#D4B266; }
      .cp-section-header {
        font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:2px;
        color:#8A8578; font-weight:800; padding:14px 16px 6px; text-transform:uppercase;
      }
      .cp-kbd {
        display:inline-block; padding:2px 6px; border:1px solid #E8E5DC; border-radius:4px;
        font-family:'JetBrains Mono',monospace; font-size:10px; color:#6B6659; background:white;
        line-height:1.2;
      }
    </style>

    <div id="cp-panel" style="
      background:#FEFCF3; border-radius:12px; width:100%; max-width:640px;
      max-height:70vh; display:flex; flex-direction:column;
      box-shadow: 0 20px 80px rgba(14,26,46,0.4), 0 0 0 1px rgba(212,178,102,0.3);
      overflow:hidden;
    ">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#0E1A2E 0%,#1C2B48 100%); padding:16px 20px; color:white;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:32px; height:32px; border-radius:6px; background:#D4B266; display:flex; align-items:center; justify-content:center; color:#0E1A2E; font-size:18px;">
            <i class="ti ti-search"></i>
          </div>
          <input id="cp-input" type="text" placeholder="ابحث عن شحنة، سائق، طلب، أو نفّذ إجراء..."
            style="flex:1; background:transparent; border:none; color:white; font-family:Tajawal,sans-serif; font-size:16px; outline:none; direction:rtl;">
          <span class="cp-kbd" style="border-color:rgba(255,255,255,0.2); background:rgba(255,255,255,0.05); color:#D4B266;">ESC</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
          <div style="font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:2px; color:#D4B266; font-weight:700;">
            SDS · COMMAND PALETTE
          </div>
          <div style="font-size:10px; color:#8A8578;">
            <span class="cp-kbd" style="border-color:rgba(255,255,255,0.2); background:rgba(255,255,255,0.05); color:#B8B0A0;">↑↓</span>
            تنقّل ·
            <span class="cp-kbd" style="border-color:rgba(255,255,255,0.2); background:rgba(255,255,255,0.05); color:#B8B0A0;">↵</span>
            اختر
          </div>
        </div>
      </div>

      <!-- Results -->
      <div id="cp-results" style="flex:1; overflow-y:auto; padding:8px;">
        <div style="padding:24px; text-align:center; color:#8A8578;">
          <div style="font-size:24px;">⏳</div>
          <div style="font-size:12px; margin-top:6px;">جاري تحميل البيانات...</div>
        </div>
      </div>

      <!-- Footer -->
      <div style="background:white; border-top:1px solid #E8E5DC; padding:8px 16px; display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#8A8578;">
        <div>
          نتائج: <span id="cp-count" style="font-weight:800; color:#0E1A2E;">0</span>
        </div>
        <div style="display:flex; gap:12px;">
          <span><span class="cp-kbd">Ctrl</span> + <span class="cp-kbd">K</span> للفتح</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(root);

  // Close on backdrop click
  root.addEventListener('mousedown', (e) => {
    if (e.target === root) closePalette();
  });

  // Load data + wire input
  await loadDataIfNeeded();
  renderResults('');

  const input = document.getElementById('cp-input');
  input.focus();
  input.addEventListener('input', (e) => {
    _selectedIndex = 0;
    renderResults(e.target.value);
  });
}

function closePalette() {
  _isOpen = false;
  const root = document.getElementById('cp-root');
  if (root) {
    root.style.opacity = '0';
    setTimeout(() => root.remove(), 100);
  }
}

function renderResults(query) {
  _currentResults = search(query);
  const container = document.getElementById('cp-results');
  const countEl = document.getElementById('cp-count');
  if (!container) return;

  countEl.textContent = _currentResults.length;

  if (_currentResults.length === 0) {
    container.innerHTML = `
      <div style="padding:40px 20px; text-align:center;">
        <div style="font-size:36px; opacity:0.5;">🔍</div>
        <div style="font-size:14px; font-weight:700; color:#0E1A2E; margin-top:12px;">لا نتائج</div>
        <div style="font-size:12px; color:#8A8578; margin-top:4px;">جرّب كلمة أخرى أو ابحث بالعربي/الإنجليزي</div>
      </div>`;
    return;
  }

  // Group by type
  const groups = { action: [], shipment: [], driver: [], request: [] };
  _currentResults.forEach(r => groups[r.type]?.push(r));

  const html = [];
  let flatIdx = 0;

  ['action', 'shipment', 'driver', 'request'].forEach(type => {
    const items = groups[type];
    if (items.length === 0) return;

    html.push(`<div class="cp-section-header">${typeLabel(type)} · ${items.length}</div>`);
    items.forEach((r) => {
      const idx = flatIdx++;
      const badge = r.badge ? (() => {
        const c = badgeColor(r.badge);
        return `<span style="background:${c.bg}; color:${c.color}; padding:2px 8px; border-radius:3px; font-family:'JetBrains Mono',monospace; font-size:9px; font-weight:800; letter-spacing:1px;">${c.text}</span>`;
      })() : '';
      const enLabel = r.en ? `<span style="font-family:'JetBrains Mono',monospace; font-size:10px; color:#8A8578; margin-inline-start:6px;">· ${r.en}</span>` : '';

      html.push(`
        <div class="cp-item ${idx === _selectedIndex ? 'cp-sel' : ''}" data-idx="${idx}">
          <div class="cp-icon-wrap"><i class="ti ${r.icon || 'ti-circle'}"></i></div>
          <div style="flex:1; min-width:0;">
            <div style="font-size:13px; font-weight:700; color:#0E1A2E; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${r.title || r.label}${enLabel}
            </div>
            ${r.subtitle ? `<div style="font-size:11px; color:#6B6659; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; direction:ltr; text-align:right;">${r.subtitle}</div>` : ''}
          </div>
          ${badge}
          ${idx === _selectedIndex ? '<span class="cp-kbd">↵</span>' : ''}
        </div>`);
    });
  });

  container.innerHTML = html.join('');

  // Wire click handlers
  container.querySelectorAll('.cp-item').forEach(el => {
    el.addEventListener('click', () => {
      _selectedIndex = parseInt(el.dataset.idx);
      executeSelected();
    });
    el.addEventListener('mouseenter', () => {
      _selectedIndex = parseInt(el.dataset.idx);
      updateSelectionVisual();
    });
  });
}

function updateSelectionVisual() {
  document.querySelectorAll('.cp-item').forEach(el => {
    const idx = parseInt(el.dataset.idx);
    if (idx === _selectedIndex) {
      el.classList.add('cp-sel');
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else {
      el.classList.remove('cp-sel');
    }
  });
}

function moveSelection(delta) {
  if (_currentResults.length === 0) return;
  _selectedIndex = (_selectedIndex + delta + _currentResults.length) % _currentResults.length;
  renderResults(document.getElementById('cp-input').value);
}

function executeSelected() {
  const r = _currentResults[_selectedIndex];
  if (!r || !r.action) return;
  closePalette();
  setTimeout(() => r.action(), 100);
}
