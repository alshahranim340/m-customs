// ─────────────────────────────────────────────
// EMAILJS NOTIFICATION SERVICE
// تنبيهات ETA للشحنات الواردة
// ─────────────────────────────────────────────

const EMAILJS_SERVICE_ID  = 'service_jcy91bd';
const EMAILJS_TEMPLATE_ID = 'template_avl8usm';
const EMAILJS_PUBLIC_KEY  = 'TyzJxtsfIDRYSTZ9P';
const ALERT_DAYS          = 5; // تنبيه قبل كم يوم

const IMPORT_PORTS_AR = {
  jed_air: 'مطار جدة',
  ruh_air: 'مطار الرياض',
  dmm_air: 'مطار الدمام',
  jed_sea: 'ميناء جدة الإسلامي',
  dmm_sea: 'ميناء الملك عبدالعزيز الدمام',
  rab_sea: 'ميناء الملك عبدالله رابغ',
  batha:   'منفذ البطحاء',
  fahd:    'جسر الملك فهد',
};

const SHIP_TYPE_AR = { sea: '🚢 بحري', air: '✈️ جوي', land: '🚛 بري' };

const STATUS_AR = {
  waiting:   'قيد الانتظار',
  clearance: 'قيد التخليص الجمركي',
  delivered: 'تم التسليم',
};

// ─────────────────────────────────────────────
// LOAD EMAILJS
// ─────────────────────────────────────────────
function loadEmailJS() {
  return new Promise((resolve, reject) => {
    if (window.emailjs) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
    script.onload = () => { window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY }); resolve(); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ─────────────────────────────────────────────
// SEND ONE EMAIL
// ─────────────────────────────────────────────
async function sendAlert(toEmail, shipment, daysLeft) {
  await loadEmailJS();

  const eta = new Date(shipment.eta).toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    to_email:      toEmail,
    bl_number:     shipment.bl_number   || '—',
    customer_name: shipment.customer_name || '—',
    ship_type:     SHIP_TYPE_AR[shipment.type] || shipment.type || '—',
    port:          IMPORT_PORTS_AR[shipment.port] || shipment.port || '—',
    eta,
    status:        STATUS_AR[shipment.status] || shipment.status || '—',
    days_left:     daysLeft,
  });
}

// ─────────────────────────────────────────────
// CHECK & SEND ALERTS
// ─────────────────────────────────────────────
export async function checkAndSendEtaAlerts(shipments, users) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const results = { sent: 0, skipped: 0, errors: [] };

  // Filter shipments that need alert
  const alertShipments = shipments.filter(s => {
    if (!s.eta || s.status === 'delivered') return false;
    const eta = new Date(s.eta); eta.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((eta - today) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= ALERT_DAYS;
  });

  if (alertShipments.length === 0) return { ...results, message: 'لا توجد شحنات تحتاج تنبيه' };

  // Get active user emails
  const activeEmails = users
    .filter(u => u.active !== false && u.email && u.email !== 'undefined')
    .map(u => u.email);

  if (activeEmails.length === 0) return { ...results, message: 'لا يوجد موظفون نشطون' };

  // Send alerts
  for (const shipment of alertShipments) {
    const eta = new Date(shipment.eta); eta.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((eta - today) / (1000 * 60 * 60 * 24));

    for (const email of activeEmails) {
      try {
        await sendAlert(email, shipment, daysLeft);
        results.sent++;
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 300));
      } catch(e) {
        results.errors.push({ email, bl: shipment.bl_number, error: e.message });
      }
    }
  }

  return {
    ...results,
    shipments: alertShipments.length,
    message: `تم إرسال ${results.sent} تنبيه لـ ${alertShipments.length} شحنة`
  };
}

// ─────────────────────────────────────────────
// GET ALERT SHIPMENTS (for UI display)
// ─────────────────────────────────────────────
export function getAlertShipments(shipments) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return shipments
    .filter(s => {
      if (!s.eta || s.status === 'delivered') return false;
      const eta = new Date(s.eta); eta.setHours(0, 0, 0, 0);
      const diff = Math.ceil((eta - today) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= ALERT_DAYS;
    })
    .map(s => {
      const eta = new Date(s.eta); eta.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((eta - today) / (1000 * 60 * 60 * 24));
      return { ...s, daysLeft };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);
}
