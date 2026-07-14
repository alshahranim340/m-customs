// ─────────────────────────────────────────────
// HIJRI DATE UTILITIES
// ─────────────────────────────────────────────

const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
];

const HIJRI_DAYS = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

/**
 * Convert Gregorian date to Hijri
 */
export function toHijri(date = new Date()) {
  const d = new Date(date);
  // Use Intl API for conversion
  const hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
    year:  'numeric',
    month: '2-digit',
    day:   '2-digit'
  }).formatToParts(d);

  const year  = hijri.find(p => p.type === 'year')?.value;
  const month = hijri.find(p => p.type === 'month')?.value;
  const day   = hijri.find(p => p.type === 'day')?.value;

  return {
    year:  parseInt(year),
    month: parseInt(month),
    day:   parseInt(day),
    str:   `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`
  };
}

/**
 * Get today's Hijri date as string YYYY-MM-DD
 */
export function todayHijri() {
  return toHijri(new Date()).str;
}

/**
 * Get Hijri day name from date string
 */
export function hijriDayName(dateStr) {
  // Use today's day name if we can't parse
  return HIJRI_DAYS[new Date().getDay()];
}

/**
 * Get month name in Arabic
 */
export function hijriMonthName(month) {
  return HIJRI_MONTHS[(month - 1)] || '';
}

/**
 * Get days in a Hijri month (approximate)
 */
export function daysInHijriMonth(year, month) {
  // Hijri months alternate 30/29 days
  // Even months = 29 days, odd = 30 days (approximate)
  return month % 2 === 0 ? 29 : 30;
}

/**
 * Build Hijri picker HTML
 */
export function buildHijriPicker(id, value = '', label = 'التاريخ (هجري)') {
  const today  = toHijri();
  const parsed = (value ? parseHijriStr(value) : null) || today;

  // Years range: 1440 to current+3
  const years = [];
  for (let y = 1440; y <= today.year + 3; y++) years.push(y);

  const py = parsed.year;
  const pm = parsed.month;
  const pd = parsed.day;

  const monthsOpts = HIJRI_MONTHS.map((m, i) =>
    `<option value="${i+1}" ${pm===i+1?'selected':''}>${i+1} — ${m}</option>`
  ).join('');

  const yearsOpts = years.map(y =>
    `<option value="${y}" ${py===y?'selected':''}>${y} هـ</option>`
  ).join('');

  const daysOpts = buildDaysOpts(py, pm, pd);

  return `
    <div class="field" id="hijri-picker-${id}">
      <label>${label}</label>
      <div style="display:grid;grid-template-columns:80px 1fr 100px;gap:8px;">
        <select id="${id}-day"   onchange="updateHijriValue('${id}')" style="text-align:center;">${daysOpts}</select>
        <select id="${id}-month" onchange="updateHijriValue('${id}');rebuildHijriDays('${id}')">${monthsOpts}</select>
        <select id="${id}-year"  onchange="updateHijriValue('${id}');rebuildHijriDays('${id}')">${yearsOpts}</select>
      </div>
      <input type="hidden" id="${id}" value="${py}-${String(pm).padStart(2,'0')}-${String(pd).padStart(2,'0')}">
    </div>`;
}

function buildDaysOpts(year, month, selected) {
  const total = daysInHijriMonth(year, month);
  let opts = '';
  for (let d = 1; d <= total; d++) {
    opts += `<option value="${d}" ${selected===d?'selected':''}>${d}</option>`;
  }
  return opts;
}

function parseHijriStr(str) {
  if (!str) return null;
  // Support both YYYY-MM-DD and DD/MM/YYYY
  let parts;
  if (str.includes('-')) {
    parts = str.split('-');
  } else if (str.includes('/')) {
    parts = str.split('/').reverse(); // DD/MM/YYYY -> [YYYY, MM, DD]
  } else {
    return null;
  }
  if (parts.length !== 3) return null;
  const [a, b, c] = parts.map(Number);
  // Detect if year is first (YYYY-MM-DD) or last (from DD/MM/YYYY reversed)
  const year  = a > 1000 ? a : c;
  const month = a > 1000 ? b : b;
  const day   = a > 1000 ? c : a;
  if (!year || !month || !day) return null;
  return {
    year, month, day,
    str: `\${year}-\${month.toString().padStart(2,'0')}-\${day.toString().padStart(2,'0')}`
  };
}

// Expose to window for onchange handlers
if (typeof window !== 'undefined') {
  // Set today's hijri day name globally
  window._hijriDayName = HIJRI_DAYS[new Date().getDay()];
  window.updateHijriValue = (id) => {
    const y = document.getElementById(`${id}-year`)?.value;
    const m = document.getElementById(`${id}-month`)?.value;
    const d = document.getElementById(`${id}-day`)?.value;
    if (y && m && d) {
      const val = `${y}-${m.toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`;
      const hidden = document.getElementById(id);
      if (hidden) hidden.value = val;
    }
  };

  window.rebuildHijriDays = (id) => {
    const y     = parseInt(document.getElementById(`${id}-year`)?.value);
    const m     = parseInt(document.getElementById(`${id}-month`)?.value);
    const dayEl = document.getElementById(`${id}-day`);
    if (!dayEl) return;
    const curDay = parseInt(dayEl.value);
    dayEl.innerHTML = buildDaysOpts(y, m, Math.min(curDay, daysInHijriMonth(y, m)));
    window.updateHijriValue(id);
  };
}
