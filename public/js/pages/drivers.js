import { db } from '../../../src/firebase/config.js';
import { getDocs, collection } from 'firebase/firestore';

export async function renderDrivers(container) {
  container.innerHTML = `
    <div class="topbar">
      <div>
        <div class="topbar-title">👤 السائقون</div>
        <div class="topbar-sub">قاعدة بيانات السائقين وتاريخ مركباتهم</div>
      </div>
    </div>
    <div class="page-body">
      <div class="card">
        <div id="drivers-list"><div class="loader"><div class="spinner"></div></div></div>
      </div>
    </div>`;

  const snap = await getDocs(collection(db, 'drivers'));
  const drivers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const list = document.getElementById('drivers-list');

  if (drivers.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">👤</div><div class="empty-title">لا يوجد سائقون بعد</div><div class="empty-sub">يُضافون تلقائياً عند إنشاء أول شحنة</div></div>`;
    return;
  }

  list.innerHTML = `
    <div class="ship-list">
      ${drivers.map(d => {
        const vehicles = d.vehicles || [];
        const latest   = vehicles[vehicles.length - 1] || {};
        return `
          <div class="ship-item" style="align-items:flex-start;padding:16px 18px;">
            <div class="user-avatar" style="margin-top:2px;">${d.name?.charAt(0) || '؟'}</div>
            <div style="flex:1;">
              <div class="ship-no">${d.name}</div>
              <div class="ship-drv">
                ${d.nationality || ''} &nbsp;|&nbsp;
                جواز: ${d.passport_country || '—'} &nbsp;|&nbsp;
                آخر لوحة: <strong>${latest.plate || '—'}</strong> (${latest.vehicle_type || '—'})
              </div>
              ${vehicles.length > 1 ? `
                <div style="margin-top:8px;">
                  <div style="font-size:11px;color:var(--muted);margin-bottom:4px;">تاريخ المركبات:</div>
                  ${vehicles.map(v => `
                    <span style="display:inline-block;background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:2px 8px;font-size:11px;margin-left:4px;margin-bottom:4px;">
                      ${v.plate} — ${v.vehicle_type} (${v.added_at?.substring(0,10) || ''})
                    </span>
                  `).join('')}
                </div>
              ` : ''}
            </div>
            <span class="pill" style="background:var(--green-light);color:var(--green);">${vehicles.length} مركبة</span>
          </div>`;
      }).join('')}
    </div>`;
}
