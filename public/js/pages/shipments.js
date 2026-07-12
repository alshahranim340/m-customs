import { getShipments, updateShipment } from '../../../src/firebase/db.js';
import { toast } from '../app.js';

const STATUS = {
  draft:          { ar: 'مسودة',          class: 'pill-draft',   next: 'sent_broker',    nextAr: 'إرسال للمخلص' },
  sent_broker:    { ar: 'أُرسل للمخلص',   class: 'pill-sent',    next: 'broker_replied', nextAr: 'رفع رد المخلص' },
  broker_replied: { ar: 'رد المخلص',       class: 'pill-replied', next: 'sent_driver',    nextAr: 'إرسال للسائق' },
  sent_driver:    { ar: 'أُرسل للسائق',    class: 'pill-done',    next: 'done',           nextAr: 'اكتمل' },
  done:           { ar: 'مكتمل ✓',         class: 'pill-done',    next: null,             nextAr: null },
};

const DEST = { uae: '🇦🇪 إمارات', bahrain: '🇧🇭 بحرين', oman: '🇴🇲 عُمان' };

export async function renderShipments(container) {
  container.innerHTML = `
    <div class="topbar">
      <div>
        <div class="topbar-title">📋 سجل الشحنات</div>
        <div class="topbar-sub">جميع الشحنات المسجلة</div>
      </div>
      <div class="topbar-actions">
        <button class="btn btn-primary" onclick="navigate('new-shipment')">➕ شحنة جديدة</button>
      </div>
    </div>
    <div class="page-body">
      <div class="card">
        <div id="shipments-list"><div class="loader"><div class="spinner"></div></div></div>
      </div>
    </div>`;

  const shipments = await getShipments(100);
  const list = document.getElementById('shipments-list');

  if (shipments.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">لا توجد شحنات</div><br><button class="btn btn-primary" onclick="navigate('new-shipment')">➕ شحنة جديدة</button></div>`;
    return;
  }

  list.innerHTML = `
    <div class="ship-list">
      ${shipments.map(s => `
        <div class="ship-item">
          <div style="flex:1;">
            <div class="ship-no">بيان #${s.declaration_no || '—'}</div>
            <div class="ship-drv">👤 ${s.driver_snapshot?.name || '—'} &nbsp;|&nbsp; ${s.exporter || ''}</div>
          </div>
          <div class="ship-plate">${s.driver_snapshot?.plate || '—'}</div>
          <div class="ship-dest">${DEST[s.destination] || '—'}</div>
          <span class="pill ${STATUS[s.status]?.class || 'pill-draft'}">${STATUS[s.status]?.ar || s.status}</span>
          <div class="ship-actions">
            ${STATUS[s.status]?.next ? `
              <button class="btn btn-sm btn-primary" onclick="advanceStatus('${s.id}','${STATUS[s.status].next}')">
                ${STATUS[s.status].nextAr}
              </button>` : ''}
          </div>
        </div>
      `).join('')}
    </div>`;

  window.advanceStatus = async (id, newStatus) => {
    await updateShipment(id, { status: newStatus });
    toast('✅ تم تحديث الحالة', 'success');
    renderShipments(container);
  };
}
