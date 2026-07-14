// ─────────────────────────────────────────────
// HIJRI DATE UTILITIES
// ─────────────────────────────────────────────

const HIJRI_MONTHS = [
  'محرم','صفر','ربيع الأول','ربيع الآخر',
  'جمادى الأولى','جمادى الآخرة','رجب','شعبان',
  'رمضان','شوال','ذو القعدة','ذو الحجة'
];

const HIJRI_DAYS = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

export function toHijri(date = new Date()) {
  const hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
    year:'numeric', month:'2-digit', day:'2-digit'
  }).formatToParts(date);
  const y = parseInt(hijri.find(p=>p.type==='year')?.value);
  const m = parseInt(hijri.find(p=>p.type==='month')?.value);
  const d = parseInt(hijri.find(p=>p.type==='day')?.value);
  return { year:y, month:m, day:d, str:`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}` };
}

export function todayHijri() {
  return toHijri().str;
}

export function hijriDayName() {
  return HIJRI_DAYS[new Date().getDay()];
}

function daysInMonth(month) {
  return month % 2 === 0 ? 29 : 30;
}

function parseDate(val) {
  if (!val) return null;
  let y, m, d;
  if (val.includes('-')) {
    [y, m, d] = val.split('-').map(Number);
  } else if (val.includes('/')) {
    [d, m, y] = val.split('/').map(Number);
  }
  if (!y || !m || !d) return null;
  return { year:y, month:m, day:d };
}

// Build picker using DOM directly (no template string issues)
export function buildHijriPicker(id, value, label) {
  const today  = toHijri();
  const parsed = parseDate(value) || today;

  const Y = parsed.year;
  const M = parsed.month;
  const D = parsed.day;

  // Container
  const wrap = document.createElement('div');
  wrap.className = 'field';
  wrap.id = `hijri-picker-${id}`;

  // Label
  const lbl = document.createElement('label');
  lbl.textContent = label || 'التاريخ (هجري)';
  wrap.appendChild(lbl);

  // Grid
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:70px 1fr 105px;gap:8px;';
  wrap.appendChild(grid);

  // Hidden input
  const hidden = document.createElement('input');
  hidden.type = 'hidden';
  hidden.id   = id;
  hidden.value = `${Y}-${String(M).padStart(2,'0')}-${String(D).padStart(2,'0')}`;
  wrap.appendChild(hidden);

  // Update hidden value
  function update() {
    const y = parseInt(yearSel.value);
    const m = parseInt(monthSel.value);
    const d = parseInt(daySel.value);
    hidden.value = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  // Rebuild days when year/month changes
  function rebuildDays(selYear, selMonth, selDay) {
    const total = daysInMonth(selMonth);
    daySel.innerHTML = '';
    for (let i = 1; i <= total; i++) {
      const o = document.createElement('option');
      o.value = i;
      o.textContent = i;
      if (i === selDay) o.selected = true;
      daySel.appendChild(o);
    }
    update();
  }

  // DAY select
  const daySel = document.createElement('select');
  daySel.id = `${id}-day`;
  daySel.style.textAlign = 'center';
  rebuildDays(Y, M, D);
  daySel.addEventListener('change', update);
  grid.appendChild(daySel);

  // MONTH select
  const monthSel = document.createElement('select');
  monthSel.id = `${id}-month`;
  HIJRI_MONTHS.forEach((name, i) => {
    const o = document.createElement('option');
    o.value = i + 1;
    o.textContent = `${i+1} — ${name}`;
    if (i + 1 === M) o.selected = true;
    monthSel.appendChild(o);
  });
  monthSel.addEventListener('change', () => {
    rebuildDays(parseInt(yearSel.value), parseInt(monthSel.value), parseInt(daySel.value));
  });
  grid.appendChild(monthSel);

  // YEAR select
  const yearSel = document.createElement('select');
  yearSel.id = `${id}-year`;
  for (let y = 1440; y <= today.year + 3; y++) {
    const o = document.createElement('option');
    o.value = y;
    o.textContent = `${y} هـ`;
    if (y === Y) o.selected = true;
    yearSel.appendChild(o);
  }
  yearSel.addEventListener('change', () => {
    rebuildDays(parseInt(yearSel.value), parseInt(monthSel.value), parseInt(daySel.value));
  });
  grid.appendChild(yearSel);

  return wrap;
}

// Set global day name
if (typeof window !== 'undefined') {
  window._hijriDayName = HIJRI_DAYS[new Date().getDay()];
}
