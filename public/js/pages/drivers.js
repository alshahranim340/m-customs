import { getAllDrivers, updateDriverArabicName, getDriversMissingArabic } from '../../../src/firebase/db.js';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../src/firebase/config.js';
import { toast } from '../app.js';

let _drivers = [];
let _search = '';
let _filter = 'all'; // all | missing_ar | complete

export async function renderDrivers(container) {
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
              <span class="modern-header-code">SDS/DRIVERS/2026</span>
            </div>
            <div class="modern-header-title">👤 السائقون</div>
            <div class="modern-header-sub">DRIVER DATABASE · ARABIC NAME MANAGEMENT</div>
          </div>
        </div>

        <div class="modern-stats modern-stats-3" id="drv-stats"></div>

        <div class="modern-search-bar" style="gap:8px;">
          <input type="text" id="drv-search" placeholder="🔍 بحث بالاسم أو الإقامة..."
            style="flex:1;border:1.5px solid #E8E5DC;border-radius:6px;padding:8px 14px;font-family:Tajawal,sans-serif;font-size:13px;outline:none;">
          <button class="drv-filter-btn active" data-filter="all">الكل</button>
          <button class="drv-filter-btn" data-filter="missing_ar">⚠ يحتاج ترجمة</button>
          <button class="drv-filter-btn" data-filter="complete">✓ مكتمل</button>
        </div>

        <div style="padding:0 24px 24px;">
          <div id="drv-list"><div class="loader"><div class="spinner"></div></div></div>
        </div>

      </div>
    </div>

    <style>
      .drv-filter-btn {
        padding:8px 14px;border-radius:4px;font-family:Tajawal,sans-serif;font-size:12px;
        font-weight:700;cursor:pointer;transition:all .15s;border:1.5px solid #E8E5DC;
        background:white;color:#0E1A2E;letter-spacing:.3px;
      }
      .drv-filter-btn.active { background:#0E1A2E;color:white;border-color:#0E1A2E; }
      .drv-filter-btn:hover:not(.active) { background:#F5F3EC; }

      .drv-card {
        background:white;border:1px solid #E8E5DC;border-radius:6px;padding:16px 20px;
        margin-bottom:8px;display:grid;
        grid-template-columns:auto 1fr auto auto auto;gap:16px;align-items:center;
      }
      .drv-card.missing-ar {
        background:linear-gradient(90deg,#FEF9E7 0%,white 40%);
        border-right:4px solid #C2410C;
      }
      .drv-code {
        font-family:'JetBrains Mono',monospace;font-size:11px;color:#8A8578;
        font-weight:700;letter-spacing:1px;
      }
      .drv-names { min-width:250px; }
      .drv-name-en {
        font-family:'Inter',sans-serif;font-size:14px;font-weight:800;
        color:#0E1A2E;direction:ltr;text-align:right;
      }
      .drv-name-ar { font-size:14px;color:#1C4B8E;font-weight:700;margin-top:2px; }
      .drv-name-missing {
        font-size:12px;color:#C2410C;font-weight:700;margin-top:2px;
        display:flex;align-items:center;gap:4px;
      }
      .drv-info { font-family:'JetBrains Mono',monospace;font-size:11px;color:#6B6659; }
      .drv-info-item { display:flex;align-items:center;gap:6px;margin-bottom:2px; }
      .drv-info-icon { color:#8A8578;font-size:12px; }
      .drv-actions { display:flex;gap:4px; }
      .drv-btn {
        background:transparent;border:1.5px solid #E8E5DC;border-radius:4px;
        padding:6px 12px;font-family:Tajawal,sans-serif;font-size:12px;
        cursor:pointer;color:#0E1A2E;font-weight:600;transition:all .15s;
      }
      .drv-btn:hover { background:#F5F3EC; }
      .drv-btn-primary { background:#1C4B8E;color:white;border-color:#1C4B8E; }
      .drv-btn-primary:hover { background:#0E1A2E; }
    </style>`;

  // Wire up
  document.querySelectorAll('.drv-filter-btn').forEach(btn => {
    btn.onclick = () => {
      _filter = btn.dataset.filter;
      document.querySelectorAll('.drv-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === _filter));
      renderList();
    };
  });
  document.getElementById('drv-search').oninput = (e) => { _search = e.target.value.trim().toLowerCase(); renderList(); };

  window._editArabicName = editArabicName;
  window._editDriver = editDriver;

  await loadData();
}

async function loadData() {
  try {
    _drivers = await getAllDrivers();
    renderStats();
    renderList();
  } catch (e) {
    console.error(e);
    toast('خطأ في التحميل', 'error');
  }
}

function pad(n) { return String(n).padStart(2,'0'); }

function renderStats() {
  const total = _drivers.length;
  const missingAr = _drivers.filter(d => !d.name_ar || d.name_ar.trim() === '').length;
  const complete = total - missingAr;

  document.getElementById('drv-stats').innerHTML = `
    <div class="modern-stat">
      <div class="modern-stat-lbl">01 · TOTAL</div>
      <div class="modern-stat-val">${pad(total)}</div>
      <div class="modern-stat-hint">إجمالي السائقين</div>
    </div>
    <div class="modern-stat">
      <div class="modern-stat-lbl">02 · MISSING AR</div>
      <div class="modern-stat-val amber">${pad(missingAr)}</div>
      <div class="modern-stat-hint">يحتاج اسم عربي</div>
    </div>
    <div class="modern-stat">
      <div class="modern-stat-lbl">03 · COMPLETE</div>
      <div class="modern-stat-val green">${pad(complete)}</div>
      <div class="modern-stat-hint">بيانات مكتملة</div>
    </div>`;
}

function renderList() {
  const el = document.getElementById('drv-list');

  let list = [..._drivers];

  // Filter
  if (_filter === 'missing_ar') list = list.filter(d => !d.name_ar || !d.name_ar.trim());
  else if (_filter === 'complete') list = list.filter(d => d.name_ar && d.name_ar.trim());

  // Search
  if (_search) {
    list = list.filter(d =>
      (d.name_en || '').toLowerCase().includes(_search) ||
      (d.name_ar || '').toLowerCase().includes(_search) ||
      (d.iqama || '').toLowerCase().includes(_search)
    );
  }

  // Sort: missing_ar first, then by name_en
  list.sort((a, b) => {
    const aMiss = !a.name_ar || !a.name_ar.trim();
    const bMiss = !b.name_ar || !b.name_ar.trim();
    if (aMiss !== bMiss) return aMiss ? -1 : 1;
    return (a.name_en || '').localeCompare(b.name_en || '');
  });

  if (list.length === 0) {
    el.innerHTML = `
      <div class="modern-empty">
        <div class="modern-empty-icon">👤</div>
        <div class="modern-empty-title">لا يوجد سائقون</div>
        <div class="modern-empty-sub">يُضافون تلقائياً من قسم النقل</div>
      </div>`;
    return;
  }

  el.innerHTML = list.map((d, idx) => renderCard(d, idx + 1)).join('');
}

function renderCard(d, num) {
  const missingAr = !d.name_ar || !d.name_ar.trim();
  const cardClass = missingAr ? 'drv-card missing-ar' : 'drv-card';

  return `
    <div class="${cardClass}">
      <div class="drv-code">#${pad(num)}</div>
      <div class="drv-names">
        <div class="drv-name-en">${d.name_en || '—'}</div>
        ${missingAr
          ? `<div class="drv-name-missing"><i class="ti ti-alert-triangle"></i> يحتاج اسم عربي</div>`
          : `<div class="drv-name-ar">${d.name_ar}</div>`
        }
      </div>
      <div class="drv-info">
        <div class="drv-info-item">
          <i class="ti ti-id drv-info-icon"></i>
          <span>${d.iqama || '—'}</span>
        </div>
        <div class="drv-info-item">
          <i class="ti ti-flag drv-info-icon"></i>
          <span>${d.nationality || '—'}</span>
        </div>
      </div>
      <div class="drv-info">
        <div class="drv-info-item">
          <i class="ti ti-phone drv-info-icon"></i>
          <span>${d.phone || '—'}</span>
        </div>
        <div class="drv-info-item">
          <i class="ti ti-truck drv-info-icon"></i>
          <span>${d.truck_number || '—'}</span>
        </div>
      </div>
      <div class="drv-actions">
        ${missingAr
          ? `<button class="drv-btn drv-btn-primary" onclick="_editArabicName('${d.id}')"><i class="ti ti-language"></i> اسم عربي</button>`
          : `<button class="drv-btn" onclick="_editDriver('${d.id}')"><i class="ti ti-edit"></i> تعديل</button>`
        }
      </div>
    </div>`;
}

async function editArabicName(id) {
  const driver = _drivers.find(d => d.id === id);
  if (!driver) return;
  const current = driver.name_ar || '';
  const val = prompt(`الاسم بالعربي لـ:\n${driver.name_en}`, current);
  if (val === null) return;
  const trimmed = val.trim();
  if (!trimmed) {
    toast('اكتب اسماً صحيحاً', 'error');
    return;
  }
  try {
    await updateDriverArabicName(id, trimmed);
    await loadData();
    toast('✓ تم حفظ الاسم العربي', 'success');
  } catch (e) {
    console.error(e);
    toast('خطأ في الحفظ', 'error');
  }
}

async function editDriver(id) {
  const driver = _drivers.find(d => d.id === id);
  if (!driver) return;

  // Build a simple prompt-based edit for all mutable fields
  const nameAr = prompt(`الاسم العربي:`, driver.name_ar || '');
  if (nameAr === null) return;
  const phone = prompt(`رقم الجوال:`, driver.phone || '');
  if (phone === null) return;
  const truck = prompt(`رقم الشاحنة الحالي:`, driver.truck_number || '');
  if (truck === null) return;
  const nationality = prompt(`الجنسية:`, driver.nationality || '');
  if (nationality === null) return;

  try {
    await updateDoc(doc(db, 'drivers', id), {
      name_ar: nameAr.trim(),
      phone: phone.trim(),
      truck_number: truck.trim(),
      nationality: nationality.trim(),
      updated_at: serverTimestamp(),
    });
    await loadData();
    toast('✓ تم التحديث', 'success');
  } catch (e) {
    console.error(e);
    toast('خطأ في التحديث', 'error');
  }
}
