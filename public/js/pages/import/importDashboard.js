import { getImportShipments, getExpenses, IMPORT_STATUS } from '../../../../src/firebase/importDb.js';
import { navigate } from '../../app.js';

let _shipments = [];
let _expenses  = [];

export async function renderImportDashboard(container) {
  container.innerHTML = `
    <div class="page-body imp-page" style="padding:20px 24px;background:#F5F3EC;min-height:100vh;font-family:'Tajawal',sans-serif;">
      <div class="modern-page">

        <!-- HEADER -->
        <div class="modern-header">
          <div class="modern-header-brand">
            <div class="modern-header-badges">
              <div class="modern-header-dots">
                <span class="modern-header-dot" style="background:#CC2229;"></span>
                <span class="modern-header-dot" style="background:#1C4B8E;"></span>
                <span class="modern-header-dot" style="background:#2E8B57;"></span>
              </div>
              <span class="modern-header-code">SDS/IMPORT/2026</span>
            </div>
            <div class="modern-header-title">لوحة تحكم الوارد</div>
            <div class="modern-header-sub" id="imp-dash-sub">IMPORT DASHBOARD · OVERVIEW</div>
          </div>
          <div class="modern-header-actions" style="display:flex;gap:8px;">
            <button class="modern-btn" onclick="printImportReport()">
              <i class="ti ti-printer"></i> طباعة
            </button>
            <button class="modern-btn modern-btn-primary" onclick="navigate('import-shipments',{action:'new'})">
              <i class="ti ti-plus"></i> شحنة جديدة
            </button>
          </div>
        </div>

        <!-- CONTENT -->
        <div id="import-dash-content">
          <div class="loader"><div class="spinner"></div></div>
        </div>
      </div>
    </div>`;

  try {
    [_shipments, _expenses] = await Promise.all([getImportShipments(), getExpenses()]);
    _render(_shipments, _expenses);
  } catch(e) {
    document.getElementById('import-dash-content').innerHTML =
      `<div class="modern-empty">
        <div class="modern-empty-icon">⚠️</div>
        <div class="modern-empty-title">خطأ في تحميل البيانات</div>
      </div>`;
  }

  window.printImportReport = printImportReport;
}

