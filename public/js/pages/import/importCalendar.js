import { getImportShipments, IMPORT_STATUS } from '../../../../src/firebase/importDb.js';

let _shipments = [];
let _viewDate  = new Date();

export async function renderImportCalendar(container) {
  container.innerHTML = `
    <div class="topbar">
      <div>
        <div class="topbar-title">📅 التقويم والتنبيهات</div>
        <div class="topbar-sub">متابعة مواعيد وصول الشحنات</div>
      </div>
    </div>
    <div class="page-body">
      <div id="cal-content"><div class="loader"><div class="spinner"></div></div></div>
    </div>`;

  try {
    _shipments = await getImportShipments();
    _renderCalendar();
  } catch(e) {
    document.getElementById('cal-content').innerHTML =
      `<div class="empty-state"><div class="empty-title">خطأ في التحميل</div></div>`;
  }

  window.calPrev   = () => { _viewDate.setMonth(_viewDate.getMonth() - 1); _renderCalendar(); };
  window.calNext   = () => { _viewDate.setMonth(_viewDate.getMonth() + 1); _renderCalendar(); };
  window.calToday  = () => { _viewDate = new Date(); _renderCalendar(); };
}

function _renderCalendar() {
  const now   = new Date();
  const year  = _viewDate.getFullYear();
  const month = _viewDate.getMonth();

  const monthName = _viewDate.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });

  // Group shipments by ETA date
  const byDate = {};
  _shipments.forEach(s => {
    if (!s.eta) return;
    const key = s.eta.split('T')[0];
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(s);
  });

  // Upcoming alerts (next 7 days, not delivered)
  const today = new Date(); today.setHours(0,0,0,0);
  const week  = new Date(today); week.setDate(week.getDate() + 7);
  const alerts = _shipments.filter(s => {
    if (!s.eta || s.status === 'delivered') return false;
    const d = new Date(s.eta); d.setHours(0,0,0,0);
    return d >= today && d <= week;
  }).sort((a,b) => new Date(a.eta) - new Date(b.eta));

  const overdue = _shipments.filter(s => {
    if (!s.eta || s.status === 'delivered') return false;
    const d = new Date(s.eta); d.setHours(0,0,0,0);
    return d < today;
  });

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayNames = ['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];

  let cells = '';
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) cells += `<div class="cal-cell cal-empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cellDate = new Date(year, month, d); cellDate.setHours(0,0,0,0);
    const isToday  = cellDate.getTime() === today.getTime();
    const ships    = byDate[dateKey] || [];
    const isPast   = cellDate < today;

    cells += `
      <div class="cal-cell ${isToday?'cal-today':''} ${isPast&&ships.length?'cal-past-ships':''}">
        <div class="cal-day-num ${isToday?'cal-today-num':''}">${d}</div>
        ${ships.map(s => `
          <div class="cal-ship-chip ${s.status==='delivered'?'cal-chip-done':isPast?'cal-chip-late':'cal-chip-active'}"
            title="${s.bl_number} — ${s.customer_name}">
            ${s.bl_number||'—'}
          </div>`).join('')}
      </div>`;
  }

  document.getElementById('cal-content').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start;">

      <!-- Calendar -->
      <div class="card" style="padding:0;overflow:hidden;">
        <!-- Nav -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border);">
          <button class="btn btn-ghost btn-sm" onclick="calPrev()">‹ السابق</button>
          <div style="font-weight:700;font-size:16px;color:var(--navy);">${monthName}</div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-ghost btn-sm" onclick="calToday()">اليوم</button>
            <button class="btn btn-ghost btn-sm" onclick="calNext()">التالي ›</button>
          </div>
        </div>
        <!-- Grid -->
        <div style="padding:12px;">
          <div class="cal-grid-head">
            ${dayNames.map(d => `<div class="cal-head-cell">${d}</div>`).join('')}
          </div>
          <div class="cal-grid">${cells}</div>
        </div>
        <!-- Legend -->
        <div style="display:flex;gap:16px;padding:10px 18px;border-top:1px solid var(--border);font-size:12px;">
          <div style="display:flex;align-items:center;gap:6px;"><div class="cal-chip-active" style="display:inline-block;padding:2px 8px;border-radius:4px;">●</div> قادم</div>
          <div style="display:flex;align-items:center;gap:6px;"><div class="cal-chip-late" style="display:inline-block;padding:2px 8px;border-radius:4px;">●</div> متأخر</div>
          <div style="display:flex;align-items:center;gap:6px;"><div class="cal-chip-done" style="display:inline-block;padding:2px 8px;border-radius:4px;">●</div> تم التسليم</div>
        </div>
      </div>

      <!-- Sidebar alerts -->
      <div style="display:flex;flex-direction:column;gap:12px;">

        <!-- Upcoming -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">🔔 تنبيهات الأسبوع</div>
            <span class="pill" style="background:var(--blue-light);color:var(--blue);">${alerts.length}</span>
          </div>
          ${alerts.length === 0
            ? `<div style="padding:16px;text-align:center;color:var(--muted);font-size:13px;">لا توجد شحنات هذا الأسبوع ✅</div>`
            : alerts.map(s => {
                const d = new Date(s.eta);
                const isToday2 = d.setHours(0,0,0,0) === today.getTime();
                return `
                <div style="padding:10px 16px;border-bottom:0.5px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
                  <div>
                    <div style="font-weight:700;font-size:13px;">${s.bl_number||'—'}</div>
                    <div style="font-size:11px;color:var(--muted);">${s.customer_name||'—'}</div>
                  </div>
                  <div style="text-align:left;">
                    <div style="font-size:12px;font-weight:600;color:${isToday2?'var(--red)':'var(--blue)'};">
                      ${isToday2 ? '🔴 اليوم' : _fmtShort(s.eta)}
                    </div>
                    <span class="pill ${IMPORT_STATUS[s.status]?.class||'pill-draft'}" style="font-size:10px;">
                      ${IMPORT_STATUS[s.status]?.ar||s.status}
                    </span>
                  </div>
                </div>`;
              }).join('')}
        </div>

        <!-- Overdue -->
        ${overdue.length > 0 ? `
        <div class="card">
          <div class="card-header">
            <div class="card-title">⚠️ متأخرة</div>
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
