import { getImportShipments, IMPORT_STATUS } from '../../../../src/firebase/importDb.js';
import { getAllUsers } from '../../../../src/firebase/auth.js';
import { checkAndSendEtaAlerts, getAlertShipments } from '../../../../src/utils/notifications.js';
import { toast } from '../../app.js';

let _shipments = [];
let _users     = [];
let _viewDate  = new Date();

const LAST_ALERT_KEY = 'mcustoms_last_alert_date';

export async function renderImportCalendar(container) {
  container.innerHTML = `
    <div class="page-body" style="padding:20px 24px;background:#F5F3EC;">
      <div class="modern-page">
        <div class="modern-header">
          <div class="modern-header-brand">
            <div class="modern-header-badges">
              <div class="modern-header-dots">
                <span class="modern-header-dot" style="background:#CC2229;"></span>
                <span class="modern-header-dot" style="background:#1C4B8E;"></span>
                <span class="modern-header-dot" style="background:#2E8B57;"></span>
              </div>
              <span class="modern-header-code">SDS/CALENDAR/2026</span>
            </div>
            <div class="modern-header-title">التقويم والتنبيهات</div>
            <div class="modern-header-sub">CALENDAR · ETA ALERTS · v2.4</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" id="btn-send-alerts">
              <i class="ti ti-mail"></i> إرسال تنبيه يدوي
            </button>
          </div>
        </div>
        <div id="cal-content" style="padding:20px 24px;"><div class="loader"><div class="spinner"></div></div></div>
      </div>
    </div>`;

  try {
    [_shipments, _users] = await Promise.all([getImportShipments(), getAllUsers()]);
    _renderCalendar();
    // تنبيه تلقائي مرة واحدة في اليوم
    _autoSendAlerts();
  } catch(e) {
    document.getElementById('cal-content').innerHTML =
      `<div class="empty-state"><div class="empty-title">خطأ في التحميل</div></div>`;
  }

  document.getElementById('btn-send-alerts').onclick = sendAlerts;

  window.calPrev  = () => { _viewDate.setMonth(_viewDate.getMonth() - 1); _renderCalendar(); };
  window.calNext  = () => { _viewDate.setMonth(_viewDate.getMonth() + 1); _renderCalendar(); };
  window.calToday = () => { _viewDate = new Date(); _renderCalendar(); };
}

// ─────────────────────────────────────────────
// AUTO SEND — مرة واحدة في اليوم
// ─────────────────────────────────────────────
async function _autoSendAlerts() {
  const today    = new Date().toISOString().split('T')[0];
  const lastSent = localStorage.getItem(LAST_ALERT_KEY);

  if (lastSent === today) return; // تم الإرسال اليوم مسبقاً

  const alertShips = getAlertShipments(_shipments);
  if (alertShips.length === 0) return; // لا توجد شحنات تحتاج تنبيه

  try {
    const result = await checkAndSendEtaAlerts(_shipments, _users);
    if (result.sent > 0) {
      localStorage.setItem(LAST_ALERT_KEY, today);
      toast(`✅ تم إرسال تنبيهات ETA تلقائياً — ${result.shipments} شحنة`, 'success');
    }
  } catch(e) {
    // صامت — لا نزعج المستخدم بأخطاء التلقائي
  }
}