function _render(shipments, expenses) {
  const now       = new Date(); now.setHours(0,0,0,0);
  const total     = shipments.length;
  const waiting   = shipments.filter(s => s.status === 'waiting').length;
  const clearance = shipments.filter(s => s.status === 'clearance' || s.status === 'customs').length;
  const delivered = shipments.filter(s => s.status === 'delivered').length;

  const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);
  const thisWeek = shipments.filter(s => {
    if (!s.eta) return false;
    const d = new Date(s.eta); d.setHours(0,0,0,0);
    return d >= now && d <= weekEnd;
  }).sort((a,b) => (a.eta > b.eta ? 1 : -1));

  const overdue = shipments.filter(s => {
    if (!s.eta || s.status === 'delivered') return false;
    const d = new Date(s.eta); d.setHours(0,0,0,0);
    return d < now;
  }).sort((a,b) => (a.eta < b.eta ? 1 : -1));

  const recent = [...shipments]
    .sort((a,b) => (b.created_at?.seconds||0) - (a.created_at?.seconds||0))
    .slice(0, 6);

  // Financial
  const totalAmount  = expenses.reduce((sum, e) => sum + _expTotal(e), 0);
  const paidAmount   = expenses.filter(e => e.paid).reduce((sum, e) => sum + _expTotal(e), 0);
  const unpaidAmount = totalAmount - paidAmount;
  const fmt = n => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const paidPct = totalAmount > 0 ? Math.round(paidAmount / totalAmount * 100) : 0;

  // Update subtitle
  const sub = document.getElementById('imp-dash-sub');
  if (sub) sub.textContent = `${_fmt(now)} · ${total} شحنة`;

  document.getElementById('import-dash-content').innerHTML = `

    <!-- KPI ROW 1: الشحنات -->
    <div class="modern-stats modern-stats-4">
      <div class="modern-stat" onclick="navigate('import-shipments')" style="cursor:pointer;">
        <div class="modern-stat-lbl">01 · TOTAL</div>
        <div class="modern-stat-val">${_pad(total)}</div>
        <div class="modern-stat-hint">إجمالي الشحنات</div>
      </div>
      <div class="modern-stat" onclick="navigate('import-shipments',{filter:'waiting'})" style="cursor:pointer;">
        <div class="modern-stat-lbl">02 · WAITING</div>
        <div class="modern-stat-val amber">${_pad(waiting)}</div>
        <div class="modern-stat-hint">قيد الانتظار</div>
      </div>
      <div class="modern-stat" onclick="navigate('import-shipments',{filter:'clearance'})" style="cursor:pointer;">
        <div class="modern-stat-lbl">03 · CLEARANCE</div>
        <div class="modern-stat-val blue">${_pad(clearance)}</div>
        <div class="modern-stat-hint">قيد التخليص</div>
      </div>
      <div class="modern-stat" onclick="navigate('import-shipments',{filter:'delivered'})" style="cursor:pointer;">
        <div class="modern-stat-lbl">04 · DELIVERED</div>
        <div class="modern-stat-val green">${_pad(delivered)}</div>
        <div class="modern-stat-hint">تم التسليم</div>
      </div>
    </div>

    <!-- KPI ROW 2: المالية -->
    <div class="modern-stats modern-stats-3" style="border-top:0;">
      <div class="modern-stat" onclick="navigate('import-expenses')" style="cursor:pointer;">
        <div class="modern-stat-lbl">05 · INVOICED (SAR)</div>
        <div class="modern-stat-val" style="font-size:28px;">${fmt(totalAmount)}</div>
        <div class="modern-stat-hint">إجمالي الفواتير</div>
      </div>
      <div class="modern-stat">
        <div class="modern-stat-lbl">06 · PAID (SAR)</div>
        <div class="modern-stat-val green" style="font-size:28px;">${fmt(paidAmount)}</div>
        <div style="margin-top:6px;">
          <div style="height:4px;background:#E8E5DC;border-radius:4px;overflow:hidden;">
            <div style="height:100%;width:${paidPct}%;background:#2E8B57;border-radius:4px;transition:width .6s;"></div>
          </div>
          <div style="font-size:10px;color:#2E8B57;font-family:'JetBrains Mono',monospace;font-weight:700;margin-top:3px;">${paidPct}% PAID</div>
        </div>
      </div>
      <div class="modern-stat">
        <div class="modern-stat-lbl">07 · UNPAID (SAR)</div>
        <div class="modern-stat-val danger" style="font-size:28px;">${fmt(unpaidAmount)}</div>
        <div class="modern-stat-hint">${expenses.filter(e=>!e.paid).length} فاتورة معلقة</div>
      </div>
    </div>

    <!-- ALERT BANNER (overdue) -->
    ${overdue.length > 0 ? `
    <div style="background:#FEEBEB;border:1px solid #FCA5A5;border-radius:10px;padding:12px 18px;
                margin-bottom:14px;display:flex;align-items:center;gap:12px;cursor:pointer;"
         onclick="navigate('import-shipments',{filter:'waiting'})">
      <span style="font-size:20px;">⚠️</span>
      <div>
        <div style="font-weight:800;color:#CC2229;font-size:13px;">
          ${overdue.length} شحنة متأخرة — تجاوزت تاريخ الوصول
        </div>
        <div style="font-size:11px;color:#EF4444;font-family:'JetBrains Mono',monospace;margin-top:2px;">
          OVERDUE · REQUIRES ATTENTION
        </div>
      </div>
      <i class="ti ti-chevron-left" style="margin-right:auto;color:#CC2229;"></i>
    </div>` : ''}

    <!-- MAIN GRID: هذا الأسبوع + المتأخرة -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">

      <!-- هذا الأسبوع -->
      <div>
        <div class="modern-section-title">
          → THIS WEEK <div class="divider"></div>
          <span class="count" style="color:#1C4B8E;">${_pad(thisWeek.length)}</span>
        </div>
        <div class="modern-list-box">
          ${thisWeek.length === 0
            ? `<div class="modern-empty" style="padding:28px;">
                <div style="font-size:24px;">📭</div>
                <div style="font-size:12px;margin-top:6px;color:#8A8578;">لا توجد وصولات هذا الأسبوع</div>
              </div>`
            : thisWeek.slice(0,5).map(s => {
                const st = IMPORT_STATUS[s.status] || { ar: s.status };
                const isToday = s.eta && s.eta.startsWith(new Date().toISOString().split('T')[0]);
                return `
                <div class="modern-row" onclick="navigate('import-shipments',{open:'${s.id}'})"
                  style="cursor:pointer;grid-template-columns:3px auto 1fr auto auto;">
                  <div class="modern-row-stripe blue"></div>
                  <div class="modern-row-code" style="min-width:100px;">${s.bl_number||'—'}</div>
                  <div class="modern-row-body">
                    <div class="modern-row-title">${s.customer_name||'—'}</div>
                    <div class="modern-row-sub">${s.consignee||s.job_no||s.internal_no||''}</div>
                  </div>
                  <div style="text-align:left;">
                    <div style="font-family:'JetBrains Mono',monospace;font-size:10px;
                      font-weight:700;color:${isToday?'#CC2229':'#1C4B8E'};">
                      ${isToday?'TODAY':_fmtShort(s.eta)}
                    </div>
                  </div>
                </div>`;
              }).join('')}
        </div>
      </div>

      <!-- المتأخرة -->
      <div>
        <div class="modern-section-title">
          → OVERDUE <div class="divider"></div>
          <span class="count" style="color:#CC2229;">${_pad(overdue.length)}</span>
        </div>
        <div class="modern-list-box">
          ${overdue.length === 0
            ? `<div class="modern-empty" style="padding:28px;">
                <div style="font-size:24px;">✅</div>
                <div style="font-size:12px;margin-top:6px;color:#2E8B57;">لا توجد شحنات متأخرة</div>
              </div>`
            : overdue.slice(0,5).map(s => {
                const diffDays = Math.floor((now - new Date(s.eta)) / 86400000);
                return `
                <div class="modern-row" onclick="navigate('import-shipments',{open:'${s.id}'})"
                  style="cursor:pointer;grid-template-columns:3px auto 1fr auto;">
                  <div class="modern-row-stripe red"></div>
                  <div class="modern-row-code" style="min-width:100px;">${s.bl_number||'—'}</div>
                  <div class="modern-row-body">
                    <div class="modern-row-title">${s.customer_name||'—'}</div>
                    <div class="modern-row-sub" style="color:#CC2229;">⚠ ${_fmtShort(s.eta)}</div>
                  </div>
                  <div style="font-family:'JetBrains Mono',monospace;font-size:10px;
                    color:#CC2229;font-weight:700;white-space:nowrap;">
                    +${diffDays}d
                  </div>
                </div>`;
              }).join('')}
        </div>
      </div>
    </div>

    <!-- أحدث الشحنات -->
    <div>
      <div class="modern-section-title">
        → RECENT SHIPMENTS <div class="divider"></div>
        <span class="count">${_pad(recent.length)}</span>
      </div>
      <div class="modern-list-box">
        ${recent.map(s => {
          const st = IMPORT_STATUS[s.status] || { ar: s.status };
          let stripe = 'gray', badgeCls = 'gray';
          if (s.status==='delivered') { stripe='green'; badgeCls='green'; }
          else if (s.status==='clearance'||s.status==='customs') { stripe='blue'; badgeCls='blue'; }
          else if (s.status==='waiting') { stripe='amber'; badgeCls='amber'; }
          const typeLabel = s.type==='air'?'AIR':s.type==='sea'?'SEA':'LAND';
          return `
          <div class="modern-row" onclick="navigate('import-shipments',{open:'${s.id}'})"
            style="cursor:pointer;grid-template-columns:3px 90px 1fr auto auto auto;">
            <div class="modern-row-stripe ${stripe}"></div>
            <div class="modern-row-code">${s.job_no||s.internal_no||'—'}</div>
            <div class="modern-row-body">
              <div class="modern-row-title">
                ${s.customer_name||'—'}
                <span style="font-family:'JetBrains Mono',monospace;font-size:9px;
                  background:#F0EDE4;color:#4A4540;padding:1px 6px;border-radius:3px;
                  margin-right:6px;font-weight:700;">${typeLabel}</span>
              </div>
              <div class="modern-row-sub">${s.bl_number||'—'}${s.consignee?' · '+s.consignee:''}</div>
            </div>
            <div class="modern-row-date">${_fmtShort(s.eta)}</div>
            <span class="modern-badge ${badgeCls}">${st.ar}</span>
            <i class="ti ti-chevron-left" style="color:#C4B9A8;font-size:14px;"></i>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

