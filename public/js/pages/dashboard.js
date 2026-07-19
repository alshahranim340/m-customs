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

let _shipments = [];

export async function renderDashboard(container) {
  try { _shipments = await getShipments(200); } catch(e) { _shipments = []; }

  const total   = _shipments.length;
  const sent    = _shipments.filter(s => ['sent_broker','broker_replied','sent_driver','done'].includes(s.status)).length;
  const pending = _shipments.filter(s => ['draft','sent_broker'].includes(s.status)).length;
  const done    = _shipments.filter(s => s.status === 'done').length;
  const recent  = _shipments.slice(0, 8);

  container.innerHTML = `
    <div class="topbar">
      <div>
        <div class="topbar-title">لوحة التحكم — الصادر</div>
        <div class="topbar-sub">نظرة عامة على عمليات التخليص</div>
      </div>
      <div class="topbar-actions">
        <button class="btn btn-ghost" onclick="printExportReport()">
          <i class="ti ti-printer"></i> طباعة التقرير
        </button>
        <button class="btn btn-primary" onclick="navigate('new-shipment')">
          <i class="ti ti-plus"></i> شحنة جديدة
        </button>
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
          <div><div class="stat-num">${done}</div><div class="stat-label">مكتملة</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon si-amber"><i class="ti ti-clock" style="font-size:22px;color:var(--amber)"></i></div>
          <div><div class="stat-num">${pending}</div><div class="stat-label">قيد التجهيز</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon si-red"><i class="ti ti-flag" style="font-size:22px;color:var(--red)"></i></div>
          <div><div class="stat-num">${_shipments.filter(s=>s.destination==='uae').length}</div><div class="stat-label">شحنات الإمارات</div></div>
        </div>
      </div>

      <!-- Flow -->
      <div class="card" style="margin-bottom:16px;">
        <div class="card-header">
          <div class="card-title">تدفق العمل — من البيانات إلى السائق</div>
        </div>
        <div style="display:flex;overflow-x:auto;padding:16px;">
          ${[
            {n:'١', icon:'📝', lbl:'تعبئة البيانات',   sub:'يدوي'},
            {n:'٢', icon:'🖨️', lbl:'توليد الفورمات',  sub:'PDF تلقائي'},
            {n:'٣', icon:'📎', lbl:'رفع المرفقات',     sub:'٦ ملفات'},
            {n:'٤', icon:'📦', lbl:'دمج PDF',          sub:'ملف واحد'},
            {n:'٥', icon:'📤', lbl:'إرسال المخلص 🇦🇪', sub:'واتساب/إيميل'},
            {n:'٦', icon:'📩', lbl:'رد المخلص',        sub:'PDF جاهز'},
            {n:'٧', icon:'📤', lbl:'إرسال السائق',     sub:'+ موعد'},
          ].map((s,i) => `
            <div style="flex:1;min-width:90px;text-align:center;padding:10px 6px;border-left:1px solid var(--border);">
              <div style="width:26px;height:26px;border-radius:50%;
                background:${i<2?'var(--green)':i===2?'var(--gold)':'var(--navy)'};
                color:white;font-size:11px;font-weight:700;display:flex;align-items:center;
                justify-content:center;margin:0 auto 8px;">${s.n}</div>
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
            <div class="empty-sub">ابدأ بإنشاء أول شحنة</div><br>
            <button class="btn btn-primary" onclick="navigate('new-shipment')">
              <i class="ti ti-plus"></i> شحنة جديدة
            </button>
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

  window.printExportReport = printExportReport;
}

