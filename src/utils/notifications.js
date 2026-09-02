/**
 * notifications.js — M-Customs
 * نظام التنبيهات اليومية عبر Brevo
 * المسار: src/utils/notifications.js
 */

import { getImportShipments } from '../firebase/importDb.js';

// ── Brevo Config ──────────────────────────────
const BREVO_API_KEY = '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';
const BREVO_SENDER  = { name: 'sudais', email: 'alshahranimohammed34@gmail.com' };

const ALERT_DAYS     = 5;
const LAST_ALERT_KEY = 'mcustoms_last_alert_date';

const IMPORT_PORTS_AR = {
  jed_air:'مطار جدة', ruh_air:'مطار الرياض', dmm_air:'مطار الدمام',
  jed_sea:'ميناء جدة الإسلامي', dmm_sea:'ميناء الملك عبدالعزيز الدمام',
  rab_sea:'ميناء رابغ', batha:'منفذ البطحاء', fahd:'جسر الملك فهد',
};
const SHIP_TYPE_AR = { sea:'🚢 بحري', air:'✈️ جوي', land:'🚛 بري' };
const DEST_AR      = { uae:'🇦🇪 الإمارات', bahrain:'🇧🇭 البحرين', oman:'🇴🇲 عُمان' };
const STATUS_AR    = {
  waiting:'قيد الانتظار', clearance:'قيد التخليص', delivered:'تم التسليم',
  waiting_broker:'انتظار رد المخلص', appointment:'تحديد موعد',
  sent_broker:'انتظار رد المخلص', broker_replied:'انتظار رد المخلص',
  sent_driver:'تحديد موعد', sent:'انتظار رد المخلص', draft:'مسودة',
};

