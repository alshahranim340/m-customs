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
    <div class="topbar">
      <div>
        <div class="topbar-title">📅 التقويم والتنبيهات</div>
        <div class="topbar-sub">متابعة مواعيد وصول الشحنات</div>
      </div>
      <div class="topbar-actions">
        <button class="btn btn-ghost" id="btn-send-alerts">
          <i class="ti ti-mail"></i> إرسال تنبيه يدوي
        </button>
      </div>
    </div>
    <div class="page-body">
      <div id="cal-content"><div class="loader"><div class="spinner"></div></div></div>
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
      <div class="card" style="padding:0;overflow:hidden;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border);">
          <button class="btn btn-ghost btn-sm" onclick="calPrev()">‹ السابق</button>
          <div style="font-weight:700;font-size:16px;color:var(--navy);">${monthName}</div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-ghost btn-sm" onclick="calToday()">اليوم</button>
            <button class="btn btn-ghost btn-sm" onclick="calNext()">التالي ›</button>
          </div>
        </div>
        <div style="padding:12px;">
          <div class="cal-grid-head">${dayNames.map(d=>`<div class="cal-head-cell">${d}</div>`).join('')}</div>
          <div class="cal-grid">${cells}</div>
        </div>
        <div style="display:flex;gap:16px;padding:10px 18px;border-top:1px solid var(--border);font-size:12px;">
          <div style="display:flex;align-items:center;gap:6px;"><div class="cal-chip-active" style="display:inline-block;padding:2px 8px;border-radius:4px;">●</div> قادم</div>
          <div style="display:flex;align-items:center;gap:6px;"><div class="cal-chip-late" style="display:inline-block;padding:2px 8px;border-radius:4px;">●</div> متأخر</div>
          <div style="display:flex;align-items:center;gap:6px;"><div class="cal-chip-done" style="display:inline-block;padding:2px 8px;border-radius:4px;">●</div> تم التسليم</div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px;">

        <!-- Alert status -->
        <div style="background:${sentToday?'#f0fdf4':'#eff6ff'};border:1px solid ${sentToday?'#86efac':'#bfdbfe'};
          border-radius:8px;padding:10px 14px;font-size:12px;display:flex;align-items:center;gap:8px;">
          <span style="font-size:18px;">${sentToday?'✅':'🔔'}</span>
          <span style="color:${sentToday?'#166534':'#1d4ed8'};font-weight:600;">
            ${sentToday ? 'تم إرسال التنبيهات اليوم تلقائياً' : 'لم يتم إرسال التنبيهات اليوم بعد'}
          </span>
        </div>

        <!-- Alert shipments -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">🔔 تنبيهات الـ 5 أيام القادمة</div>
            <span class="pill" style="background:${alertShips.length>0?'var(--red-light)':'var(--green-light)'};
              color:${alertShips.length>0?'var(--red)':'var(--green)'};">${alertShips.length}</span>
          </div>
          ${alertShips.length === 0
            ? `<div style="padding:16px;text-align:center;color:var(--muted);font-size:13px;">✅ لا توجد شحنات خلال 5 أيام</div>`
            : alertShips.map(s => `
              <div style="padding:10px 16px;border-bottom:0.5px solid var(--border);">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <div>
                    <div style="font-weight:700;font-size:13px;">${s.bl_number||'—'}</div>
                    <div style="font-size:11px;color:var(--muted);">${s.customer_name||'—'}</div>
                  </div>
                  <div style="text-align:left;">
                    <div style="font-size:12px;font-weight:700;color:${s.daysLeft===0?'var(--red)':s.daysLeft<=2?'#f97316':'var(--blue)'};">
                      ${s.daysLeft===0?'🔴 اليوم':s.daysLeft===1?'🟠 غداً':`🔵 ${s.daysLeft} أيام`}
                    </div>
                    <div style="font-size:11px;color:var(--muted);">${_fmtShort(s.eta)}</div>
                  </div>
                </div>
              </div>`).join('')}
        </div>

        ${overdue.length > 0 ? `
        <div class="card">
          <div class="card-header">
            <div class="card-title">⚠️ شحنات متأخرة</div>
            <span class="pill" style="background:var(--red-light);color:var(--red);">${overdue.length}</span>
          </div>
          ${overdue.map(s => `
            <div style="padding:10px 16px;border-bottom:0.5px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-weight:700;font-size:13px;">${s.bl_number||'—'}</div>
                <div style="font-size:11px;color:var(--muted);">${s.customer_name||'—'}</div>
              </div>
              <div style="font-size:11px;color:var(--red);font-weight:600;">${_fmtShort(s.eta)}</div>
            </div>`).join('')}
        </div>` : ''}

      </div>
    </div>`;
}

function _fmtShort(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-SA', { month:'short', day:'numeric' });
}
