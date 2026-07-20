// ─────────────────────────────────────────────
// EMAILJS NOTIFICATION SERVICE
// ─────────────────────────────────────────────

const EMAILJS_SERVICE_ID  = 'service_jcy91bd';
const EMAILJS_TEMPLATE_ID = 'template_avl8usm';
const EMAILJS_PUBLIC_KEY  = 'TyzJxtsfIDRYSTZ9P';
const ALERT_DAYS          = 5;
const LAST_ALERT_KEY      = 'mcustoms_last_alert_date';

const IMPORT_PORTS_AR = {
  jed_air: 'مطار جدة',   ruh_air: 'مطار الرياض',  dmm_air: 'مطار الدمام',
  jed_sea: 'ميناء جدة الإسلامي', dmm_sea: 'ميناء الملك عبدالعزيز الدمام',
  rab_sea: 'ميناء الملك عبدالله رابغ', batha: 'منفذ البطحاء', fahd: 'جسر الملك فهد',
};

const SHIP_TYPE_AR = { sea: '🚢 بحري', air: '✈️ جوي', land: '🚛 بري' };
const STATUS_AR    = { waiting: 'قيد الانتظار', clearance: 'قيد التخليص الجمركي', delivered: 'تم التسليم' };

// ─────────────────────────────────────────────
// SEND VIA FETCH (no SDK needed)
// ─────────────────────────────────────────────
async function sendAlert(toEmail, shipment, daysLeft) {
  const eta = new Date(shipment.eta).toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const payload = {
    service_id:  EMAILJS_SERVICE_ID,
    template_id: EMAILJS_TEMPLATE_ID,
    user_id:     EMAILJS_PUBLIC_KEY,
    template_params: {
      to_email:      toEmail,
      bl_number:     shipment.bl_number    || '—',
      customer_name: shipment.customer_name || '—',
      ship_type:     SHIP_TYPE_AR[shipment.type] || shipment.type || '—',
      port:          IMPORT_PORTS_AR[shipment.port] || shipment.port || '—',
      eta,
      status:        STATUS_AR[shipment.status] || shipment.status || '—',
      days_left:     daysLeft,
    }
  };

  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`EmailJS ${res.status}: ${err}`);
  }
}

// ─────────────────────────────────────────────
// CHECK & SEND
// ─────────────────────────────────────────────
export async function checkAndSendEtaAlerts(shipments, users) {
  const today = new Date(); today.setHours(0,0,0,0);
  const results = { sent: 0, skipped: 0, errors: [], shipments: 0 };

  const alertShipments = shipments.filter(s => {
    if (!s.eta || s.status === 'delivered') return false;
    const eta = new Date(s.eta); eta.setHours(0,0,0,0);
    const diff = Math.ceil((eta - today) / 86400000);
    return diff >= 0 && diff <= ALERT_DAYS;
  });

  results.shipments = alertShipments.length;
  if (alertShipments.length === 0) return { ...results, message: 'لا توجد شحنات تحتاج تنبيه' };

  const activeEmails = users
    .filter(u => u.active !== false && u.email && u.email !== 'undefined')
    .map(u => u.email);

  if (activeEmails.length === 0) return { ...results, message: 'لا يوجد موظفون نشطون' };

  for (const shipment of alertShipments) {
    const eta = new Date(shipment.eta); eta.setHours(0,0,0,0);
    const daysLeft = Math.ceil((eta - today) / 86400000);

    for (const email of activeEmails) {
      try {
        await sendAlert(email, shipment, daysLeft);
        results.sent++;
        await new Promise(r => setTimeout(r, 400));
      } catch(e) {
        console.error('EmailJS error:', e.message);
        results.errors.push({ email, bl: shipment.bl_number, error: e.message });
      }
    }
  }

  results.message = `تم إرسال ${results.sent} تنبيه لـ ${alertShipments.length} شحنة`;
  return results;
}

// ─────────────────────────────────────────────
// AUTO ALERT — يُستدعى من app.js عند الدخول
// ─────────────────────────────────────────────
export async function autoAlertOnLogin(shipments, users) {
  const today    = new Date().toISOString().split('T')[0];
  const lastSent = localStorage.getItem(LAST_ALERT_KEY);
  if (lastSent === today) return; // أُرسل اليوم مسبقاً

  const alertShips = getAlertShipments(shipments);
  if (alertShips.length === 0) return;

  try {
    const result = await checkAndSendEtaAlerts(shipments, users);
    if (result.sent > 0) localStorage.setItem(LAST_ALERT_KEY, today);
  } catch(e) {
    console.error('Auto alert error:', e);
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

export { LAST_ALERT_KEY };
