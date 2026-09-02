/**
 * notifications.js — M-Customs
 * نظام التنبيهات عبر Brevo (بدلاً من EmailJS)
 * المسار: src/utils/notifications.js
 *
 * - يُرسل لجميع الموظفين المسجّلين (admin, employee, supervisor, transport)
 * - Cooldown: مرة واحدة يومياً فقط (localStorage)
 * - 300 إيميل/يوم مجاناً عبر Brevo
 */

// ── Brevo Config ──────────────────────────────
const BREVO_API_KEY = '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';
const BREVO_SENDER  = { name: 'sudais', email: 'alshahranimohammed34@gmail.com' };

// ─────────────────────────────────────────────
const ALERT_DAYS    = 5;
const LAST_ALERT_KEY = 'mcustoms_last_alert_date';

const IMPORT_PORTS_AR = {
  jed_air: 'مطار جدة',   ruh_air: 'مطار الرياض',  dmm_air: 'مطار الدمام',
  jed_sea: 'ميناء جدة الإسلامي', dmm_sea: 'ميناء الملك عبدالعزيز الدمام',
  rab_sea: 'ميناء الملك عبدالله رابغ', batha: 'منفذ البطحاء', fahd: 'جسر الملك فهد',
};

const SHIP_TYPE_AR = { sea: '🚢 بحري', air: '✈️ جوي', land: '🚛 بري' };
const STATUS_AR    = {
  waiting:   'قيد الانتظار',
  clearance: 'قيد التخليص الجمركي',
  delivered: 'تم التسليم',
  customs:   'قيد التخليص الجمركي',
};

