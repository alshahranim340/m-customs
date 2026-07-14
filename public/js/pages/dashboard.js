import { getShipments } from '../../../src/firebase/db.js';
import { navigate } from '../app.js';

const STATUS_LABELS = {
  draft:         { ar: 'مسودة',         class: 'pill-draft' },
  sent_broker:   { ar: 'أُرسل للمخلص',  class: 'pill-sent' },
  broker_replied:{ ar: 'رد المخلص',      class: 'pill-replied' },
  sent_driver:   { ar: 'أُرسل للسائق',   class: 'pill-done' },
  done:          { ar: 'مكتمل ✓',        class: 'pill-done' },
};

const DEST_FLAGS = { uae: '🇦🇪', bahrain: '🇧🇭', oman: '🇴🇲' };

export async function renderDashboard(container) {
  let shipments = [];
  try { shipments = await getShipments(100); } catch(e) {}

  const total    = shipments.length;
  const sent     = shipments.filter(s => ['sent_broker','broker_replied','sent_driver','done'].includes(s.status)).length;
  const pending  = shipments.filter(s => ['draft','sent_broker'].includes(s.status)).length;
  const recent   = shipments.slice(0, 8);

  container.innerHTML = `
    <!-- Topbar -->
    <div class="topbar">
      <div>
        <div class="topbar-title">لوحة التحكم</div>
        <div class="topbar-sub">نظرة عامة على عمليات التخليص</div>
      </div>
      <div class="topbar-actions">
        <button class="btn btn-primary" onclick="navigate('new-shipment')"><i class="ti ti-plus"></i> شحنة جديدة</button>
      </div>
    </div>

    <div class="page-body">

      <!-- Stats -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon si-blue"><i class="ti ti-truck" style="font-size:22px;color:var(--blue)"></i></div>
          <div><div class="stat-num">${total}</div><div class="stat-label">إجمالي الشحنات</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon si-green"><i class="ti ti-circle-check" style="font-size:22px;color:var(--green)"></i></div>
          <div><div class="stat-num">${sent}</div><div class="stat-label">أُرسلت للمخلص</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon si-amber"><i class="ti ti-clock" style="font-size:22px;color:var(--amber)"></i></div>
          <div><div class="stat-num">${pending}</div><div class="stat-label">قيد التجهيز</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon si-red"><i class="ti ti-flag" style="font-size:22px;color:var(--red)"></i></div>
          <div><div class="stat-num">${shipments.filter(s=>s.destination==='uae').length}</div><div class="stat-label">شحنات الإمارات</div></div>
        </div>
      </div>

      <!-- Flow -->
      <div class="card" style="margin-bottom:16px;">
        <div class="card-header">
          <div class="card-title">تدفق العمل — من البيانات إلى السائق</div>
        </div>
        <div style="display:flex; overflow-x:auto; padding:16px;">
          ${[
            {n:'١', icon:'📝', lbl:'تعبئة البيانات',    sub:'يدوي'},
            {n:'٢', icon:'🖨️', lbl:'توليد الفورمات',   sub:'PDF تلقائي'},
            {n:'٣', icon:'📎', lbl:'رفع المرفقات',      sub:'٦ ملفات'},
            {n:'٤', icon:'📦', lbl:'دمج PDF',           sub:'ملف واحد'},
            {n:'٥', icon:'📤', lbl:'إرسال المخلص 🇦🇪',  sub:'واتساب/إيميل'},
            {n:'٦', icon:'📩', lbl:'رد المخلص',         sub:'PDF جاهز'},
            {n:'٧', icon:'📤', lbl:'إرسال السائق',      sub:'+ موعد'},
          ].map((s,i) => `
            <div style="flex:1;min-width:90px;text-align:center;padding:10px 6px;border-left:1px solid var(--border);">
              <div style="width:26px;height:26px;border-radius:50%;background:${i<2?'var(--green)':i===2?'var(--gold)':'var(--navy)'};color:white;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;">${s.n}</div>
              <div style="font-size:18px;margin-bottom:4px;">${s.icon}</div>
              <div style="font-size:11px;font-weight:600;color:var(--navy);">${s.lbl}</div>
              <div style="font-size:10px;color:var(--muted);margin-top:2px;">${s.sub}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Recent Shipments -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">📋 آخر الشحنات</div>
          <button class="btn btn-ghost btn-sm" onclick="navigate('shipments')">عرض الكل</button>
        </div>
        ${recent.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">📭</div>
            <div class="empty-title">لا توجد شحنات بعد</div>
            <div class="empty-sub">ابدأ بإنشاء أول شحنة</div>
            <br>
            <button class="btn btn-primary" onclick="navigate('new-shipment')"><i class="ti ti-plus"></i> شحنة جديدة</button>
          </div>
        ` : `
          <div class="ship-list">
            ${recent.map(s => `
              <div class="ship-item" onclick="navigate('shipments', {open:'${s.id}'})">
                <div>
                  <div class="ship-no">بيان #${s.declaration_no || '—'}</div>
                  <div class="ship-drv">👤 ${s.driver_snapshot?.name || '—'}</div>
                </div>
                <div class="ship-plate">${s.driver_snapshot?.plate || '—'}</div>
                <div class="ship-dest">${DEST_FLAGS[s.destination] || '🚛'} ${s.destination === 'uae' ? 'إمارات' : s.destination === 'bahrain' ? 'بحرين' : 'عُمان'}</div>
                <span class="pill ${STATUS_LABELS[s.status]?.class || 'pill-draft'}">${STATUS_LABELS[s.status]?.ar || s.status}</span>
                <div class="ship-actions">
                  <div class="icon-btn" title="فتح">📄</div>
                  <div class="icon-btn" title="إرسال">📤</div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

    </div>`;
}
