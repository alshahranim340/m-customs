import { getImportShipments, getExpenses, IMPORT_STATUS } from '../../../../src/firebase/importDb.js';
import { navigate } from '../../app.js';

let _shipments = [];
let _expenses  = [];

export async function renderImportDashboard(container) {
  container.innerHTML = `
    <div class="topbar">
      <div>
        <div class="topbar-title">📥 لوحة تحكم الوارد</div>
        <div class="topbar-sub">نظرة عامة على الشحنات الواردة</div>
      </div>
      <div class="topbar-actions">
        <button class="btn btn-ghost" onclick="printImportReport()">
          <i class="ti ti-printer"></i> طباعة التقرير
        </button>
        <button class="btn btn-primary" onclick="navigate('import-shipments', {action:'new'})">
          <i class="ti ti-plus"></i> شحنة جديدة
        </button>
      </div>
    </div>
    <div class="page-body">
      <div id="import-dash-content"><div class="loader"><div class="spinner"></div></div></div>
    </div>`;

  try {
    [_shipments, _expenses] = await Promise.all([getImportShipments(), getExpenses()]);
    _render(_shipments, _expenses);
  } catch(e) {
    document.getElementById('import-dash-content').innerHTML =
      `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">خطأ في تحميل البيانات</div></div>`;
  }

  window.printImportReport = printImportReport;
}

function _render(shipments, expenses) {
  const total     = shipments.length;
  const waiting   = shipments.filter(s => s.status === 'waiting').length;
  const clearance = shipments.filter(s => s.status === 'clearance').length;
  const delivered = shipments.filter(s => s.status === 'delivered').length;

  const now  = new Date();
  const week = new Date(now); week.setDate(week.getDate() + 7);
  const thisWeek = shipments.filter(s => {
    if (!s.eta) return false;
    const d = new Date(s.eta);
    return d >= now && d <= week;
  });
  const overdue = shipments.filter(s => {
    if (!s.eta || s.status === 'delivered') return false;
    return new Date(s.eta) < now;
  });

  const totalAmount  = expenses.reduce((sum, e) => sum + _expTotal(e), 0);
  const paidAmount   = expenses.filter(e => e.paid).reduce((sum, e) => sum + _expTotal(e), 0);
  const unpaidAmount = totalAmount - paidAmount;
  const fmt = n => n.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  document.getElementById('import-dash-content').innerHTML = `
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
      <div class="card">
        <div class="card-header">
          <div class="card-title">📅 شحنات هذا الأسبوع (ETA)</div>
          <span class="pill" style="background:var(--blue-light);color:var(--blue);">${thisWeek.length}</span>
        </div>
        ${thisWeek.length === 0
          ? `<div class="empty-state" style="padding:24px;"><div class="empty-icon" style="font-size:28px;">✅</div><div class="empty-title" style="font-size:13px;">لا توجد شحنات هذا الأسبوع</div></div>`
          : `<div class="ship-list">${thisWeek.slice(0,5).map(s => `
              <div class="ship-item" onclick="navigate('import-shipments',{open:'${s.id}'})" style="cursor:pointer;">
                <div><div class="ship-no">${s.bl_number||'—'}</div><div class="ship-drv">🏢 ${s.customer_name||'—'}</div></div>
                <div style="font-size:12px;color:var(--muted);">${_formatDate(s.eta)}</div>
                <span class="pill ${IMPORT_STATUS[s.status]?.class||'pill-draft'}">${IMPORT_STATUS[s.status]?.ar||s.status}</span>
              </div>`).join('')}</div>`}
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">⚠️ شحنات متأخرة</div>
          <span class="pill" style="background:var(--red-light);color:var(--red);">${overdue.length}</span>
        </div>
        ${overdue.length === 0
          ? `<div class="empty-state" style="padding:24px;"><div class="empty-icon" style="font-size:28px;">✅</div><div class="empty-title" style="font-size:13px;">لا توجد شحنات متأخرة</div></div>`
          : `<div class="ship-list">${overdue.slice(0,5).map(s => `
              <div class="ship-item" onclick="navigate('import-shipments',{open:'${s.id}'})" style="cursor:pointer;">
                <div><div class="ship-no">${s.bl_number||'—'}</div><div class="ship-drv">🏢 ${s.customer_name||'—'}</div></div>
                <div style="font-size:12px;color:var(--red);font-weight:600;">${_formatDate(s.eta)}</div>
                <span class="pill ${IMPORT_STATUS[s.status]?.class||'pill-draft'}">${IMPORT_STATUS[s.status]?.ar||s.status}</span>
              </div>`).join('')}</div>`}
      </div>
    </div>`;
}

