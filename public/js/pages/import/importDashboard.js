import { getImportShipments, getExpenses, IMPORT_STATUS } from '../../../../src/firebase/importDb.js';
import { navigate } from '../../app.js';

let _shipments = [];
let _expenses  = [];

export async function renderImportDashboard(container) {
  container.innerHTML = `
    <div class="page-body" style="padding:20px 24px;background:#F5F7FA;">
      <div class="modern-page">
        <div class="modern-header">
          <div class="modern-header-brand">
            <div class="modern-header-icon"><i class="ti ti-package-import"></i></div>
            <div>
              <div class="modern-header-title">لوحة تحكم الوارد</div>
              <div class="modern-header-sub">نظرة عامة على الشحنات الواردة</div>
            </div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" onclick="printImportReport()">
              <i class="ti ti-printer"></i> طباعة التقرير
            </button>
            <button class="modern-btn modern-btn-primary" onclick="navigate('import-shipments', {action:'new'})">
              <i class="ti ti-plus"></i> شحنة جديدة
            </button>
          </div>
        </div>
        <div id="import-dash-content"><div class="loader"><div class="spinner"></div></div></div>
      </div>
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
    <div style="padding:18px 24px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px;background:#FAFBFC;border-bottom:1px solid #F0F1F5;">
      <div onclick="navigate('import-shipments')" style="cursor:pointer;">
        <div style="font-size:11px;color:#697386;font-weight:600;letter-spacing:.3px;text-transform:uppercase;">إجمالي الشحنات</div>
        <div style="font-size:26px;font-weight:700;color:#0A2540;margin-top:4px;letter-spacing:-0.5px;">${total}</div>
        <div style="font-size:11px;color:#697386;margin-top:2px;display:flex;align-items:center;gap:4px;"><span style="width:6px;height:6px;border-radius:50%;background:#1C4B8E;"></span> إجمالي</div>
      </div>
      <div onclick="navigate('import-shipments',{filter:'waiting'})" style="cursor:pointer;">
        <div style="font-size:11px;color:#697386;font-weight:600;letter-spacing:.3px;text-transform:uppercase;">قيد الانتظار</div>
        <div style="font-size:26px;font-weight:700;color:#C2410C;margin-top:4px;letter-spacing:-0.5px;">${waiting}</div>
        <div style="font-size:11px;color:#C2410C;margin-top:2px;display:flex;align-items:center;gap:4px;"><span style="width:6px;height:6px;border-radius:50%;background:#C2410C;"></span> بانتظار</div>
      </div>
      <div onclick="navigate('import-shipments',{filter:'clearance'})" style="cursor:pointer;">
        <div style="font-size:11px;color:#697386;font-weight:600;letter-spacing:.3px;text-transform:uppercase;">قيد التخليص</div>
        <div style="font-size:26px;font-weight:700;color:#6366F1;margin-top:4px;letter-spacing:-0.5px;">${clearance}</div>
        <div style="font-size:11px;color:#6366F1;margin-top:2px;display:flex;align-items:center;gap:4px;"><span style="width:6px;height:6px;border-radius:50%;background:#6366F1;"></span> جمركي</div>
      </div>
      <div onclick="navigate('import-shipments',{filter:'delivered'})" style="cursor:pointer;">
        <div style="font-size:11px;color:#697386;font-weight:600;letter-spacing:.3px;text-transform:uppercase;">تم التسليم</div>
        <div style="font-size:26px;font-weight:700;color:#2E8B57;margin-top:4px;letter-spacing:-0.5px;">${delivered}</div>
        <div style="font-size:11px;color:#2E8B57;margin-top:2px;display:flex;align-items:center;gap:4px;"><span style="width:6px;height:6px;border-radius:50%;background:#2E8B57;"></span> مكتمل</div>
      </div>
    </div>

    <div style="padding:18px 24px;display:grid;grid-template-columns:repeat(3,1fr);gap:20px;border-bottom:1px solid #F0F1F5;">
      <div onclick="navigate('import-expenses')" style="cursor:pointer;">
        <div style="font-size:11px;color:#697386;font-weight:600;letter-spacing:.3px;text-transform:uppercase;">إجمالي الفواتير</div>
        <div style="font-size:22px;font-weight:700;color:#0A2540;margin-top:4px;letter-spacing:-0.5px;">${fmt(totalAmount)} <span style="font-size:12px;color:#697386;font-weight:500;">ر.س</span></div>
      </div>
      <div>
        <div style="font-size:11px;color:#697386;font-weight:600;letter-spacing:.3px;text-transform:uppercase;">المدفوع</div>
        <div style="font-size:22px;font-weight:700;color:#2E8B57;margin-top:4px;letter-spacing:-0.5px;">${fmt(paidAmount)} <span style="font-size:12px;color:#697386;font-weight:500;">ر.س</span></div>
      </div>
      <div>
        <div style="font-size:11px;color:#697386;font-weight:600;letter-spacing:.3px;text-transform:uppercase;">المتبقي</div>
        <div style="font-size:22px;font-weight:700;color:#CC2229;margin-top:4px;letter-spacing:-0.5px;">${fmt(unpaidAmount)} <span style="font-size:12px;color:#697386;font-weight:500;">ر.س</span></div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:20px 24px;">
      <!-- This Week -->
      <div style="background:white;border:1px solid #E3E8EE;border-radius:10px;overflow:hidden;">
        <div style="padding:14px 18px;border-bottom:1px solid #F0F1F5;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:12px;font-weight:700;color:#697386;letter-spacing:.5px;text-transform:uppercase;display:flex;align-items:center;gap:8px;">
            <i class="ti ti-calendar-event" style="font-size:14px;color:#1C4B8E;"></i>
            شحنات هذا الأسبوع (ETA)
          </div>
          <span class="modern-badge blue">${thisWeek.length}</span>
        </div>
        <div style="padding:8px 12px;">
          ${thisWeek.length === 0
            ? `<div style="text-align:center;padding:24px;color:#697386;font-size:12px;"><div style="font-size:28px;margin-bottom:4px;">✅</div>لا توجد شحنات هذا الأسبوع</div>`
            : thisWeek.slice(0,5).map(s => {
              const st = IMPORT_STATUS[s.status] || { ar: s.status, class: 'pill-draft' };
              let badgeClass = 'gray';
              if (st.class === 'pill-done') badgeClass = 'green';
              else if (st.class === 'pill-sent') badgeClass = 'blue';
              else if (st.class === 'pill-replied') badgeClass = 'amber';
              return `
              <div onclick="navigate('import-shipments',{open:'${s.id}'})" style="cursor:pointer;padding:10px;border-radius:8px;display:grid;grid-template-columns:1fr auto auto;gap:12px;align-items:center;transition:background .1s;" onmouseover="this.style.background='#FAFBFC'" onmouseout="this.style.background=''">
                <div style="min-width:0;">
                  <div style="font-size:13px;font-weight:600;color:#0A2540;">${s.bl_number||'—'}</div>
                  <div style="font-size:11px;color:#697386;margin-top:2px;">🏢 ${s.customer_name||'—'}</div>
                </div>
                <span style="font-size:11px;color:#697386;">${_formatDate(s.eta)}</span>
                <span class="modern-badge ${badgeClass}">${st.ar}</span>
              </div>`;
            }).join('')}
        </div>
      </div>

      <!-- Overdue -->
      <div style="background:white;border:1px solid #E3E8EE;border-radius:10px;overflow:hidden;">
        <div style="padding:14px 18px;border-bottom:1px solid #F0F1F5;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:12px;font-weight:700;color:#697386;letter-spacing:.5px;text-transform:uppercase;display:flex;align-items:center;gap:8px;">
            <i class="ti ti-alert-triangle" style="font-size:14px;color:#CC2229;"></i>
            شحنات متأخرة
          </div>
          <span class="modern-badge red">${overdue.length}</span>
        </div>
        <div style="padding:8px 12px;">
          ${overdue.length === 0
            ? `<div style="text-align:center;padding:24px;color:#697386;font-size:12px;"><div style="font-size:28px;margin-bottom:4px;">✅</div>لا توجد شحنات متأخرة</div>`
            : overdue.slice(0,5).map(s => {
              const st = IMPORT_STATUS[s.status] || { ar: s.status, class: 'pill-draft' };
              let badgeClass = 'gray';
              if (st.class === 'pill-done') badgeClass = 'green';
              else if (st.class === 'pill-sent') badgeClass = 'blue';
              return `
              <div onclick="navigate('import-shipments',{open:'${s.id}'})" style="cursor:pointer;padding:10px;border-radius:8px;display:grid;grid-template-columns:1fr auto auto;gap:12px;align-items:center;" onmouseover="this.style.background='#FEF2F2'" onmouseout="this.style.background=''">
                <div style="min-width:0;">
                  <div style="font-size:13px;font-weight:600;color:#0A2540;">${s.bl_number||'—'}</div>
                  <div style="font-size:11px;color:#697386;margin-top:2px;">🏢 ${s.customer_name||'—'}</div>
                </div>
                <span style="font-size:11px;color:#CC2229;font-weight:600;">${_formatDate(s.eta)}</span>
                <span class="modern-badge ${badgeClass}">${st.ar}</span>
              </div>`;
            }).join('')}
        </div>
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
