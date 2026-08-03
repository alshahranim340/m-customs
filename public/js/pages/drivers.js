import { db } from '../../../src/firebase/config.js';
import { getDocs, collection } from 'firebase/firestore';

const pad = n => String(n).padStart(2, '0');

export async function renderDrivers(container) {
  container.innerHTML = `
    <div class="page-body" style="padding:20px 24px;background:#F5F3EC;">
      <div class="modern-page">

        <div class="modern-header">
          <div class="modern-header-brand">
            <div class="modern-header-badges">
              <div class="modern-header-dots">
                <span class="modern-header-dot" style="background:#CC2229;"></span>
                <span class="modern-header-dot" style="background:#1C4B8E;"></span>
                <span class="modern-header-dot" style="background:#2E8B57;"></span>
              </div>
              <span class="modern-header-code">SDS/DRIVERS/2026</span>
            </div>
            <div class="modern-header-title">السائقون</div>
            <div class="modern-header-sub" id="drivers-sub">DRIVERS REGISTRY · v2.4</div>
          </div>
        </div>

        <div class="modern-search-bar">
          <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B6659;letter-spacing:1.5px;font-weight:700;">FIND ›</span>
          <div class="modern-search-wrap">
            <i class="ti ti-search modern-search-icon"></i>
            <input type="text" id="driver-search" class="modern-search-input"
              placeholder="driver name · plate number"
              oninput="filterDrivers(this.value)">
          </div>
        </div>

        <div id="drivers-list" style="padding:0 24px 20px;">
          <div class="loader"><div class="spinner"></div></div>
        </div>

      </div>
    </div>`;

  const snap = await getDocs(collection(db, 'drivers'));
  const drivers = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const subEl = document.getElementById('drivers-sub');
  if (subEl) subEl.textContent = `DRIVERS REGISTRY · ${pad(drivers.length)} REGISTERED`;

  window._allDrivers = drivers;
  window.filterDrivers = filterDrivers;
  renderList(drivers);
}

function renderList(drivers) {
  const list = document.getElementById('drivers-list');
  if (!list) return;

  if (drivers.length === 0) {
    list.innerHTML = `
      <div class="modern-empty">
        <div class="modern-empty-icon">👤</div>
        <div class="modern-empty-title">لا يوجد سائقون</div>
        <div class="modern-empty-sub">EMPTY REGISTRY</div>
      </div>`;
    return;
  }

  list.innerHTML = `
    <div class="modern-section-title" style="padding-top:16px;">
      → REGISTERED / السائقون المسجلون
      <div class="divider"></div>
      <span class="count">${pad(drivers.length)} drivers</span>
    </div>
    <div class="modern-list-box">
      ${drivers.map((d, idx) => {
        const vehicles = d.vehicles || [];
        const latest = vehicles[vehicles.length - 1] || {};
        const initial = (d.name || '؟').charAt(0);

        return `
          <div class="modern-row" style="grid-template-columns:auto 70px 1fr auto auto;">
            <div style="width:36px;height:36px;background:#0E1A2E;color:white;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;">${initial}</div>
            <div class="modern-row-code">${pad(idx + 1)}</div>
            <div class="modern-row-body">
              <div class="modern-row-title">
                ${d.name || '—'}
                ${latest.plate ? `<span class="modern-row-plate">${latest.plate}</span>` : ''}
              </div>
              <div class="modern-row-sub">
                ${d.nationality ? `→ ${d.nationality.toUpperCase()}` : ''}
                ${latest.vehicle_type ? ` · ${latest.vehicle_type}` : ''}
                ${d.passport_country ? ` · PASSPORT ${d.passport_country}` : ''}
              </div>
              ${vehicles.length > 1 ? `
                <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">
                  ${vehicles.slice(0, 4).map(v => `
                    <span class="modern-row-plate" style="margin-left:0;">${v.plate}</span>
                  `).join('')}
                  ${vehicles.length > 4 ? `<span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#1C4B8E;font-weight:700;">+${vehicles.length - 4}</span>` : ''}
                </div>
              ` : ''}
            </div>
            <span class="modern-badge blue">${pad(vehicles.length)} PLATE${vehicles.length !== 1 ? 'S' : ''}</span>
            <span class="modern-row-date">—</span>
          </div>`;
      }).join('')}
    </div>`;
}

function filterDrivers(query) {
  const q = (query || '').toLowerCase().trim();
  const drivers = window._allDrivers || [];
  if (!q) { renderList(drivers); return; }

  const filtered = drivers.filter(d => {
    const name = (d.name || '').toLowerCase();
    const plates = (d.vehicles || []).map(v => (v.plate || '').toLowerCase()).join(' ');
    return name.includes(q) || plates.includes(q);
  });
  renderList(filtered);
}
