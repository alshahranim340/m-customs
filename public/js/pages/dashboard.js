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

  const uaeCount = _shipments.filter(s=>s.destination==='uae').length;
  const pad = n => String(n).padStart(2, '0');

  container.innerHTML = `
    <div class="page-body" style="padding:20px 24px;background:#F5F3EC;">
      <div class="modern-page">

        <!-- Header -->
        <div class="modern-header">
          <div class="modern-header-brand">
            <div class="modern-header-badges">
              <div class="modern-header-dots">
                <span class="modern-header-dot" style="background:#CC2229;"></span>
                <span class="modern-header-dot" style="background:#1C4B8E;"></span>
                <span class="modern-header-dot" style="background:#2E8B57;"></span>
              </div>
              <span class="modern-header-code">SDS/EXPORT/2026</span>
            </div>
            <div class="modern-header-title">لوحة التحكم — الصادر</div>
            <div class="modern-header-sub">EXPORT DASHBOARD · OVERVIEW · v2.4</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" onclick="printExportReport()">
              <i class="ti ti-printer"></i> طباعة التقرير
            </button>
            <button class="modern-btn modern-btn-primary" onclick="navigate('new-shipment')">
              <i class="ti ti-plus"></i> شحنة جديدة
            </button>
          </div>
        </div>

        <!-- Stats -->
        <div class="modern-stats modern-stats-4">
          <div class="modern-stat">
            <div class="modern-stat-lbl">01 · TOTAL</div>
            <div class="modern-stat-val">${pad(total)}</div>
            <div class="modern-stat-hint">إجمالي الشحنات</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">02 · DONE</div>
            <div class="modern-stat-val green">${pad(done)}</div>
            <div class="modern-stat-hint">مكتملة</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">03 · PENDING</div>
            <div class="modern-stat-val amber">${pad(pending)}</div>
            <div class="modern-stat-hint">قيد التجهيز</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">04 · UAE ●</div>
            <div class="modern-stat-val blue">${pad(uaeCount)}</div>
            <div class="modern-stat-hint">شحنات الإمارات</div>
          </div>
        </div>

        <!-- Recent Shipments -->
        <div class="modern-section">
          <div class="modern-section-title">
            → RECENT / آخر الشحنات
            <div class="divider"></div>
            <button onclick="navigate('shipments')" style="background:none;border:none;color:#1C4B8E;font-family:'JetBrains Mono',monospace;font-size:10px;cursor:pointer;font-weight:700;letter-spacing:1px;">VIEW ALL ›</button>
          </div>
        </div>

        <div class="modern-list">
          ${recent.length === 0 ? `
            <div class="modern-empty">
              <div class="modern-empty-icon">📭</div>
              <div class="modern-empty-title">لا توجد شحنات بعد</div>
              <div class="modern-empty-sub">EMPTY LEDGER</div>
              <button class="modern-btn modern-btn-primary" onclick="navigate('new-shipment')" style="margin-top:12px;">
                <i class="ti ti-plus"></i> شحنة جديدة
              </button>
            </div>
          ` : `
            <div class="modern-list-box">
              ${recent.map(s => {
                const st = STATUS_LABELS[s.status] || { ar: s.status, class: 'pill-draft' };
                let badgeClass = 'gray', stripeClass = 'gray', stKey = 'DRAFT';
                if (st.class === 'pill-done') { badgeClass = 'green'; stripeClass = 'green'; stKey = 'DONE'; }
                else if (st.class === 'pill-sent') { badgeClass = 'blue'; stripeClass = 'blue'; stKey = 'SENT'; }
                else if (st.class === 'pill-replied') { badgeClass = 'amber'; stripeClass = 'amber'; stKey = 'REPLIED'; }
                const destCode = s.destination === 'uae' ? 'AE / EMIRATES'
                  : s.destination === 'bahrain' ? 'BH / BAHRAIN'
                  : s.destination === 'oman' ? 'OM / OMAN' : '—';
                const driver = s.driver_snapshot?.name || '';
                const plate = s.driver_snapshot?.plate || '';
                return `
                <div class="modern-row" onclick="navigate('shipments', {open:'${s.id}'})" style="cursor:pointer;grid-template-columns:auto 70px 1fr auto auto;">
                  <div class="modern-row-stripe ${stripeClass}"></div>
                  <div class="modern-row-code">${s.declaration_no || '—'}</div>
                  <div class="modern-row-body">
                    <div class="modern-row-title">
                      ${driver || '<span class="muted">—</span>'}
                      ${plate ? `<span class="modern-row-plate">${plate}</span>` : ''}
                    </div>
                    <div class="modern-row-sub">→ ${destCode}</div>
                  </div>
                  <span class="modern-badge ${badgeClass}">${stKey}</span>
                  <span class="modern-row-date">${s.date || '—'}</span>
                </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

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
