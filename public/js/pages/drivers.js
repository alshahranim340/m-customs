import { db } from '../../../src/firebase/config.js';
import { getDocs, collection } from 'firebase/firestore';

export async function renderDrivers(container) {
  container.innerHTML = `
    <div class="page-body" style="padding:20px 24px;background:#F5F7FA;">
      <div class="modern-page">

        <!-- Header -->
        <div class="modern-header">
          <div class="modern-header-brand">
            <div class="modern-header-icon"><i class="ti ti-user"></i></div>
            <div>
              <div class="modern-header-title">السائقون</div>
              <div class="modern-header-sub" id="drivers-sub">قاعدة بيانات السائقين وتاريخ مركباتهم</div>
            </div>
          </div>
        </div>

        <!-- Search -->
        <div class="modern-search-bar">
          <div class="modern-search-wrap">
            <i class="ti ti-search modern-search-icon"></i>
            <input type="text" id="driver-search" class="modern-search-input"
              placeholder="ابحث باسم السائق أو رقم اللوحة..."
              oninput="filterDrivers(this.value)">
          </div>
        </div>

        <!-- List -->
        <div id="drivers-list" style="padding:0 24px 20px;">
          <div class="loader"><div class="spinner"></div></div>
        </div>

      </div>
    </div>`;

  const snap = await getDocs(collection(db, 'drivers'));
  const drivers = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const subEl = document.getElementById('drivers-sub');
  if (subEl) subEl.textContent = `${drivers.length} سائق مسجل`;

  window._allDrivers = drivers;
  window.filterDrivers = filterDrivers;
  renderList(drivers);
}

function renderList(drivers) {
  const list = document.getElementById('drivers-list');
  if (!list) return;

  if (drivers.length === 0) {
    list.innerHTML = `
      <div style="text-align:center;padding:40px;background:#FAFBFC;border-radius:10px;">
        <div style="font-size:36px;margin-bottom:8px;">👤</div>
        <div style="font-size:14px;font-weight:600;color:#0A2540;">لا يوجد سائقون</div>
        <div style="font-size:12px;color:#697386;margin-top:4px;">يُضافون تلقائياً عند إنشاء شحنة</div>
      </div>`;
    return;
  }

  list.innerHTML = drivers.map(d => {
    const vehicles = d.vehicles || [];
    const latest   = vehicles[vehicles.length - 1] || {};
    const initial  = (d.name || '؟').charAt(0);

    return `
      <div style="background:white;border:1px solid #E3E8EE;border-radius:10px;padding:14px 16px;margin-bottom:8px;display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;transition:all 0.15s;">
        <div style="width:40px;height:40px;background:linear-gradient(135deg,#1C4B8E,#2E8B57);border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-size:16px;font-weight:700;">
          ${initial}
        </div>
        <div style="min-width:0;">
          <div style="font-size:14px;font-weight:600;color:#0A2540;">${d.name || '—'}</div>
          <div style="font-size:12px;color:#697386;margin-top:3px;display:flex;flex-wrap:wrap;gap:12px;">
            ${d.nationality ? `<span><i class="ti ti-flag" style="font-size:12px;vertical-align:-1px;"></i> ${d.nationality}</span>` : ''}
            ${d.passport_country ? `<span><i class="ti ti-id" style="font-size:12px;vertical-align:-1px;"></i> ${d.passport_country}</span>` : ''}
            ${latest.plate ? `<span><i class="ti ti-car" style="font-size:12px;vertical-align:-1px;"></i> <strong style="color:#0A2540;">${latest.plate}</strong> (${latest.vehicle_type || '—'})</span>` : ''}
          </div>
          ${vehicles.length > 1 ? `
            <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;">
              ${vehicles.slice(0, 4).map(v => `
                <span style="background:#F5F7FA;border:1px solid #E3E8EE;border-radius:6px;padding:3px 8px;font-size:11px;color:#425466;">
                  ${v.plate} · ${v.vehicle_type || '—'}
                </span>
              `).join('')}
              ${vehicles.length > 4 ? `<span style="background:#EFF4FB;color:#1C4B8E;padding:3px 8px;font-size:11px;border-radius:6px;font-weight:600;">+${vehicles.length - 4}</span>` : ''}
            </div>
          ` : ''}
        </div>
        <span class="modern-badge blue">${vehicles.length} مركبة</span>
      </div>`;
  }).join('');
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
