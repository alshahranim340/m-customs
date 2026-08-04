import { getShipments } from '../../../src/firebase/db.js';
import { toHijri } from '../../../src/utils/hijriDate.js';

let _allShipments = [];
let _filtered = [];
let _period = 'month'; // month | quarter | year | custom
let _selectedMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
let _selectedQuarter = ''; // e.g. 2026-Q1
let _selectedYear = new Date().getFullYear();
let _customFrom = '';
let _customTo = '';
let _destinations = { uae: true, bahrain: true, oman: true };
let _reportNote = '';

const DEST_LABELS = {
  uae: { ar: 'الإمارات', en: 'UAE / EMIRATES', color: '#1C4B8E' },
  bahrain: { ar: 'البحرين', en: 'BH / BAHRAIN', color: '#CC2229' },
  oman: { ar: 'عمان', en: 'OM / OMAN', color: '#2E8B57' },
};

const STATUS_LABELS = {
  draft: { ar: 'مسودة', en: 'DRAFT', class: 'gray' },
  sent: { ar: 'مرسلة', en: 'SENT', class: 'blue' },
  replied: { ar: 'رد عودة', en: 'REPLIED', class: 'amber' },
  done: { ar: 'مكتملة', en: 'DONE', class: 'green' },
};

export async function renderExportReport(container) {
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
              <span class="modern-header-code">SDS/EXPORT-REPORT/2026</span>
            </div>
            <div class="modern-header-title">📊 تقرير الشحنات — الصادر</div>
            <div class="modern-header-sub">EXPORT REPORT · PERIODIC ANALYSIS · v1.0</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" onclick="navigate('shipments')">
              <i class="ti ti-arrow-right"></i> رجوع
            </button>
          </div>
        </div>

        <!-- Filters bar -->
        <div class="modern-search-bar" style="flex-direction:column;align-items:stretch;gap:12px;padding:16px 24px;">

          <!-- Period tabs -->
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
            <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B6659;letter-spacing:1.5px;font-weight:700;">PERIOD ›</span>
            <button class="rep-period-btn" data-period="month">📅 شهري</button>
            <button class="rep-period-btn" data-period="quarter">📆 ربع سنوي</button>
            <button class="rep-period-btn" data-period="year">🗓️ سنوي</button>
            <button class="rep-period-btn" data-period="custom">⚙ مخصص</button>
            <div style="flex:1;"></div>
            <div id="rep-picker"></div>
          </div>

          <!-- Destinations -->
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B6659;letter-spacing:1.5px;font-weight:700;">DESTINATIONS ›</span>
            <label style="display:flex;align-items:center;gap:6px;background:white;border:1.5px solid #E8E5DC;border-radius:4px;padding:6px 12px;cursor:pointer;">
              <input type="checkbox" id="dest-uae" checked style="accent-color:#1C4B8E;"> 
              <span style="font-size:12px;font-weight:700;color:#1C4B8E;">🇦🇪 الإمارات</span>
            </label>
            <label style="display:flex;align-items:center;gap:6px;background:white;border:1.5px solid #E8E5DC;border-radius:4px;padding:6px 12px;cursor:pointer;">
              <input type="checkbox" id="dest-bahrain" checked style="accent-color:#CC2229;">
              <span style="font-size:12px;font-weight:700;color:#CC2229;">🇧🇭 البحرين</span>
            </label>
            <label style="display:flex;align-items:center;gap:6px;background:white;border:1.5px solid #E8E5DC;border-radius:4px;padding:6px 12px;cursor:pointer;">
              <input type="checkbox" id="dest-oman" checked style="accent-color:#2E8B57;">
              <span style="font-size:12px;font-weight:700;color:#2E8B57;">🇴🇲 عمان</span>
            </label>
            <div style="flex:1;"></div>
            <button class="modern-btn" onclick="exportReportExcel()">
              <i class="ti ti-file-spreadsheet"></i> Excel
            </button>
            <button class="modern-btn modern-btn-primary" onclick="printReport()">
              <i class="ti ti-printer"></i> طباعة PDF
            </button>
          </div>
        </div>

        <!-- Report body -->
        <div id="report-body" style="padding:0 24px 24px;">
          <div class="loader"><div class="spinner"></div></div>
        </div>

      </div>
    </div>

    <style>
      .rep-period-btn {
        padding:6px 14px;border-radius:4px;font-family:Tajawal,sans-serif;font-size:11px;
        font-weight:700;cursor:pointer;transition:all .15s;border:1.5px solid #E8E5DC;
        background:white;color:#0E1A2E;letter-spacing:.3px;
      }
      .rep-period-btn.active { background:#0E1A2E; color:white; border-color:#0E1A2E; }
      .rep-period-btn:hover:not(.active) { background:#F5F3EC; }

      @media print {
        body { background:white !important; }
        .no-print { display:none !important; }
        .sidebar, .modern-header-actions, .modern-search-bar { display:none !important; }
        .page-body { padding:0 !important; background:white !important; }
        .modern-page { border:none !important; }
      }
    </style>`;

  await loadShipments();
  attachFilterHandlers();
  updatePicker();
  applyFilters();
  render();
}

async function loadShipments() {
  try {
    _allShipments = await getShipments();
  } catch (e) {
    console.error('load shipments error:', e);
    _allShipments = [];
  }
}

function attachFilterHandlers() {
  document.querySelectorAll('.rep-period-btn').forEach(btn => {
    btn.onclick = () => {
      _period = btn.dataset.period;
      document.querySelectorAll('.rep-period-btn').forEach(b => b.classList.toggle('active', b.dataset.period === _period));
      updatePicker();
      applyFilters();
      render();
    };
    if (btn.dataset.period === _period) btn.classList.add('active');
  });

  ['uae','bahrain','oman'].forEach(dest => {
    const el = document.getElementById(`dest-${dest}`);
    if (el) el.onchange = () => {
      _destinations[dest] = el.checked;
      applyFilters();
      render();
    };
  });
}

function updatePicker() {
  const el = document.getElementById('rep-picker');
  if (!el) return;

  if (_period === 'month') {
    // Generate list of months
    const months = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', calendar: 'gregory' });
      months.push({ val, label });
    }
    el.innerHTML = `
      <select id="picker-month" style="border:1.5px solid #E8E5DC;border-radius:4px;padding:6px 12px;font-family:'Tajawal',sans-serif;font-size:12px;background:white;color:#0E1A2E;font-weight:600;">
        ${months.map(m => `<option value="${m.val}" ${m.val === _selectedMonth ? 'selected' : ''}>${m.label}</option>`).join('')}
      </select>`;
    document.getElementById('picker-month').onchange = (e) => {
      _selectedMonth = e.target.value;
      applyFilters();
      render();
    };
  } else if (_period === 'quarter') {
    const now = new Date();
    const year = now.getFullYear();
    const quarters = [];
    for (let y = year; y >= year - 2; y--) {
      for (let q = 4; q >= 1; q--) {
        quarters.push({ val: `${y}-Q${q}`, label: `Q${q} ${y}` });
      }
    }
    if (!_selectedQuarter) _selectedQuarter = quarters[0].val;
    el.innerHTML = `
      <select id="picker-quarter" style="border:1.5px solid #E8E5DC;border-radius:4px;padding:6px 12px;font-family:'Tajawal',sans-serif;font-size:12px;background:white;color:#0E1A2E;font-weight:600;">
        ${quarters.map(q => `<option value="${q.val}" ${q.val === _selectedQuarter ? 'selected' : ''}>${q.label}</option>`).join('')}
      </select>`;
    document.getElementById('picker-quarter').onchange = (e) => {
      _selectedQuarter = e.target.value;
      applyFilters();
      render();
    };
  } else if (_period === 'year') {
    const years = [];
    const now = new Date();
    for (let y = now.getFullYear(); y >= now.getFullYear() - 5; y--) {
      years.push(y);
    }
    el.innerHTML = `
      <select id="picker-year" style="border:1.5px solid #E8E5DC;border-radius:4px;padding:6px 12px;font-family:'Tajawal',sans-serif;font-size:12px;background:white;color:#0E1A2E;font-weight:600;">
        ${years.map(y => `<option value="${y}" ${y === _selectedYear ? 'selected' : ''}>${y}</option>`).join('')}
      </select>`;
    document.getElementById('picker-year').onchange = (e) => {
      _selectedYear = parseInt(e.target.value);
      applyFilters();
      render();
    };
  } else if (_period === 'custom') {
    if (!_customFrom) {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      _customFrom = d.toISOString().slice(0, 10);
    }
    if (!_customTo) _customTo = new Date().toISOString().slice(0, 10);

    el.innerHTML = `
      <div style="display:flex;gap:6px;align-items:center;">
        <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B6659;">FROM</span>
        <input type="date" id="picker-from" value="${_customFrom}" style="border:1.5px solid #E8E5DC;border-radius:4px;padding:6px 10px;font-size:12px;">
        <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B6659;">TO</span>
        <input type="date" id="picker-to" value="${_customTo}" style="border:1.5px solid #E8E5DC;border-radius:4px;padding:6px 10px;font-size:12px;">
      </div>`;
    document.getElementById('picker-from').onchange = (e) => { _customFrom = e.target.value; applyFilters(); render(); };
    document.getElementById('picker-to').onchange = (e) => { _customTo = e.target.value; applyFilters(); render(); };
  }
}

function applyFilters() {
  let { from, to } = getPeriodRange();

  // Convert gregorian range to hijri for comparison
  // (shipments store dates in Hijri format YYYY-MM-DD)
  let fromHijri = from ? toHijri(new Date(from + 'T00:00:00')) : null;
  let toHijriStr = to ? toHijri(new Date(to + 'T23:59:59')) : null;

  _filtered = _allShipments.filter(s => {
    if (!s.date) return false;
    if (fromHijri && s.date < fromHijri) return false;
    if (toHijriStr && s.date > toHijriStr) return false;
    if (!_destinations[s.destination]) return false;
    return true;
  });
}

function getPeriodRange() {
  if (_period === 'month') {
    const [y, m] = _selectedMonth.split('-');
    const from = `${y}-${m}-01`;
    const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
    const to = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
    return { from, to };
  } else if (_period === 'quarter') {
    const [y, q] = _selectedQuarter.split('-Q');
    const startMonth = (parseInt(q) - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    const from = `${y}-${String(startMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(parseInt(y), endMonth, 0).getDate();
    const to = `${y}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { from, to };
  } else if (_period === 'year') {
    return { from: `${_selectedYear}-01-01`, to: `${_selectedYear}-12-31` };
  } else if (_period === 'custom') {
    return { from: _customFrom, to: _customTo };
  }
  return {};
}

function getPeriodLabel() {
  if (_period === 'month') {
    const [y, m] = _selectedMonth.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', calendar: 'gregory' });
  } else if (_period === 'quarter') return `الربع ${_selectedQuarter.split('-Q')[1]} · ${_selectedQuarter.split('-Q')[0]}`;
  else if (_period === 'year') return `سنة ${_selectedYear}`;
  else if (_period === 'custom') return `${_customFrom} إلى ${_customTo}`;
  return '';
}

function getPeriodCode() {
  if (_period === 'month') return _selectedMonth;
  if (_period === 'quarter') return _selectedQuarter;
  if (_period === 'year') return String(_selectedYear);
  if (_period === 'custom') return `${_customFrom}_${_customTo}`;
  return '';
}

function pad(n) { return String(n || 0).padStart(2, '0'); }

function render() {
  const el = document.getElementById('report-body');
  if (!el) return;

  const total = _filtered.length;
  const done = _filtered.filter(s => s.status === 'done').length;
  const pending = _filtered.filter(s => s.status !== 'done').length;
  const uniqueDrivers = new Set(_filtered.map(s => s.driver_snapshot?.plate).filter(Boolean)).size;

  // Destinations breakdown
  const byDest = { uae: 0, bahrain: 0, oman: 0 };
  _filtered.forEach(s => { if (byDest[s.destination] !== undefined) byDest[s.destination]++; });

  // Status breakdown
  const byStatus = { draft: 0, sent: 0, replied: 0, done: 0 };
  _filtered.forEach(s => { if (byStatus[s.status] !== undefined) byStatus[s.status]++; });

  // Avg per day
  const { from, to } = getPeriodRange();
  let days = 1;
  if (from && to) {
    days = Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000) + 1);
  }
  const avgPerDay = (total / days).toFixed(1);

  const periodLabel = getPeriodLabel();

  el.innerHTML = `
    <!-- Report title (visible only in print) -->
    <div id="print-title" style="display:none;text-align:center;padding:24px;border-bottom:2px solid #0E1A2E;margin-bottom:20px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#8A8578;letter-spacing:2px;">SDS · EXPORT REPORT · ${getPeriodCode().toUpperCase()}</div>
      <div style="font-size:22px;font-weight:800;color:#0E1A2E;margin-top:6px;">تقرير الشحنات - الصادر</div>
      <div style="font-size:14px;color:#6B6659;margin-top:4px;">${periodLabel}</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;margin-top:6px;">Generated: ${new Date().toLocaleString('ar-SA', { calendar: 'gregory' })}</div>
    </div>

    <!-- Stats -->
    <div class="modern-stats modern-stats-4" style="margin-bottom:16px;background:white;padding:24px;border:1px solid #E8E5DC;border-radius:6px;">
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
        <div class="modern-stat-lbl">03 · DRIVERS</div>
        <div class="modern-stat-val blue">${pad(uniqueDrivers)}</div>
        <div class="modern-stat-hint">سائق نشط</div>
      </div>
      <div class="modern-stat">
        <div class="modern-stat-lbl">04 · AVG/DAY</div>
        <div class="modern-stat-val amber">${avgPerDay}</div>
        <div class="modern-stat-hint">متوسط يومي</div>
      </div>
    </div>

    <!-- Destinations breakdown -->
    <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:20px;margin-bottom:16px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#0E1A2E;letter-spacing:2px;font-weight:800;margin-bottom:14px;">→ BY DESTINATION / حسب الوجهة</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
        ${['uae','bahrain','oman'].filter(d => _destinations[d]).map(d => {
          const label = DEST_LABELS[d];
          const count = byDest[d];
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return `
            <div style="background:#FAFAF7;border:1px solid #F0EDE4;border-radius:6px;padding:14px;">
              <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:${label.color};font-weight:700;letter-spacing:1.5px;">${label.en}</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:26px;font-weight:800;color:#0E1A2E;margin-top:4px;">${pad(count)}</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#6B6659;">${pct}% من الإجمالي · ${label.ar}</div>
              <div style="height:5px;background:#F0EDE4;border-radius:3px;margin-top:8px;overflow:hidden;">
                <div style="width:${pct}%;height:100%;background:${label.color};"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Status breakdown -->
    <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:20px;margin-bottom:16px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#0E1A2E;letter-spacing:2px;font-weight:800;margin-bottom:14px;">→ BY STATUS / حسب الحالة</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
        ${Object.entries(STATUS_LABELS).map(([key, label]) => {
          const count = byStatus[key];
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return `
            <div style="background:#FAFAF7;border:1px solid #F0EDE4;border-radius:6px;padding:12px;text-align:center;">
              <span class="modern-badge ${label.class}">${label.en}</span>
              <div style="font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:800;color:#0E1A2E;margin-top:8px;">${pad(count)}</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B6659;margin-top:2px;">${pct}% · ${label.ar}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Full shipments list -->
    <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:20px;margin-bottom:16px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#0E1A2E;letter-spacing:2px;font-weight:800;margin-bottom:14px;">
        → FULL LIST / القائمة الكاملة · ${pad(_filtered.length)} SHIPMENTS
      </div>

      ${_filtered.length === 0 ? `
        <div class="modern-empty">
          <div class="modern-empty-icon">📭</div>
          <div class="modern-empty-title">لا توجد شحنات في هذه الفترة</div>
          <div class="modern-empty-sub">NO SHIPMENTS IN PERIOD</div>
        </div>
      ` : `
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#F5F3EC;border-bottom:2px solid #0E1A2E;">
                <th style="padding:10px 8px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;color:#0E1A2E;letter-spacing:1.5px;font-weight:800;">#</th>
                <th style="padding:10px 8px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;color:#0E1A2E;letter-spacing:1.5px;font-weight:800;">DECLARATION</th>
                <th style="padding:10px 8px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;color:#0E1A2E;letter-spacing:1.5px;font-weight:800;">DATE</th>
                <th style="padding:10px 8px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;color:#0E1A2E;letter-spacing:1.5px;font-weight:800;">DRIVER / السائق</th>
                <th style="padding:10px 8px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;color:#0E1A2E;letter-spacing:1.5px;font-weight:800;">PLATE</th>
                <th style="padding:10px 8px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;color:#0E1A2E;letter-spacing:1.5px;font-weight:800;">EXPORTER / المصدر</th>
                <th style="padding:10px 8px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:9px;color:#0E1A2E;letter-spacing:1.5px;font-weight:800;">DEST</th>
                <th style="padding:10px 8px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:9px;color:#0E1A2E;letter-spacing:1.5px;font-weight:800;">STATUS</th>
              </tr>
            </thead>
            <tbody>
              ${_filtered.map((s, idx) => {
                const dest = DEST_LABELS[s.destination] || { ar: '—', en: '—', color: '#8A8578' };
                const status = STATUS_LABELS[s.status] || { ar: s.status, en: s.status, class: 'gray' };
                return `
                  <tr style="border-bottom:1px solid #F0EDE4;">
                    <td style="padding:8px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#8A8578;">${pad(idx + 1)}</td>
                    <td style="padding:8px;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:800;color:#0E1A2E;">${s.declaration_no || '—'}</td>
                    <td style="padding:8px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#6B6659;">${s.date || '—'}</td>
                    <td style="padding:8px;font-size:12px;color:#0E1A2E;font-weight:600;">${s.driver_snapshot?.name || '—'}</td>
                    <td style="padding:8px;"><span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:#0E1A2E;background:#F5F3EC;border:1px solid #E8E5DC;padding:2px 6px;border-radius:3px;direction:ltr;display:inline-block;">${s.driver_snapshot?.plate || '—'}</span></td>
                    <td style="padding:8px;font-size:12px;color:#0E1A2E;">${s.exporter || '—'}</td>
                    <td style="padding:8px;text-align:center;"><span style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;color:${dest.color};">${s.destination === 'uae' ? 'AE' : s.destination === 'bahrain' ? 'BH' : s.destination === 'oman' ? 'OM' : '—'}</span></td>
                    <td style="padding:8px;text-align:center;"><span class="modern-badge ${status.class}" style="font-size:9px;">${status.en}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>

    <!-- Notes -->
    <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:20px;margin-bottom:16px;" class="rep-notes-section">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#0E1A2E;letter-spacing:2px;font-weight:800;margin-bottom:12px;">→ NOTES / ملاحظات</div>
      <textarea id="report-note" placeholder="اكتب ملاحظات إضافية للتقرير (مثال: يوجد رد عودة على البيان رقم 134873 من الجمارك الإماراتية بخصوص...)"
        style="width:100%;min-height:80px;padding:12px 14px;border:1.5px solid #E8E5DC;border-radius:6px;font-family:Tajawal,sans-serif;font-size:13px;resize:vertical;outline:none;color:#0E1A2E;line-height:1.6;"
        oninput="_setReportNote(this.value)">${_reportNote}</textarea>
    </div>

    <!-- Footer signature area (only visible in print) -->
    <div id="print-footer" style="display:none;padding:40px 20px 20px;border-top:1px solid #E8E5DC;margin-top:20px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:60px;">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;letter-spacing:1.5px;font-weight:700;">PREPARED BY / أعده</div>
          <div style="border-bottom:1px solid #0E1A2E;height:40px;margin-top:6px;"></div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B6659;margin-top:6px;">SIGNATURE · التوقيع</div>
        </div>
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;letter-spacing:1.5px;font-weight:700;">APPROVED BY / اعتمده</div>
          <div style="border-bottom:1px solid #0E1A2E;height:40px;margin-top:6px;"></div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B6659;margin-top:6px;">SIGNATURE · التوقيع</div>
        </div>
      </div>
    </div>
  `;

  window._setReportNote = (v) => { _reportNote = v; };
  window.printReport = handlePrint;
  window.exportReportExcel = handleExcel;
}

function handlePrint() {
  document.getElementById('print-title').style.display = 'block';
  document.getElementById('print-footer').style.display = 'block';
  setTimeout(() => {
    window.print();
    setTimeout(() => {
      document.getElementById('print-title').style.display = 'none';
      document.getElementById('print-footer').style.display = 'none';
    }, 500);
  }, 100);
}

function handleExcel() {
  const periodLabel = getPeriodLabel();
  const periodCode = getPeriodCode();

  // Build CSV (Excel-compatible with BOM for Arabic)
  const BOM = '\uFEFF';
  let csv = BOM;

  // Header
  csv += `تقرير الشحنات - الصادر,${periodLabel}\n`;
  csv += `تاريخ الإصدار,${new Date().toLocaleString('ar-SA', { calendar: 'gregory' })}\n`;
  csv += `عدد الشحنات,${_filtered.length}\n\n`;

  // Summary
  csv += `الوجهة,العدد,النسبة\n`;
  ['uae','bahrain','oman'].filter(d => _destinations[d]).forEach(d => {
    const count = _filtered.filter(s => s.destination === d).length;
    const pct = _filtered.length > 0 ? Math.round((count / _filtered.length) * 100) : 0;
    csv += `${DEST_LABELS[d].ar},${count},${pct}%\n`;
  });
  csv += `\n`;

  // Full list
  csv += `#,رقم البيان,التاريخ,السائق,رقم اللوحة,المصدر,الوجهة,الحالة\n`;
  _filtered.forEach((s, idx) => {
    const dest = DEST_LABELS[s.destination]?.ar || '—';
    const status = STATUS_LABELS[s.status]?.ar || s.status || '—';
    const driver = (s.driver_snapshot?.name || '—').replace(/,/g, '،');
    const plate = (s.driver_snapshot?.plate || '—').replace(/,/g, '');
    const exporter = (s.exporter || '—').replace(/,/g, '،');
    csv += `${idx + 1},${s.declaration_no || '—'},${s.date || '—'},"${driver}","${plate}","${exporter}",${dest},${status}\n`;
  });

  // Notes
  if (_reportNote) {
    csv += `\nملاحظات\n"${_reportNote.replace(/"/g, '""')}"\n`;
  }

  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `تقرير_الشحنات_${periodCode}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