// ─────────────────────────────────────────────
// HTML Template — النموذج المعتمد
// ─────────────────────────────────────────────
function buildEmailHTML(importAlerts, exportPending, users) {
  const today    = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});
  const dayName  = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'][new Date().getDay()];
  const totalAlerts = importAlerts.length + exportPending.length;

  // ── Import rows ──
  const importRows = importAlerts.map(s => {
    const eta      = s.eta ? new Date(s.eta).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
    const port     = IMPORT_PORTS_AR[s.port] || s.port || '—';
    const type     = SHIP_TYPE_AR[s.type]    || s.type || '—';
    const urgency  = s.daysLeft === 0 ? '#CC2229' : s.daysLeft <= 2 ? '#C8943A' : '#1C4B8E';
    const urgBg    = s.daysLeft === 0 ? '#FEEBEB' : s.daysLeft <= 2 ? '#FEF3E2' : '#EEF2FF';
    const rowBg    = s.daysLeft === 0 ? '#FFF5F5' : 'white';
    const daysText = s.daysLeft === 0 ? '⚡ اليوم!' : s.daysLeft === 1 ? 'غداً' : `${s.daysLeft} أيام`;
    return `
      <tr style="background:${rowBg};">
        <td style="padding:10px 12px;font-family:'Courier New',monospace;font-size:12px;font-weight:700;color:#0E1A2E;border-bottom:1px solid #F0EDE4;">${s.bl_number||'—'}</td>
        <td style="padding:10px 12px;font-size:12px;color:#0E1A2E;border-bottom:1px solid #F0EDE4;">${s.customer_name||'—'}</td>
        <td style="padding:10px 12px;font-size:11px;color:#4A4540;border-bottom:1px solid #F0EDE4;">${type}<br><span style="font-size:10px;color:#8A8578;">${port}</span></td>
        <td style="padding:10px 12px;font-family:'Courier New',monospace;font-size:12px;color:#0E1A2E;border-bottom:1px solid #F0EDE4;">${eta}</td>
        <td style="padding:10px 12px;text-align:center;border-bottom:1px solid #F0EDE4;">
          <span style="background:${urgBg};color:${urgency};padding:4px 10px;border-radius:10px;font-size:10px;font-weight:700;">${daysText}</span>
        </td>
      </tr>`;
  }).join('');

  // ── Export rows ──
  const exportRows = exportPending.slice(0,8).map((s,i) => {
    const status  = STATUS_AR[s.status] || s.status || '—';
    const dest    = DEST_AR[s.destination] || s.destination || '—';
    const driver  = s.driver_snapshot?.name_ar || s.driver_snapshot?.name_en || '—';
    const rowBg   = i%2===0 ? 'white' : '#FAFAF7';
    return `
      <tr style="background:${rowBg};">
        <td style="padding:10px 12px;font-family:'Courier New',monospace;font-size:12px;font-weight:700;color:#1C4B8E;border-bottom:1px solid #F0EDE4;">${s.declaration_no||'—'}</td>
        <td style="padding:10px 12px;font-size:12px;color:#0E1A2E;border-bottom:1px solid #F0EDE4;">${s.exporter||'—'}</td>
        <td style="padding:10px 12px;font-size:12px;color:#0E1A2E;border-bottom:1px solid #F0EDE4;">${driver}</td>
        <td style="padding:10px 12px;font-size:11px;border-bottom:1px solid #F0EDE4;">${dest}</td>
        <td style="padding:10px 12px;font-family:'Courier New',monospace;font-size:11px;color:#6B6659;border-bottom:1px solid #F0EDE4;">${s.date||'—'}</td>
        <td style="padding:10px 12px;text-align:center;border-bottom:1px solid #F0EDE4;">
          <span style="background:#FEF3E2;color:#C8943A;padding:3px 8px;border-radius:10px;font-size:9px;font-weight:700;">${status}</span>
        </td>
      </tr>`;
  }).join('');

  const extraExport = exportPending.length > 8
    ? `<tr><td colspan="6" style="padding:10px;text-align:center;color:#8A8578;font-size:11px;font-family:'Courier New',monospace;">+ ${exportPending.length-8} شحنات أخرى</td></tr>`
    : '';

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#E8E5DC;font-family:Tahoma,Arial,sans-serif;">
<div style="max-width:660px;margin:20px auto;background:white;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);">

  <!-- HEADER -->
  <div style="background:linear-gradient(135deg,#0E1A2E 0%,#1C2B48 100%);padding:26px 30px;">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div>
        <div style="font-size:9px;color:#D4B266;letter-spacing:3px;font-weight:700;font-family:'Courier New',monospace;">SDS · M-CUSTOMS · DAILY BRIEF</div>
        <div style="font-size:24px;font-weight:900;color:white;margin-top:6px;">📊 الملخص اليومي</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px;font-family:'Courier New',monospace;">
          ${dayName} ${today} · شركة السديس للخدمات اللوجستية
        </div>
      </div>
      <div style="background:rgba(212,178,102,0.15);border:1px solid rgba(212,178,102,0.3);border-radius:12px;padding:14px 18px;text-align:center;">
        <div style="font-size:9px;color:#D4B266;letter-spacing:1.5px;font-family:'Courier New',monospace;">ALERTS</div>
        <div style="font-size:36px;font-weight:900;color:#D4B266;line-height:1;">${String(totalAlerts).padStart(2,'0')}</div>
        <div style="font-size:9px;color:rgba(255,255,255,0.4);">تحتاج انتباه</div>
      </div>
    </div>
  </div>

  <!-- STATS -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;border-bottom:1px solid #F0EDE4;">
    <div style="padding:14px;text-align:center;border-left:1px solid #F0EDE4;">
      <div style="font-size:9px;color:#8A8578;letter-spacing:1.5px;font-family:'Courier New',monospace;margin-bottom:4px;">وارد · IMPORT</div>
      <div style="font-size:26px;font-weight:900;color:#1C4B8E;">${String(importAlerts.length).padStart(2,'0')}</div>
      <div style="font-size:10px;color:#6B6659;">ETA خلال 5 أيام</div>
    </div>
    <div style="padding:14px;text-align:center;border-left:1px solid #F0EDE4;">
      <div style="font-size:9px;color:#8A8578;letter-spacing:1.5px;font-family:'Courier New',monospace;margin-bottom:4px;">صادر · EXPORT</div>
      <div style="font-size:26px;font-weight:900;color:#2E8B57;">${String(exportPending.length).padStart(2,'0')}</div>
      <div style="font-size:10px;color:#6B6659;">انتظار الموعد</div>
    </div>
    <div style="padding:14px;text-align:center;border-left:1px solid #F0EDE4;">
      <div style="font-size:9px;color:#8A8578;letter-spacing:1.5px;font-family:'Courier New',monospace;margin-bottom:4px;">اليوم · TODAY</div>
      <div style="font-size:26px;font-weight:900;color:#CC2229;">${String(importAlerts.filter(s=>s.daysLeft===0).length).padStart(2,'0')}</div>
      <div style="font-size:10px;color:#6B6659;">وصول اليوم</div>
    </div>
    <div style="padding:14px;text-align:center;">
      <div style="font-size:9px;color:#8A8578;letter-spacing:1.5px;font-family:'Courier New',monospace;margin-bottom:4px;">موظفون · STAFF</div>
      <div style="font-size:26px;font-weight:900;color:#C8943A;">${String(users.length).padStart(2,'0')}</div>
      <div style="font-size:10px;color:#6B6659;">مستلم التنبيه</div>
    </div>
  </div>

  <div style="padding:20px 24px;">

    ${importAlerts.length > 0 ? `
    <!-- IMPORT SECTION -->
    <div style="margin-bottom:22px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:#EEF2FF;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">🚢</div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:900;color:#0E1A2E;">شحنات الوارد — ETA خلال ${ALERT_DAYS} أيام</div>
          <div style="font-size:10px;color:#8A8578;font-family:'Courier New',monospace;">IMPORT · ETA ALERT</div>
        </div>
        <div style="background:#FEEBEB;color:#CC2229;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;">${importAlerts.length} شحنات</div>
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #E8E5DC;border-radius:10px;overflow:hidden;">
        <thead><tr style="background:#1C4B8E;">
          <th style="padding:10px 12px;color:white;font-size:10px;text-align:right;font-family:'Courier New',monospace;">BL / AW</th>
          <th style="padding:10px 12px;color:white;font-size:10px;text-align:right;">العميل</th>
          <th style="padding:10px 12px;color:white;font-size:10px;text-align:right;">النوع / المنفذ</th>
          <th style="padding:10px 12px;color:white;font-size:10px;text-align:right;font-family:'Courier New',monospace;">ETA</th>
          <th style="padding:10px 12px;color:white;font-size:10px;text-align:center;">المتبقي</th>
        </tr></thead>
        <tbody>${importRows}</tbody>
      </table>
    </div>
    <div style="border-top:2px dashed #E8E5DC;margin:18px 0;"></div>` : ''}

    ${exportPending.length > 0 ? `
    <!-- EXPORT SECTION -->
    <div style="margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:#E7F5EE;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">🚛</div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:900;color:#0E1A2E;">شحنات الصادر — انتظار الموعد</div>
          <div style="font-size:10px;color:#8A8578;font-family:'Courier New',monospace;">EXPORT · AWAITING APPOINTMENT</div>
        </div>
        <div style="background:#FEF3E2;color:#C8943A;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;">${exportPending.length} شحنة</div>
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #E8E5DC;border-radius:10px;overflow:hidden;">
        <thead><tr style="background:#2E8B57;">
          <th style="padding:10px 12px;color:white;font-size:10px;text-align:right;font-family:'Courier New',monospace;"># البيان</th>
          <th style="padding:10px 12px;color:white;font-size:10px;text-align:right;">المصدّر</th>
          <th style="padding:10px 12px;color:white;font-size:10px;text-align:right;">السائق</th>
          <th style="padding:10px 12px;color:white;font-size:10px;text-align:right;">الوجهة</th>
          <th style="padding:10px 12px;color:white;font-size:10px;text-align:right;">التاريخ</th>
          <th style="padding:10px 12px;color:white;font-size:10px;text-align:center;">الحالة</th>
        </tr></thead>
        <tbody>${exportRows}${extraExport}</tbody>
      </table>
    </div>` : ''}

    <!-- CTA -->
    <div style="text-align:center;margin:22px 0 6px;">
      <a href="https://m-customs.web.app"
         style="display:inline-block;background:linear-gradient(135deg,#0E1A2E,#1C2B48);
         color:white;padding:13px 36px;border-radius:10px;text-decoration:none;
         font-size:13px;font-weight:700;letter-spacing:0.5px;">
        🔗 فتح النظام — M-Customs
      </a>
    </div>

  </div>

  <!-- FOOTER -->
  <div style="background:#F5F3EC;padding:14px 24px;text-align:center;border-top:1px solid #E8E5DC;">
    <div style="font-size:10px;color:#8A8578;font-family:'Courier New',monospace;letter-spacing:1px;">
      M-CUSTOMS · شركة السديس للخدمات اللوجستية · نظام التخليص الجمركي
    </div>
    <div style="font-size:9px;color:#C4B9A8;margin-top:3px;">
      هذا إيميل تلقائي يُرسل عند الدخول للنظام · لا ترد على هذا الإيميل
    </div>
  </div>

