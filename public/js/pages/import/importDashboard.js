import { getImportShipments, getExpenses, IMPORT_STATUS } from '../../../src/firebase/importDb.js';
import { navigate } from '../app.js';

export async function renderImportDashboard(container) {
  container.innerHTML = `
    <div class="topbar">
      <div>
        <div class="topbar-title">📥 لوحة تحكم الوارد</div>
        <div class="topbar-sub">نظرة عامة على الشحنات الواردة</div>
      </div>
      <div class="topbar-actions">
        <button class="btn btn-primary" onclick="navigate('import-shipments', {action:'new'})">
          <i class="ti ti-plus"></i> شحنة جديدة
        </button>
      </div>
    </div>
    <div class="page-body">
      <div id="import-dash-content"><div class="loader"><div class="spinner"></div></div></div>
    </div>`;

  try {
    const [shipments, expenses] = await Promise.all([getImportShipments(), getExpenses()]);
    _render(shipments, expenses);
  } catch(e) {
    document.getElementById('import-dash-content').innerHTML =
      `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">خطأ في تحميل البيانات</div></div>`;
  }
}

function _render(shipments, expenses) {
  const total     = shipments.length;
  const waiting   = shipments.filter(s => s.status === 'waiting').length;
  const clearance = shipments.filter(s => s.status === 'clearance').length;
  const delivered = shipments.filter(s => s.status === 'delivered').length;

  // ETA — this week
  const now   = new Date();
  const week  = new Date(now); week.setDate(week.getDate() + 7);
  const thisWeek = shipments.filter(s => {
    if (!s.eta) return false;
    const d = new Date(s.eta);
    return d >= now && d <= week;
  });

  // Overdue — ETA passed but not delivered
  const overdue = shipments.filter(s => {
    if (!s.eta || s.status === 'delivered') return false;
    return new Date(s.eta) < now;
  });

  // Expenses
  const totalAmount = expenses.reduce((sum, e) =>
    sum + (e.items || []).reduce((s2, i) => s2 + (parseFloat(i.amount) || 0), 0), 0);
  const paidAmount  = expenses.filter(e => e.paid).reduce((sum, e) =>
    sum + (e.items || []).reduce((s2, i) => s2 + (parseFloat(i.amount) || 0), 0), 0);
  const unpaidAmount = totalAmount - paidAmount;

  const fmt = n => n.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  document.getElementById('import-dash-content').innerHTML = `

    <!-- Shipment Stats -->
    <div class="stats-row">
      <div class="stat-card" onclick="navigate('import-shipments')" style="cursor:pointer;">
        <div class="stat-icon si-blue"><i class="ti ti-ship" style="font-size:22px;color:var(--blue)"></i></div>
        <div><div class="stat-num">${total}</div><div class="stat-label">إجمالي الشحنات</div></div>
      </div>
      <div class="stat-card" onclick="navigate('import-shipments',{filter:'waiting'})" style="cursor:pointer;">
        <div class="stat-icon si-amber"><i class="ti ti-clock" style="font-size:22px;color:var(--amber)"></i></div>
        <div><div class="stat-num">${waiting}</div><div class="stat-label">قيد الانتظار</div></div>
      </div>
      <div class="stat-card" onclick="navigate('import-shipments',{filter:'clearance'})" style="cursor:pointer;">
        <div class="stat-icon" style="background:#EEF2FF;"><i class="ti ti-file-check" style="font-size:22px;color:#6366f1"></i></div>
        <div><div class="stat-num">${clearance}</div><div class="stat-label">قيد التخليص</div></div>
      </div>
      <div class="stat-card" onclick="navigate('import-shipments',{filter:'delivered'})" style="cursor:pointer;">
        <div class="stat-icon si-green"><i class="ti ti-circle-check" style="font-size:22px;color:var(--green)"></i></div>
        <div><div class="stat-num">${delivered}</div><div class="stat-label">تم التسليم</div></div>
      </div>
    </div>

    <!-- Expenses Stats -->
    <div class="stats-row" style="margin-top:0;">
      <div class="stat-card" onclick="navigate('import-expenses')" style="cursor:pointer;">
        <div class="stat-icon" style="background:#FFF7ED;"><i class="ti ti-receipt" style="font-size:22px;color:#f97316"></i></div>
        <div><div class="stat-num" style="font-size:18px;">${fmt(totalAmount)}</div><div class="stat-label">إجمالي الفواتير (ر.س)</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon si-green"><i class="ti ti-cash" style="font-size:22px;color:var(--green)"></i></div>
        <div><div class="stat-num" style="font-size:18px;color:var(--green);">${fmt(paidAmount)}</div><div class="stat-label">المدفوع (ر.س)</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon si-red"><i class="ti ti-alert-circle" style="font-size:22px;color:var(--red)"></i></div>
        <div><div class="stat-num" style="font-size:18px;color:var(--red);">${fmt(unpaidAmount)}</div><div class="stat-label">المتبقي (ر.س)</div></div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">

      <!-- This Week -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">📅 شحنات هذا الأسبوع (ETA)</div>
          <span class="pill" style="background:var(--blue-light);color:var(--blue);">${thisWeek.length}</span>
        </div>
        ${thisWeek.length === 0
          ? `<div class="empty-state" style="padding:24px;"><div class="empty-icon" style="font-size:28px;">✅</div><div class="empty-title" style="font-size:13px;">لا توجد شحنات هذا الأسبوع</div></div>`
          : `<div class="ship-list">
              ${thisWeek.slice(0,5).map(s => `
                <div class="ship-item" onclick="navigate('import-shipments',{open:'${s.id}'})" style="cursor:pointer;">
                  <div>
                    <div class="ship-no">${s.bl_number || '—'}</div>
                    <div class="ship-drv">🏢 ${s.customer_name || '—'}</div>
                  </div>
                  <div style="font-size:12px;color:var(--muted);">${_formatDate(s.eta)}</div>
                  <span class="pill ${IMPORT_STATUS[s.status]?.class||'pill-draft'}">${IMPORT_STATUS[s.status]?.ar||s.status}</span>
                </div>`).join('')}
            </div>`}
      </div>

      <!-- Overdue -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">⚠️ شحنات متأخرة</div>
          <span class="pill" style="background:var(--red-light);color:var(--red);">${overdue.length}</span>
        </div>
        ${overdue.length === 0
          ? `<div class="empty-state" style="padding:24px;"><div class="empty-icon" style="font-size:28px;">✅</div><div class="empty-title" style="font-size:13px;">لا توجد شحنات متأخرة</div></div>`
          : `<div class="ship-list">
              ${overdue.slice(0,5).map(s => `
                <div class="ship-item" onclick="navigate('import-shipments',{open:'${s.id}'})" style="cursor:pointer;">
                  <div>
                    <div class="ship-no">${s.bl_number || '—'}</div>
                    <div class="ship-drv">🏢 ${s.customer_name || '—'}</div>
                  </div>
                  <div style="font-size:12px;color:var(--red);font-weight:600;">${_formatDate(s.eta)}</div>
                  <span class="pill ${IMPORT_STATUS[s.status]?.class||'pill-draft'}">${IMPORT_STATUS[s.status]?.ar||s.status}</span>
                </div>`).join('')}
            </div>`}
      </div>

    </div>`;
}

function _formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}