// ─────────────────────────────────────────────
// PRINT REPORT (unchanged from original)
// ─────────────────────────────────────────────
function printImportReport() {
  const now       = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
  const total     = _shipments.length;
  const waiting   = _shipments.filter(s => s.status === 'waiting').length;
  const clearance = _shipments.filter(s => s.status === 'clearance' || s.status === 'customs').length;
  const delivered = _shipments.filter(s => s.status === 'delivered').length;
  const overdue   = _shipments.filter(s => s.eta && new Date(s.eta) < new Date() && s.status !== 'delivered');

  const totalAmount  = _expenses.reduce((sum, e) => sum + _expTotal(e), 0);
  const paidAmount   = _expenses.filter(e => e.paid).reduce((sum, e) => sum + _expTotal(e), 0);
  const unpaidAmount = totalAmount - paidAmount;
  const fmt = n => n.toLocaleString('en-US', { minimumFractionDigits: 2 });

  const byType = { sea:0, air:0, land:0 };
  _shipments.forEach(s => { if (byType[s.type] !== undefined) byType[s.type]++; });

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>تقرير قسم الوارد — ${now}</title>
<style>
  body { font-family:'Tajawal',sans-serif;margin:0;padding:32px;color:#0E1A2E;background:#F5F3EC; }
  .header { background:#0E1A2E;color:white;padding:24px 28px;border-radius:12px;margin-bottom:24px; }
  .header h1 { font-size:22px;margin:0 0 4px; }
  .header p { font-size:12px;opacity:.6;margin:0; }
  .kpi-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px; }
  .kpi { background:white;border:1px solid #E8E5DC;border-radius:10px;padding:16px; }
  .kpi-lbl { font-size:9px;font-weight:800;letter-spacing:1.5px;color:#8A8578;margin-bottom:6px; }
  .kpi-val { font-size:28px;font-weight:900;color:#0E1A2E; }
  table { width:100%;border-collapse:collapse;background:white;border-radius:10px;overflow:hidden; }
  th { background:#1C4B8E;color:white;padding:10px 12px;font-size:11px;text-align:right; }
  td { padding:9px 12px;border-bottom:1px solid #F0EDE4;font-size:12px; }
  tr:last-child td { border-bottom:none; }
  .badge { padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700; }
  .g { background:#E7F5EE;color:#1a7a50; } .b { background:#EEF2FF;color:#1C4B8E; }
  .a { background:#FEF3E2;color:#C8943A; } .r { background:#FEEBEB;color:#CC2229; }
  @media print { body { padding:16px; } }
</style>
</head>
<body>
<div class="header">
  <h1>📦 تقرير قسم الوارد — شركة السديس للخدمات اللوجستية</h1>
  <p>التاريخ: ${now} · إجمالي الشحنات: ${total}</p>
</div>
<div class="kpi-grid">
  <div class="kpi"><div class="kpi-lbl">إجمالي الشحنات</div><div class="kpi-val">${_pad(total)}</div></div>
  <div class="kpi"><div class="kpi-lbl">قيد الانتظار</div><div class="kpi-val" style="color:#C8943A">${_pad(waiting)}</div></div>
  <div class="kpi"><div class="kpi-lbl">التخليص الجمركي</div><div class="kpi-val" style="color:#1C4B8E">${_pad(clearance)}</div></div>
  <div class="kpi"><div class="kpi-lbl">تم التسليم</div><div class="kpi-val" style="color:#2E8B57">${_pad(delivered)}</div></div>
  <div class="kpi"><div class="kpi-lbl">بحري</div><div class="kpi-val">${_pad(byType.sea)}</div></div>
  <div class="kpi"><div class="kpi-lbl">جوي</div><div class="kpi-val">${_pad(byType.air)}</div></div>
  <div class="kpi"><div class="kpi-lbl">بري</div><div class="kpi-val">${_pad(byType.land)}</div></div>
  <div class="kpi"><div class="kpi-lbl">إجمالي متأخر</div><div class="kpi-val" style="color:#CC2229">${_pad(overdue.length)}</div></div>
</div>
<table>
  <thead>
    <tr>
      <th>JOB</th><th>BL</th><th>العميل</th><th>النوع</th><th>المنفذ</th>
      <th>ETA</th><th>الحالة</th><th>البيان</th>
    </tr>
  </thead>
  <tbody>
    ${_shipments.map(s => {
      const st = IMPORT_STATUS[s.status] || { ar: s.status };
      let bc = 'a';
      if (s.status==='delivered') bc='g';
      else if (s.status==='clearance'||s.status==='customs') bc='b';
      else if (s.status==='waiting') bc='a';
      return `<tr>
        <td><b>${s.job_no||s.internal_no||'—'}</b></td>
        <td style="font-family:monospace;font-size:11px;">${s.bl_number||'—'}</td>
        <td>${s.customer_name||'—'}</td>
        <td>${(s.type||'').toUpperCase()}</td>
        <td>${s.port||'—'}</td>
        <td>${s.eta||'—'}</td>
        <td><span class="badge ${bc}">${st.ar}</span></td>
        <td>${s.customs_no||'—'}</td>
      </tr>`;
    }).join('')}
  </tbody>
</table>
<br>
<table>
  <thead><tr><th colspan="4" style="background:#2E8B57;">الملخص المالي (SAR)</th></tr>
    <tr><th>إجمالي</th><th>مدفوع</th><th>غير مدفوع</th><th>نسبة السداد</th></tr>
  </thead>
  <tbody><tr>
    <td>${fmt(totalAmount)}</td>
    <td style="color:#2E8B57;font-weight:700;">${fmt(paidAmount)}</td>
    <td style="color:#CC2229;font-weight:700;">${fmt(unpaidAmount)}</td>
    <td>${totalAmount>0?Math.round(paidAmount/totalAmount*100):0}%</td>
  </tr></tbody>
</table>
</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 800);
}

/* ── Helpers ── */
function _pad(n)     { return String(n).padStart(2, '0'); }
function _expTotal(e){ return (e.fees||[]).reduce((s,f)=>s+(parseFloat(f.amount)||0),0); }
function _fmt(d)     { if(!d)return'—'; return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' }); }
function _fmtShort(d){ if(!d)return'—'; return new Date(d).toLocaleDateString('en-GB',{month:'short',day:'numeric'}); }
