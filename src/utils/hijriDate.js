// ─────────────────────────────────────────────
// HIJRI DATE — Calendar picker with auto conversion
// ─────────────────────────────────────────────

const HIJRI_DAYS = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

/**
 * Convert Gregorian date to Hijri string
 */
export function toHijri(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-u-ca-islamic', {
    year:'numeric', month:'2-digit', day:'2-digit'
  }).formatToParts(date);
  const y = parts.find(p=>p.type==='year')?.value.replace(/\s*AH/,'');
  const m = parts.find(p=>p.type==='month')?.value;
  const d = parts.find(p=>p.type==='day')?.value;
  return `${y}-${m}-${d}`;
}

export function todayHijri() {
  return toHijri(new Date());
}

export function hijriDayName() {
  return HIJRI_DAYS[new Date().getDay()];
}

/**
 * Build a calendar date picker that shows Hijri equivalent
 * Returns a DOM element
 */
export function buildHijriPicker(id, savedHijriValue, label) {
  const wrap = document.createElement('div');
  wrap.className = 'field';

  // Label
  const lbl = document.createElement('label');
  lbl.textContent = label || 'التاريخ (هجري)';
  wrap.appendChild(lbl);

  // Container
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:10px;align-items:center;';
  wrap.appendChild(row);

  // Calendar input (Gregorian)
  const calInput = document.createElement('input');
  calInput.type = 'date';
  calInput.style.cssText = 'flex:1;padding:9px 12px;border:0.5px solid #D8E2EE;border-radius:8px;font-size:13px;font-family:Tajawal,sans-serif;outline:none;';
  calInput.valueAsDate = new Date(); // default today
  row.appendChild(calInput);

  // Hijri display
  const hijriBox = document.createElement('div');
  hijriBox.style.cssText = 'flex:1;padding:9px 12px;background:#EBF4FF;border:0.5px solid #2563a8;border-radius:8px;font-size:13px;font-weight:700;color:#1C2D4E;text-align:center;direction:ltr;';
  hijriBox.textContent = toHijri(new Date());
  row.appendChild(hijriBox);

  // Hidden input for form value
  const hidden = document.createElement('input');
  hidden.type = 'hidden';
  hidden.id = id;
  hidden.value = toHijri(new Date());
  wrap.appendChild(hidden);

  // Update on change
  calInput.addEventListener('change', () => {
    const selected = calInput.valueAsDate || new Date();
    const hijriStr = toHijri(selected);
    hijriBox.textContent = hijriStr;
    hidden.value = hijriStr;
    // Store day name
    hidden.dataset.dayName = HIJRI_DAYS[selected.getDay()];
    hidden.dataset.gregorian = calInput.value;
  });

  // Set initial day name
  hidden.dataset.dayName = HIJRI_DAYS[new Date().getDay()];
  hidden.dataset.gregorian = calInput.value;

  // If we have a saved value, show it
  if (savedHijriValue && savedHijriValue.includes('-')) {
    hijriBox.textContent = savedHijriValue;
    hidden.value = savedHijriValue;
  }

  return wrap;
}

/**
 * Get day name for a specific date (from calendar input)
 */
export function getDayName(gregorianDateStr) {
  try {
    const d = gregorianDateStr ? new Date(gregorianDateStr) : new Date();
    return HIJRI_DAYS[d.getDay()];
  } catch(e) {
    return HIJRI_DAYS[new Date().getDay()];
  }
}

// Set global day name
if (typeof window !== 'undefined') {
  window._hijriDayName = HIJRI_DAYS[new Date().getDay()];
}
