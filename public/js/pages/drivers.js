import { getAllDrivers, updateDriverArabicName, getDriversMissingArabic, softDeleteDriver, restoreDeletedDriver, getDeletedDrivers } from '../../../src/firebase/db.js';
import { getCurrentUser } from '../../../src/firebase/auth.js';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../src/firebase/config.js';
import { toast } from '../app.js';

let _drivers = [];          // active drivers only (not soft-deleted)
let _deletedDrivers = [];   // soft-deleted drivers (for admin recovery)
let _profile = null;        // current user profile (for role check + deleted_by tracking)
let _search = '';
let _filter = 'all'; // all | missing_ar | complete
let _undoTimer = null;

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
          <div class="modern-header-actions">
            <button class="modern-btn" onclick="_openAddDriverModal()" style="background:#0E1A2E;color:white;border-color:#0E1A2E;">
              <i class="ti ti-user-plus"></i> إضافة سائق
            </button>
            <button class="modern-btn" onclick="_exportDriversCSV()" style="background:#2E8B57;color:white;border-color:#2E8B57;">
              <i class="ti ti-file-spreadsheet"></i> تصدير CSV
            </button>
          </div>
        </div>

        <div class="modern-stats modern-stats-3" id="drv-stats"></div>

        <div class="modern-search-bar" style="gap:8px;">
          <input type="text" id="drv-search" placeholder="🔍 بحث بالاسم، الإقامة، أو رقم الشاحنة..."
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
      .drv-btn-danger {
        background:transparent;border-color:#E8E5DC;color:#6B6659;
        padding:6px 10px;
      }
      .drv-btn-danger:hover {
        background:#FEF2F2;border-color:#CC2229;color:#CC2229;
      }
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
  window._deleteDriver = deleteDriver;
  window._closeDeleteModal = closeDeleteModal;
  window._confirmDeleteDriver = confirmDeleteDriver;
  window._openAddDriverModal = openAddDriverModal;

  await loadData();
}

function openAddDriverModal() {
  openDriverModal({}, 'add');
}

async function loadData() {
  try {
    // Load current user profile once (for role check + deleted_by name)
    if (!_profile) {
      const user = getCurrentUser();
      if (user) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) _profile = { uid: user.uid, ...snap.data() };
        } catch (e) { console.warn('profile load failed:', e); }
      }
    }

    // Fetch active + deleted in parallel (getAllDrivers now excludes soft-deleted)
    const [active, deleted] = await Promise.all([
      getAllDrivers(),
      getDeletedDrivers(),
    ]);
    _drivers = active;
    _deletedDrivers = deleted;
    renderStats();
    renderList();
    updateDeletedDrawer();
  } catch (e) {
    console.error(e);
    toast('خطأ في التحميل', 'error');
  }
}

function pad(n) { return String(n).padStart(2,'0'); }

// Detect if a string contains Arabic characters
function hasArabic(s) {
  if (!s) return false;
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(s);
}