</div>
</body></html>`;
}

// ─────────────────────────────────────────────
// Send via Brevo
// ─────────────────────────────────────────────
async function sendBrevoEmail(toEmails, importAlerts, exportPending, users) {
  const count   = importAlerts.length + exportPending.length;
  const payload = {
    sender:      BREVO_SENDER,
    to:          toEmails.map(email => ({ email })),
    subject:     `📊 الملخص اليومي — ${count} شحنة تحتاج انتباهك`,
    htmlContent: buildEmailHTML(importAlerts, exportPending, users),
  };

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method:  'POST',
    headers: { 'Content-Type':'application/json', 'api-key': BREVO_API_KEY },
    body:    JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo ${res.status}: ${err}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────
// Main: Check & Send
// ─────────────────────────────────────────────
export async function checkAndSendEtaAlerts(exportShipments, users) {
  const today = new Date(); today.setHours(0,0,0,0);

  // Import: ETA within 5 days
  let importShipments = [];
  try { importShipments = await getImportShipments(); } catch(_) {}

  const importAlerts = importShipments
    .filter(s => {
      if (!s.eta || s.status === 'delivered') return false;
      const eta = new Date(s.eta); eta.setHours(0,0,0,0);
      const diff = Math.ceil((eta - today) / 86400000);
      return diff >= 0 && diff <= ALERT_DAYS;
    })
    .map(s => {
      const eta = new Date(s.eta); eta.setHours(0,0,0,0);
      return { ...s, daysLeft: Math.ceil((eta - today) / 86400000) };
    })
    .sort((a,b) => a.daysLeft - b.daysLeft);

  // Export: waiting for appointment
  const NON_DONE = new Set(['draft','sent','sent_broker','broker_replied','sent_driver','waiting_broker','appointment']);
  const exportPending = exportShipments
    .filter(s => NON_DONE.has(s.status))
    .sort((a,b) => (a.date||'') > (b.date||'') ? -1 : 1);

  if (importAlerts.length === 0 && exportPending.length === 0) {
    return { sent: 0, message: 'لا توجد شحنات تحتاج تنبيه' };
  }

  const activeEmails = users
    .filter(u => u.active !== false && u.email && u.email !== 'undefined')
    .map(u => u.email).filter(Boolean);

  if (activeEmails.length === 0) return { sent: 0, message: 'لا يوجد موظفون نشطون' };

  try {
    await sendBrevoEmail(activeEmails, importAlerts, exportPending, users);
    return {
      sent: activeEmails.length,
      message: `تم إرسال الملخص لـ ${activeEmails.length} موظف`
    };
  } catch(e) {
    console.error('[Brevo]', e.message);
    return { sent: 0, message: `خطأ: ${e.message}` };
  }
}

// ─────────────────────────────────────────────
// Auto Alert — مرة واحدة يومياً
// ─────────────────────────────────────────────
export async function autoAlertOnLogin(exportShipments, users) {
  const today    = new Date().toISOString().split('T')[0];
  const lastSent = localStorage.getItem(LAST_ALERT_KEY);
  if (lastSent === today) return;

  try {
    const result = await checkAndSendEtaAlerts(exportShipments, users);
    if (result.sent > 0) {
      localStorage.setItem(LAST_ALERT_KEY, today);
      console.log('[Brevo] ✅', result.message);
    }
  } catch(e) {
    console.error('[Brevo] Auto alert error:', e);
  }
}

// ─────────────────────────────────────────────
// Test Mode — إرسال لإيميل واحد فقط
// ─────────────────────────────────────────────
export async function sendTestAlert(testEmail, exportShipments) {
  let importShipments = [];
  try { importShipments = await getImportShipments(); } catch(_) {}

  const today = new Date(); today.setHours(0,0,0,0);

  let importAlerts = importShipments
    .filter(s => s.eta && s.status !== 'delivered')
    .map(s => {
      const eta = new Date(s.eta); eta.setHours(0,0,0,0);
      return { ...s, daysLeft: Math.ceil((eta - today) / 86400000) };
    })
    .filter(s => s.daysLeft >= 0 && s.daysLeft <= ALERT_DAYS)
    .sort((a,b) => a.daysLeft - b.daysLeft);

  const NON_DONE = new Set(['draft','sent','sent_broker','broker_replied','sent_driver','waiting_broker','appointment']);
  let exportPending = (exportShipments||[]).filter(s => NON_DONE.has(s.status));

  // بيانات تجريبية إذا لا توجد بيانات حقيقية
  if (importAlerts.length === 0) {
    importAlerts = [
      { bl_number:'TEST-IMPORT-001', customer_name:'اختبار — شركة التجربة', type:'sea', port:'jed_sea', eta: new Date(Date.now()+2*86400000).toISOString().slice(0,10), status:'waiting', daysLeft:2 },
      { bl_number:'TEST-IMPORT-002', customer_name:'اختبار — عميل آخر',     type:'air', port:'jed_air', eta: new Date(Date.now()+5*86400000).toISOString().slice(0,10), status:'clearance', daysLeft:5 },
    ];
  }
  if (exportPending.length === 0) {
    exportPending = [
      { declaration_no:'155388', exporter:'شركة إدارة خدمات البيئة', driver_snapshot:{name_ar:'عبدالرحمن شان'}, destination:'uae', date:'1448-03-18', status:'waiting_broker' },
      { declaration_no:'155423', exporter:'شركة إدارة خدمات البيئة', driver_snapshot:{name_ar:'امين كاروت'},     destination:'uae', date:'1448-03-18', status:'sent_broker' },
    ];
  }

  const fakeUsers = [{ email: testEmail }];
  await sendBrevoEmail([testEmail], importAlerts, exportPending, fakeUsers);
  return { sent:1, importCount: importAlerts.length, exportCount: exportPending.length };
}

// ─────────────────────────────────────────────
export function getAlertShipments(shipments) {
  const today = new Date(); today.setHours(0,0,0,0);
  return shipments
    .filter(s => {
      if (!s.eta || s.status==='delivered') return false;
      const eta = new Date(s.eta); eta.setHours(0,0,0,0);
      return Math.ceil((eta-today)/86400000) >= 0;
    })
    .map(s => {
      const eta = new Date(s.eta); eta.setHours(0,0,0,0);
      return { ...s, daysLeft: Math.ceil((eta-today)/86400000) };
    });
}

export { LAST_ALERT_KEY };
