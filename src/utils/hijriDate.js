// ─────────────────────────────────────────────
// HIJRI DATE — Calendar picker with auto conversion
// ─────────────────────────────────────────────

const HIJRI_DAYS = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

/**
 * Convert Gregorian date to Hijri string YYYY-MM-DD
 */
export function toHijri(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-u-ca-islamic-nu-latn', {
    year:'numeric', month:'2-digit', day:'2-digit'
  }).formatToParts(date);
  const y = parts.find(p=>p.type==='year')?.value.replace(/[^0-9]/g,'');
  const m = parts.find(p=>p.type==='month')?.value;
  const d = parts.find(p=>p.type==='day')?.value;
  return `${y}-${m}-${d}`;
}

/**
 * Convert Hijri string (YYYY-MM-DD) to approximate Gregorian Date
 */
export function hijriToGregorian(hijriStr) {
  if (!hijriStr) return new Date();
  // Parse hijri
  let parts;
  if (hijriStr.includes('-')) parts = hijriStr.split('-').map(Number);
  else if (hijriStr.includes('/')) parts = hijriStr.split('/').reverse().map(Number);
  else return new Date();

  const [hy, hm, hd] = parts;
  if (!hy || !hm || !hd) return new Date();

  // Search for matching gregorian date (binary-ish search around estimate)
  // Estimate: Hijri year * 354.367 days from epoch
  // Islamic epoch: July 16, 622 CE
  const estimateDays = Math.floor((hy - 1) * 354.367 + (hm - 1) * 29.53 + hd);
  let guess = new Date(622, 6, 16);
  guess.setDate(guess.getDate() + estimateDays);

  // Refine: adjust until toHijri matches
  const target = `${hy}-${String(hm).padStart(2,'0')}-${String(hd).padStart(2,'0')}`;
  for (let i = 0; i < 15; i++) {
    const current = toHijri(guess);
    if (current === target) break;
    // Compare and adjust by 1 day
    const [cy, cm, cd] = current.split('-').map(Number);
    const diff = (hy - cy) * 354 + (hm - cm) * 29.5 + (hd - cd);
    if (Math.abs(diff) < 1) {
      guess.setDate(guess.getDate() + (diff > 0 ? 1 : -1));
    } else {
      guess.setDate(guess.getDate() + Math.round(diff));
    }
  }
  return guess;
}

export function todayHijri() {
  return toHijri(new Date());
}

export function hijriDayName() {
  return HIJRI_DAYS[new Date().getDay()];
}

export function getDayName(gregorianDateStr) {
  try {
    const d = gregorianDateStr ? new Date(gregorianDateStr) : new Date();
    return HIJRI_DAYS[d.getDay()];
  } catch(e) {
    return HIJRI_DAYS[new Date().getDay()];
  }
}

/**
 * Get day name in Arabic for a given Hijri date string
 */
export function dayNameFromHijri(hijriStr) {
  const greg = hijriToGregorian(hijriStr);
  return HIJRI_DAYS[greg.getDay()];
}

/**
 * Build calendar date picker → returns DOM element
 */
export function buildHijriPicker(id, savedHijriValue, label) {
  const wrap = document.createElement('div');
  wrap.className = 'field';

  const lbl = document.createElement('label');
  lbl.textContent = label || 'التاريخ (هجري)';
  wrap.appendChild(lbl);

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:10px;align-items:center;';
  wrap.appendChild(row);

  // Determine initial Gregorian date
  let initialGreg = new Date();
  if (savedHijriValue && (savedHijriValue.includes('-') || savedHijriValue.includes('/'))) {
    initialGreg = hijriToGregorian(savedHijriValue);
  }
  const initialHijri = savedHijriValue && savedHijriValue.includes('-')
    ? savedHijriValue
    : toHijri(initialGreg);

  // Calendar input (Gregorian)
  const calInput = document.createElement('input');
  calInput.type = 'date';
  calInput.style.cssText = 'flex:1;padding:9px 12px;border:0.5px solid #D8E2EE;border-radius:8px;font-size:13px;font-family:Tajawal,sans-serif;outline:none;';
  calInput.valueAsDate = initialGreg;
  row.appendChild(calInput);

  // Hijri display box
  const hijriBox = document.createElement('div');
  hijriBox.style.cssText = 'flex:1;padding:9px 12px;background:#EBF4FF;border:0.5px solid #2563a8;border-radius:8px;font-size:13px;font-weight:700;color:#1C2D4E;text-align:center;direction:ltr;';
  hijriBox.textContent = initialHijri;
  row.appendChild(hijriBox);

  // Hidden value
  const hidden = document.createElement('input');
  hidden.type = 'hidden';
  hidden.id = id;
  hidden.value = initialHijri;
  hidden.dataset.dayName   = HIJRI_DAYS[initialGreg.getDay()];
  hidden.dataset.gregorian = calInput.value;
  wrap.appendChild(hidden);

  // Update on change
  calInput.addEventListener('change', () => {
    const selected = calInput.valueAsDate || new Date();
    const hijriStr = toHijri(selected);
    hijriBox.textContent      = hijriStr;
    hidden.value              = hijriStr;
    hidden.dataset.dayName    = HIJRI_DAYS[selected.getDay()];
    hidden.dataset.gregorian  = calInput.value;
  });

  return wrap;
}

// Global day name
if (typeof window !== 'undefined') {
  window._hijriDayName = HIJRI_DAYS[new Date().getDay()];
}