function renderStats() {
  const total = _drivers.length;
  // A driver is "missing arabic" ONLY if no field contains Arabic characters
  const missingAr = _drivers.filter(d => {
    const nameAr = d.name_ar || '';
    const nameEn = d.name_en || '';
    const nameLegacy = d.name || '';
    // If any field contains Arabic chars, we have the Arabic name
    return !hasArabic(nameAr) && !hasArabic(nameEn) && !hasArabic(nameLegacy);
  }).length;
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

  // Normalize drivers: figure out the best Arabic + English display names
  // If any field contains Arabic chars, use it as the Arabic display name
  _drivers.forEach(d => {
    const nameAr = d.name_ar || '';
    const nameEn = d.name_en || '';
    const nameLegacy = d.name || '';

    // Arabic display: prefer name_ar, then check if legacy 'name' is Arabic, then check name_en
    if (hasArabic(nameAr)) {
      d._displayNameAr = nameAr;
    } else if (hasArabic(nameLegacy)) {
      d._displayNameAr = nameLegacy;
    } else if (hasArabic(nameEn)) {
      // Arabic name was written in the English field
      d._displayNameAr = nameEn;
    } else {
      d._displayNameAr = '';
    }

    // English display: prefer name_en (only if not Arabic), then check legacy 'name'
    if (nameEn && !hasArabic(nameEn)) {
      d._displayNameEn = nameEn;
    } else if (nameLegacy && !hasArabic(nameLegacy)) {
      d._displayNameEn = nameLegacy;
    } else {
      d._displayNameEn = '';
    }
  });

  let list = [..._drivers];

  // Filter
  if (_filter === 'missing_ar') list = list.filter(d => !d._displayNameAr || !d._displayNameAr.trim());
  else if (_filter === 'complete') list = list.filter(d => d._displayNameAr && d._displayNameAr.trim());

  // Search
  if (_search) {
    list = list.filter(d => {
      // Search truck number (current + legacy vehicles array)
      let trucks = [d.truck_number || ''];
      if (d.vehicles && Array.isArray(d.vehicles)) {
        trucks = trucks.concat(d.vehicles.map(v => v.plate || ''));
      }
      const truckMatch = trucks.some(t => t.toLowerCase().includes(_search));
      return (
        (d._displayNameEn || '').toLowerCase().includes(_search) ||
        (d._displayNameAr || '').toLowerCase().includes(_search) ||
        (d.name || '').toLowerCase().includes(_search) ||
        (d.iqama || '').toLowerCase().includes(_search) ||
        truckMatch
      );
    });
  }

  // Sort: missing_ar first, then by name
  list.sort((a, b) => {
    const aMiss = !a._displayNameAr || !a._displayNameAr.trim();
    const bMiss = !b._displayNameAr || !b._displayNameAr.trim();
    if (aMiss !== bMiss) return aMiss ? -1 : 1;
    return (a._displayNameEn || a._displayNameAr || '').localeCompare(b._displayNameEn || b._displayNameAr || '');
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
  const missingAr = !d._displayNameAr || !d._displayNameAr.trim();
  const cardClass = missingAr ? 'drv-card missing-ar' : 'drv-card';

  // Support legacy drivers: get plate from vehicles array (last one)
  let plate = d.truck_number || '';
  if (!plate && d.vehicles && d.vehicles.length > 0) {
    plate = d.vehicles[d.vehicles.length - 1].plate || '';
  }

  return `
    <div class="${cardClass}">
      <div class="drv-code">#${pad(num)}</div>
      <div class="drv-names">
        ${d._displayNameEn
          ? `<div class="drv-name-en">${d._displayNameEn}</div>`
          : ''
        }
        ${missingAr
          ? `<div class="drv-name-missing"><i class="ti ti-alert-triangle"></i> يحتاج اسم عربي</div>`
          : `<div class="drv-name-ar">${d._displayNameAr}</div>`
        }
      </div>
      <div class="drv-info">
        <div class="drv-info-item">
          <i class="ti ti-id drv-info-icon"></i>
          <span>${d.iqama || d.passport_country || '—'}</span>
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
          <span>${plate || '—'}</span>
        </div>
      </div>
      <div class="drv-actions">
        ${missingAr
          ? `<button class="drv-btn drv-btn-primary" onclick="_editArabicName('${d.id}')"><i class="ti ti-language"></i> اسم عربي</button>`
          : `<button class="drv-btn" onclick="_editDriver('${d.id}')"><i class="ti ti-edit"></i> تعديل</button>`
        }
        <button class="drv-btn drv-btn-danger" onclick="_deleteDriver('${d.id}')" title="حذف السائق">
          <i class="ti ti-trash"></i>
        </button>
      </div>
    </div>`;
}

async function editArabicName(id) {
  const driver = _drivers.find(d => d.id === id);
  if (!driver) return;
  openDriverModal(driver, 'ar-only');
}

async function editDriver(id) {
  const driver = _drivers.find(d => d.id === id);
  if (!driver) return;
  openDriverModal(driver, 'full');
}

function openDriverModal(driver, mode) {
  // Remove any existing modal
  const existing = document.getElementById('drv-modal');
  if (existing) existing.remove();

  const isAdd = mode === 'add';
  const displayNameEn = isAdd ? '' : (driver._displayNameEn || driver.name_en || '');
  const displayNameAr = isAdd ? '' : (driver._displayNameAr || driver.name_ar || driver.name || '');

  // Get current plate
  let currentPlate = '';
  if (!isAdd) {
    currentPlate = driver.truck_number || '';
    if (!currentPlate && driver.vehicles && driver.vehicles.length > 0) {
      currentPlate = driver.vehicles[driver.vehicles.length - 1].plate || '';
    }
  }

  const titleMap = {
    'ar-only': '✏ إضافة اسم عربي',
    'full':    '✏ تعديل بيانات السائق',
    'add':     '➕ إضافة سائق جديد',
  };
  const codeMap = {
    'ar-only': 'SDS/DRIVER/EDIT',
    'full':    'SDS/DRIVER/EDIT',
    'add':     'SDS/DRIVER/NEW',
  };

  const modal = document.createElement('div');
  modal.id = 'drv-modal';
  modal.innerHTML = `
    <div class="drv-modal-backdrop" onclick="_closeDriverModal(event)"></div>
    <div class="drv-modal-box">

      <!-- Header -->
      <div class="drv-modal-header">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;letter-spacing:2px;font-weight:700;">${codeMap[mode] || 'SDS/DRIVER'}</div>
          <div style="font-size:20px;color:#0E1A2E;font-weight:800;margin-top:2px;">
            ${titleMap[mode] || '✏ تعديل بيانات السائق'}
          </div>
          ${displayNameEn ? `<div style="font-family:'Inter',sans-serif;font-size:13px;color:#6B6659;margin-top:4px;direction:ltr;text-align:right;">${displayNameEn}</div>` : ''}
        </div>
        <button class="drv-modal-close" onclick="_closeDriverModal(true)">
          <i class="ti ti-x"></i>
        </button>
      </div>

      <!-- Body -->
      <div class="drv-modal-body">

        <!-- Arabic name (always shown) -->
        <div class="drv-field">
          <label class="drv-label">
            <span class="drv-label-num">01</span>
            <span>الاسم بالعربي</span>
            <span class="drv-label-hint">AR NAME · Required</span>
          </label>
          <input type="text" id="drv-input-name-ar" value="${displayNameAr}"
            placeholder="مثال: بارامجيت كشمير"
            class="drv-input" style="direction:rtl;">
        </div>

        ${(mode === 'full' || mode === 'add') ? `
          <!-- English name -->
          <div class="drv-field">
            <label class="drv-label">
              <span class="drv-label-num">02</span>
              <span>الاسم بالإنجليزي</span>
              <span class="drv-label-hint">EN NAME</span>
            </label>
            <input type="text" id="drv-input-name-en" value="${displayNameEn}"
              placeholder="EXAMPLE: PARAMJIT KASHMIR"
              class="drv-input" style="direction:ltr;text-align:left;">
          </div>

          <!-- Iqama -->
          <div class="drv-field">
            <label class="drv-label">
              <span class="drv-label-num">03</span>
              <span>رقم الإقامة</span>
              <span class="drv-label-hint">IQAMA / ID</span>
            </label>
            <input type="text" id="drv-input-iqama" value="${driver.iqama || ''}"
              placeholder="2481671556"
              class="drv-input" style="direction:ltr;text-align:right;font-family:'JetBrains Mono',monospace;">
          </div>

          <!-- Nationality + Phone (grid) -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div class="drv-field">
              <label class="drv-label">
                <span class="drv-label-num">04</span>
                <span>الجنسية</span>
                <span class="drv-label-hint">NATIONALITY</span>
              </label>
              <input type="text" id="drv-input-nationality" value="${driver.nationality || ''}"
                placeholder="هندي"
                class="drv-input" style="direction:rtl;">
            </div>
            <div class="drv-field">
              <label class="drv-label">
                <span class="drv-label-num">05</span>
                <span>رقم الجوال</span>
                <span class="drv-label-hint">PHONE</span>
              </label>
              <input type="text" id="drv-input-phone" value="${driver.phone || ''}"
                placeholder="0501234567"
                class="drv-input" style="direction:ltr;text-align:right;font-family:'JetBrains Mono',monospace;">
            </div>
          </div>

          <!-- Truck -->
          <div class="drv-field">
            <label class="drv-label">
              <span class="drv-label-num">06</span>
              <span>رقم الشاحنة الحالي</span>
              <span class="drv-label-hint">CURRENT TRUCK #</span>
            </label>
            <input type="text" id="drv-input-truck" value="${currentPlate}"
              placeholder="9691"
              class="drv-input" style="direction:ltr;text-align:right;font-family:'JetBrains Mono',monospace;">
          </div>
        ` : `
          <!-- Info card in ar-only mode -->
          <div class="drv-info-card">
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:2px;font-weight:700;margin-bottom:8px;">DRIVER INFO</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">
              <div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:1px;">IQAMA</div>
                <div style="font-family:'JetBrains Mono',monospace;color:#0E1A2E;font-weight:700;margin-top:2px;">${driver.iqama || '—'}</div>
              </div>
              <div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:1px;">NATIONALITY</div>
                <div style="color:#0E1A2E;font-weight:700;margin-top:2px;">${driver.nationality || '—'}</div>
              </div>
              <div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:1px;">PHONE</div>
                <div style="font-family:'JetBrains Mono',monospace;color:#0E1A2E;font-weight:700;margin-top:2px;">${driver.phone || '—'}</div>
              </div>
              <div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:1px;">TRUCK #</div>
                <div style="font-family:'JetBrains Mono',monospace;color:#0E1A2E;font-weight:700;margin-top:2px;">${currentPlate || '—'}</div>
              </div>
            </div>
          </div>
        `}

      </div>

      <!-- Footer -->
      <div class="drv-modal-footer">
        <button class="drv-btn" onclick="_closeDriverModal(true)">إلغاء</button>
        <button class="drv-btn drv-btn-primary" onclick="_saveDriverModal('${driver?.id || ''}', '${mode}')">
          <i class="ti ti-device-floppy"></i> ${isAdd ? 'إضافة السائق' : 'حفظ التعديلات'}
        </button>
      </div>

    </div>

    <style>
      #drv-modal {
        position:fixed;inset:0;z-index:9999;
        display:flex;align-items:center;justify-content:center;
        padding:20px;
        font-family:'Tajawal',sans-serif;
        animation:drvFadeIn 0.15s ease-out;
      }
      @keyframes drvFadeIn { from { opacity:0; } to { opacity:1; } }
      .drv-modal-backdrop {
        position:absolute;inset:0;
        background:rgba(14,26,46,0.65);
        backdrop-filter:blur(2px);
      }
      .drv-modal-box {
        position:relative;background:#FAFAF7;
        border:1px solid #E8E5DC;border-radius:10px;
        width:100%;max-width:560px;max-height:90vh;
        display:flex;flex-direction:column;
        overflow:hidden;
        box-shadow:0 20px 50px rgba(14,26,46,0.25);
        animation:drvSlideUp 0.2s ease-out;
      }
      @keyframes drvSlideUp {
        from { transform:translateY(20px);opacity:0; }
        to { transform:translateY(0);opacity:1; }
      }
      .drv-modal-header {
        display:flex;justify-content:space-between;align-items:flex-start;
        padding:20px 24px;background:white;
        border-bottom:1px solid #E8E5DC;
      }
      .drv-modal-close {
        background:transparent;border:1.5px solid #E8E5DC;
        border-radius:6px;width:34px;height:34px;
        display:flex;align-items:center;justify-content:center;
        cursor:pointer;color:#6B6659;transition:all 0.15s;
      }
      .drv-modal-close:hover {
        background:#FEF2F2;border-color:#CC2229;color:#CC2229;
      }
      .drv-modal-body {
        padding:20px 24px;overflow-y:auto;
        display:flex;flex-direction:column;gap:14px;
      }
      .drv-modal-footer {
        display:flex;justify-content:flex-end;gap:8px;
        padding:16px 24px;background:white;
        border-top:1px solid #E8E5DC;
      }
      .drv-field { display:flex;flex-direction:column;gap:6px; }
      .drv-label {
        display:flex;align-items:center;gap:8px;
        font-size:13px;font-weight:700;color:#0E1A2E;
      }
      .drv-label-num {
        font-family:'JetBrains Mono',monospace;font-size:10px;
        background:#0E1A2E;color:white;
        padding:2px 6px;border-radius:3px;
        letter-spacing:1px;font-weight:800;
      }
      .drv-label-hint {
        font-family:'JetBrains Mono',monospace;font-size:9px;
        color:#8A8578;letter-spacing:1.5px;
        margin-right:auto;font-weight:700;
      }
      .drv-input {
        width:100%;border:1.5px solid #E8E5DC;border-radius:6px;
        padding:10px 14px;font-family:'Tajawal',sans-serif;font-size:14px;
        color:#0E1A2E;background:white;
        transition:all 0.15s;outline:none;
      }
      .drv-input:focus {
        border-color:#1C4B8E;
        box-shadow:0 0 0 3px rgba(28,75,142,0.1);
      }
      .drv-info-card {
        background:white;border:1px solid #E8E5DC;
        border-radius:6px;padding:14px;
      }
    </style>
  `;

  document.body.appendChild(modal);

  // Focus the first input
  setTimeout(() => {
    const firstInput = mode === 'ar-only'
      ? document.getElementById('drv-input-name-ar')
      : document.getElementById('drv-input-name-ar');
    if (firstInput) {
      firstInput.focus();
      firstInput.select();
    }
  }, 100);

  // Close on Escape
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeDriverModal(true);
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

function closeDriverModal(force) {
  // Ignore clicks on the box itself (only close on backdrop or explicit)
  if (force !== true && !(force?.target?.classList?.contains?.('drv-modal-backdrop'))) return;
  const modal = document.getElementById('drv-modal');
  if (modal) modal.remove();
}

async function saveDriverModal(id, mode) {
  const nameAr = document.getElementById('drv-input-name-ar')?.value.trim() || '';

  if (!nameAr) {
    toast('اكتب الاسم العربي أولاً', 'error');
    return;
  }

  const isAdd = mode === 'add';

  // For add mode: build a full new-doc payload
  if (isAdd) {
    const nameEn = document.getElementById('drv-input-name-en')?.value.trim() || '';
    const iqama = document.getElementById('drv-input-iqama')?.value.trim() || '';
    const nationality = document.getElementById('drv-input-nationality')?.value.trim() || '';
    const phone = document.getElementById('drv-input-phone')?.value.trim() || '';
    const truck = document.getElementById('drv-input-truck')?.value.trim() || '';

    // Duplicate detection: iqama takes precedence, then name_en
    if (iqama) {
      const dupIqama = _drivers.find(d => (d.iqama || '').trim() === iqama);
      if (dupIqama) {
        toast(`⚠ الإقامة ${iqama} مسجلة بالفعل للسائق: ${dupIqama.name_ar || dupIqama.name_en || dupIqama.name}`, 'error');
        return;
      }
    }
    if (nameEn) {
      const dupEn = _drivers.find(d => (d.name_en || '').trim().toLowerCase() === nameEn.toLowerCase());
      if (dupEn) {
        toast(`⚠ الاسم الإنجليزي "${nameEn}" مسجل بالفعل`, 'error');
        return;
      }
    }

    const newDoc = {
      name_ar: nameAr,
      name_en: nameEn,
      iqama, nationality, phone,
      truck_number: truck,
      vehicles: truck ? [{ plate: truck, added_at: new Date().toISOString() }] : [],
      source: 'manual',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };

    try {
      const { addDoc, collection } = await import('firebase/firestore');
      const ref = await addDoc(collection(db, 'drivers'), newDoc);
      closeDriverModal(true);
      await loadData();
      toast(`✓ أُضيف السائق: ${nameAr}`, 'success');
    } catch (e) {
      console.error(e);
      toast('خطأ في إضافة السائق', 'error');
    }
    return;
  }

  const updates = {
    name_ar: nameAr,
    updated_at: serverTimestamp(),
  };

  if (mode === 'full') {
    const nameEn = document.getElementById('drv-input-name-en')?.value.trim() || '';
    const iqama = document.getElementById('drv-input-iqama')?.value.trim() || '';
    const nationality = document.getElementById('drv-input-nationality')?.value.trim() || '';
    const phone = document.getElementById('drv-input-phone')?.value.trim() || '';
    const truck = document.getElementById('drv-input-truck')?.value.trim() || '';

    if (nameEn) updates.name_en = nameEn;
    if (iqama) updates.iqama = iqama;
    if (nationality) updates.nationality = nationality;
    if (phone) updates.phone = phone;
    if (truck) updates.truck_number = truck;
  }

  try {
    await updateDoc(doc(db, 'drivers', id), updates);
    closeDriverModal(true);
    await loadData();
    toast('✓ تم الحفظ', 'success');
  } catch (e) {
    console.error(e);
    toast('خطأ في الحفظ', 'error');
  }
}

window._closeDriverModal = closeDriverModal;
window._saveDriverModal = saveDriverModal;

// ═════════════════════════════════════════════
// DELETE DRIVER
// ═════════════════════════════════════════════
async function deleteDriver(id) {
  const driver = _drivers.find(d => d.id === id);
  if (!driver) return;

  const existing = document.getElementById('drv-delete-modal');
  if (existing) existing.remove();

  const displayName = driver._displayNameAr || driver._displayNameEn || driver.name || 'السائق';

  const modal = document.createElement('div');
  modal.id = 'drv-delete-modal';
  modal.innerHTML = `
    <div class="drv-modal-backdrop" onclick="_closeDeleteModal(event)"></div>
    <div class="drv-modal-box" style="max-width:440px;">

      <div class="drv-modal-header" style="background:#FEF2F2;border-bottom-color:#FCA5A5;">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;letter-spacing:2px;font-weight:700;">SDS/DRIVER/DELETE</div>
          <div style="font-size:20px;color:#CC2229;font-weight:800;margin-top:2px;">🗑 حذف السائق</div>
        </div>
        <button class="drv-modal-close" onclick="_closeDeleteModal(true)">
          <i class="ti ti-x"></i>
        </button>
      </div>

      <div class="drv-modal-body">
        <div style="background:#FEF2F2;border:1px solid #FCA5A5;border-radius:6px;padding:14px 16px;">
          <div style="display:flex;align-items:center;gap:8px;color:#CC2229;font-weight:800;font-size:14px;">
            <i class="ti ti-alert-triangle"></i>
            <span>تأكيد حذف السائق</span>
          </div>
          <div style="font-size:13px;color:#0E1A2E;margin-top:8px;line-height:1.6;">
            سيتم حذف السائق: <span style="font-weight:800;">${displayName}</span>
            <br>
            <span style="color:#2E8B57;font-size:12px;">✓ يمكن استرجاع السائق خلال 5 ثوانٍ من زر التراجع، أو لاحقاً من سجل المحذوفات (للأدمن).</span>
          </div>
        </div>

        <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:12px;margin-top:14px;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:1.5px;font-weight:700;">DRIVER INFO</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;margin-top:8px;">
            ${driver._displayNameEn ? `<div><span style="color:#8A8578;">EN:</span> <span style="direction:ltr;">${driver._displayNameEn}</span></div>` : ''}
            ${driver._displayNameAr ? `<div><span style="color:#8A8578;">AR:</span> ${driver._displayNameAr}</div>` : ''}
            ${driver.iqama ? `<div><span style="color:#8A8578;">IQAMA:</span> <span style="font-family:'JetBrains Mono',monospace;">${driver.iqama}</span></div>` : ''}
            ${driver.nationality ? `<div><span style="color:#8A8578;">NAT:</span> ${driver.nationality}</div>` : ''}
          </div>
        </div>
      </div>

      <div class="drv-modal-footer">
        <button class="drv-btn" onclick="_closeDeleteModal(true)">إلغاء</button>
        <button class="drv-btn" style="background:#CC2229;color:white;border-color:#CC2229;" onclick="_confirmDeleteDriver('${id}')">
          <i class="ti ti-trash"></i> نعم، احذف
        </button>
      </div>

    </div>

    <style>
      #drv-delete-modal {
        position:fixed;inset:0;z-index:99999;
        display:flex;align-items:center;justify-content:center;
        padding:20px;font-family:'Tajawal',sans-serif;
      }
      #drv-delete-modal .drv-modal-backdrop {
        position:absolute;inset:0;
        background:rgba(14,26,46,0.65);backdrop-filter:blur(2px);
      }
      #drv-delete-modal .drv-modal-box {
        position:relative;background:#FAFAF7;
        border:1px solid #E8E5DC;border-radius:10px;
        width:100%;max-width:440px;
        display:flex;flex-direction:column;overflow:hidden;
        box-shadow:0 20px 50px rgba(14,26,46,0.25);
      }
      #drv-delete-modal .drv-modal-header {
        display:flex;justify-content:space-between;align-items:flex-start;
        padding:20px 24px;border-bottom:1px solid #E8E5DC;
      }
      #drv-delete-modal .drv-modal-close {
        background:transparent;border:1.5px solid #E8E5DC;
        border-radius:6px;width:34px;height:34px;
        display:flex;align-items:center;justify-content:center;
        cursor:pointer;color:#6B6659;transition:all 0.15s;
      }
      #drv-delete-modal .drv-modal-close:hover {
        background:#FEF2F2;border-color:#CC2229;color:#CC2229;
      }
      #drv-delete-modal .drv-modal-body {
        padding:20px 24px;overflow-y:auto;
      }
      #drv-delete-modal .drv-modal-footer {
        display:flex;justify-content:flex-end;gap:8px;
        padding:16px 24px;background:white;border-top:1px solid #E8E5DC;
      }
      #drv-delete-modal .drv-btn {
        background:white;border:1.5px solid #E8E5DC;border-radius:6px;
        padding:9px 18px;font-family:'Tajawal',sans-serif;font-size:13px;
        cursor:pointer;color:#0E1A2E;font-weight:700;
        transition:all 0.15s;display:inline-flex;align-items:center;gap:6px;
      }
      #drv-delete-modal .drv-btn:hover { background:#F5F3EC; }
    </style>`;

  document.body.appendChild(modal);
}

function closeDeleteModal(force) {
  if (force !== true && !(force?.target?.classList?.contains?.('drv-modal-backdrop'))) return;
  const modal = document.getElementById('drv-delete-modal');
  if (modal) modal.remove();
}

async function confirmDeleteDriver(id) {
  const driver = _drivers.find(d => d.id === id);
  const displayName = driver?._displayNameAr || driver?._displayNameEn || driver?.name || 'السائق';

  const modal = document.getElementById('drv-delete-modal');
  if (modal) {
    modal.querySelectorAll('button').forEach(b => b.disabled = true);
    const confirmBtn = modal.querySelector('button[style*="CC2229"]');
    if (confirmBtn) confirmBtn.innerHTML = '<i class="ti ti-loader"></i> جاري الحذف...';
  }

  try {
    const deletedBy = _profile?.name || _profile?.email || 'مستخدم';
    await softDeleteDriver(id, deletedBy);
    closeDeleteModal(true);
    await loadData();
    showDriverUndoToast(`حُذف السائق: ${displayName}`, id);
  } catch (e) {
    console.error(e);
    toast('خطأ في الحذف', 'error');
    if (modal) modal.querySelectorAll('button').forEach(b => b.disabled = false);
  }
}

// Undo toast — sticky for 5 seconds with restore button
function showDriverUndoToast(message, driverId) {
  const existing = document.getElementById('drv-undo-toast');
  if (existing) existing.remove();
  if (_undoTimer) clearTimeout(_undoTimer);

  const t = document.createElement('div');
  t.id = 'drv-undo-toast';
  t.style.cssText = `
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:#0E1A2E;color:white;padding:12px 18px;border-radius:8px;
    box-shadow:0 8px 24px rgba(14,26,46,0.35);z-index:100000;
    display:flex;align-items:center;gap:14px;font-family:'Tajawal',sans-serif;
    font-size:13px;font-weight:700;min-width:280px;
  `;
  t.innerHTML = `
    <span><i class="ti ti-trash" style="color:#F0C040;"></i> ${message}</span>
    <button id="drv-undo-btn" style="background:#D4B266;color:#0E1A2E;border:none;border-radius:5px;padding:6px 14px;font-family:'Tajawal',sans-serif;font-size:12px;font-weight:800;cursor:pointer;">
      <i class="ti ti-arrow-back-up"></i> تراجع
    </button>
    <button id="drv-undo-close" style="background:transparent;border:none;color:#B8B0A0;cursor:pointer;font-size:18px;padding:0 4px;">×</button>
  `;
  document.body.appendChild(t);

  document.getElementById('drv-undo-btn').onclick = async () => {
    clearTimeout(_undoTimer);
    t.remove();
    try {
      await restoreDeletedDriver(driverId);
      await loadData();
      toast('✓ استُعيد السائق', 'success');
    } catch (e) {
      console.error(e);
      toast('فشل الاستعادة', 'error');
    }
  };
  document.getElementById('drv-undo-close').onclick = () => {
    clearTimeout(_undoTimer);
    t.remove();
  };

  _undoTimer = setTimeout(() => t.remove(), 5000);
}

// Update the deleted-drivers drawer at the bottom of the page (admin only)
function updateDeletedDrawer() {
  document.getElementById('drv-deleted-drawer')?.remove();

  // Only admin and manager see the deleted drawer
  if (_profile?.role !== 'admin' && _profile?.role !== 'manager') return;
  if (!_deletedDrivers || _deletedDrivers.length === 0) return;

  const drawer = document.createElement('div');
  drawer.id = 'drv-deleted-drawer';
  drawer.style.cssText = `
    margin:16px 24px 24px;background:white;border:1px solid #E8E5DC;
    border-radius:10px;overflow:hidden;font-family:'Tajawal',sans-serif;
  `;

  drawer.innerHTML = `
    <div id="drv-drawer-header" style="background:#FAFAF7;padding:12px 18px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none;border-bottom:1px solid #F0EDE4;">
      <div style="display:flex;align-items:center;gap:10px;">
        <i class="ti ti-trash" style="color:#8A8578;"></i>
        <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;letter-spacing:1.5px;font-weight:800;">DELETED DRIVERS</span>
        <span style="background:#CC2229;color:white;font-family:'JetBrains Mono',monospace;font-size:10px;padding:2px 8px;border-radius:10px;font-weight:800;">${_deletedDrivers.length}</span>
        <span style="color:#6B6659;font-size:12px;">سجل السائقين المحذوفين — يمكن استرجاعهم</span>
      </div>
      <i class="ti ti-chevron-down" id="drv-drawer-icon" style="color:#8A8578;transition:transform 0.2s;"></i>
    </div>
    <div id="drv-drawer-body" style="max-height:0;overflow:hidden;transition:max-height 0.3s ease;">
      <div style="padding:14px 18px;">
        ${_deletedDrivers.map(d => {
          const nameEn = d.name_en || '';
          const nameAr = d.name_ar || d.name || '';
          const iqama = d.iqama || '—';
          const truck = d.truck_number || '—';
          const delDate = d.deleted_at ? new Date(d.deleted_at).toLocaleString('en-GB') : '—';
          const delBy = d.deleted_by || 'غير معروف';
          return `
            <div style="border:1px solid #F0EDE4;border-radius:6px;padding:12px 14px;margin-bottom:8px;background:#FAFAF7;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
                <div style="min-width:0;flex:1;">
                  <div style="font-size:14px;font-weight:800;color:#0E1A2E;">
                    ${nameAr || nameEn || 'بلا اسم'}
                    ${nameEn && nameAr ? `<span style="color:#8A8578;font-weight:600;font-family:'JetBrains Mono',monospace;font-size:11px;direction:ltr;"> · ${nameEn}</span>` : ''}
                  </div>
                  <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B6659;margin-top:4px;letter-spacing:0.5px;">
                    IQAMA: ${iqama} · TRUCK: ${truck}
                  </div>
                  <div style="font-size:11px;color:#8A8578;margin-top:4px;">
                    <i class="ti ti-user-x" style="font-size:12px;color:#CC2229;"></i>
                    حُذف بواسطة <b style="color:#0E1A2E;">${delBy}</b> في ${delDate}
                  </div>
                </div>
                <button data-restore-id="${d.id}" class="drv-restore-btn" style="background:#2E8B57;color:white;border:none;border-radius:5px;padding:7px 14px;font-family:'Tajawal',sans-serif;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap;">
                  <i class="ti ti-arrow-back-up"></i> استرجاع
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // Append after main content
  const pageBody = document.querySelector('.page-body');
  if (pageBody) pageBody.appendChild(drawer);
  else document.body.appendChild(drawer);

  // Wire up header toggle
  document.getElementById('drv-drawer-header').onclick = () => {
    const body = document.getElementById('drv-drawer-body');
    const icon = document.getElementById('drv-drawer-icon');
    if (!body) return;
    if (body.style.maxHeight === '0px' || !body.style.maxHeight) {
      body.style.maxHeight = '600px';
      body.style.overflowY = 'auto';
      icon.style.transform = 'rotate(180deg)';
    } else {
      body.style.maxHeight = '0px';
      icon.style.transform = 'rotate(0deg)';
    }
  };

  // Wire up restore buttons
  document.querySelectorAll('.drv-restore-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.restoreId;
      if (!id) return;
      btn.disabled = true;
      btn.innerHTML = '<i class="ti ti-loader"></i> جاري...';
      try {
        await restoreDeletedDriver(id);
        await loadData();
        toast('✓ استُعيد السائق', 'success');
      } catch (e) {
        console.error(e);
        toast('فشل الاستعادة', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="ti ti-arrow-back-up"></i> استرجاع';
      }
    };
  });
}

window._deleteDriver = deleteDriver;
window._closeDeleteModal = closeDeleteModal;
window._confirmDeleteDriver = confirmDeleteDriver;

// ══════════════════════════════════════════════════════════════
// EXPORT DRIVERS TO CSV
// ══════════════════════════════════════════════════════════════
function exportDriversCSV() {
  if (!_drivers || _drivers.length === 0) {
    toast('لا يوجد سائقون للتصدير', 'error');
    return;
  }

  const BOM = '\uFEFF';
  let csv = BOM;

  // Header row
  csv += 'ID,Name (EN),Name (AR),Iqama,Phone,Nationality,Truck Number\n';

  const isArabic = (s) => /[\u0600-\u06FF]/.test(s || '');

  _drivers.forEach(d => {
    // Support legacy: get plate from vehicles array if truck_number empty
    let plate = d.truck_number || '';
    if (!plate && d.vehicles && d.vehicles.length > 0) {
      plate = d.vehicles[d.vehicles.length - 1].plate || '';
    }

    // Smart name detection: legacy `name` field could contain either language
    // Priority: name_en (dedicated) → name (if not arabic) — for English column
    // Priority: name_ar (dedicated) → name (if arabic) — for Arabic column
    const legacyName = (d.name || '').trim();
    const legacyIsArabic = isArabic(legacyName);

    const nameEnRaw = d.name_en || (legacyName && !legacyIsArabic ? legacyName : '');
    const nameArRaw = d.name_ar || (legacyName && legacyIsArabic ? legacyName : '');

    const nameEn = nameEnRaw.replace(/,/g, ' ').replace(/"/g, '""');
    const nameAr = nameArRaw.replace(/,/g, '،').replace(/"/g, '""');
    const iqama = (d.iqama || '').toString().replace(/,/g, '');
    const phone = (d.phone || '').toString().replace(/,/g, '');
    const nat = (d.nationality || '').replace(/,/g, '،').replace(/"/g, '""');
    const truck = plate.toString().replace(/,/g, ' ').replace(/"/g, '""');

    csv += `${d.id || ''},"${nameEn}","${nameAr}",${iqama},${phone},"${nat}","${truck}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const now = new Date().toISOString().slice(0, 10);
  link.download = `drivers_${now}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  toast(`✓ تم تصدير ${_drivers.length} سائق`, 'success');
}

window._exportDriversCSV = exportDriversCSV;