// ─────────────────────────────────────────────
// MANUAL SEND
// ─────────────────────────────────────────────
async function sendAlerts() {
  const btn = document.getElementById('btn-send-alerts');
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader"></i> جاري الإرسال...';
  try {
    const result = await checkAndSendEtaAlerts(_shipments, _users);
    if (result.sent > 0) {
      localStorage.setItem(LAST_ALERT_KEY, new Date().toISOString().split('T')[0]);
      toast(`✅ ${result.message}`, 'success');
    } else {
      toast(`ℹ️ ${result.message}`, 'success');
    }
    if (result.errors?.length > 0) toast(`⚠️ فشل إرسال ${result.errors.length} تنبيه`, 'error');
  } catch(e) {
    toast('❌ خطأ في إرسال التنبيهات', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="ti ti-mail"></i> إرسال تنبيه يدوي';
  }
}

// ─────────────────────────────────────────────
// RENDER CALENDAR
// ─────────────────────────────────────────────
function _renderCalendar() {
  const today = new Date(); today.setHours(0,0,0,0);
  const year  = _viewDate.getFullYear();
  const month = _viewDate.getMonth();
  const monthName = _viewDate.toLocaleDateString('ar-SA', { month:'long', year:'numeric' });
  const alertShips = getAlertShipments(_shipments);

  const byDate = {};
  _shipments.forEach(s => {
    if (!s.eta) return;
    const key = s.eta.split('T')[0];
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(s);
  });

  const overdue = _shipments.filter(s => {
    if (!s.eta || s.status === 'delivered') return false;
    const d = new Date(s.eta); d.setHours(0,0,0,0);
    return d < today;
  });

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayNames    = ['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];

  const lastSent = localStorage.getItem(LAST_ALERT_KEY);
  const sentToday = lastSent === new Date().toISOString().split('T')[0];

  let cells = '';
  for (let i = 0; i < firstDay; i++) cells += `<div class="cal-cell cal-empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey  = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cellDate = new Date(year, month, d); cellDate.setHours(0,0,0,0);
    const isToday  = cellDate.getTime() === today.getTime();
    const ships    = byDate[dateKey] || [];
    const isPast   = cellDate < today;
    cells += `
      <div class="cal-cell ${isToday?'cal-today':''} ${isPast&&ships.length?'cal-past-ships':''}">
        <div class="cal-day-num ${isToday?'cal-today-num':''}">${d}</div>
        ${ships.map(s => `
          <div class="cal-ship-chip ${s.status==='delivered'?'cal-chip-done':isPast?'cal-chip-late':'cal-chip-active'}"
            title="${s.bl_number} — ${s.customer_name}">${s.bl_number||'—'}</div>`).join('')}
      </div>`;
  }

  document.getElementById('cal-content').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start;">
      <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;overflow:hidden;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #F0EDE4;">
          <button class="modern-btn" onclick="calPrev()" style="padding:6px 12px;font-size:11px;">
            <i class="ti ti-chevron-right"></i> السابق
          </button>
          <div style="font-family:'JetBrains Mono',monospace;font-weight:800;font-size:14px;color:#0E1A2E;letter-spacing:1px;">${monthName}</div>
          <div style="display:flex;gap:6px;">
            <button class="modern-btn" onclick="calToday()" style="padding:6px 12px;font-size:11px;">اليوم</button>
            <button class="modern-btn" onclick="calNext()" style="padding:6px 12px;font-size:11px;">
              التالي <i class="ti ti-chevron-left"></i>
            </button>
          </div>
        </div>
        <div style="padding:14px;">
          <div class="cal-grid-head">${dayNames.map(d=>`<div class="cal-head-cell">${d}</div>`).join('')}</div>
          <div class="cal-grid">${cells}</div>
        </div>
        <div style="display:flex;gap:16px;padding:12px 18px;border-top:1px solid #F0EDE4;font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B6659;letter-spacing:.5px;">
          <div style="display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;background:#1C4B8E;display:inline-block;border-radius:2px;"></span> UPCOMING</div>
          <div style="display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;background:#CC2229;display:inline-block;border-radius:2px;"></span> OVERDUE</div>
          <div style="display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;background:#2E8B57;display:inline-block;border-radius:2px;"></span> DELIVERED</div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px;">

        <div style="background:${sentToday?'#E7F5EE':'#E8F0FA'};border:1px solid ${sentToday?'#86efac':'#BFDBFE'};border-radius:6px;padding:10px 14px;font-family:'JetBrains Mono',monospace;font-size:11px;display:flex;align-items:center;gap:10px;letter-spacing:.5px;">
          <span style="font-size:14px;">${sentToday?'✓':'●'}</span>
          <span style="color:${sentToday?'#2E8B57':'#1C4B8E'};font-weight:700;">
            ${sentToday ? 'ALERTS SENT TODAY' : 'PENDING SEND'}
          </span>
        </div>

        <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;overflow:hidden;">
          <div style="padding:12px 16px;border-bottom:1px solid #F0EDE4;display:flex;justify-content:space-between;align-items:center;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#0E1A2E;letter-spacing:1.5px;font-weight:800;">→ 5-DAY ALERTS</div>
            <span class="modern-badge ${alertShips.length>0?'red':'green'}">${String(alertShips.length).padStart(2,'0')}</span>
          </div>
          ${alertShips.length === 0
            ? `<div style="padding:20px;text-align:center;color:#8A8578;font-family:'JetBrains Mono',monospace;font-size:11px;">✓ NO ALERTS</div>`
            : `<div style="padding:6px 8px;">${alertShips.map(s => {
              const daysColor = s.daysLeft===0?'#CC2229':s.daysLeft<=2?'#C2410C':'#1C4B8E';
              return `
              <div style="padding:10px 12px;display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid #F0EDE4;">
                <div style="min-width:0;flex:1;">
                  <div style="font-family:'JetBrains Mono',monospace;font-weight:800;font-size:12px;color:#0E1A2E;">${s.bl_number||'—'}</div>
                  <div style="font-size:11px;color:#6B6659;margin-top:2px;">${s.customer_name||'—'}</div>
                </div>
                <div style="text-align:left;">
                  <div style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:${daysColor};letter-spacing:.5px;">
                    ${s.daysLeft===0?'TODAY':s.daysLeft===1?'TOMORROW':`${s.daysLeft} DAYS`}
                  </div>
                  <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;">${_fmtShort(s.eta)}</div>
                </div>
              </div>`;
            }).join('')}</div>`}
        </div>

        ${overdue.length > 0 ? `
        <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;overflow:hidden;">
          <div style="padding:12px 16px;border-bottom:1px solid #F0EDE4;display:flex;justify-content:space-between;align-items:center;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#CC2229;letter-spacing:1.5px;font-weight:800;">→ OVERDUE</div>
            <span class="modern-badge red">${String(overdue.length).padStart(2,'0')}</span>
          </div>
          <div style="padding:6px 8px;">
            ${overdue.map(s => `
              <div style="padding:10px 12px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #F0EDE4;">
                <div>
                  <div style="font-family:'JetBrains Mono',monospace;font-weight:800;font-size:12px;color:#0E1A2E;">${s.bl_number||'—'}</div>
                  <div style="font-size:11px;color:#6B6659;margin-top:2px;">${s.customer_name||'—'}</div>
                </div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#CC2229;font-weight:700;letter-spacing:.5px;">${_fmtShort(s.eta)}</div>
              </div>`).join('')}
          </div>
        </div>` : ''}

      </div>
    </div>`;
}

function _fmtShort(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-SA', { month:'short', day:'numeric' });
}