// ─────────────────────────────────────────────
// PRINT REPORT
// ─────────────────────────────────────────────
function printImportReport() {
  const now       = new Date().toLocaleDateString('ar-SA', { year:'numeric', month:'long', day:'numeric' });
  const total     = _shipments.length;
  const waiting   = _shipments.filter(s => s.status === 'waiting').length;
  const clearance = _shipments.filter(s => s.status === 'clearance').length;
  const delivered = _shipments.filter(s => s.status === 'delivered').length;

  const overdue = _shipments.filter(s => {
    if (!s.eta || s.status === 'delivered') return false;
    return new Date(s.eta) < new Date();
  });

  const totalAmount  = _expenses.reduce((sum, e) => sum + _expTotal(e), 0);
  const paidAmount   = _expenses.filter(e => e.paid).reduce((sum, e) => sum + _expTotal(e), 0);
  const unpaidAmount = totalAmount - paidAmount;
  const fmt = n => n.toLocaleString('ar-SA', { minimumFractionDigits: 2 });

  // Group by type
  const byType = { sea:0, air:0, land:0 };
  _shipments.forEach(s => { if (byType[s.type] !== undefined) byType[s.type]++; });

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>تقرير الوارد</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Tajawal',sans-serif; direction:rtl; color:#1C2D4E; background:white; padding:32px; }
        .header { display:flex; justify-content:space-between; align-items:flex-start;
          margin-bottom:24px; padding-bottom:16px; border-bottom:3px solid #1C2D4E; }
        .co-name { font-size:16px; font-weight:800; }
        .co-sub  { font-size:11px; color:#5a7090; margin-top:3px; }
        .report-title { font-size:22px; font-weight:800; text-align:center; margin-bottom:20px; }
        .date { font-size:12px; color:#5a7090; text-align:left; }

        .stats4 { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:16px; }
        .stats3 { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:20px; }
        .stat { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; text-align:center; }
        .stat-num { font-size:26px; font-weight:800; }
        .stat-lbl { font-size:11px; color:#5a7090; margin-top:3px; }

        .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; }
        .box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px; }
        .box-title { font-size:12px; font-weight:700; color:#5a7090; margin-bottom:8px; }
        .box-row { display:flex; justify-content:space-between; padding:5px 0;
          border-bottom:0.5px solid #e2e8f0; font-size:13px; }
        .box-row:last-child { border:none; }
        .box-val { font-weight:700; }

        .section-title { font-size:14px; font-weight:800; margin:20px 0 10px;
          padding-bottom:6px; border-bottom:1px solid #e2e8f0; }
        table { width:100%; border-collapse:collapse; font-size:12px; }
        thead tr { background:#1C2D4E; color:white; }
        th { padding:9px 12px; text-align:right; font-weight:600; }
        td { padding:9px 12px; border-bottom:0.5px solid #e2e8f0; }
        tr:nth-child(even) td { background:#f8fafc; }
        .pill { display:inline-block; padding:2px 9px; border-radius:12px; font-size:11px; font-weight:700; }
        .p-wait { background:#fef3c7; color:#92400e; }
        .p-clear { background:#ede9fe; color:#5b21b6; }
        .p-done  { background:#dcfce7; color:#166534; }
        .footer { margin-top:32px; text-align:center; font-size:11px; color:#5a7090;
          border-top:1px solid #e2e8f0; padding-top:12px; }
        @media print { body { padding:16px; } @page { margin:1cm; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="co-name">شركة عبدالرحمن عبدالعزيز السديس للخدمات اللوجستية</div>
          <div class="co-sub">ABDULRAHMAN ABDULAZIZ AL-SUDAIS LOGISTICS SERVICES CO.</div>
        </div>
        <div class="date"><div>تاريخ التقرير</div><div style="font-weight:700;margin-top:4px;">${now}</div></div>
      </div>

      <div class="report-title">📥 تقرير قسم الوارد</div>

      <!-- شحنات -->
      <div class="stats4">
        <div class="stat"><div class="stat-num">${total}</div><div class="stat-lbl">إجمالي الشحنات</div></div>
        <div class="stat"><div class="stat-num" style="color:#92400e;">${waiting}</div><div class="stat-lbl">قيد الانتظار</div></div>
        <div class="stat"><div class="stat-num" style="color:#5b21b6;">${clearance}</div><div class="stat-lbl">قيد التخليص</div></div>
        <div class="stat"><div class="stat-num" style="color:#166534;">${delivered}</div><div class="stat-lbl">تم التسليم</div></div>
      </div>

      <!-- مالية -->
      <div class="stats3">
        <div class="stat"><div class="stat-num">${fmt(totalAmount)}</div><div class="stat-lbl">إجمالي الفواتير (ر.س)</div></div>
        <div class="stat"><div class="stat-num" style="color:#166534;">${fmt(paidAmount)}</div><div class="stat-lbl">المدفوع (ر.س)</div></div>
        <div class="stat"><div class="stat-num" style="color:#b91c1c;">${fmt(unpaidAmount)}</div><div class="stat-lbl">المتبقي (ر.س)</div></div>
      </div>

      <div class="grid2">
        <div class="box">
          <div class="box-title">🚢 توزيع نوع الشحنات</div>
          <div class="box-row"><span>🚢 بحري</span><span class="box-val">${byType.sea}</span></div>
          <div class="box-row"><span>✈️ جوي</span><span class="box-val">${byType.air}</span></div>
          <div class="box-row"><span>🚛 بري</span><span class="box-val">${byType.land}</span></div>
        </div>
        <div class="box">
          <div class="box-title">⚠️ شحنات متأخرة</div>
          ${overdue.length === 0
            ? `<div style="text-align:center;color:#166534;padding:12px;font-size:13px;">✅ لا توجد شحنات متأخرة</div>`
            : overdue.map(s => `
              <div class="box-row">
                <span style="font-weight:700;">${s.bl_number||'—'}</span>
                <span style="color:#b91c1c;font-size:12px;">${_formatDate(s.eta)}</span>
              </div>`).join('')}
        </div>
      </div>

      <!-- جدول الشحنات -->
      <div class="section-title">📋 قائمة الشحنات</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>رقم البوليصة</th>
            <th>الرقم الداخلي</th>
            <th>العميل</th>
            <th>النوع</th>
            <th>ETA</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${_shipments.map((s, i) => {
            const typeIcon = s.type === 'air' ? '✈️' : s.type === 'sea' ? '🚢' : '🚛';
            const pillClass = s.status === 'delivered' ? 'p-done' : s.status === 'clearance' ? 'p-clear' : 'p-wait';
            const stAr = IMPORT_STATUS[s.status]?.ar || s.status;
            return `
              <tr>
                <td style="color:#5a7090;">${i+1}</td>
                <td style="font-weight:700;">${s.bl_number||'—'}</td>
                <td style="color:#5a7090;">${s.internal_no||'—'}</td>
                <td>${s.customer_name||'—'}</td>
                <td>${typeIcon}</td>
                <td>${_formatDate(s.eta)}</td>
                <td><span class="pill ${pillClass}">${stAr}</span></td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>

      <div class="footer">M-Customs — نظام التخليص الجمركي &nbsp;|&nbsp; شركة السديس للخدمات اللوجستية</div>
      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `);
  win.document.close();
}

function _expTotal(e) {
  return (e.items || []).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
}

function _formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ar-SA', { year:'numeric', month:'short', day:'numeric' });
}
