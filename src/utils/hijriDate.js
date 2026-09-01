// ─────────────────────────────────────────────
// HIJRI DATE — Calendar picker with auto conversion
// ─────────────────────────────────────────────

const HIJRI_DAYS = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

/**
 * Convert Gregorian date to Hijri string YYYY-MM-DD
 */
export function toHijri(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
    year:'numeric', month:'2-digit', day:'2-digit'
  }).formatToParts(date);
  const y = parts.find(p=>p.type==='year')?.value.replace(/[^0-9]/g,'');
  const m = parts.find(p=>p.type==='month')?.value;
  const d = parts.find(p=>p.type==='day')?.value;
  return `${y}-${m}-${d}`;
}

/**
 * Convert Hijri string (YYYY-MM-DD) to Gregorian Date
 *
 * FIX: الكود القديم يتأرجح بين تاريخين ولا يتقارب.
 * الحل: بحث ±90 يوم حول التقدير — مضمون الوصول للتاريخ الصحيح.
 */
export function hijriToGregorian(hijriStr) {
  if (!hijriStr) return new Date();

  const parts = hijriStr.includes('-')
    ? hijriStr.split('-').map(Number)
    : hijriStr.split('/').map(Number);

  const [hy, hm, hd] = parts;
  if (!hy || !hm || !hd) return new Date();

  const target = `${hy}-${String(hm).padStart(2,'0')}-${String(hd).padStart(2,'0')}`;

  // نقطة البداية: حساب تقديري من الحقبة الإسلامية
  // Epoch: July 19, 622 CE (proleptic Gregorian) = 1 Muharram 1 AH
  const epochMs   = new Date(622, 6, 19).getTime();
  const approxMs  = ((hy - 1) * 354.367 + (hm - 1) * 29.53 + hd) * 86400000;
  const estimate  = new Date(epochMs + approxMs);
  const DAY_MS    = 86400000;

  // بحث ±90 يوم حول التقدير (يتعامل مع أي انزياح في الحساب)
  for (let delta = 0; delta <= 90; delta++) {
    // بحث للأمام
    const fwd = new Date(estimate.getTime() + delta * DAY_MS);
    if (toHijri(fwd) === target) return fwd;

    // بحث للخلف
    if (delta > 0) {
      const bwd = new Date(estimate.getTime() - delta * DAY_MS);
      if (toHijri(bwd) === target) return bwd;
    }
  }

  // fallback: إرجاع التقدير إذا لم يُوجد تطابق
  console.warn('[hijriToGregorian] No exact match for', hijriStr);
  return estimate;
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