// ─────────────────────────────────────────────
// PRINT REPORT
// ─────────────────────────────────────────────
function printExportReport() {
  const now   = new Date().toLocaleDateString('ar-SA', { year:'numeric', month:'long', day:'numeric' });
  const total = _shipments.length;
  const done  = _shipments.filter(s => s.status === 'done').length;
  const pending = _shipments.filter(s => ['draft','sent_broker'].includes(s.status)).length;
  const uae   = _shipments.filter(s => s.destination === 'uae').length;
  const bah   = _shipments.filter(s => s.destination === 'bahrain').length;
  const oman  = _shipments.filter(s => s.destination === 'oman').length;

  const statusCount = {};
  _shipments.forEach(s => {
    const lbl = STATUS_LABELS[s.status]?.ar || s.status;
    statusCount[lbl] = (statusCount[lbl] || 0) + 1;
  });

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>تقرير الصادر</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Tajawal',sans-serif; direction:rtl; color:#1C2D4E; background:white; padding:32px; }
        .header { display:flex; justify-content:space-between; align-items:flex-start;
          margin-bottom:24px; padding-bottom:16px; border-bottom:3px solid #1C2D4E; }
        .co-name { font-size:16px; font-weight:800; color:#1C2D4E; }
        .co-sub  { font-size:11px; color:#5a7090; margin-top:3px; }
        .report-title { font-size:22px; font-weight:800; color:#1C2D4E; text-align:center; margin-bottom:20px; }
        .date { font-size:12px; color:#5a7090; text-align:left; }

        .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }
        .stat  { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px; text-align:center; }
        .stat-num { font-size:30px; font-weight:800; color:#1C2D4E; }
        .stat-lbl { font-size:12px; color:#5a7090; margin-top:3px; }

        .section-title { font-size:14px; font-weight:800; color:#1C2D4E;
          margin:20px 0 10px; padding-bottom:6px; border-bottom:1px solid #e2e8f0; }

        .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; }
        .box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; }
        .box-title { font-size:12px; font-weight:700; color:#5a7090; margin-bottom:10px; }
        .box-row { display:flex; justify-content:space-between; align-items:center;
          padding:6px 0; border-bottom:0.5px solid #e2e8f0; font-size:13px; }
        .box-row:last-child { border:none; }
        .box-val { font-weight:700; color:#1C2D4E; }

        table { width:100%; border-collapse:collapse; font-size:12px; }
        thead tr { background:#1C2D4E; color:white; }
        th { padding:9px 12px; text-align:right; font-weight:600; }
        td { padding:9px 12px; border-bottom:0.5px solid #e2e8f0; }
        tr:nth-child(even) td { background:#f8fafc; }
        .pill { display:inline-block; padding:2px 9px; border-radius:12px; font-size:11px; font-weight:700; }
        .p-draft   { background:#f1f5f9; color:#64748b; }
        .p-sent    { background:#dbeafe; color:#1d4ed8; }
        .p-replied { background:#fef3c7; color:#92400e; }
        .p-done    { background:#dcfce7; color:#166534; }

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
        <div class="date">
          <div>تاريخ التقرير</div>
          <div style="font-weight:700;margin-top:4px;">${now}</div>
        </div>
      </div>

      <div class="report-title">📤 تقرير قسم الصادر</div>

      <!-- Stats -->
      <div class="stats">
        <div class="stat">
          <div class="stat-num">${total}</div>
          <div class="stat-lbl">إجمالي الشحنات</div>
        </div>
        <div class="stat">
          <div class="stat-num" style="color:#166534;">${done}</div>
          <div class="stat-lbl">مكتملة</div>
        </div>
        <div class="stat">
          <div class="stat-num" style="color:#92400e;">${pending}</div>
          <div class="stat-lbl">قيد التجهيز</div>
        </div>
        <div class="stat">
          <div class="stat-num" style="color:#1d4ed8;">${total - done - pending}</div>
          <div class="stat-lbl">قيد المعالجة</div>
        </div>
      </div>

      <div class="grid2">
        <!-- Destinations -->
        <div class="box">
          <div class="box-title">🌍 توزيع الوجهات</div>
          <div class="box-row"><span>🇦🇪 الإمارات</span><span class="box-val">${uae}</span></div>
          <div class="box-row"><span>🇧🇭 البحرين</span><span class="box-val">${bah}</span></div>
          <div class="box-row"><span>🇴🇲 سلطنة عُمان</span><span class="box-val">${oman}</span></div>
        </div>
        <!-- Status breakdown -->
        <div class="box">
          <div class="box-title">📊 توزيع الحالات</div>
          ${Object.entries(statusCount).map(([lbl, cnt]) =>
            `<div class="box-row"><span>${lbl}</span><span class="box-val">${cnt}</span></div>`
          ).join('')}
        </div>
      </div>

      <!-- Shipments table -->
      <div class="section-title">📋 قائمة الشحنات</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>رقم البيان</th>
            <th>المصدّر</th>
            <th>السائق</th>
            <th>اللوحة</th>
            <th>الوجهة</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${_shipments.map((s, i) => {
            const st = STATUS_LABELS[s.status];
            const pillClass = s.status === 'done' ? 'p-done'
              : s.status === 'broker_replied' || s.status === 'sent_driver' ? 'p-replied'
              : s.status === 'sent_broker' ? 'p-sent' : 'p-draft';
            const dest = s.destination === 'uae' ? '🇦🇪 إمارات'
              : s.destination === 'bahrain' ? '🇧🇭 بحرين' : '🇴🇲 عُمان';
            return `
              <tr>
                <td style="color:#5a7090;">${i+1}</td>
                <td style="font-weight:700;">${s.declaration_no || '—'}</td>
                <td>${s.exporter || '—'}</td>
                <td>${s.driver_snapshot?.name || '—'}</td>
                <td style="direction:ltr;">${s.driver_snapshot?.plate || '—'}</td>
                <td>${dest}</td>
                <td><span class="pill ${pillClass}">${st?.ar || s.status}</span></td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>

      <div class="footer">
        M-Customs — نظام التخليص الجمركي &nbsp;|&nbsp; شركة السديس للخدمات اللوجستية
      </div>

      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `);
  win.document.close();
}