// ─────────────────────────────────────────────
// HTML Template احترافي
// ─────────────────────────────────────────────
function buildEmailHTML(shipments) {
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  const rows = shipments.map(s => {
    const eta      = s.eta ? new Date(s.eta).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';
    const port     = IMPORT_PORTS_AR[s.port] || s.port || '—';
    const type     = SHIP_TYPE_AR[s.type] || s.type || '—';
    const status   = STATUS_AR[s.status] || s.status || '—';
    const urgency  = s.daysLeft === 0 ? '#CC2229' : s.daysLeft <= 2 ? '#C8943A' : '#1C4B8E';
    const daysText = s.daysLeft === 0 ? 'اليوم!' : `${s.daysLeft} أيام`;

    return `
      <tr>
        <td style="padding:12px 14px;border-bottom:1px solid #F0EDE4;font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:#0E1A2E;">
          ${s.bl_number || '—'}
        </td>
        <td style="padding:12px 14px;border-bottom:1px solid #F0EDE4;font-size:13px;color:#0E1A2E;">
          ${s.customer_name || '—'}
        </td>
        <td style="padding:12px 14px;border-bottom:1px solid #F0EDE4;font-size:12px;color:#4A4540;">
          ${type}<br><span style="color:#6B6659;font-size:11px;">${port}</span>
        </td>
        <td style="padding:12px 14px;border-bottom:1px solid #F0EDE4;font-size:12px;font-family:'Courier New',monospace;color:#0E1A2E;">
          ${eta}
        </td>
        <td style="padding:12px 14px;border-bottom:1px solid #F0EDE4;text-align:center;">
          <span style="background:${urgency}20;color:${urgency};padding:4px 10px;border-radius:12px;font-size:11px;font-weight:700;">
            ${daysText}
          </span>
        </td>
        <td style="padding:12px 14px;border-bottom:1px solid #F0EDE4;font-size:12px;color:#6B6659;">
          ${status}
        </td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F3EC;font-family:Tajawal,Arial,sans-serif;">

<div style="max-width:680px;margin:20px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0E1A2E 0%,#1C2B48 100%);padding:24px 28px;">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#D4B266;letter-spacing:2px;margin-bottom:6px;">
      SDS / IMPORT / ETA ALERT
    </div>
    <div style="font-size:22px;font-weight:900;color:white;">
      ⚠️ تنبيه ETA — شحنات وارد
    </div>
    <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px;font-family:'Courier New',monospace;">
      ${today} · M-Customs · شركة السديس للخدمات اللوجستية
    </div>
  </div>

  <!-- Alert Banner -->
  <div style="background:#FEF3E2;border-right:4px solid #C8943A;padding:14px 20px;margin:20px;border-radius:8px;">
    <div style="font-weight:800;color:#C8943A;font-size:14px;">
      🔔 ${shipments.length} شحنة تصل خلال ${ALERT_DAYS} أيام أو أقل
    </div>
    <div style="font-size:12px;color:#6B6659;margin-top:3px;">
      يرجى اتخاذ الإجراءات اللازمة لاستكمال التخليص الجمركي
    </div>
  </div>

  <!-- Table -->
  <div style="padding:0 20px 20px;">
    <table style="width:100%;border-collapse:collapse;background:white;border-radius:10px;border:1px solid #E8E5DC;overflow:hidden;">
      <thead>
        <tr style="background:#1C4B8E;">
          <th style="padding:12px 14px;color:white;font-size:11px;text-align:right;font-family:'Courier New',monospace;letter-spacing:0.5px;">BL / AW</th>
          <th style="padding:12px 14px;color:white;font-size:11px;text-align:right;">العميل</th>
          <th style="padding:12px 14px;color:white;font-size:11px;text-align:right;">النوع / المنفذ</th>
          <th style="padding:12px 14px;color:white;font-size:11px;text-align:right;font-family:'Courier New',monospace;">ETA</th>
          <th style="padding:12px 14px;color:white;font-size:11px;text-align:center;">المتبقي</th>
          <th style="padding:12px 14px;color:white;font-size:11px;text-align:right;">الحالة</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <!-- Footer -->
  <div style="background:#F5F3EC;padding:16px 28px;text-align:center;border-top:1px solid #E8E5DC;">
    <div style="font-size:11px;color:#8A8578;font-family:'Courier New',monospace;">
      M-CUSTOMS · شركة السديس للخدمات اللوجستية · نظام التخليص الجمركي
    </div>
    <div style="font-size:10px;color:#C4B9A8;margin-top:4px;">
      هذا إيميل تلقائي من النظام — لا ترد على هذا الإيميل
    </div>
  </div>

</div>
</body></html>`;
}

// ─────────────────────────────────────────────
// SEND VIA BREVO API
// ─────────────────────────────────────────────
async function sendBrevoEmail(toEmails, shipments) {
  const htmlContent = buildEmailHTML(shipments);
  const count = shipments.length;

  const payload = {
    sender: BREVO_SENDER,
    to:     toEmails.map(email => ({ email })),
    subject: `⚠️ تنبيه ETA — ${count} شحنة وارد تحتاج انتباهك`,
    htmlContent,
  };

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key':       BREVO_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo ${res.status}: ${err}`);
  }

  return res.json();
}

// ─────────────────────────────────────────────
// CHECK & SEND — main function
// ─────────────────────────────────────────────
export async function checkAndSendEtaAlerts(shipments, users) {
  const today   = new Date(); today.setHours(0,0,0,0);
  const results = { sent: 0, skipped: 0, errors: [], shipments: 0 };

  const alertShipments = shipments
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

  results.shipments = alertShipments.length;
  if (alertShipments.length === 0) {
    return { ...results, message: 'لا توجد شحنات تحتاج تنبيه' };
  }

  // جميع الموظفين النشطين (admin, employee, supervisor, transport)
  const activeEmails = users
    .filter(u => u.active !== false && u.email && u.email !== 'undefined')
    .map(u => u.email)
    .filter(Boolean);

  if (activeEmails.length === 0) {
    return { ...results, message: 'لا يوجد موظفون نشطون' };
  }

  try {
    // إرسال رسالة واحدة لجميع الموظفين دفعة واحدة
    await sendBrevoEmail(activeEmails, alertShipments);
    results.sent = activeEmails.length;
    results.message = `تم إرسال تنبيه لـ ${activeEmails.length} موظف — ${alertShipments.length} شحنة`;
  } catch(e) {
    console.error('[Brevo] Alert error:', e.message);
    results.errors.push(e.message);
    results.message = `خطأ: ${e.message}`;
  }

  return results;
}

// ─────────────────────────────────────────────
// AUTO ALERT — مرة واحدة يومياً عند الدخول
// ─────────────────────────────────────────────
export async function autoAlertOnLogin(shipments, users) {
  const today    = new Date().toISOString().split('T')[0];
  const lastSent = localStorage.getItem(LAST_ALERT_KEY);

  // Cooldown: لا ترسل إذا أُرسل اليوم بالفعل
  if (lastSent === today) {
    console.log('[Brevo] Alert already sent today — skipping');
    return;
  }

  const alertShips = getAlertShipments(shipments);
  if (alertShips.length === 0) return;

  try {
    const result = await checkAndSendEtaAlerts(shipments, users);
    if (result.sent > 0) {
      localStorage.setItem(LAST_ALERT_KEY, today);
      console.log(`[Brevo] ✅ ${result.message}`);
    }
  } catch(e) {
    console.error('[Brevo] Auto alert error:', e);
  }
}

// ─────────────────────────────────────────────
// GET ALERT SHIPMENTS
// ─────────────────────────────────────────────
export function getAlertShipments(shipments) {
  const today = new Date(); today.setHours(0,0,0,0);
  return shipments
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
}

// ─────────────────────────────────────────────
// TEST MODE — إرسال لإيميل واحد فقط للاختبار
// ─────────────────────────────────────────────
export async function sendTestAlert(testEmail, shipments) {
  let testShipments = getAlertShipments(shipments).slice(0, 3);

  // إذا لا توجد شحنات حقيقية — أنشئ بيانات تجريبية
  if (testShipments.length === 0) {
    testShipments = [
      {
        bl_number:     'TEST-001',
        customer_name: 'اختبار — شركة التجربة',
        type:          'sea',
        port:          'jed_sea',
        eta:           new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
        status:        'waiting',
        daysLeft:      2,
      },
      {
        bl_number:     'TEST-002',
        customer_name: 'اختبار — عميل آخر',
        type:          'air',
        port:          'jed_air',
        eta:           new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
        status:        'clearance',
        daysLeft:      5,
      }
    ];
  }

  await sendBrevoEmail([testEmail], testShipments);
  return { sent: 1, shipments: testShipments.length, testEmail };
}


export { LAST_ALERT_KEY };
