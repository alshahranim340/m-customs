import { getCurrentUser, isAdmin } from '../../../src/firebase/auth.js';
import { getUserProfile } from '../../../src/firebase/auth.js';
import {
  getTransportRequests, createTransportRequest, updateTransportRequest,
  deleteTransportRequest, getTransportDropdowns, addDropdownValue,
  linkRequestToShipment
} from '../../../src/firebase/transportDb.js';
import { getAllDrivers, upsertTransportDriver, createShipmentFromTransportRequest, findDriverByEnOrIqama } from '../../../src/firebase/db.js';
import { toast } from '../app.js';
import { todayHijri, buildHijriPicker } from '../../../src/utils/hijriDate.js';

let _profile = null;
let _requests = [];
let _deletedRequests = []; // soft-deleted requests (for admin recovery drawer)
let _dropdowns = { customers: [], materials: [], nationalities: [] };
let _drivers = []; // all drivers cached for autocomplete
let _selected = new Set(); // selected request IDs for bulk print/export
let _expandedBatches = new Set(); // batch keys currently expanded in cards view
let _filter = 'all'; // all | draft | sent | converted
let _search = '';

const DEST_LABELS = {
  uae:     { ar: 'الإمارات', en: 'UAE', color: '#1C4B8E' },
  bahrain: { ar: 'البحرين',  en: 'BH',  color: '#CC2229' },
  oman:    { ar: 'عمان',      en: 'OM',  color: '#2E8B57' },
};

const STATUS_LABELS = {
  draft:     { ar: 'مسودة',  en: 'DRAFT',     class: 'gray'  },
  sent:      { ar: 'مرسل',   en: 'SENT',      class: 'blue'  },
  converted: { ar: 'محوّل',  en: 'CONVERTED', class: 'amber' },
  done:      { ar: 'مكتمل',  en: 'DONE',      class: 'green' },
};

// Saudi loading locations (most common at top)
const LOADING_LOCATIONS = [
  'DAMMAM', 'RABIGH', 'JEDDAH', 'RIYADH', 'YANBU', 'JUBAIL',
  'MAKKAH', 'MADINAH', 'TAIF', 'AL-AHSA', 'TABUK', 'HAIL',
  'KHAMIS-MUSHAIT', 'ABHA', 'NAJRAN', 'JAZAN', 'ARAR', 'SAKAKA',
  'AL-BAHA', 'AL-QUNFUDHAH', 'AL-KHOBAR', 'BURAYDAH', 'UNAYZAH'
];

export async function renderTransportRequests(container) {
  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = `<div class="page-body" style="padding:40px;text-align:center;">يجب تسجيل الدخول</div>`;
    return;
  }
  _profile = await getUserProfile(user.uid);

  // Access control
  if (_profile.role !== 'transport' && _profile.role !== 'admin' && _profile.role !== 'manager') {
    container.innerHTML = `
      <div class="page-body" style="padding:40px;text-align:center;">
        <div style="font-size:56px;">🔒</div>
        <div style="font-size:18px;color:#0E1A2E;font-weight:800;margin-top:12px;">لا تملك صلاحية الوصول</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#6B6659;margin-top:4px;letter-spacing:1px;">ACCESS DENIED · TRANSPORT ROLE REQUIRED</div>
      </div>`;
    return;
  }

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
              <span class="modern-header-code">SDS/TRANSPORT/REQUESTS/2026</span>
            </div>
            <div class="modern-header-title">🚛 طلبات النقل</div>
            <div class="modern-header-sub">TRANSPORT REQUESTS · EXCEL-LIKE ENTRY</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" id="btn-bulk-send" onclick="_bulkSendToClearance()" style="display:none;background:#2E8B57;color:white;border-color:#2E8B57;">
              <i class="ti ti-send"></i> إرسال دفعة للتخليص (<span id="bulk-send-count">0</span>)
            </button>
            <button class="modern-btn" id="btn-bulk-delete" onclick="_bulkDelete()" style="display:none;background:#CC2229;color:white;border-color:#CC2229;">
              <i class="ti ti-trash"></i> حذف <span id="bulk-delete-count">0</span>
            </button>
            <button class="modern-btn" id="btn-print-selected" onclick="_printSelected()" style="display:none;">
              <i class="ti ti-printer"></i> طباعة <span id="print-count">0</span>
            </button>
            <button class="modern-btn" id="btn-excel-selected" onclick="_exportSelectedExcel()" style="display:none;">
              <i class="ti ti-file-spreadsheet"></i> Excel
            </button>
            <button class="modern-btn" onclick="_openReports()" style="background:#1C4B8E;color:white;border-color:#1C4B8E;">
              <i class="ti ti-chart-bar"></i> التقارير
            </button>
            <button class="modern-btn modern-btn-primary" style="background:#0E1A2E;color:white;border-color:#0E1A2E;" onclick="_openBatchModal()">
              <i class="ti ti-package"></i> دفعة جديدة
            </button>
          </div>
        </div>

        <!-- Stats -->
        <div class="modern-stats modern-stats-4" id="tr-stats"></div>

        <!-- Toolbar -->
        <div class="modern-search-bar" style="gap:8px;">
          <input type="text" id="tr-search" placeholder="🔍 بحث بالسائق، الشاحنة، العميل..."
            style="flex:1;border:1.5px solid #E8E5DC;border-radius:6px;padding:8px 14px;font-family:Tajawal,sans-serif;font-size:13px;outline:none;">
          <button class="rep-period-btn" data-filter="all">الكل</button>
          <button class="rep-period-btn" data-filter="draft">مسودة</button>
          <button class="rep-period-btn" data-filter="sent">مرسل</button>
          <button class="rep-period-btn" data-filter="converted">محوّل</button>
        </div>

        <!-- Excel-like table -->
        <div style="padding:0 24px 24px;">
          <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;overflow:hidden;">
            <div style="overflow-x:auto;">
              <table class="tr-table" style="width:100%;border-collapse:collapse;font-size:12px;min-width:1400px;">
                <thead>
                  <tr style="background:#0E1A2E;color:white;">
                    <th style="padding:10px 6px;text-align:center;width:36px;">
                      <input type="checkbox" id="chk-select-all" style="accent-color:#2E8B57;cursor:pointer;" onclick="_toggleSelectAll(this)">
                    </th>
                    <th style="padding:10px 6px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.5px;font-weight:800;width:40px;">#</th>
                    <th style="padding:10px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.5px;font-weight:800;">TRUCK</th>
                    <th style="padding:10px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.5px;font-weight:800;">LOCATION</th>
                    <th style="padding:10px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.5px;font-weight:800;">DRIVER NAME</th>
                    <th style="padding:10px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.5px;font-weight:800;">ID / IQAMA</th>
                    <th style="padding:10px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.5px;font-weight:800;">NATIONALITY</th>
                    <th style="padding:10px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.5px;font-weight:800;">CUSTOMER</th>
                    <th style="padding:10px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.5px;font-weight:800;">MATERIAL</th>
                    <th style="padding:10px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.5px;font-weight:800;">QTY</th>
                    <th style="padding:10px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.5px;font-weight:800;">DATE</th>
                    <th style="padding:10px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.5px;font-weight:800;">DELIVERY#</th>
                    <th style="padding:10px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.5px;font-weight:800;">DEST</th>
                    <th style="padding:10px 6px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.5px;font-weight:800;">STATUS</th>
                    <th style="padding:10px 6px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.5px;font-weight:800;width:100px;">ACTIONS</th>
                  </tr>
                </thead>
                <tbody id="tr-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>

    <style>
      .rep-period-btn {
        padding:8px 14px;border-radius:4px;font-family:Tajawal,sans-serif;font-size:12px;
        font-weight:700;cursor:pointer;transition:all .15s;border:1.5px solid #E8E5DC;
        background:white;color:#0E1A2E;letter-spacing:.3px;
      }
      .rep-period-btn.active { background:#0E1A2E; color:white; border-color:#0E1A2E; }
      .rep-period-btn:hover:not(.active) { background:#F5F3EC; }

      .tr-cell {
        border:none;background:transparent;width:100%;padding:8px 6px;
        font-family:Tajawal,sans-serif;font-size:12px;color:#0E1A2E;
        outline:none;border-bottom:2px solid transparent;
      }
      .tr-cell:focus { border-bottom-color:#1C4B8E; background:#F5F3EC; }
      .tr-cell[readonly] { color:#8A8578; }
      .tr-cell.tr-empty {
        background: rgba(204, 34, 41, 0.05) !important;
        border-bottom: 2px dashed rgba(204, 34, 41, 0.3);
      }
      .tr-cell.tr-empty::placeholder { color: rgba(204,34,41,0.5); }
      .tr-row { border-bottom:1px solid #F0EDE4; }
      .tr-row:hover { background:#FAFAF7; }
      .tr-row.tr-dirty { background:#FEF9E7; }
      .tr-row.tr-sent { opacity:0.75; }

      .tr-icon-btn {
        background:transparent;border:none;cursor:pointer;padding:6px;
        border-radius:4px;color:#6B6659;transition:all .15s;
      }
      .tr-icon-btn:hover { background:#F0EDE4;color:#0E1A2E; }
      .tr-icon-btn.tr-danger:hover { color:#CC2229;background:#FEF2F2; }
      .tr-icon-btn.tr-success:hover { color:#2E8B57;background:#E7F5EE; }

      #tr-driver-dropdown {
        position:absolute;
        display:none;
        background:white;
        border:2px solid #0E1A2E;
        border-radius:6px;
        box-shadow:0 8px 24px rgba(14,26,46,0.18);
        z-index:9998;
        max-height:400px;
        overflow-y:auto;
        font-family:'Tajawal',sans-serif;
      }
      .tr-dd-item {
        padding:10px 12px;
        border-bottom:1px solid #F0EDE4;
        cursor:pointer;
        transition:background 0.1s;
      }
      .tr-dd-item:last-child { border-bottom:none; }
      .tr-dd-item:hover { background:#F5F3EC; }
    </style>
  `;

  // Helper: render whichever view is active
  const renderActive = () => {
    if (_viewMode === 'cards') renderCardsView();
    else renderTable();
  };

  // Wire up filter buttons + search
  document.querySelectorAll('.rep-period-btn').forEach(btn => {
    btn.onclick = () => {
      _filter = btn.dataset.filter;
      document.querySelectorAll('.rep-period-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === _filter));
      renderActive();
    };
    if (btn.dataset.filter === _filter) btn.classList.add('active');
  });
  document.getElementById('tr-search').oninput = (e) => { _search = e.target.value.trim().toLowerCase(); renderActive(); };

  // Expose functions to window
  window._addRow = addNewRow;
  window._saveRow = saveRow;
  window._deleteRow = deleteRow;
  window._sendRow = sendRow;
  window._openBatchModal = openBatchModal;
  window._batchAddTruck = batchAddTruck;
  window._batchRemoveTruck = batchRemoveTruck;
  window._batchSelectDriver = batchSelectDriver;
  window._batchSaveDraft = () => saveBatch(false);
  window._batchSaveAndSend = () => saveBatch(true);
  window._batchPreviewAndSend = showBatchPreview;
  window._batchClose = closeBatchModal;

  await loadData();
}

async function loadData() {
  try {
    const [allRequests, dropdowns, drivers] = await Promise.all([
      getTransportRequests(200),
      getTransportDropdowns(),
      getAllDrivers(),
    ]);
    // Split active vs soft-deleted (deleted: true means hidden from main view)
    _requests = allRequests.filter(r => !r.deleted);
    _deletedRequests = allRequests.filter(r => r.deleted);
    _dropdowns = dropdowns;
    _drivers = drivers;
    renderStats();
    // Route to current view (cards default, table optional via _viewMode)
    if (_viewMode === 'cards') {
      renderCardsView();
    } else {
      renderTable();
    }
    // Update deleted drawer badge
    updateDeletedDrawer();
  } catch (e) {
    console.error('load transport error:', e);
    toast('خطأ في التحميل', 'error');
  }
}

// Detect if a string is Arabic (contains Arabic characters)
function isArabicName(str) {
  if (!str) return false;
  return /[\u0600-\u06FF]/.test(str);
}

// Smart driver upsert: detects arabic vs english name, keeps existing fields
// Also fetches full driver data (phone) if driver exists in _drivers
async function smartUpsertDriver(payload) {
  const name = (payload.driver_name || '').trim();
  if (!name) return null;

  // Try to find existing driver in cache to inherit missing fields (like phone)
  const iqama = (payload.iqama || '').trim();
  let existing = null;
  if (iqama) {
    existing = _drivers.find(d => (d.iqama || '').trim() === iqama);
  }
  if (!existing) {
    existing = _drivers.find(d =>
      (d.name_ar && d.name_ar.trim() === name) ||
      (d.name && d.name.trim() === name) ||
      (d.name_en && d.name_en.trim().toLowerCase() === name.toLowerCase())
    );
  }

  const upsertData = {
    iqama: iqama || (existing?.iqama || ''),
    nationality: (payload.nationality || '').trim() || (existing?.nationality || ''),
    truck_number: (payload.truck_number || '').trim() || (existing?.truck_number || ''),
    phone: (payload.phone || '').trim() || (existing?.phone || ''),
  };

  // Route name to correct field based on script
  if (isArabicName(name)) {
    upsertData.name_ar = name;
    // preserve existing english name
    if (existing?.name_en) upsertData.name_en = existing.name_en;
  } else {
    upsertData.name_en = name;
    // preserve existing arabic name
    if (existing?.name_ar) upsertData.name_ar = existing.name_ar;
    else if (existing?.name) upsertData.name_ar = existing.name;
  }

  return await upsertTransportDriver(upsertData);
}


function renderStats() {
  const total = _requests.length;
  const draft = _requests.filter(r => r.status === 'draft').length;
  const sent = _requests.filter(r => r.status === 'sent').length;
  const converted = _requests.filter(r => r.status === 'converted' || r.status === 'done').length;

  const pad = (n) => String(n).padStart(2, '0');

  document.getElementById('tr-stats').innerHTML = `
    <div class="modern-stat">
      <div class="modern-stat-lbl">01 · TOTAL</div>
      <div class="modern-stat-val">${pad(total)}</div>
      <div class="modern-stat-hint">إجمالي الطلبات</div>
    </div>
    <div class="modern-stat">
      <div class="modern-stat-lbl">02 · DRAFT</div>
      <div class="modern-stat-val amber">${pad(draft)}</div>
      <div class="modern-stat-hint">مسودة (لم تُرسل)</div>
    </div>
    <div class="modern-stat">
      <div class="modern-stat-lbl">03 · SENT</div>
      <div class="modern-stat-val blue">${pad(sent)}</div>
      <div class="modern-stat-hint">مُرسلة للتخليص</div>
    </div>
    <div class="modern-stat">
      <div class="modern-stat-lbl">04 · CONVERTED</div>
      <div class="modern-stat-val green">${pad(converted)}</div>
      <div class="modern-stat-hint">تم إنشاء شحنة</div>
    </div>
  `;
}

function renderTable() {
  const tbody = document.getElementById('tr-tbody');
  if (!tbody) return;

  // Filter
  let list = _requests;
  if (_filter !== 'all') list = list.filter(r => r.status === _filter);
  if (_search) {
    list = list.filter(r =>
      (r.driver_name || '').toLowerCase().includes(_search) ||
      (r.truck_number || '').toLowerCase().includes(_search) ||
      (r.customer || '').toLowerCase().includes(_search) ||
      (r.driver_id_number || '').toLowerCase().includes(_search)
    );
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="15" style="padding:40px;text-align:center;">
        <div style="font-size:44px;">🚛</div>
        <div style="font-size:14px;color:#0E1A2E;font-weight:700;margin-top:8px;">لا توجد طلبات نقل</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B6659;margin-top:4px;letter-spacing:1px;">CLICK "صف جديد" TO ADD</div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((r, idx) => renderRow(r, idx + 1)).join('');

  // Mark empty cells with red-tinted background so they stand out
  tbody.querySelectorAll('.tr-cell').forEach(el => {
    const applyEmpty = () => {
      if (!el.value || !el.value.trim()) el.classList.add('tr-empty');
      else el.classList.remove('tr-empty');
    };
    applyEmpty();
    el.addEventListener('input', applyEmpty);
    el.addEventListener('change', applyEmpty);
  });

  // Attach custom driver search dropdown
  document.querySelectorAll('.tr-driver-name').forEach(input => {
    if (input.readOnly || input.hasAttribute('readonly')) return;

    // Show dropdown on focus
    input.addEventListener('focus', (e) => {
      showDriverDropdown(e.target);
    });

    // Filter dropdown on input
    input.addEventListener('input', (e) => {
      showDriverDropdown(e.target);
    });

    // Hide dropdown on blur (with delay to allow click)
    input.addEventListener('blur', () => {
      setTimeout(() => hideDriverDropdown(), 200);
    });

    // Also auto-fill on plain typed name match (e.g. paste)
    input.addEventListener('change', (e) => {
      autoFillFromDriverName(e.target);
    });
  });
}

// ═════════════════════════════════════════════
// CUSTOM DRIVER DROPDOWN
// ═════════════════════════════════════════════
let _activeInput = null;

function showDriverDropdown(input) {
  _activeInput = input;
  const query = input.value.trim().toLowerCase();

  // Filter drivers by name (en/ar/legacy name), iqama, truck#
  let matches = _drivers.filter(d => {
    // Support legacy drivers: get any name they have
    const anyName = d.name_en || d.name_ar || d.name || '';
    if (!anyName) return false;
    if (!query) return true; // show all if empty

    // Also check legacy vehicles array for truck matches
    let trucks = [d.truck_number || ''];
    if (d.vehicles && Array.isArray(d.vehicles)) {
      trucks = trucks.concat(d.vehicles.map(v => (v.plate || '')));
    }

    const inNameEn = (d.name_en || '').toLowerCase().includes(query);
    const inNameAr = (d.name_ar || '').toLowerCase().includes(query);
    const inLegacyName = (d.name || '').toLowerCase().includes(query);
    const inIqama = (d.iqama || '').toLowerCase().includes(query);
    const inTruck = trucks.some(t => t.toLowerCase().includes(query));
    return inNameEn || inNameAr || inLegacyName || inIqama || inTruck;
  });

  // Sort: exact match first, then by name
  matches.sort((a, b) => {
    const aName = (a.name_en || a.name_ar || a.name || '').toLowerCase();
    const bName = (b.name_en || b.name_ar || b.name || '').toLowerCase();
    const aExact = aName === query;
    const bExact = bName === query;
    if (aExact !== bExact) return aExact ? -1 : 1;
    return aName.localeCompare(bName);
  });

  // Limit to first 15
  matches = matches.slice(0, 15);

  // Get or create dropdown
  let dd = document.getElementById('tr-driver-dropdown');
  if (!dd) {
    dd = document.createElement('div');
    dd.id = 'tr-driver-dropdown';
    document.body.appendChild(dd);
  }

  if (matches.length === 0) {
    dd.innerHTML = `
      <div style="padding:14px;text-align:center;color:#8A8578;font-size:12px;">
        ${query ? '🔍 لا يوجد سائق مطابق — سيُنشأ سائق جديد' : 'ابدأ بالكتابة'}
      </div>`;
  } else {
    dd.innerHTML = matches.map(d => {
      const missingAr = !d.name_ar || !d.name_ar.trim();
      // Support legacy: if no name_en, use 'name' as the display
      const displayEn = d.name_en || '';
      const displayAr = d.name_ar || (!d.name_en && d.name) || '';
      // Support legacy: get plate from vehicles array
      let plate = d.truck_number || '';
      if (!plate && d.vehicles && d.vehicles.length > 0) {
        plate = d.vehicles[d.vehicles.length - 1].plate || '';
      }
      return `
        <div class="tr-dd-item" data-driver-id="${d.id}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
            <div style="flex:1;min-width:0;">
              ${displayEn ? `
                <div style="font-family:'Inter','Segoe UI',sans-serif;font-weight:800;font-size:13px;color:#0E1A2E;direction:ltr;text-align:right;">
                  ${displayEn}
                </div>` : ''
              }
              ${displayAr
                ? `<div style="font-size:12px;color:#1C4B8E;font-weight:700;margin-top:2px;">${displayAr}</div>`
                : `<div style="font-size:10px;color:#C2410C;font-weight:700;margin-top:2px;">⚠ يحتاج اسم عربي</div>`
              }
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B6659;">
            <div>
              <span style="color:#8A8578;">IQAMA:</span>
              <span style="color:#0E1A2E;font-weight:700;">${d.iqama || '—'}</span>
            </div>
            <div>
              <span style="color:#8A8578;">NAT:</span>
              <span style="color:#0E1A2E;font-weight:700;">${d.nationality || '—'}</span>
            </div>
            <div>
              <span style="color:#8A8578;">TRUCK:</span>
              <span style="color:#0E1A2E;font-weight:700;">${plate || '—'}</span>
            </div>
            <div>
              <span style="color:#8A8578;">PHONE:</span>
              <span style="color:#0E1A2E;font-weight:700;">${d.phone || '—'}</span>
            </div>
          </div>
        </div>`;
    }).join('');

    // Attach click handlers
    dd.querySelectorAll('.tr-dd-item').forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault(); // prevent input blur
        const driverId = item.dataset.driverId;
        selectDriverFromDropdown(driverId);
      });
    });
  }

  // Position dropdown below input
  const rect = input.getBoundingClientRect();
  dd.style.display = 'block';
  dd.style.top = `${rect.bottom + window.scrollY + 2}px`;
  dd.style.left = `${rect.left + window.scrollX}px`;
  dd.style.width = `${Math.max(rect.width, 320)}px`;
}

function hideDriverDropdown() {
  const dd = document.getElementById('tr-driver-dropdown');
  if (dd) dd.style.display = 'none';
}

function selectDriverFromDropdown(driverId) {
  const driver = _drivers.find(d => d.id === driverId);
  if (!driver || !_activeInput) return;

  const row = _activeInput.closest('tr');
  if (!row) return;

  // Transport section uses English by default; fallback to Arabic if no English
  _activeInput.value = driver.name_en || driver.name_ar || driver.name || '';

  // Get plate from vehicles array if truck_number is empty (legacy)
  let plate = driver.truck_number || '';
  if (!plate && driver.vehicles && driver.vehicles.length > 0) {
    plate = driver.vehicles[driver.vehicles.length - 1].plate || '';
  }

  // Always overwrite these fields (user chose this driver)
  const setCell = (field, value) => {
    const cell = row.querySelector(`[data-field="${field}"]`);
    if (cell && value !== undefined && value !== null) cell.value = value;
  };
  setCell('driver_id_number', driver.iqama || '');
  setCell('driver_nationality', driver.nationality || '');
  setCell('truck_number', plate);

  hideDriverDropdown();
  const displayName = driver.name_en || driver.name_ar || driver.name || 'السائق';
  toast(`✓ ${displayName} — البيانات تم تعبئتها`, 'success');
}

// Fallback: if user typed a name that matches exactly, auto-fill
function autoFillFromDriverName(input) {
  const val = input.value.trim();
  if (!val) return;
  const driver = _drivers.find(d =>
    (d.name_en || '').toLowerCase() === val.toLowerCase()
  );
  if (driver) {
    const row = input.closest('tr');
    if (!row) return;
    const fillIfEmpty = (field, value) => {
      const cell = row.querySelector(`[data-field="${field}"]`);
      if (cell && value && !cell.value) cell.value = value;
    };
    fillIfEmpty('driver_id_number', driver.iqama);
    fillIfEmpty('driver_nationality', driver.nationality);
    fillIfEmpty('truck_number', driver.truck_number);
  }
}

function renderRow(r, num) {
  const dest = DEST_LABELS[r.destination] || DEST_LABELS.uae;
  const status = STATUS_LABELS[r.status] || STATUS_LABELS.draft;
  const isSent = r.status === 'sent' || r.status === 'converted' || r.status === 'done';
  const rowClass = isSent ? 'tr-row tr-sent' : 'tr-row';
  const roCss = isSent ? 'readonly' : '';
  const isSelected = _selected.has(r.id);

  return `
    <tr class="${rowClass}" data-id="${r.id}">
      <td style="text-align:center;">
        <input type="checkbox" class="tr-select" data-req-id="${r.id}" ${isSelected ? 'checked' : ''} onclick="_toggleSelect('${r.id}')" style="accent-color:#2E8B57;cursor:pointer;">
      </td>
      <td style="text-align:center;font-family:'JetBrains Mono',monospace;font-size:11px;color:#8A8578;font-weight:700;">${String(num).padStart(2,'0')}</td>
      <td><input type="text" class="tr-cell" data-field="truck_number" value="${r.truck_number||''}" ${roCss}></td>
      <td>
        <input list="dl-loading-location" type="text" class="tr-cell" data-field="loading_location"
          value="${r.loading_location||''}" ${roCss}
          style="direction:ltr;text-align:right;font-family:'JetBrains Mono',monospace;font-size:11px;">
      </td>
      <td>
        <input type="text" class="tr-cell tr-driver-name" data-field="driver_name" value="${r.driver_name||''}" ${roCss} placeholder="اكتب للبحث..." style="direction:ltr;text-align:right;" autocomplete="off">
      </td>
      <td><input type="text" class="tr-cell" data-field="driver_id_number" value="${r.driver_id_number||''}" ${roCss} style="direction:ltr;text-align:right;"></td>
      <td>${renderSelect('driver_nationality', r.driver_nationality || '', _dropdowns.nationalities, isSent, '')}</td>
      <td>${renderSelect('customer', r.customer || '', _dropdowns.customers, isSent, '')}</td>
      <td>${renderSelect('material', r.material || '', _dropdowns.materials, isSent, '')}</td>
      <td><input type="number" class="tr-cell" data-field="quantity" value="${r.quantity||''}" ${roCss} style="direction:ltr;text-align:right;" step="0.01"></td>
      <td><input type="text" class="tr-cell tr-hijri" data-field="dispatch_date" value="${r.dispatch_date||''}" ${roCss} style="direction:ltr;text-align:right;"></td>
      <td><input type="text" class="tr-cell" data-field="delivery_number" value="${r.delivery_number||''}" ${roCss} style="direction:ltr;text-align:right;"></td>
      <td>${renderDestSelect(r.destination || 'uae', isSent)}</td>
      <td style="text-align:center;"><span class="modern-badge ${status.class}" style="font-size:9px;">${status.en}</span></td>
      <td style="text-align:center;">
        ${!isSent ? `
          <button class="tr-icon-btn tr-success" onclick="_saveRow('${r.id}')" title="حفظ"><i class="ti ti-device-floppy"></i></button>
          <button class="tr-icon-btn" onclick="_sendRow('${r.id}')" title="إرسال للتخليص"><i class="ti ti-send"></i></button>
        ` : ''}
        <button class="tr-icon-btn tr-danger" onclick="_deleteRow('${r.id}')" title="حذف"><i class="ti ti-trash"></i></button>
      </td>
    </tr>
    ${num === 1 ? `<datalist id="dl-loading-location">${LOADING_LOCATIONS.map(l => `<option value="${l}"></option>`).join('')}</datalist>` : ''}`;
}

function renderSelect(field, value, options, readOnly, placeholder) {
  const ro = readOnly ? 'disabled' : '';
  return `
    <input list="dl-${field}" type="text" class="tr-cell" data-field="${field}" value="${value}" ${ro} placeholder="${placeholder}">
    <datalist id="dl-${field}">
      ${(options || []).map(o => `<option value="${o}"></option>`).join('')}
    </datalist>`;
}

function renderDestSelect(value, readOnly) {
  const ro = readOnly ? 'disabled' : '';
  return `
    <select class="tr-cell" data-field="destination" ${ro} style="cursor:pointer;">
      <option value="uae" ${value==='uae'?'selected':''}>🇦🇪 الإمارات</option>
      <option value="bahrain" ${value==='bahrain'?'selected':''}>🇧🇭 البحرين</option>
      <option value="oman" ${value==='oman'?'selected':''}>🇴🇲 عمان</option>
    </select>`;
}

async function addNewRow() {
  try {
    const currentUser = getCurrentUser();
    const newId = await createTransportRequest({
      destination: 'uae',
      dispatch_date: todayHijri(),
      status: 'draft',
    }, {
      uid: currentUser.uid,
      name: _profile.name,
      email: _profile.email,
    });
    await loadData();
    toast('✓ صف جديد', 'success');

    // Focus first cell of the new row
    setTimeout(() => {
      const row = document.querySelector(`tr[data-id="${newId}"]`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const firstInput = row.querySelector('input:not([readonly])');
        if (firstInput) firstInput.focus();
      }
    }, 100);
  } catch (e) {
    console.error(e);
    toast('خطأ في الإضافة', 'error');
  }
}

// Collect all cell values from a row and save
async function saveRow(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;

  const updates = {};
  row.querySelectorAll('[data-field]').forEach(el => {
    const field = el.dataset.field;
    let val = el.value;
    if (field === 'quantity') val = parseFloat(val) || 0;
    updates[field] = val;
  });

  try {
    await updateTransportRequest(id, updates);

    // Upsert driver record if we have a name
    if (updates.driver_name && updates.driver_name.trim()) {
      await smartUpsertDriver({
        driver_name:  updates.driver_name.trim(),
        iqama:        updates.driver_id_number || '',
        nationality:  updates.driver_nationality || '',
        truck_number: updates.truck_number || '',
        phone:        '',
      });
    }

    // Auto-learn: add new customer/material/nationality if new
    const learn = async (field, dropdownField) => {
      if (updates[field] && !_dropdowns[dropdownField].includes(updates[field])) {
        await addDropdownValue(dropdownField, updates[field]);
      }
    };
    await Promise.all([
      learn('customer', 'customers'),
      learn('material', 'materials'),
      learn('driver_nationality', 'nationalities'),
    ]);

    await loadData();
    toast('✓ تم الحفظ', 'success');
  } catch (e) {
    console.error(e);
    toast('خطأ في الحفظ', 'error');
  }
}

async function sendRow(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;

  // Validate required fields first
  const inputs = row.querySelectorAll('[data-field]');
  const data = {};
  inputs.forEach(el => { data[el.dataset.field] = el.value; });

  const required = ['truck_number', 'driver_name', 'customer', 'destination'];
  const missing = required.filter(f => !data[f] || !data[f].trim());
  if (missing.length > 0) {
    toast(`الحقول المطلوبة: ${missing.join(', ')}`, 'error');
    return;
  }

  // Show confirmation modal
  showSendConfirmModal(id, data);
}

function showSendConfirmModal(id, data) {
  const existing = document.getElementById('tr-send-modal');
  if (existing) existing.remove();

  const destLabel = DEST_LABELS[data.destination]?.ar || data.destination;

  const modal = document.createElement('div');
  modal.id = 'tr-send-modal';
  modal.innerHTML = `
    <div class="tr-modal-backdrop" onclick="_closeSendModal(event)"></div>
    <div class="tr-modal-box">

      <div class="tr-modal-header">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;letter-spacing:2px;font-weight:700;">SDS/TRANSPORT/SEND</div>
          <div style="font-size:20px;color:#0E1A2E;font-weight:800;margin-top:2px;">📤 تأكيد إرسال للتخليص</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#6B6659;margin-top:4px;">
            REVIEW BEFORE SENDING · WILL CREATE SHIPMENT
          </div>
        </div>
        <button class="tr-modal-close" onclick="_closeSendModal(true)">
          <i class="ti ti-x"></i>
        </button>
      </div>

      <div class="tr-modal-body">

        <div style="background:#FEF9E7;border:1px solid #C2410C;border-radius:6px;padding:12px 14px;margin-bottom:14px;">
          <div style="display:flex;align-items:center;gap:8px;font-weight:700;color:#C2410C;font-size:13px;">
            <i class="ti ti-alert-triangle"></i>
            <span>بعد الإرسال لن يمكن التعديل على هذا الطلب</span>
          </div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#8A6B33;margin-top:6px;letter-spacing:.3px;">
            → سيتم إنشاء شحنة مسودة تلقائياً في قسم الصادر
          </div>
        </div>

        <!-- Data preview -->
        <div class="tr-preview-grid">
          <div class="tr-preview-item">
            <div class="tr-preview-lbl">TRUCK</div>
            <div class="tr-preview-val" style="font-family:'JetBrains Mono',monospace;">${data.truck_number || '—'}</div>
          </div>
          <div class="tr-preview-item">
            <div class="tr-preview-lbl">DRIVER</div>
            <div class="tr-preview-val" style="direction:ltr;text-align:right;">${data.driver_name || '—'}</div>
          </div>
          <div class="tr-preview-item">
            <div class="tr-preview-lbl">IQAMA</div>
            <div class="tr-preview-val" style="font-family:'JetBrains Mono',monospace;">${data.driver_id_number || '—'}</div>
          </div>
          <div class="tr-preview-item">
            <div class="tr-preview-lbl">NATIONALITY</div>
            <div class="tr-preview-val">${data.driver_nationality || '—'}</div>
          </div>
          <div class="tr-preview-item">
            <div class="tr-preview-lbl">CUSTOMER</div>
            <div class="tr-preview-val">${data.customer || '—'}</div>
          </div>
          <div class="tr-preview-item">
            <div class="tr-preview-lbl">MATERIAL</div>
            <div class="tr-preview-val">${data.material || '—'}</div>
          </div>
          <div class="tr-preview-item">
            <div class="tr-preview-lbl">QUANTITY</div>
            <div class="tr-preview-val" style="font-family:'JetBrains Mono',monospace;">${data.quantity || '—'}</div>
          </div>
          <div class="tr-preview-item">
            <div class="tr-preview-lbl">DATE</div>
            <div class="tr-preview-val" style="font-family:'JetBrains Mono',monospace;">${data.dispatch_date || '—'}</div>
          </div>
          <div class="tr-preview-item">
            <div class="tr-preview-lbl">DELIVERY #</div>
            <div class="tr-preview-val" style="font-family:'JetBrains Mono',monospace;">${data.delivery_number || '—'}</div>
          </div>
          <div class="tr-preview-item">
            <div class="tr-preview-lbl">DESTINATION</div>
            <div class="tr-preview-val" style="font-weight:800;">${destLabel}</div>
          </div>
        </div>

      </div>

      <div class="tr-modal-footer">
        <button class="tr-btn" onclick="_closeSendModal(true)">إلغاء</button>
        <button class="tr-btn tr-btn-primary" onclick="_confirmSend('${id}')">
          <i class="ti ti-send"></i> تأكيد وإرسال
        </button>
      </div>

    </div>

    <style>
      #tr-send-modal {
        position:fixed;inset:0;z-index:9999;
        display:flex;align-items:center;justify-content:center;
        padding:20px;font-family:'Tajawal',sans-serif;
        animation:trFadeIn 0.15s ease-out;
      }
      @keyframes trFadeIn { from { opacity:0; } to { opacity:1; } }
      .tr-modal-backdrop {
        position:absolute;inset:0;
        background:rgba(14,26,46,0.65);
        backdrop-filter:blur(2px);
      }
      .tr-modal-box {
        position:relative;background:#FAFAF7;
        border:1px solid #E8E5DC;border-radius:10px;
        width:100%;max-width:640px;max-height:90vh;
        display:flex;flex-direction:column;overflow:hidden;
        box-shadow:0 20px 50px rgba(14,26,46,0.25);
        animation:trSlideUp 0.2s ease-out;
      }
      @keyframes trSlideUp {
        from { transform:translateY(20px);opacity:0; }
        to { transform:translateY(0);opacity:1; }
      }
      .tr-modal-header {
        display:flex;justify-content:space-between;align-items:flex-start;
        padding:20px 24px;background:white;border-bottom:1px solid #E8E5DC;
      }
      .tr-modal-close {
        background:transparent;border:1.5px solid #E8E5DC;
        border-radius:6px;width:34px;height:34px;
        display:flex;align-items:center;justify-content:center;
        cursor:pointer;color:#6B6659;transition:all 0.15s;
      }
      .tr-modal-close:hover {
        background:#FEF2F2;border-color:#CC2229;color:#CC2229;
      }
      .tr-modal-body {
        padding:20px 24px;overflow-y:auto;
      }
      .tr-modal-footer {
        display:flex;justify-content:flex-end;gap:8px;
        padding:16px 24px;background:white;border-top:1px solid #E8E5DC;
      }
      .tr-preview-grid {
        display:grid;grid-template-columns:1fr 1fr;gap:10px;
        background:white;border:1px solid #E8E5DC;border-radius:6px;padding:14px;
      }
      .tr-preview-item {
        padding:8px 10px;background:#FAFAF7;border-radius:4px;
        border-right:3px solid #1C4B8E;
      }
      .tr-preview-lbl {
        font-family:'JetBrains Mono',monospace;font-size:9px;
        color:#8A8578;letter-spacing:1.5px;font-weight:700;
      }
      .tr-preview-val {
        font-size:13px;color:#0E1A2E;font-weight:600;margin-top:2px;
      }
      .tr-btn {
        background:white;border:1.5px solid #E8E5DC;border-radius:6px;
        padding:9px 18px;font-family:'Tajawal',sans-serif;font-size:13px;
        cursor:pointer;color:#0E1A2E;font-weight:700;
        transition:all 0.15s;display:inline-flex;align-items:center;gap:6px;
      }
      .tr-btn:hover { background:#F5F3EC; }
      .tr-btn-primary {
        background:#2E8B57;border-color:#2E8B57;color:white;
      }
      .tr-btn-primary:hover { background:#1F6640; }
    </style>
  `;

  document.body.appendChild(modal);

  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeSendModal(true);
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

function closeSendModal(force) {
  if (force !== true && !(force?.target?.classList?.contains?.('tr-modal-backdrop'))) return;
  const modal = document.getElementById('tr-send-modal');
  if (modal) modal.remove();
}

async function confirmSend(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) { closeSendModal(true); return; }

  // Disable buttons
  const modal = document.getElementById('tr-send-modal');
  if (modal) {
    modal.querySelectorAll('button').forEach(b => b.disabled = true);
    const confirmBtn = modal.querySelector('.tr-btn-primary');
    if (confirmBtn) confirmBtn.innerHTML = '<i class="ti ti-loader"></i> جاري الإرسال...';
  }

  const updates = {};
  row.querySelectorAll('[data-field]').forEach(el => {
    const f = el.dataset.field;
    let v = el.value;
    if (f === 'quantity') v = parseFloat(v) || 0;
    updates[f] = v;
  });
  updates.status = 'sent';

  try {
    // 1. Save request updates
    await updateTransportRequest(id, updates);

    // 2. Upsert driver
    let driver = null;
    if (updates.driver_name && updates.driver_name.trim()) {
      driver = await smartUpsertDriver({
        driver_name:  updates.driver_name.trim(),
        iqama:        updates.driver_id_number || '',
        nationality:  updates.driver_nationality || '',
        truck_number: updates.truck_number || '',
        phone:        '',
      });
    }

    // 3. Learn dropdowns
    if (updates.customer && !_dropdowns.customers.includes(updates.customer)) {
      await addDropdownValue('customers', updates.customer);
    }
    if (updates.material && !_dropdowns.materials.includes(updates.material)) {
      await addDropdownValue('materials', updates.material);
    }
    if (updates.driver_nationality && !_dropdowns.nationalities.includes(updates.driver_nationality)) {
      await addDropdownValue('nationalities', updates.driver_nationality);
    }

    // 4. Create shipment from request
    const reqObj = { id, ...updates };
    const shipmentId = await createShipmentFromTransportRequest(reqObj, driver);

    // 5. Link request → shipment
    await linkRequestToShipment(id, shipmentId);

    closeSendModal(true);
    await loadData();
    toast('✓ تم الإرسال وإنشاء الشحنة تلقائياً', 'success');
  } catch (e) {
    console.error(e);
    toast('خطأ في الإرسال', 'error');
    if (modal) {
      modal.querySelectorAll('button').forEach(b => b.disabled = false);
      const confirmBtn = modal.querySelector('.tr-btn-primary');
      if (confirmBtn) confirmBtn.innerHTML = '<i class="ti ti-send"></i> تأكيد وإرسال';
    }
  }
}

window._closeSendModal = closeSendModal;
window._confirmSend = confirmSend;

async function deleteRow(id) {
  const req = _requests.find(r => r.id === id);
  if (!req) return;
  if (req.status === 'converted') {
    toast('لا يمكن حذف طلب محوّل لشحنة', 'error');
    return;
  }
  if (!confirm('حذف هذا الطلب؟')) return;
  try {
    await deleteTransportRequest(id);
    await loadData();
    toast('✓ تم الحذف', 'success');
  } catch (e) {
    console.error(e);
    toast('خطأ في الحذف', 'error');
  }
}

// ═════════════════════════════════════════════
// SELECTION & PRINT / EXCEL EXPORT
// ═════════════════════════════════════════════
function toggleSelect(id) {
  if (_selected.has(id)) _selected.delete(id);
  else _selected.add(id);
  updateBulkButtons();
}

function toggleSelectAll(el) {
  if (el.checked) {
    // Select ALL visible rows (drafts + sent)
    _requests.forEach(r => _selected.add(r.id));
  } else {
    _selected.clear();
  }
  document.querySelectorAll('.tr-select').forEach(cb => { cb.checked = el.checked; });
  updateBulkButtons();
}

function updateBulkButtons() {
  const btnPrint = document.getElementById('btn-print-selected');
  const btnExcel = document.getElementById('btn-excel-selected');
  const btnBulkSend = document.getElementById('btn-bulk-send');
  const btnBulkDelete = document.getElementById('btn-bulk-delete');
  const cnt = document.getElementById('print-count');
  const bulkCnt = document.getElementById('bulk-send-count');
  const delCnt = document.getElementById('bulk-delete-count');
  if (!btnPrint) return;

  if (_selected.size > 0) {
    btnPrint.style.display = '';
    btnExcel.style.display = '';
    btnBulkDelete.style.display = '';
    if (cnt) cnt.textContent = _selected.size;
    if (delCnt) delCnt.textContent = _selected.size;

    // Show bulk-send only if at least one selected is draft
    const selectedDrafts = _requests.filter(r => _selected.has(r.id) && r.status === 'draft');
    if (selectedDrafts.length > 0) {
      btnBulkSend.style.display = '';
      if (bulkCnt) bulkCnt.textContent = selectedDrafts.length;
    } else {
      btnBulkSend.style.display = 'none';
    }
  } else {
    btnPrint.style.display = 'none';
    btnExcel.style.display = 'none';
    btnBulkSend.style.display = 'none';
    btnBulkDelete.style.display = 'none';
  }
}

// Bulk delete selected requests
async function bulkDelete() {
  if (_selected.size === 0) return toast('حدد طلباً أولاً', 'error');

  const selected = _requests.filter(r => _selected.has(r.id));
  const converted = selected.filter(r => r.status === 'converted');

  let msg = `حذف ${selected.length} طلب؟`;
  if (converted.length > 0) {
    msg += `\n\n⚠ تحذير: ${converted.length} طلب محوّل لشحنات في قسم التخليص.`;
    msg += `\nإذا الشحنات مو محذوفة، سيبقى الرابط مكسور.`;
  }
  msg += `\n\nتقدر تتراجع خلال 8 ثوانٍ بعد الحذف.`;
  if (!confirm(msg)) return;

  try {
    // Snapshot for undo
    const snapshots = selected.map(r => ({ ...r }));

    let ok = 0, fail = 0;
    for (const r of selected) {
      try {
        await deleteTransportRequest(r.id);
        ok++;
      } catch (e) {
        console.error('Delete failed for', r.id, e);
        fail++;
      }
    }
    _selected.clear();
    await loadData();

    const currentUser = getCurrentUser();
    const meta = { uid: currentUser.uid, name: _profile.name, email: _profile.email };

    // Show toast with undo
    toast(`🗑️ حُذف ${ok} طلب${fail > 0 ? ` (فشل ${fail})` : ''}`, 'success', {
      undo: async () => {
        // Restore all deleted records
        for (const snap of snapshots) {
          const { id, created_at, updated_at, ...data } = snap;
          await createTransportRequest(data, meta);
        }
        await loadData();
      }
    });
  } catch (e) {
    console.error(e);
    toast('خطأ في الحذف الجماعي', 'error');
  }
}

// Bulk send selected drafts to clearance department
async function bulkSendToClearance() {
  const selectedDrafts = _requests.filter(r => _selected.has(r.id) && r.status === 'draft');
  if (selectedDrafts.length === 0) return toast('لا توجد مسودّات محدّدة', 'error');

  // Validate all have required fields
  const invalid = [];
  selectedDrafts.forEach(r => {
    const missing = [];
    if (!r.truck_number) missing.push('الشاحنة');
    if (!r.driver_name) missing.push('السائق');
    if (!r.customer) missing.push('العميل');
    if (missing.length > 0) invalid.push(`${r.driver_name || '(بلا اسم)'}: ${missing.join('، ')}`);
  });
  if (invalid.length > 0) {
    return toast(`${invalid.length} صف ناقص:\n${invalid.slice(0,3).join('\n')}`, 'error');
  }

  if (!confirm(`إرسال ${selectedDrafts.length} طلب لقسم التخليص؟\nسيُنشأ shipment لكل شاحنة.`)) return;

  try {
    let ok = 0, fail = 0;
    for (const r of selectedDrafts) {
      try {
        const driver = await findDriverByEnOrIqama(r.driver_name, r.driver_id_number);
        const shipmentId = await createShipmentFromTransportRequest(r, driver);
        await linkRequestToShipment(r.id, shipmentId);
        await updateTransportRequest(r.id, { status: 'converted', shipment_id: shipmentId });
        ok++;
      } catch (e) {
        console.error('Failed to send request', r.id, e);
        fail++;
      }
    }
    _selected.clear();
    await loadData();
    toast(`✓ أُرسلت ${ok} طلب${fail > 0 ? ` (فشل ${fail})` : ''}`, fail > 0 ? 'error' : 'success');
  } catch (e) {
    console.error(e);
    toast('خطأ في الإرسال الجماعي', 'error');
  }
}

function getSelectedRequests() {
  return _requests.filter(r => _selected.has(r.id));
}

function printSelected() {
  const items = getSelectedRequests();
  if (items.length === 0) {
    toast('حدد طلباً أولاً', 'error');
    return;
  }

  const printWindow = window.open('', '_blank');
  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-SA', { calendar: 'gregory' });
  const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>طلبات النقل - ${dateStr}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body {
      font-family: 'Segoe UI', 'Tajawal', Arial, sans-serif;
      padding: 0; margin: 0; color: #0E1A2E;
    }
    .print-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding: 12px 16px; border-bottom: 3px solid #0E1A2E; margin-bottom: 12px;
    }
    .print-title-block h1 { font-size: 20px; margin: 0; font-weight: 800; }
    .print-title-block .subtitle { font-size: 11px; color: #6B6659; margin-top: 2px; letter-spacing: 1px; }
    .print-meta { text-align: left; font-size: 10px; color: #6B6659; }
    .print-meta .code { font-family: 'Courier New', monospace; font-weight: 700; letter-spacing: 1.5px; color: #0E1A2E; }
    table {
      width: 100%; border-collapse: collapse; font-size: 10px;
      table-layout: fixed;
    }
    thead th {
      background: #E8F1FA; color: #0E1A2E;
      border: 1px solid #7FA3C7;
      padding: 6px 4px; text-align: center; font-weight: 700;
      font-size: 9px; letter-spacing: .5px;
    }
    tbody td {
      border: 1px solid #C0C6CE;
      padding: 5px 4px; text-align: center;
      background: white;
    }
    tbody tr:nth-child(even) td { background: #FBFBFB; }
    .col-en { direction: ltr; font-family: 'Segoe UI', Arial, sans-serif; font-weight: 700; }
    .col-num { font-family: 'Courier New', monospace; font-weight: 700; direction: ltr; }
    .col-ar { direction: rtl; }
    .print-footer {
      margin-top: 20px; display: flex; justify-content: space-between;
      padding: 12px 16px; border-top: 1px solid #E8E5DC;
      font-size: 10px; color: #6B6659;
    }
    .signature-block { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 40px; margin-top: 30px; }
    .sig { text-align: center; }
    .sig-line { border-bottom: 1px solid #0E1A2E; height: 30px; margin-bottom: 4px; }
    .sig-label { font-size: 10px; color: #6B6659; font-weight: 700; }
    @media print {
      .no-print { display: none !important; }
    }
    .no-print {
      position: fixed; top: 10px; left: 10px; z-index: 100;
      background: #0E1A2E; color: white; border: none;
      padding: 10px 20px; border-radius: 6px; cursor: pointer;
      font-family: 'Tajawal', sans-serif; font-size: 13px; font-weight: 700;
    }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()">🖨️ طباعة الآن</button>

  <div class="print-header">
    <div class="print-title-block">
      <h1>🚛 طلبات النقل - السديس اللوجستية</h1>
      <div class="subtitle">TRANSPORT REQUESTS · SDS LOGISTICS</div>
    </div>
    <div class="print-meta">
      <div class="code">SDS/TRANSPORT/${now.getFullYear()}</div>
      <div style="margin-top:4px;">${dateStr} · ${timeStr}</div>
      <div style="margin-top:2px;">${items.length} طلب</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:3%;">S/L</th>
        <th style="width:6%;">Truck#</th>
        <th style="width:16%;">Driver Name</th>
        <th style="width:9%;">Driver#</th>
        <th style="width:8%;">Nationality</th>
        <th style="width:8%;">Customer</th>
        <th style="width:7%;">Material</th>
        <th style="width:5%;">Qty(M/T)</th>
        <th style="width:7%;">Dispatch Date</th>
        <th style="width:7%;">Delivery#</th>
        <th style="width:6%;">Dest</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((r, i) => `
        <tr>
          <td class="col-num">${i + 1}</td>
          <td class="col-num">${r.truck_number || '—'}</td>
          <td class="col-en">${r.driver_name || '—'}</td>
          <td class="col-num">${r.driver_id_number || '—'}</td>
          <td class="col-ar">${r.driver_nationality || '—'}</td>
          <td class="col-ar">${r.customer || '—'}</td>
          <td class="col-ar">${r.material || '—'}</td>
          <td class="col-num">${r.quantity || '—'}</td>
          <td class="col-num">${r.dispatch_date || '—'}</td>
          <td class="col-num">${r.delivery_number || '—'}</td>
          <td class="col-ar">${(DEST_LABELS[r.destination]?.en || r.destination || '—').toUpperCase()}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="signature-block">
    <div class="sig">
      <div class="sig-line"></div>
      <div class="sig-label">أُعدَّ بواسطة / PREPARED BY</div>
    </div>
    <div class="sig">
      <div class="sig-line"></div>
      <div class="sig-label">مسؤول النقل / TRANSPORT MANAGER</div>
    </div>
    <div class="sig">
      <div class="sig-line"></div>
      <div class="sig-label">مسؤول التخليص / CUSTOMS MANAGER</div>
    </div>
  </div>

  <div class="print-footer">
    <div>M-Customs System · السديس اللوجستية</div>
    <div>Page 1 of 1</div>
  </div>

  <script>
    setTimeout(() => window.print(), 300);
  </script>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}

function exportSelectedExcel() {
  const items = getSelectedRequests();
  if (items.length === 0) {
    toast('حدد طلباً أولاً', 'error');
    return;
  }

  const BOM = '\uFEFF';
  let csv = BOM;

  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-SA', { calendar: 'gregory' });

  csv += `طلبات النقل - السديس اللوجستية,${dateStr}\n`;
  csv += `عدد الطلبات,${items.length}\n\n`;

  csv += `S/L,Truck#,Driver Name,Driver#,Nationality,Customer,Material,Qty(M/T),Dispatch Date,Delivery#,Destination\n`;
  items.forEach((r, i) => {
    const dest = (DEST_LABELS[r.destination]?.en || r.destination || '').toUpperCase();
    const nat = (r.driver_nationality || '').replace(/,/g, '،');
    const cust = (r.customer || '').replace(/,/g, '،');
    const mat = (r.material || '').replace(/,/g, '،');
    const drv = (r.driver_name || '').replace(/,/g, ' ');
    csv += `${i+1},${r.truck_number||''},"${drv}",${r.driver_id_number||''},"${nat}","${cust}","${mat}",${r.quantity||''},${r.dispatch_date||''},${r.delivery_number||''},${dest}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `طلبات_النقل_${now.toISOString().slice(0,10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  toast(`✓ تم تصدير ${items.length} طلب`, 'success');
}

window._toggleSelect = toggleSelect;
window._toggleSelectAll = toggleSelectAll;
window._printSelected = printSelected;
window._exportSelectedExcel = exportSelectedExcel;

// ══════════════════════════════════════════════════════════════
// BATCH ADD MODAL — Set customer/material/date once, add many trucks
// ══════════════════════════════════════════════════════════════

let _batchTrucks = []; // temporary list before saving

function openBatchModal() {
  _batchTrucks = [{ tempId: Date.now() }]; // start with one empty truck

  const existing = document.getElementById('tr-batch-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'tr-batch-modal';
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(14,26,46,0.55);z-index:9999;
    display:flex;align-items:center;justify-content:center;padding:20px;
    font-family:Tajawal,sans-serif;
  `;

  modal.innerHTML = `
    <div style="background:#F5F3EC;border-radius:10px;width:100%;max-width:1200px;max-height:92vh;
                overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(14,26,46,0.4);">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#0E1A2E 0%,#1C2B48 100%);color:white;padding:18px 24px;
                  display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;color:#D4B266;font-weight:700;">
            SDS · BATCH REQUEST · NEW
          </div>
          <div style="font-size:20px;font-weight:900;margin-top:4px;">📦 دفعة نقل جديدة</div>
          <div style="font-size:11px;color:#B8B0A0;margin-top:2px;">
            اضبط العميل + المادة + التاريخ مرة واحدة، ثم أضف الشاحنات
          </div>
        </div>
        <button onclick="_batchClose()" style="background:transparent;border:none;color:white;font-size:26px;cursor:pointer;padding:4px 12px;">×</button>
      </div>

      <!-- Body -->
      <div style="flex:1;overflow-y:auto;padding:24px;">

        <!-- BATCH DEFAULTS -->
        <div style="background:white;border:1px solid #E8E5DC;border-radius:8px;padding:18px;margin-bottom:20px;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;color:#8B6914;font-weight:800;margin-bottom:14px;">
            ⚙ BATCH DEFAULTS — تُطبَّق على كل الشاحنات
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;">
            <div>
              <label style="font-size:11px;font-weight:800;color:#6B6659;display:block;margin-bottom:6px;">العميل *</label>
              <input list="dl-batch-customer" id="batch-customer" type="text" placeholder="اختر أو أضف"
                style="width:100%;padding:9px 12px;border:1.5px solid #D4B266;border-radius:5px;font-family:Tajawal,sans-serif;font-size:13px;background:#FEFCF3;outline:none;">
              <datalist id="dl-batch-customer">
                ${_dropdowns.customers.map(o => `<option value="${o}"></option>`).join('')}
              </datalist>
            </div>
            <div>
              <label style="font-size:11px;font-weight:800;color:#6B6659;display:block;margin-bottom:6px;">المادة *</label>
              <input list="dl-batch-material" id="batch-material" type="text" placeholder="RRO, DRO, HG..."
                style="width:100%;padding:9px 12px;border:1.5px solid #D4B266;border-radius:5px;font-family:Tajawal,sans-serif;font-size:13px;background:#FEFCF3;outline:none;">
              <datalist id="dl-batch-material">
                ${_dropdowns.materials.map(o => `<option value="${o}"></option>`).join('')}
              </datalist>
            </div>
            <div>
              <label style="font-size:11px;font-weight:800;color:#6B6659;display:block;margin-bottom:6px;">منطقة التحميل *</label>
              <input list="dl-batch-loading" id="batch-loading-location" type="text" placeholder="DAMMAM"
                style="width:100%;padding:9px 12px;border:1.5px solid #D4B266;border-radius:5px;font-family:'JetBrains Mono',monospace;font-size:13px;background:#FEFCF3;outline:none;direction:ltr;text-align:right;">
              <datalist id="dl-batch-loading">
                ${LOADING_LOCATIONS.map(l => `<option value="${l}"></option>`).join('')}
              </datalist>
            </div>
            <div>
              <label style="font-size:11px;font-weight:800;color:#6B6659;display:block;margin-bottom:6px;">تاريخ التحميل (هجري)</label>
              <input id="batch-date" type="text" value="${todayHijri()}" placeholder="1447-12-05"
                style="width:100%;padding:9px 12px;border:1.5px solid #E8E5DC;border-radius:5px;font-family:'JetBrains Mono',monospace;font-size:13px;direction:ltr;text-align:right;outline:none;">
            </div>
            <div>
              <label style="font-size:11px;font-weight:800;color:#6B6659;display:block;margin-bottom:6px;">الوجهة</label>
              <select id="batch-destination" style="width:100%;padding:9px 12px;border:1.5px solid #E8E5DC;border-radius:5px;font-family:Tajawal,sans-serif;font-size:13px;cursor:pointer;outline:none;background:white;">
                <option value="uae">🇦🇪 الإمارات</option>
                <option value="bahrain">🇧🇭 البحرين</option>
                <option value="oman">🇴🇲 عمان</option>
              </select>
            </div>
          </div>
        </div>

        <!-- TRUCKS SECTION -->
        <div style="background:white;border:1px solid #E8E5DC;border-radius:8px;overflow:hidden;">
          <div style="background:#FAFAF7;padding:12px 18px;border-bottom:1px solid #E8E5DC;display:flex;justify-content:space-between;align-items:center;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;color:#0E1A2E;font-weight:800;">
              🚛 TRUCKS — اختر السائق تُملأ البيانات تلقائياً
            </div>
            <button onclick="_batchAddTruck()" style="background:#0E1A2E;color:white;border:none;border-radius:5px;padding:6px 14px;font-family:Tajawal,sans-serif;font-size:12px;font-weight:700;cursor:pointer;">
              <i class="ti ti-plus"></i> شاحنة
            </button>
          </div>
          <div style="overflow-x:auto;">
            <table id="batch-trucks-table" style="width:100%;border-collapse:collapse;font-size:12px;min-width:1000px;">
              <thead>
                <tr style="background:#F5F3EC;">
                  <th style="padding:9px 6px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:9px;color:#6B6659;letter-spacing:1px;font-weight:800;width:36px;">#</th>
                  <th style="padding:9px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;color:#6B6659;letter-spacing:1px;font-weight:800;">DRIVER NAME *</th>
                  <th style="padding:9px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;color:#6B6659;letter-spacing:1px;font-weight:800;">PHONE</th>
                  <th style="padding:9px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;color:#6B6659;letter-spacing:1px;font-weight:800;">IQAMA</th>
                  <th style="padding:9px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;color:#6B6659;letter-spacing:1px;font-weight:800;">NAT</th>
                  <th style="padding:9px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;color:#6B6659;letter-spacing:1px;font-weight:800;">TRUCK#</th>
                  <th style="padding:9px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;color:#6B6659;letter-spacing:1px;font-weight:800;">QTY(MT)</th>
                  <th style="padding:9px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;color:#6B6659;letter-spacing:1px;font-weight:800;">DELIVERY#</th>
                  <th style="padding:9px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;color:#6B6659;letter-spacing:1px;font-weight:800;">LOCATION (opt)</th>
                  <th style="padding:9px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;color:#6B6659;letter-spacing:1px;font-weight:800;">DATE (opt)</th>
                  <th style="padding:9px 6px;text-align:center;width:40px;"></th>
                </tr>
              </thead>
              <tbody id="batch-trucks-body"></tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div style="background:white;border-top:1px solid #E8E5DC;padding:14px 24px;display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <div style="font-size:12px;color:#6B6659;">
          <span id="batch-count">1</span> شاحنة في الدفعة
        </div>
        <div style="display:flex;gap:10px;">
          <button onclick="_batchClose()" style="background:#F5F3EC;color:#6B6659;border:1px solid #E8E5DC;border-radius:5px;padding:9px 18px;font-family:Tajawal,sans-serif;font-size:13px;font-weight:700;cursor:pointer;">إلغاء</button>
          <button onclick="_batchSaveDraft()" style="background:white;color:#0E1A2E;border:1.5px solid #0E1A2E;border-radius:5px;padding:9px 18px;font-family:Tajawal,sans-serif;font-size:13px;font-weight:700;cursor:pointer;">
            <i class="ti ti-device-floppy"></i> حفظ كمسودّة
          </button>
          <button onclick="_batchPreviewAndSend()" style="background:#2E8B57;color:white;border:none;border-radius:5px;padding:9px 20px;font-family:Tajawal,sans-serif;font-size:13px;font-weight:800;cursor:pointer;">
            <i class="ti ti-eye"></i> معاينة وإرسال
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  renderBatchTrucks();
}

function closeBatchModal() {
  const m = document.getElementById('tr-batch-modal');
  if (m) m.remove();
  _batchTrucks = [];
}

function showBatchPreview() {
  // Read current defaults
  const customer = document.getElementById('batch-customer').value.trim();
  const material = document.getElementById('batch-material').value.trim();
  const loading_location = document.getElementById('batch-loading-location').value.trim().toUpperCase();
  const dispatch_date = document.getElementById('batch-date').value.trim();
  const destination = document.getElementById('batch-destination').value;
  const destLabel = DEST_LABELS[destination]?.ar || destination;

  // Read latest row inputs into _batchTrucks
  document.querySelectorAll('#batch-trucks-body .batch-cell').forEach(input => {
    const idx = parseInt(input.dataset.idx);
    const field = input.dataset.field;
    if (!isNaN(idx) && field) _batchTrucks[idx][field] = input.value;
  });

  const validTrucks = _batchTrucks.filter(t => (t.driver_name || '').trim());
  const totalQty = validTrucks.reduce((s, t) => s + (parseFloat(t.quantity) || 0), 0);

  // Location distribution
  const locMap = {};
  validTrucks.forEach(t => {
    const loc = (t.loading_location || '').trim().toUpperCase() || loading_location || '—';
    locMap[loc] = (locMap[loc] || 0) + 1;
  });

  // Warnings
  const warnings = [];
  validTrucks.forEach((t, i) => {
    const missing = [];
    if (!t.truck_number) missing.push('TRUCK#');
    if (!t.driver_id_number) missing.push('IQAMA');
    if (missing.length > 0) warnings.push(`${t.driver_name || `#${i+1}`}: ${missing.join(', ')}`);
  });

  const existing = document.getElementById('tr-batch-preview-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'tr-batch-preview-modal';
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(14,26,46,0.65);z-index:10000;
    display:flex;align-items:center;justify-content:center;padding:20px;
    font-family:Tajawal,sans-serif;
  `;

  modal.innerHTML = `
    <div style="background:#F5F3EC;border-radius:10px;width:100%;max-width:640px;max-height:88vh;
                overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(14,26,46,0.4);">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#0E1A2E 0%,#1C2B48 100%);color:white;padding:16px 22px;
                  display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;color:#D4B266;font-weight:700;">SDS · BATCH · PREVIEW</div>
          <div style="font-size:18px;font-weight:900;margin-top:3px;">👁 معاينة قبل الإرسال</div>
        </div>
        <button onclick="document.getElementById('tr-batch-preview-modal').remove()"
          style="background:transparent;border:none;color:white;font-size:26px;cursor:pointer;padding:4px 10px;">×</button>
      </div>

      <!-- Body -->
      <div style="flex:1;overflow-y:auto;padding:20px;">

        <!-- Stats -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px;">
          <div style="background:white;border:1px solid #E8E5DC;border-radius:7px;padding:14px;text-align:center;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#6B6659;font-weight:700;letter-spacing:1px;">DRIVERS</div>
            <div style="font-size:28px;font-weight:900;color:#0E1A2E;margin-top:4px;">${validTrucks.length}</div>
          </div>
          <div style="background:#E7F5EE;border:1px solid #B7DFD0;border-radius:7px;padding:14px;text-align:center;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#2E8B57;font-weight:700;letter-spacing:1px;">TOTAL QTY (MT)</div>
            <div style="font-size:28px;font-weight:900;color:#2E8B57;margin-top:4px;">${totalQty.toFixed(2)}</div>
          </div>
          <div style="background:#EEF2FF;border:1px solid #C7D4F5;border-radius:7px;padding:14px;text-align:center;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#1C4B8E;font-weight:700;letter-spacing:1px;">DEST</div>
            <div style="font-size:20px;font-weight:900;color:#1C4B8E;margin-top:4px;">${destLabel}</div>
          </div>
        </div>

        <!-- Batch defaults summary -->
        <div style="background:white;border:1px solid #E8E5DC;border-radius:7px;padding:14px;margin-bottom:14px;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8B6914;font-weight:800;letter-spacing:1.5px;margin-bottom:10px;">⚙ BATCH DEFAULTS</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;">
            <div><span style="color:#8A8578;font-size:11px;">العميل:</span> <b>${customer || '—'}</b></div>
            <div><span style="color:#8A8578;font-size:11px;">المادة:</span> <b>${material || '—'}</b></div>
            <div><span style="color:#8A8578;font-size:11px;">التاريخ:</span> <b style="font-family:'JetBrains Mono',monospace;">${dispatch_date || '—'}</b></div>
            <div><span style="color:#8A8578;font-size:11px;">منطقة التحميل:</span> <b style="font-family:'JetBrains Mono',monospace;">${loading_location || '—'}</b></div>
          </div>
        </div>

        <!-- Location distribution -->
        <div style="background:white;border:1px solid #E8E5DC;border-radius:7px;padding:14px;margin-bottom:14px;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#0E1A2E;font-weight:800;letter-spacing:1.5px;margin-bottom:10px;">📍 توزيع مناطق التحميل</div>
          ${Object.entries(locMap).map(([loc, cnt]) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #F0EDE4;">
              <span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;">${loc}</span>
              <span style="background:#0E1A2E;color:white;border-radius:12px;padding:2px 10px;font-size:11px;font-weight:800;">${cnt} شاحنة</span>
            </div>`).join('')}
        </div>

        <!-- Warnings -->
        ${warnings.length > 0 ? `
          <div style="background:#FEF9E7;border:1px solid #F0C040;border-radius:7px;padding:14px;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#C2410C;font-weight:800;letter-spacing:1.5px;margin-bottom:8px;">
              ⚠ تحذيرات (${warnings.length}) — يمكن الإرسال مع التحذيرات
            </div>
            ${warnings.map(w => `<div style="font-size:12px;color:#C2410C;padding:3px 0;direction:ltr;text-align:right;">• ${w}</div>`).join('')}
          </div>` : `
          <div style="background:#E7F5EE;border:1px solid #B7DFD0;border-radius:7px;padding:12px;text-align:center;">
            <span style="color:#2E8B57;font-weight:800;font-size:13px;">✓ جميع السائقين مكتملون</span>
          </div>`}

      </div>

      <!-- Footer -->
      <div style="background:white;border-top:1px solid #E8E5DC;padding:14px 22px;display:flex;justify-content:flex-end;gap:10px;">
        <button onclick="document.getElementById('tr-batch-preview-modal').remove()"
          style="background:#F5F3EC;color:#6B6659;border:1px solid #E8E5DC;border-radius:5px;padding:9px 18px;font-family:Tajawal,sans-serif;font-size:13px;font-weight:700;cursor:pointer;">
          رجوع للتعديل
        </button>
        <button onclick="document.getElementById('tr-batch-preview-modal').remove(); _batchSaveAndSend();"
          style="background:#2E8B57;color:white;border:none;border-radius:5px;padding:9px 22px;font-family:Tajawal,sans-serif;font-size:13px;font-weight:800;cursor:pointer;">
          <i class="ti ti-send"></i> تأكيد وإرسال للتخليص
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function renderBatchTrucks() {
  const tbody = document.getElementById('batch-trucks-body');
  if (!tbody) return;

  tbody.innerHTML = _batchTrucks.map((t, idx) => `
    <tr data-truck-idx="${idx}" style="border-bottom:1px solid #F0EDE4;">
      <td style="text-align:center;font-family:'JetBrains Mono',monospace;font-weight:700;color:#8A8578;">${String(idx+1).padStart(2,'0')}</td>
      <td>
        <input type="text" class="batch-cell batch-driver-name" data-field="driver_name" data-idx="${idx}"
          value="${t.driver_name||''}" placeholder="ابحث بالاسم..." autocomplete="off"
          style="border:none;background:transparent;width:100%;padding:8px 6px;font-family:Tajawal,sans-serif;font-size:12px;direction:ltr;text-align:right;outline:none;">
      </td>
      <td>
        <input type="text" class="batch-cell" data-field="phone" data-idx="${idx}"
          value="${t.phone||''}" readonly placeholder="—"
          style="border:none;background:transparent;width:100%;padding:8px 6px;font-family:'JetBrains Mono',monospace;font-size:11px;direction:ltr;text-align:right;outline:none;color:#2E8B57;min-width:110px;">
      </td>
      <td>
        <input type="text" class="batch-cell" data-field="driver_id_number" data-idx="${idx}"
          value="${t.driver_id_number||''}" placeholder="إقامة"
          style="border:none;background:transparent;width:100%;padding:8px 6px;font-family:'JetBrains Mono',monospace;font-size:12px;direction:ltr;text-align:right;outline:none;">
      </td>
      <td>
        <input type="text" class="batch-cell" data-field="driver_nationality" data-idx="${idx}"
          value="${t.driver_nationality||''}" placeholder="الجنسية"
          style="border:none;background:transparent;width:100%;padding:8px 6px;font-family:Tajawal,sans-serif;font-size:12px;outline:none;">
      </td>
      <td>
        <input type="text" class="batch-cell" data-field="truck_number" data-idx="${idx}"
          value="${t.truck_number||''}" placeholder="رقم اللوحة"
          style="border:none;background:transparent;width:100%;padding:8px 6px;font-family:'JetBrains Mono',monospace;font-size:12px;direction:ltr;text-align:right;outline:none;">
      </td>
      <td>
        <input type="number" class="batch-cell" data-field="quantity" data-idx="${idx}"
          value="${t.quantity||''}" placeholder="الكمية" step="0.01"
          style="border:none;background:transparent;width:100%;padding:8px 6px;font-family:'JetBrains Mono',monospace;font-size:12px;direction:ltr;text-align:right;outline:none;">
      </td>
      <td>
        <input type="text" class="batch-cell" data-field="delivery_number" data-idx="${idx}"
          value="${t.delivery_number||''}" placeholder="رقم الإذن"
          style="border:none;background:transparent;width:100%;padding:8px 6px;font-family:'JetBrains Mono',monospace;font-size:12px;direction:ltr;text-align:right;outline:none;">
      </td>
      <td>
        <input list="dl-batch-location-row" type="text" class="batch-cell" data-field="loading_location" data-idx="${idx}"
          value="${t.loading_location||''}" placeholder="(افتراضي)"
          style="border:none;background:transparent;width:100%;padding:8px 6px;font-family:'JetBrains Mono',monospace;font-size:11px;direction:ltr;text-align:right;outline:none;color:#1C4B8E;min-width:100px;">
        ${idx === 0 ? `<datalist id="dl-batch-location-row">${LOADING_LOCATIONS.map(l => `<option value="${l}"></option>`).join('')}</datalist>` : ''}
      </td>
      <td>
        <input type="text" class="batch-cell" data-field="dispatch_date" data-idx="${idx}"
          value="${t.dispatch_date || todayHijri()}" placeholder="${todayHijri()}"
          style="border:none;background:transparent;width:100%;padding:8px 6px;font-family:'JetBrains Mono',monospace;font-size:11px;direction:ltr;text-align:right;outline:none;color:#0E1A2E;">
      </td>
      <td style="text-align:center;">
        ${_batchTrucks.length > 1 ? `
          <button onclick="_batchRemoveTruck(${idx})" style="background:transparent;border:none;cursor:pointer;color:#CC2229;padding:4px;font-size:16px;">
            <i class="ti ti-trash"></i>
          </button>` : ''
        }
      </td>
    </tr>
  `).join('');

  // Sync inputs → state
  tbody.querySelectorAll('.batch-cell').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      const field = e.target.dataset.field;
      _batchTrucks[idx][field] = e.target.value;
    });
  });

  // Driver dropdown on driver name cells
  tbody.querySelectorAll('.batch-driver-name').forEach(input => {
    input.addEventListener('focus', (e) => showBatchDriverDropdown(e.target));
    input.addEventListener('input', (e) => showBatchDriverDropdown(e.target));
    input.addEventListener('blur', () => setTimeout(() => hideDriverDropdown(), 200));
  });

  document.getElementById('batch-count').textContent = _batchTrucks.length;
}

function batchAddTruck() {
  _batchTrucks.push({ tempId: Date.now() + Math.random() });
  renderBatchTrucks();
  // Focus the new row's driver name
  setTimeout(() => {
    const rows = document.querySelectorAll('#batch-trucks-body tr');
    const lastRow = rows[rows.length - 1];
    if (lastRow) {
      lastRow.scrollIntoView({ behavior: 'smooth', block: 'end' });
      const nameInput = lastRow.querySelector('.batch-driver-name');
      if (nameInput) nameInput.focus();
    }
  }, 50);
}

function batchRemoveTruck(idx) {
  if (_batchTrucks.length <= 1) return;
  _batchTrucks.splice(idx, 1);
  renderBatchTrucks();
}

// Reuse existing driver dropdown for the batch inputs
function showBatchDriverDropdown(input) {
  _activeInput = input;
  const query = (input.value || '').trim().toLowerCase();

  let matches = _drivers.filter(d => {
    const anyName = d.name_en || d.name_ar || d.name || '';
    if (!anyName) return false;
    if (!query) return true;
    let trucks = [d.truck_number || ''];
    if (d.vehicles && Array.isArray(d.vehicles)) {
      trucks = trucks.concat(d.vehicles.map(v => (v.plate || '')));
    }
    const inNameEn = (d.name_en || '').toLowerCase().includes(query);
    const inNameAr = (d.name_ar || '').toLowerCase().includes(query);
    const inLegacyName = (d.name || '').toLowerCase().includes(query);
    const inIqama = (d.iqama || '').toLowerCase().includes(query);
    const inTruck = trucks.some(t => t.toLowerCase().includes(query));
    return inNameEn || inNameAr || inLegacyName || inIqama || inTruck;
  }).slice(0, 15);

  let dd = document.getElementById('tr-driver-dropdown');
  if (!dd) {
    dd = document.createElement('div');
    dd.id = 'tr-driver-dropdown';
    document.body.appendChild(dd);
  }
  dd.style.zIndex = '10001';

  if (matches.length === 0) {
    dd.innerHTML = `<div style="padding:14px;text-align:center;color:#8A8578;font-size:12px;">
      ${query ? '🔍 لا يوجد سائق مطابق' : 'ابدأ بالكتابة'}
    </div>`;
  } else {
    dd.innerHTML = matches.map(d => {
      const displayEn = d.name_en || '';
      const displayAr = d.name_ar || (!d.name_en && d.name) || '';
      let plate = d.truck_number || '';
      if (!plate && d.vehicles && d.vehicles.length > 0) {
        plate = d.vehicles[d.vehicles.length - 1].plate || '';
      }
      return `
        <div class="tr-dd-item" data-driver-id="${d.id}">
          ${displayEn ? `<div style="font-weight:800;font-size:13px;color:#0E1A2E;direction:ltr;text-align:right;">${displayEn}</div>` : ''}
          ${displayAr ? `<div style="font-size:12px;color:#1C4B8E;margin-top:2px;">${displayAr}</div>` : ''}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B6659;">
            <div><span style="color:#8A8578;">IQAMA:</span> <b style="color:#0E1A2E;">${d.iqama || '—'}</b></div>
            <div><span style="color:#8A8578;">NAT:</span> <b style="color:#0E1A2E;">${d.nationality || '—'}</b></div>
            <div><span style="color:#8A8578;">TRUCK:</span> <b style="color:#0E1A2E;">${plate || '—'}</b></div>
            <div><span style="color:#8A8578;">PHONE:</span> <b style="color:#0E1A2E;">${d.phone || '—'}</b></div>
          </div>
        </div>`;
    }).join('');

    dd.querySelectorAll('.tr-dd-item').forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        batchSelectDriver(item.dataset.driverId);
      });
    });
  }

  const rect = input.getBoundingClientRect();
  dd.style.display = 'block';
  dd.style.top = `${rect.bottom + window.scrollY + 2}px`;
  dd.style.left = `${rect.left + window.scrollX}px`;
  dd.style.width = `${Math.max(rect.width, 320)}px`;
}

function batchSelectDriver(driverId) {
  const driver = _drivers.find(d => d.id === driverId);
  if (!driver || !_activeInput) return;

  const idx = parseInt(_activeInput.dataset.idx);
  if (isNaN(idx)) return;

  let plate = driver.truck_number || '';
  if (!plate && driver.vehicles && driver.vehicles.length > 0) {
    plate = driver.vehicles[driver.vehicles.length - 1].plate || '';
  }

  // Fill batch truck object
  _batchTrucks[idx].driver_name = driver.name_en || driver.name_ar || driver.name || '';
  _batchTrucks[idx].driver_id_number = driver.iqama || '';
  _batchTrucks[idx].driver_nationality = driver.nationality || '';
  _batchTrucks[idx].truck_number = plate;
  _batchTrucks[idx].phone = driver.phone || '';

  hideDriverDropdown();
  renderBatchTrucks();
  toast(`✓ ${_batchTrucks[idx].driver_name}`, 'success');
}

async function saveBatch(sendToClearance) {
  // Read batch defaults
  const customer = document.getElementById('batch-customer').value.trim();
  const material = document.getElementById('batch-material').value.trim();
  const loading_location = document.getElementById('batch-loading-location').value.trim().toUpperCase();
  const dispatch_date = document.getElementById('batch-date').value.trim();
  const destination = document.getElementById('batch-destination').value;

  // Validate
  if (!customer) return toast('اسم العميل مطلوب', 'error');
  if (!material) return toast('المادة مطلوبة', 'error');
  if (!loading_location) return toast('منطقة التحميل مطلوبة', 'error');

  const validTrucks = _batchTrucks.filter(t => (t.driver_name || '').trim());
  if (validTrucks.length === 0) return toast('أضف سائقاً واحداً على الأقل', 'error');

  if (sendToClearance) {
    const missing = validTrucks.filter(t => !t.truck_number);
    if (missing.length > 0) {
      return toast(`${missing.length} شاحنة بدون رقم لوحة — لا يمكن الإرسال`, 'error');
    }
  }

  try {
    const currentUser = getCurrentUser();
    const meta = { uid: currentUser.uid, name: _profile.name, email: _profile.email };

    // Learn new dropdown values
    if (customer && !_dropdowns.customers.includes(customer)) {
      await addDropdownValue('customers', customer);
    }
    if (material && !_dropdowns.materials.includes(material)) {
      await addDropdownValue('materials', material);
    }

    // Generate a unique batch_id for this whole bulk save
    const batchId = 'B' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
    const batchLabel = `${customer} · ${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}`;

    const createdIds = [];
    for (const t of validTrucks) {
      const data = {
        customer,
        material,
        loading_location: (t.loading_location || '').trim().toUpperCase() || loading_location,
        destination,
        dispatch_date: (t.dispatch_date || '').trim() || dispatch_date,
        driver_name: (t.driver_name || '').trim(),
        driver_id_number: (t.driver_id_number || '').trim(),
        driver_nationality: (t.driver_nationality || '').trim(),
        truck_number: (t.truck_number || '').trim(),
        quantity: parseFloat(t.quantity) || 0,
        delivery_number: (t.delivery_number || '').trim(),
        status: 'draft',
        batch_id: batchId,
        batch_label: batchLabel,
      };
      const newId = await createTransportRequest(data, meta);
      createdIds.push(newId);

      // Upsert driver record
      if (data.driver_name) {
        await smartUpsertDriver({
          driver_name:  data.driver_name,
          iqama:        data.driver_id_number,
          nationality:  data.driver_nationality,
          truck_number: data.truck_number,
          phone:        (t.phone || '').trim(),
        });
      }

      // Learn nationality
      if (data.driver_nationality && !_dropdowns.nationalities.includes(data.driver_nationality)) {
        await addDropdownValue('nationalities', data.driver_nationality);
      }
    }

    // Send each to clearance if requested
    if (sendToClearance) {
      for (let i = 0; i < createdIds.length; i++) {
        const reqId = createdIds[i];
        const reqDoc = validTrucks[i];
        const fullData = {
          id: reqId,
          customer, material, loading_location, destination,
          dispatch_date: (reqDoc.dispatch_date || '').trim() || dispatch_date,
          driver_name: reqDoc.driver_name,
          driver_id_number: reqDoc.driver_id_number,
          driver_nationality: reqDoc.driver_nationality,
          truck_number: reqDoc.truck_number,
          quantity: parseFloat(reqDoc.quantity) || 0,
          delivery_number: reqDoc.delivery_number || '',
        };
        const driver = await findDriverByEnOrIqama(reqDoc.driver_name, reqDoc.driver_id_number);
        const shipmentId = await createShipmentFromTransportRequest(fullData, driver);
        await linkRequestToShipment(reqId, shipmentId);
        await updateTransportRequest(reqId, { status: 'converted', shipment_id: shipmentId });
      }
    }

    closeBatchModal();
    await loadData();
    toast(`✓ ${validTrucks.length} ${sendToClearance ? 'أُرسلت للتخليص' : 'محفوظة كمسودّة'}`, 'success');
  } catch (e) {
    console.error(e);
    toast('خطأ في الحفظ: ' + (e.message || e), 'error');
  }
}

// ══════════════════════════════════════════════════════════════
// SUNARA-STYLE EXCEL EXPORT (styled .xlsx via xlsx-js-style)
// ══════════════════════════════════════════════════════════════

// Extract only digits from a plate string (e.g. "أ ص ع 4743" → "4743")
function extractPlateDigits(plate) {
  if (!plate) return '';
  const digits = String(plate).match(/\d+/g);
  return digits ? digits.join('') : String(plate);
}

async function exportSelectedExcelXLSX() {
  const items = getSelectedRequests();
  if (items.length === 0) return toast('حدد طلباً أولاً', 'error');

  // Lazy-load xlsx-js-style (supports real cell styling)
  if (!window.XLSX || !window.XLSX._styled) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    if (window.XLSX) window.XLSX._styled = true;
  }
  const XLSX = window.XLSX;

  // Style helpers ─────────────────────────────────
  const BORDER = {
    top:    { style: 'thin', color: { rgb: '8B7355' } },
    bottom: { style: 'thin', color: { rgb: '8B7355' } },
    left:   { style: 'thin', color: { rgb: '8B7355' } },
    right:  { style: 'thin', color: { rgb: '8B7355' } },
  };
  const TITLE_STYLE = {
    font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
    fill: { fgColor: { rgb: '0E1A2E' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BORDER,
  };
  const SUBTITLE_STYLE = {
    font: { bold: true, sz: 11, color: { rgb: 'D4B266' }, name: 'Calibri' },
    fill: { fgColor: { rgb: '1C2B48' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BORDER,
  };
  const HEADER_STYLE = {
    font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
    fill: { fgColor: { rgb: '0E1A2E' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: BORDER,
  };
  const CELL_STYLE = (isEven) => ({
    font: { sz: 10, name: 'Calibri', color: { rgb: '0E1A2E' } },
    fill: { fgColor: { rgb: isEven ? 'F8F5EC' : 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BORDER,
  });
  const CELL_STYLE_LEFT = (isEven) => ({
    ...CELL_STYLE(isEven),
    alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
  });

  const headers = [
    'S/N', 'Location', 'Truck Number', 'ETA - Loading', 'Driver Name',
    'Driver Number', 'Driver Nationality', 'Customer', 'Material',
    'Qty (MT)', 'Dispatch Date', 'Delivery SLIP', 'Phone', 'Axles'
  ];

  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-SA', { calendar: 'gregory' });
  const customerName = items[0].customer || 'Transport';

  // Build sheet data ─────────────────────────────
  const aoa = [
    ['السديس اللوجستية · AL SUDAIS LOGISTICS'],
    [`TRANSPORT REQUESTS · ${customerName.toUpperCase()} · ${dateStr}`],
    [],
    headers,
    ...items.map((r, i) => {
      // Look up driver phone from cached drivers
      let phone = r.driver_phone || '';
      if (!phone && r.driver_id_number) {
        const drv = _drivers.find(d => d.iqama === r.driver_id_number);
        if (drv) phone = drv.phone || '';
      }
      if (!phone && r.driver_name) {
        const drv = _drivers.find(d =>
          (d.name_en === r.driver_name) || (d.name_ar === r.driver_name) || (d.name === r.driver_name)
        );
        if (drv) phone = drv.phone || '';
      }
      const dash = '—';
      return [
        i + 1,
        r.loading_location || dash,
        extractPlateDigits(r.truck_number || '') || dash,
        r.dispatch_date || dash,
        r.driver_name || dash,
        r.driver_id_number || dash,
        r.driver_nationality || dash,
        r.customer || dash,
        r.material || dash,
        r.quantity || dash,
        r.dispatch_date || dash,
        r.delivery_number || dash,
        phone || dash,
        dash
      ];
    })
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Merge title rows
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } }, // title
    { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } }, // subtitle
  ];

  // Row heights
  ws['!rows'] = [
    { hpt: 28 }, // title
    { hpt: 20 }, // subtitle
    { hpt: 10 }, // spacer
    { hpt: 30 }, // header
    ...items.map(() => ({ hpt: 22 }))
  ];

  // Column widths (SUNARA proportions)
  ws['!cols'] = [
    { wch: 6 },  // S/N
    { wch: 12 }, // Location
    { wch: 14 }, // Truck#
    { wch: 14 }, // ETA
    { wch: 24 }, // Driver Name
    { wch: 15 }, // Driver Number
    { wch: 16 }, // Nationality
    { wch: 20 }, // Customer
    { wch: 12 }, // Material
    { wch: 10 }, // Qty
    { wch: 14 }, // Dispatch Date
    { wch: 14 }, // Delivery SLIP
    { wch: 14 }, // Phone
    { wch: 8 },  // Axles
  ];

  // Apply styles cell by cell ─────────────────────
  const range = XLSX.utils.decode_range(ws['!ref']);

  // Title row (0)
  for (let C = 0; C <= 13; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[addr]) ws[addr] = { t: 's', v: '' };
    ws[addr].s = TITLE_STYLE;
  }
  // Subtitle row (1)
  for (let C = 0; C <= 13; C++) {
    const addr = XLSX.utils.encode_cell({ r: 1, c: C });
    if (!ws[addr]) ws[addr] = { t: 's', v: '' };
    ws[addr].s = SUBTITLE_STYLE;
  }
  // Header row (3)
  for (let C = 0; C <= 13; C++) {
    const addr = XLSX.utils.encode_cell({ r: 3, c: C });
    if (!ws[addr]) continue;
    ws[addr].s = HEADER_STYLE;
  }
  // Data rows (4..)
  for (let R = 4; R <= range.e.r; R++) {
    const isEven = (R - 4) % 2 === 1;
    for (let C = 0; C <= 13; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      // Driver name and customer left-aligned for readability
      ws[addr].s = (C === 4 || C === 7) ? CELL_STYLE_LEFT(isEven) : CELL_STYLE(isEven);
    }
  }

  const wb = XLSX.utils.book_new();
  const sheetName = customerName.substring(0, 25).replace(/[\/\\?*[\]:]/g, '');
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const filename = `${customerName}_${now.toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);

  toast(`✓ تم تصدير ${items.length} طلب`, 'success');
}

// Override the old CSV export with the new XLSX one
window._exportSelectedExcel = exportSelectedExcelXLSX;
window._bulkSendToClearance = bulkSendToClearance;
window._bulkDelete = bulkDelete;

// ══════════════════════════════════════════════════════════════
// VIEW TOGGLE — Flat table vs grouped cards
// ══════════════════════════════════════════════════════════════

let _viewMode = 'cards'; // 'table' | 'cards' — default is grouped batches view
// Note: table view is kept in code for future use but no UI toggle exposes it currently.

function renderCardsView() {
  const tableEl = document.querySelector('.tr-table');
  if (tableEl) tableEl.style.display = 'none';

  // Apply status filter and search (same as renderTable)
  let list = _requests;
  if (_filter !== 'all') list = list.filter(r => r.status === _filter);
  if (_search) {
    list = list.filter(r =>
      (r.driver_name || '').toLowerCase().includes(_search) ||
      (r.truck_number || '').toLowerCase().includes(_search) ||
      (r.customer || '').toLowerCase().includes(_search) ||
      (r.driver_id_number || '').toLowerCase().includes(_search)
    );
  }

  // Group by batch_id (or fallback to date+customer for legacy)
  const groups = {};
  list.forEach(r => {
    let key = r.batch_id;
    let label = r.batch_label;
    if (!key) {
      // Legacy: group by customer + created date (day)
      const d = r.created_at?.toDate ? r.created_at.toDate() : new Date(r.created_at || Date.now());
      const dayKey = d.toISOString().slice(0, 10);
      key = `legacy-${r.customer || '_'}-${dayKey}`;
      label = `${r.customer || 'بلا عميل'} · ${dayKey}`;
    }
    if (!groups[key]) groups[key] = { key, label, items: [], firstDate: null };
    groups[key].items.push(r);
    const d = r.created_at?.toDate ? r.created_at.toDate() : new Date(r.created_at || 0);
    if (!groups[key].firstDate || d < groups[key].firstDate) groups[key].firstDate = d;
  });

  // Sort groups by most recent first
  const sortedGroups = Object.values(groups).sort((a, b) => (b.firstDate || 0) - (a.firstDate || 0));

  // Remove old container if present
  document.getElementById('cards-view-container')?.remove();

  const container = document.createElement('div');
  container.id = 'cards-view-container';
  container.style.cssText = 'padding:0 24px 24px;';

  if (sortedGroups.length === 0) {
    container.innerHTML = `
      <div style="background:white;border:1px solid #E8E5DC;border-radius:10px;padding:60px 40px;text-align:center;">
        <div style="font-size:48px;opacity:0.5;">📦</div>
        <div style="font-size:15px;color:#0E1A2E;font-weight:800;margin-top:12px;">لا توجد دفعات نقل</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;margin-top:6px;letter-spacing:1.5px;">CREATE FIRST BATCH</div>
        <button onclick="_openBatchModal()" style="margin-top:20px;background:#0E1A2E;color:white;border:none;border-radius:6px;padding:11px 26px;font-family:Tajawal,sans-serif;font-size:13px;font-weight:800;cursor:pointer;">
          <i class="ti ti-package"></i> إنشاء دفعة جديدة
        </button>
      </div>`;
  } else {
    container.innerHTML = sortedGroups.map(g => renderGroupCard(g)).join('');
  }

  // Insert container after the table wrapper
  if (tableEl) {
    const tableWrapper = tableEl.closest('div[style*="padding:0 24px 24px"]');
    if (tableWrapper) {
      tableWrapper.parentNode.insertBefore(container, tableWrapper.nextSibling);
    } else {
      tableEl.parentNode.insertBefore(container, tableEl.nextSibling);
    }
  }
}

function renderGroupCard(group) {
  const items = group.items;
  const totalQty = items.reduce((s, r) => s + (parseFloat(r.quantity) || 0), 0).toFixed(2);
  const statusCounts = { draft: 0, sent: 0, converted: 0, done: 0 };
  items.forEach(r => statusCounts[r.status] = (statusCounts[r.status] || 0) + 1);
  const location = items[0].loading_location || '—';
  const material = items[0].material || '—';
  const dateStr = group.firstDate ? group.firstDate.toLocaleDateString('en-GB') : '—';
  const draftIds = items.filter(r => r.status === 'draft').map(r => r.id);
  const isLegacy = group.key.startsWith('legacy-');
  // Persist expanded state across re-renders using _expandedBatches Set
  const isExpanded = _expandedBatches.has(group.key);

  return `
    <div class="batch-card" data-batch-key="${group.key}" style="background:white;border:1px solid #E8E5DC;border-radius:10px;margin-bottom:14px;overflow:hidden;box-shadow:0 2px 8px rgba(14,26,46,0.04);transition:box-shadow 0.2s;">
      <!-- Card Header (clickable to expand) -->
      <div onclick="_batchCardToggle('${group.key}')" style="background:linear-gradient(135deg,#0E1A2E 0%,#1C2B48 100%);color:white;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;cursor:pointer;user-select:none;">
        <div style="display:flex;align-items:center;gap:14px;flex:1;min-width:0;">
          <i class="ti ti-chevron-${isExpanded ? 'up' : 'down'}" style="font-size:18px;color:#D4B266;transition:transform 0.2s;"></i>
          <div style="min-width:0;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.5px;color:#D4B266;font-weight:700;">
              ${isLegacy ? 'LEGACY · ' : 'BATCH · '}${group.key.substring(0, 12)}
            </div>
            <div style="font-size:16px;font-weight:900;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${items[0].customer || 'بلا عميل'}</div>
            <div style="font-size:11px;color:#B8B0A0;margin-top:2px;font-family:'JetBrains Mono',monospace;">
              ${dateStr} · ${location} · ${material}
            </div>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;" onclick="event.stopPropagation()">
          <div style="display:flex;gap:6px;">
            ${statusCounts.draft > 0 ? `<span class="modern-badge gray" style="font-size:10px;">DRAFT ${statusCounts.draft}</span>` : ''}
            ${statusCounts.sent > 0 ? `<span class="modern-badge blue" style="font-size:10px;">SENT ${statusCounts.sent}</span>` : ''}
            ${statusCounts.converted > 0 ? `<span class="modern-badge amber" style="font-size:10px;">CONVERTED ${statusCounts.converted}</span>` : ''}
          </div>
          <div style="display:flex;gap:6px;">
            <button onclick="_batchCardEdit('${group.key}')" title="تعديل الدفعة" style="background:rgba(255,255,255,0.1);color:white;border:1px solid rgba(255,255,255,0.3);border-radius:4px;padding:6px 10px;font-family:Tajawal,sans-serif;font-size:11px;cursor:pointer;">
              <i class="ti ti-edit"></i> تعديل
            </button>
            <button onclick="_batchCardExport('${group.key}')" title="تصدير Excel" style="background:white;color:#0E1A2E;border:none;border-radius:4px;padding:6px 10px;font-family:Tajawal,sans-serif;font-size:11px;font-weight:700;cursor:pointer;">
              <i class="ti ti-file-spreadsheet"></i> Excel
            </button>
            <button onclick="_batchCardPrint('${group.key}')" title="طباعة" style="background:white;color:#0E1A2E;border:none;border-radius:4px;padding:6px 10px;font-family:Tajawal,sans-serif;font-size:11px;font-weight:700;cursor:pointer;">
              <i class="ti ti-printer"></i> طباعة
            </button>
            ${draftIds.length > 0 ? `
              <button onclick="_batchCardSend('${group.key}')" title="إرسال المسودات للتخليص" style="background:#2E8B57;color:white;border:none;border-radius:4px;padding:6px 10px;font-family:Tajawal,sans-serif;font-size:11px;font-weight:700;cursor:pointer;">
                <i class="ti ti-send"></i> إرسال ${draftIds.length}
              </button>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Summary Stats (always visible) -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:1px;background:#F0EDE4;">
        <div style="background:white;padding:12px 16px;text-align:center;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:1.5px;font-weight:700;">TRUCKS</div>
          <div style="font-size:22px;font-weight:900;color:#0E1A2E;font-family:'JetBrains Mono',monospace;margin-top:2px;">${String(items.length).padStart(2, '0')}</div>
        </div>
        <div style="background:white;padding:12px 16px;text-align:center;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:1.5px;font-weight:700;">TOTAL QTY</div>
          <div style="font-size:22px;font-weight:900;color:#2E8B57;font-family:'JetBrains Mono',monospace;margin-top:2px;">${totalQty}</div>
        </div>
        <div style="background:white;padding:12px 16px;text-align:center;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:1.5px;font-weight:700;">LOCATION</div>
          <div style="font-size:14px;font-weight:800;color:#0E1A2E;font-family:'JetBrains Mono',monospace;margin-top:4px;">${location}</div>
        </div>
        <div style="background:white;padding:12px 16px;text-align:center;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:1.5px;font-weight:700;">MATERIAL</div>
          <div style="font-size:14px;font-weight:800;color:#0E1A2E;font-family:'JetBrains Mono',monospace;margin-top:4px;">${material}</div>
        </div>
      </div>

      <!-- Trucks table (collapsible) -->
      <div class="batch-card-body" style="overflow:hidden;max-height:${isExpanded ? '2000px' : '0'};transition:max-height 0.3s ease;">
        <div style="overflow-x:auto;border-top:1px solid #E8E5DC;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#FAFAF7;border-bottom:1px solid #E8E5DC;">
                <th style="padding:8px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:9px;color:#6B6659;letter-spacing:1px;font-weight:800;width:40px;">#</th>
                <th style="padding:8px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;color:#6B6659;letter-spacing:1px;font-weight:800;">DRIVER</th>
                <th style="padding:8px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;color:#6B6659;letter-spacing:1px;font-weight:800;">TRUCK</th>
                <th style="padding:8px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;color:#6B6659;letter-spacing:1px;font-weight:800;">IQAMA</th>
                <th style="padding:8px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;color:#6B6659;letter-spacing:1px;font-weight:800;">QTY</th>
                <th style="padding:8px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;color:#6B6659;letter-spacing:1px;font-weight:800;">DELIVERY</th>
                <th style="padding:8px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:9px;color:#6B6659;letter-spacing:1px;font-weight:800;">STATUS</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((r, i) => {
                const status = STATUS_LABELS[r.status] || STATUS_LABELS.draft;
                return `
                  <tr style="border-bottom:1px solid #F5F3EC;">
                    <td style="padding:8px;text-align:center;font-family:'JetBrains Mono',monospace;color:#8A8578;font-weight:700;">${String(i+1).padStart(2,'0')}</td>
                    <td style="padding:8px;color:#0E1A2E;font-weight:600;">${r.driver_name || '—'}</td>
                    <td style="padding:8px;font-family:'JetBrains Mono',monospace;color:#0E1A2E;direction:ltr;text-align:right;">${r.truck_number || '—'}</td>
                    <td style="padding:8px;font-family:'JetBrains Mono',monospace;color:#6B6659;direction:ltr;text-align:right;">${r.driver_id_number || '—'}</td>
                    <td style="padding:8px;font-family:'JetBrains Mono',monospace;color:#0E1A2E;font-weight:700;">${r.quantity || '—'}</td>
                    <td style="padding:8px;font-family:'JetBrains Mono',monospace;color:#0E1A2E;">${r.delivery_number || '—'}</td>
                    <td style="padding:8px;text-align:center;"><span class="modern-badge ${status.class}" style="font-size:9px;">${status.en}</span></td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
}

// Toggle expand/collapse for a batch card
function batchCardToggle(batchKey) {
  if (_expandedBatches.has(batchKey)) {
    _expandedBatches.delete(batchKey);
  } else {
    _expandedBatches.add(batchKey);
  }
  renderCardsView();
}

async function batchCardSelectAll(batchKey) {
  const items = _requests.filter(r => (r.batch_id || `legacy-${r.customer}-${r.created_at?.toDate?.().toISOString?.().slice(0,10)}`) === batchKey);
  items.forEach(r => _selected.add(r.id));
  toast(`✓ حُدّد ${items.length} في الدفعة`, 'success');
  updateBulkButtons();
}

async function batchCardExport(batchKey) {
  const items = _requests.filter(r => (r.batch_id || `legacy-${r.customer}-${r.created_at?.toDate?.().toISOString?.().slice(0,10)}`) === batchKey);
  _selected.clear();
  items.forEach(r => _selected.add(r.id));
  await exportSelectedExcelXLSX();
  _selected.clear();
  updateBulkButtons();
}

function batchCardPrint(batchKey) {
  const items = _requests.filter(r => (r.batch_id || `legacy-${r.customer}-${r.created_at?.toDate?.().toISOString?.().slice(0,10)}`) === batchKey);
  _selected.clear();
  items.forEach(r => _selected.add(r.id));
  printSelected();
  _selected.clear();
  updateBulkButtons();
}

async function batchCardSend(batchKey) {
  const items = _requests.filter(r =>
    (r.batch_id || `legacy-${r.customer}-${r.created_at?.toDate?.().toISOString?.().slice(0,10)}`) === batchKey
    && r.status === 'draft'
  );
  if (items.length === 0) return;
  _selected.clear();
  items.forEach(r => _selected.add(r.id));
  await bulkSendToClearance();
  if (_viewMode === 'cards') renderCardsView();
}

// Open an edit modal for an existing batch - lets user modify each truck row
function batchCardEdit(batchKey) {
  const items = _requests.filter(r =>
    (r.batch_id || `legacy-${r.customer}-${r.created_at?.toDate?.().toISOString?.().slice(0,10)}`) === batchKey
  ).sort((a, b) => {
    // Sort by creation order within the batch
    const at = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at || 0);
    const bt = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at || 0);
    return at - bt;
  });
  if (items.length === 0) {
    toast('الدفعة فارغة', 'error');
    return;
  }
  openBatchEditModal(batchKey, items);
}

function openBatchEditModal(batchKey, items) {
  const first = items[0];
  const isLegacy = batchKey.startsWith('legacy-');
  const convertedCount = items.filter(r => r.status === 'converted' || r.status === 'done').length;

  const existing = document.getElementById('tr-batch-edit-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'tr-batch-edit-modal';
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(14,26,46,0.65);z-index:9999;
    display:flex;align-items:center;justify-content:center;padding:20px;
    font-family:Tajawal,sans-serif;overflow-y:auto;
  `;

  const totalQty = items.reduce((s, r) => s + (parseFloat(r.quantity) || 0), 0).toFixed(2);

  modal.innerHTML = `
    <div style="background:#F5F3EC;border-radius:10px;width:100%;max-width:1200px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(14,26,46,0.4);">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#0E1A2E 0%,#1C2B48 100%);color:white;padding:16px 22px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;color:#D4B266;font-weight:700;">SDS · BATCH · EDIT</div>
          <div style="font-size:18px;font-weight:900;margin-top:3px;">✏ تعديل الدفعة — ${first.customer || 'بلا عميل'}</div>
          <div style="font-size:11px;color:#B8B0A0;margin-top:2px;font-family:'JetBrains Mono',monospace;">${isLegacy ? 'LEGACY' : batchKey.substring(0,20)} · ${items.length} شاحنة · ${totalQty} MT</div>
        </div>
        <button onclick="_closeBatchEditModal()" style="background:transparent;border:none;color:white;font-size:26px;cursor:pointer;padding:4px 10px;">×</button>
      </div>

      <!-- Body -->
      <div style="flex:1;overflow-y:auto;padding:20px;">
        ${convertedCount > 0 ? `
          <div style="background:#FEF9E7;border:1px solid #F0C040;border-radius:6px;padding:12px 14px;margin-bottom:14px;font-size:12px;color:#8A6B33;">
            <i class="ti ti-alert-triangle" style="color:#C2410C;"></i>
            <b>${convertedCount} شاحنة</b> من هذه الدفعة أُرسلت للتخليص (لون أصفر خفيف).
            التعديل هنا لن يُحدّث الشحنات في قسم التخليص — عدّلها من هناك للحفاظ على التطابق.
          </div>
        ` : ''}

        <!-- Batch defaults section -->
        <div style="background:white;border:1px solid #E8E5DC;border-radius:8px;padding:14px 16px;margin-bottom:14px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
            <i class="ti ti-settings" style="color:#8B6914;font-size:16px;"></i>
            <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#8B6914;letter-spacing:1.5px;font-weight:800;">BATCH DEFAULTS</span>
            <span style="color:#8A8578;font-size:11px;">— تُطبَّق على كل الشاحنات</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;">
            <div>
              <label style="font-size:10px;font-weight:700;color:#6B6659;display:block;margin-bottom:4px;">العميل *</label>
              <input id="be-customer" type="text" value="${(first.customer || '').replace(/"/g,'&quot;')}" list="dl-be-customer"
                style="width:100%;padding:8px 10px;border:1.5px solid #E8E5DC;border-radius:5px;font-family:Tajawal,sans-serif;font-size:12px;outline:none;">
              <datalist id="dl-be-customer">${_dropdowns.customers.map(c => `<option value="${c}"></option>`).join('')}</datalist>
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:#6B6659;display:block;margin-bottom:4px;">المادة *</label>
              <input id="be-material" type="text" value="${(first.material || '').replace(/"/g,'&quot;')}" list="dl-be-material"
                style="width:100%;padding:8px 10px;border:1.5px solid #E8E5DC;border-radius:5px;font-family:Tajawal,sans-serif;font-size:12px;outline:none;">
              <datalist id="dl-be-material">${_dropdowns.materials.map(m => `<option value="${m}"></option>`).join('')}</datalist>
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:#6B6659;display:block;margin-bottom:4px;">الوجهة *</label>
              <select id="be-destination" style="width:100%;padding:8px 10px;border:1.5px solid #E8E5DC;border-radius:5px;font-family:Tajawal,sans-serif;font-size:12px;background:white;outline:none;">
                ${Object.entries(DEST_LABELS).map(([k, v]) => `<option value="${k}" ${first.destination === k ? 'selected' : ''}>${v.en} — ${v.ar}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:#6B6659;display:block;margin-bottom:4px;">منطقة التحميل *</label>
              <input id="be-loading-location" type="text" value="${(first.loading_location || '').replace(/"/g,'&quot;')}" list="dl-be-location"
                style="width:100%;padding:8px 10px;border:1.5px solid #E8E5DC;border-radius:5px;font-family:'JetBrains Mono',monospace;font-size:12px;direction:ltr;text-align:right;outline:none;">
              <datalist id="dl-be-location">${LOADING_LOCATIONS.map(l => `<option value="${l}"></option>`).join('')}</datalist>
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:#6B6659;display:block;margin-bottom:4px;">تاريخ التحميل</label>
              <input id="be-dispatch-date" type="text" value="${(first.dispatch_date || '').replace(/"/g,'&quot;')}" placeholder="1447-12-05"
                style="width:100%;padding:8px 10px;border:1.5px solid #E8E5DC;border-radius:5px;font-family:'JetBrains Mono',monospace;font-size:12px;direction:ltr;text-align:right;outline:none;">
            </div>
          </div>
        </div>

        <div style="background:white;border-radius:8px;overflow:hidden;">
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead>
                <tr style="background:#0E1A2E;color:white;">
                  <th style="padding:9px 6px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;font-weight:800;width:60px;">#</th>
                  <th style="padding:9px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;font-weight:800;">DRIVER</th>
                  <th style="padding:9px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;font-weight:800;">TRUCK</th>
                  <th style="padding:9px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;font-weight:800;">IQAMA</th>
                  <th style="padding:9px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;font-weight:800;">QTY</th>
                  <th style="padding:9px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;font-weight:800;">DELIVERY</th>
                  <th style="padding:9px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;font-weight:800;">LOCATION</th>
                  <th style="padding:9px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;font-weight:800;">DATE</th>
                  <th style="padding:9px 6px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;font-weight:800;">STATUS</th>
                  <th style="padding:9px 6px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;font-weight:800;width:60px;">DEL</th>
                </tr>
              </thead>
              <tbody id="batch-edit-tbody">
                ${items.map((r, i) => renderBatchEditRow(r, i)).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div style="margin-top:14px;background:#EEF2FF;border:1px solid #C7D4F5;border-radius:6px;padding:12px;font-size:12px;color:#1C4B8E;">
          <i class="ti ti-info-circle"></i>
          عدّل الحقول مباشرة ثم اضغط "حفظ التغييرات". لحذف شاحنة استخدم أيقونة السلة. لحذف الدفعة كاملة استخدم الزر الأحمر أدناه.
        </div>
      </div>

      <!-- Footer -->
      <div style="background:white;border-top:1px solid #E8E5DC;padding:14px 22px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <button onclick="_deleteBatchFull('${batchKey}')" style="background:#CC2229;color:white;border:none;border-radius:5px;padding:9px 18px;font-family:Tajawal,sans-serif;font-size:13px;font-weight:800;cursor:pointer;">
          <i class="ti ti-trash"></i> حذف الدفعة كاملة
        </button>
        <div style="display:flex;gap:10px;">
          <button onclick="_closeBatchEditModal()" style="background:#F5F3EC;color:#6B6659;border:1px solid #E8E5DC;border-radius:5px;padding:9px 18px;font-family:Tajawal,sans-serif;font-size:13px;font-weight:700;cursor:pointer;">
            إلغاء
          </button>
          <button onclick="_saveBatchEdit('${batchKey}')" style="background:#2E8B57;color:white;border:none;border-radius:5px;padding:9px 24px;font-family:Tajawal,sans-serif;font-size:13px;font-weight:800;cursor:pointer;">
            <i class="ti ti-device-floppy"></i> حفظ التغييرات
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function renderBatchEditRow(r, idx) {
  const status = STATUS_LABELS[r.status] || STATUS_LABELS.draft;
  const isConverted = r.status === 'converted' || r.status === 'done';
  const rowBg = isConverted ? 'background:#FEF9E7;' : ''; // subtle warning tint
  const warnIcon = isConverted ? `<i class="ti ti-alert-triangle" style="color:#C2410C;font-size:14px;" title="محوّل للتخليص"></i>` : '';
  return `
    <tr data-req-id="${r.id}" style="border-bottom:1px solid #F0EDE4;${rowBg}">
      <td style="padding:6px;text-align:center;font-family:'JetBrains Mono',monospace;color:#8A8578;font-weight:700;font-size:11px;">${warnIcon} ${String(idx+1).padStart(2,'0')}</td>
      <td style="padding:4px;"><input type="text" data-f="driver_name" value="${(r.driver_name||'').replace(/"/g,'&quot;')}" style="width:100%;padding:6px;border:1px solid #E8E5DC;border-radius:4px;font-family:Tajawal,sans-serif;font-size:12px;outline:none;"></td>
      <td style="padding:4px;"><input type="text" data-f="truck_number" value="${(r.truck_number||'').replace(/"/g,'&quot;')}" style="width:100%;padding:6px;border:1px solid #E8E5DC;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:12px;direction:ltr;text-align:right;outline:none;"></td>
      <td style="padding:4px;"><input type="text" data-f="driver_id_number" value="${(r.driver_id_number||'').replace(/"/g,'&quot;')}" style="width:100%;padding:6px;border:1px solid #E8E5DC;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:12px;direction:ltr;text-align:right;outline:none;"></td>
      <td style="padding:4px;"><input type="number" step="0.01" data-f="quantity" value="${r.quantity||''}" style="width:100%;padding:6px;border:1px solid #E8E5DC;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:12px;direction:ltr;text-align:right;outline:none;"></td>
      <td style="padding:4px;"><input type="text" data-f="delivery_number" value="${(r.delivery_number||'').replace(/"/g,'&quot;')}" style="width:100%;padding:6px;border:1px solid #E8E5DC;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:12px;direction:ltr;text-align:right;outline:none;"></td>
      <td style="padding:4px;"><input type="text" data-f="loading_location" value="${(r.loading_location||'').replace(/"/g,'&quot;')}" style="width:100%;padding:6px;border:1px solid #E8E5DC;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:11px;direction:ltr;text-align:right;outline:none;"></td>
      <td style="padding:4px;"><input type="text" data-f="dispatch_date" value="${(r.dispatch_date||'').replace(/"/g,'&quot;')}" style="width:100%;padding:6px;border:1px solid #E8E5DC;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:11px;direction:ltr;text-align:right;outline:none;"></td>
      <td style="padding:6px;text-align:center;"><span class="modern-badge ${status.class}" style="font-size:9px;">${status.en}</span></td>
      <td style="padding:6px;text-align:center;">
        <button onclick="_batchEditDeleteRow('${r.id}')" title="حذف من الدفعة" style="background:transparent;border:none;color:#CC2229;cursor:pointer;padding:4px 8px;font-size:15px;">
          <i class="ti ti-trash"></i>
        </button>
      </td>
    </tr>
  `;
}

function closeBatchEditModal() {
  document.getElementById('tr-batch-edit-modal')?.remove();
}

async function batchEditDeleteRow(reqId) {
  const req = _requests.find(r => r.id === reqId);
  if (!req) return;

  const wasConverted = req.status === 'converted' || req.status === 'done';
  const warnMsg = wasConverted
    ? `⚠ هذه الشاحنة أُرسلت للتخليص.\nالحذف من هنا لا يحذفها من قسم التخليص.\n\nحذف "${req.driver_name || req.truck_number || 'الشاحنة'}"؟`
    : `حذف الشاحنة "${req.driver_name || req.truck_number || 'بدون بيانات'}" من الدفعة؟`;
  if (!confirm(warnMsg)) return;

  try {
    // Soft delete: mark as deleted instead of removing
    await updateTransportRequest(reqId, {
      deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: 'user', // could be enhanced with auth.currentUser
    });
    // Remove from modal immediately
    document.querySelector(`#tr-batch-edit-modal tr[data-req-id="${reqId}"]`)?.remove();
    await loadData();
    // Show undo toast for 5 seconds
    showUndoToast(`حُذفت شاحنة ${req.driver_name || ''}`, [reqId]);
  } catch (e) {
    console.error(e);
    toast('خطأ في الحذف', 'error');
  }
}

// Delete entire batch (all trucks) with warning for converted, undo toast
async function deleteBatchFull(batchKey) {
  const items = _requests.filter(r =>
    (r.batch_id || `legacy-${r.customer}-${r.created_at?.toDate?.().toISOString?.().slice(0,10)}`) === batchKey
  );
  if (items.length === 0) return;

  const convertedCount = items.filter(r => r.status === 'converted' || r.status === 'done').length;
  const first = items[0];
  let msg = `حذف الدفعة كاملة (${items.length} شاحنة) — ${first.customer || ''}؟`;
  if (convertedCount > 0) {
    msg = `⚠ تنبيه: ${convertedCount} شاحنة من هذه الدفعة أُرسلت للتخليص.\n` +
          `الحذف من هنا لا يحذفها من قسم التخليص.\n\n` +
          `حذف الدفعة كاملة (${items.length} شاحنة)؟`;
  }
  if (!confirm(msg)) return;

  const nowIso = new Date().toISOString();
  const ids = items.map(r => r.id);
  let failed = 0;
  for (const id of ids) {
    try {
      await updateTransportRequest(id, {
        deleted: true,
        deleted_at: nowIso,
        deleted_by: 'user',
      });
    } catch (e) {
      console.error('soft delete failed', id, e);
      failed++;
    }
  }

  closeBatchEditModal();
  await loadData();

  if (failed === 0) {
    showUndoToast(`حُذفت الدفعة (${items.length} شاحنة)`, ids);
  } else {
    toast(`حُذفت ${items.length - failed}، فشل ${failed}`, 'error');
  }
}

// Undo toast — sticky for 5 seconds with undo button
let _undoTimer = null;
function showUndoToast(message, reqIds) {
  const existing = document.getElementById('tr-undo-toast');
  if (existing) existing.remove();
  if (_undoTimer) clearTimeout(_undoTimer);

  const t = document.createElement('div');
  t.id = 'tr-undo-toast';
  t.style.cssText = `
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:#0E1A2E;color:white;padding:12px 18px;border-radius:8px;
    box-shadow:0 8px 24px rgba(14,26,46,0.35);z-index:10001;
    display:flex;align-items:center;gap:14px;font-family:Tajawal,sans-serif;
    font-size:13px;font-weight:700;min-width:280px;
    animation:slideUp 0.25s ease-out;
  `;
  t.innerHTML = `
    <span><i class="ti ti-trash" style="color:#F0C040;"></i> ${message}</span>
    <button id="undo-btn" style="background:#D4B266;color:#0E1A2E;border:none;border-radius:5px;padding:6px 14px;font-family:Tajawal,sans-serif;font-size:12px;font-weight:800;cursor:pointer;">
      <i class="ti ti-arrow-back-up"></i> تراجع
    </button>
    <button id="undo-close" style="background:transparent;border:none;color:#B8B0A0;cursor:pointer;font-size:18px;padding:0 4px;">×</button>
  `;
  document.body.appendChild(t);

  document.getElementById('undo-btn').onclick = async () => {
    clearTimeout(_undoTimer);
    t.remove();
    let restored = 0;
    for (const id of reqIds) {
      try {
        await updateTransportRequest(id, {
          deleted: false,
          deleted_at: null,
          deleted_by: null,
        });
        restored++;
      } catch (e) { console.error('restore failed', id, e); }
    }
    await loadData();
    toast(`✓ استُعيدت ${restored} شاحنة`, 'success');
  };
  document.getElementById('undo-close').onclick = () => {
    clearTimeout(_undoTimer);
    t.remove();
  };

  _undoTimer = setTimeout(() => t.remove(), 5000);
}

// Restore a deleted request from the drawer
async function restoreDeletedRequest(reqId) {
  try {
    await updateTransportRequest(reqId, {
      deleted: false,
      deleted_at: null,
      deleted_by: null,
    });
    await loadData();
    toast('✓ استُعيد الطلب', 'success');
  } catch (e) {
    console.error(e);
    toast('فشل الاستعادة', 'error');
  }
}

// Update the deleted-drawer badge/section at the bottom of the page (admin only)
function updateDeletedDrawer() {
  // Remove existing drawer if any
  document.getElementById('tr-deleted-drawer')?.remove();

  // Only admin and manager see the deleted drawer
  if (_profile?.role !== 'admin' && _profile?.role !== 'manager') return;
  if (!_deletedRequests || _deletedRequests.length === 0) return;

  const drawer = document.createElement('div');
  drawer.id = 'tr-deleted-drawer';
  drawer.style.cssText = `
    margin:20px 24px 24px;background:white;border:1px solid #E8E5DC;
    border-radius:10px;overflow:hidden;
  `;

  // Group deleted by batch
  const groups = {};
  _deletedRequests.forEach(r => {
    let key = r.batch_id || `legacy-${r.customer || '_'}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  const groupArr = Object.entries(groups);

  drawer.innerHTML = `
    <div id="deleted-drawer-header" style="background:#FAFAF7;padding:12px 18px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none;border-bottom:1px solid #F0EDE4;" onclick="_toggleDeletedDrawer()">
      <div style="display:flex;align-items:center;gap:10px;">
        <i class="ti ti-trash" style="color:#8A8578;"></i>
        <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;letter-spacing:1.5px;font-weight:800;">DELETED</span>
        <span style="background:#CC2229;color:white;font-family:'JetBrains Mono',monospace;font-size:10px;padding:2px 8px;border-radius:10px;font-weight:800;">${_deletedRequests.length}</span>
        <span style="color:#6B6659;font-size:12px;">سجل المحذوفات — يمكن استرجاعها</span>
      </div>
      <i class="ti ti-chevron-down" id="deleted-drawer-icon" style="color:#8A8578;transition:transform 0.2s;"></i>
    </div>
    <div id="deleted-drawer-body" style="max-height:0;overflow:hidden;transition:max-height 0.3s ease;">
      <div style="padding:14px 18px;">
        ${groupArr.map(([key, items]) => {
          const first = items[0];
          const isLegacy = key.startsWith('legacy-');
          const totalQty = items.reduce((s, r) => s + (parseFloat(r.quantity) || 0), 0).toFixed(2);
          const delDate = items[0].deleted_at ? new Date(items[0].deleted_at).toLocaleString('en-GB') : '—';
          return `
            <div style="border:1px solid #F0EDE4;border-radius:6px;padding:12px;margin-bottom:8px;background:#FAFAF7;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
                <div style="min-width:0;">
                  <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:1.5px;font-weight:700;">${isLegacy ? 'LEGACY' : 'BATCH · ' + key.substring(0,12)}</div>
                  <div style="font-size:14px;font-weight:800;color:#0E1A2E;margin-top:2px;">${first.customer || 'بلا عميل'}</div>
                  <div style="font-size:11px;color:#6B6659;margin-top:2px;font-family:'JetBrains Mono',monospace;">${items.length} شاحنة · ${totalQty} MT · حُذف في ${delDate}</div>
                </div>
                <button onclick="_restoreDeletedBatch('${key.replace(/'/g,"\\'")}')" style="background:#2E8B57;color:white;border:none;border-radius:5px;padding:7px 14px;font-family:Tajawal,sans-serif;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap;">
                  <i class="ti ti-arrow-back-up"></i> استرجاع
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  const container = document.getElementById('cards-view-container');
  if (container) {
    container.parentNode.insertBefore(drawer, container.nextSibling);
  } else {
    document.body.appendChild(drawer);
  }
}

function toggleDeletedDrawer() {
  const body = document.getElementById('deleted-drawer-body');
  const icon = document.getElementById('deleted-drawer-icon');
  if (!body) return;
  if (body.style.maxHeight === '0px' || !body.style.maxHeight) {
    body.style.maxHeight = '600px';
    body.style.overflowY = 'auto';
    if (icon) icon.style.transform = 'rotate(180deg)';
  } else {
    body.style.maxHeight = '0px';
    if (icon) icon.style.transform = 'rotate(0deg)';
  }
}

async function restoreDeletedBatch(batchKey) {
  const items = _deletedRequests.filter(r => {
    const key = r.batch_id || `legacy-${r.customer || '_'}`;
    return key === batchKey;
  });
  if (items.length === 0) return;
  if (!confirm(`استرجاع ${items.length} شاحنة؟`)) return;

  let restored = 0;
  for (const r of items) {
    try {
      await updateTransportRequest(r.id, {
        deleted: false,
        deleted_at: null,
        deleted_by: null,
      });
      restored++;
    } catch (e) { console.error('restore failed', r.id, e); }
  }
  await loadData();
  toast(`✓ استُعيدت ${restored} شاحنة`, 'success');
}

window._closeBatchEditModal = closeBatchEditModal;
window._saveBatchEdit = saveBatchEdit;
window._batchEditDeleteRow = batchEditDeleteRow;
window._deleteBatchFull = deleteBatchFull;
window._toggleDeletedDrawer = toggleDeletedDrawer;
window._restoreDeletedBatch = restoreDeletedBatch;
window._restoreDeletedRequest = restoreDeletedRequest;


async function saveBatchEdit(batchKey) {
  const modal = document.getElementById('tr-batch-edit-modal');
  if (!modal) return;
  const rows = modal.querySelectorAll('tr[data-req-id]');
  if (rows.length === 0) return closeBatchEditModal();

  const btn = modal.querySelector('button[onclick*="_saveBatchEdit"]');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ حفظ...'; }

  // Read batch defaults from the header inputs (applied to every row)
  const g = (id) => document.getElementById(id);
  const batchDefaults = {
    customer:         g('be-customer')?.value?.trim() || '',
    material:         g('be-material')?.value?.trim() || '',
    destination:      g('be-destination')?.value || 'uae',
    loading_location: (g('be-loading-location')?.value || '').trim().toUpperCase(),
    dispatch_date:    g('be-dispatch-date')?.value?.trim() || '',
  };
  // Validation: customer and material are required
  if (!batchDefaults.customer || !batchDefaults.material) {
    toast('العميل والمادة إلزاميان', 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-device-floppy"></i> حفظ التغييرات'; }
    return;
  }

  let updated = 0, failed = 0;
  for (const row of rows) {
    const id = row.dataset.reqId;
    // Start with batch-level defaults (applied to every truck)
    const updates = {
      customer: batchDefaults.customer,
      material: batchDefaults.material,
      destination: batchDefaults.destination,
    };
    // Per-row fields override defaults
    row.querySelectorAll('input[data-f]').forEach(input => {
      const field = input.dataset.f;
      let val = input.value;
      if (field === 'quantity') val = parseFloat(val) || 0;
      else val = (val || '').trim();
      updates[field] = val;
    });
    // For loading_location and dispatch_date: if row didn't specify, use batch default
    if (!updates.loading_location) updates.loading_location = batchDefaults.loading_location;
    if (!updates.dispatch_date) updates.dispatch_date = batchDefaults.dispatch_date;

    try {
      await updateTransportRequest(id, updates);
      // Also sync driver record if driver info was edited
      if (updates.driver_name && updates.driver_name.trim()) {
        try {
          await smartUpsertDriver({
            driver_name:  updates.driver_name.trim(),
            iqama:        updates.driver_id_number || '',
            nationality:  '',
            truck_number: updates.truck_number || '',
            phone:        '',
          });
        } catch (e) { console.warn('driver sync failed:', e); }
      }
      updated++;
    } catch (e) {
      console.error('update failed:', id, e);
      failed++;
    }
  }

  // Learn new customer/material for future autocomplete
  try {
    if (batchDefaults.customer && !_dropdowns.customers.includes(batchDefaults.customer)) {
      await addDropdownValue('customers', batchDefaults.customer);
    }
    if (batchDefaults.material && !_dropdowns.materials.includes(batchDefaults.material)) {
      await addDropdownValue('materials', batchDefaults.material);
    }
  } catch (e) { console.warn('dropdown learn failed:', e); }

  closeBatchEditModal();
  await loadData();
  if (failed === 0) toast(`✓ حُفظت ${updated} شاحنة`, 'success');
  else toast(`حُفظت ${updated}، فشل ${failed}`, 'error');
}


window._batchCardSelectAll = batchCardSelectAll;
window._batchCardExport = batchCardExport;
window._batchCardPrint = batchCardPrint;
window._batchCardSend = batchCardSend;
window._batchCardToggle = batchCardToggle;
window._batchCardEdit = batchCardEdit;

// ══════════════════════════════════════════════════════════════
// REPORTS MODAL — Period-based report (monthly / custom)
// ══════════════════════════════════════════════════════════════

function openReportsModal() {
  document.getElementById('tr-reports-modal')?.remove();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  // Extract unique customers from requests
  const customers = [...new Set(_requests.map(r => r.customer).filter(Boolean))].sort();

  const modal = document.createElement('div');
  modal.id = 'tr-reports-modal';
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(14,26,46,0.55);z-index:9999;
    display:flex;align-items:center;justify-content:center;padding:20px;
    font-family:Tajawal,sans-serif;
  `;
  modal.innerHTML = `
    <div style="background:#F5F3EC;border-radius:10px;width:100%;max-width:600px;overflow:hidden;
                display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(14,26,46,0.4);">
      <div style="background:linear-gradient(135deg,#1C4B8E 0%,#0E1A2E 100%);color:white;padding:18px 24px;
                  display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;color:#D4B266;font-weight:700;">
            SDS · REPORTS · PERIOD
          </div>
          <div style="font-size:20px;font-weight:900;margin-top:4px;">📊 تقرير الطلبات</div>
        </div>
        <button onclick="document.getElementById('tr-reports-modal').remove()" style="background:transparent;border:none;color:white;font-size:26px;cursor:pointer;padding:4px 12px;">×</button>
      </div>

      <div style="padding:24px;">
        <!-- Quick period buttons -->
        <div style="margin-bottom:18px;">
          <label style="font-size:11px;font-weight:800;color:#6B6659;display:block;margin-bottom:8px;">الفترة السريعة</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="rep-quick-btn" data-days="0" style="padding:8px 14px;border:1.5px solid #E8E5DC;background:white;border-radius:5px;font-family:Tajawal,sans-serif;font-size:12px;font-weight:700;cursor:pointer;">اليوم</button>
            <button class="rep-quick-btn" data-days="7" style="padding:8px 14px;border:1.5px solid #E8E5DC;background:white;border-radius:5px;font-family:Tajawal,sans-serif;font-size:12px;font-weight:700;cursor:pointer;">7 أيام</button>
            <button class="rep-quick-btn" data-days="30" style="padding:8px 14px;border:1.5px solid #E8E5DC;background:white;border-radius:5px;font-family:Tajawal,sans-serif;font-size:12px;font-weight:700;cursor:pointer;">30 يوم</button>
            <button class="rep-quick-btn" data-days="month" style="padding:8px 14px;border:1.5px solid #1C4B8E;background:#1C4B8E;color:white;border-radius:5px;font-family:Tajawal,sans-serif;font-size:12px;font-weight:700;cursor:pointer;">هذا الشهر</button>
            <button class="rep-quick-btn" data-days="lastmonth" style="padding:8px 14px;border:1.5px solid #E8E5DC;background:white;border-radius:5px;font-family:Tajawal,sans-serif;font-size:12px;font-weight:700;cursor:pointer;">الشهر الماضي</button>
            <button class="rep-quick-btn" data-days="all" style="padding:8px 14px;border:1.5px solid #E8E5DC;background:white;border-radius:5px;font-family:Tajawal,sans-serif;font-size:12px;font-weight:700;cursor:pointer;">الكل</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px;">
          <div>
            <label style="font-size:11px;font-weight:800;color:#6B6659;display:block;margin-bottom:6px;">من تاريخ</label>
            <input type="date" id="rep-from" value="${monthStart}" style="width:100%;padding:9px 12px;border:1.5px solid #E8E5DC;border-radius:5px;font-family:Tajawal,sans-serif;font-size:13px;outline:none;">
          </div>
          <div>
            <label style="font-size:11px;font-weight:800;color:#6B6659;display:block;margin-bottom:6px;">إلى تاريخ</label>
            <input type="date" id="rep-to" value="${today}" style="width:100%;padding:9px 12px;border:1.5px solid #E8E5DC;border-radius:5px;font-family:Tajawal,sans-serif;font-size:13px;outline:none;">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px;">
          <div>
            <label style="font-size:11px;font-weight:800;color:#6B6659;display:block;margin-bottom:6px;">العميل (اختياري)</label>
            <select id="rep-customer" style="width:100%;padding:9px 12px;border:1.5px solid #E8E5DC;border-radius:5px;font-family:Tajawal,sans-serif;font-size:13px;background:white;outline:none;">
              <option value="">كل العملاء</option>
              ${customers.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:800;color:#6B6659;display:block;margin-bottom:6px;">الحالة</label>
            <select id="rep-status" style="width:100%;padding:9px 12px;border:1.5px solid #E8E5DC;border-radius:5px;font-family:Tajawal,sans-serif;font-size:13px;background:white;outline:none;">
              <option value="">كل الحالات</option>
              <option value="draft">مسودة</option>
              <option value="sent">مرسلة</option>
              <option value="converted">محوّلة</option>
            </select>
          </div>
        </div>

        <!-- Preview -->
        <div id="rep-preview" style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:14px;margin-bottom:14px;">
          <div style="font-size:12px;color:#6B6659;">اختر الفترة ثم اضغط "تحديث المعاينة"</div>
        </div>
      </div>

      <div style="background:white;border-top:1px solid #E8E5DC;padding:14px 24px;display:flex;justify-content:space-between;gap:10px;">
        <button onclick="_reportRefresh()" style="background:#F5F3EC;color:#0E1A2E;border:1.5px solid #E8E5DC;border-radius:5px;padding:9px 18px;font-family:Tajawal,sans-serif;font-size:13px;font-weight:700;cursor:pointer;">
          <i class="ti ti-refresh"></i> تحديث المعاينة
        </button>
        <div style="display:flex;gap:10px;">
          <button onclick="_reportPrint()" style="background:white;color:#0E1A2E;border:1.5px solid #0E1A2E;border-radius:5px;padding:9px 18px;font-family:Tajawal,sans-serif;font-size:13px;font-weight:700;cursor:pointer;">
            <i class="ti ti-printer"></i> طباعة
          </button>
          <button onclick="_reportExport()" style="background:#2E8B57;color:white;border:none;border-radius:5px;padding:9px 20px;font-family:Tajawal,sans-serif;font-size:13px;font-weight:800;cursor:pointer;">
            <i class="ti ti-file-spreadsheet"></i> تصدير Excel
          </button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(modal);

  // Wire quick period buttons
  modal.querySelectorAll('.rep-quick-btn').forEach(btn => {
    btn.onclick = () => {
      modal.querySelectorAll('.rep-quick-btn').forEach(b => {
        b.style.background = 'white';
        b.style.color = '#0E1A2E';
        b.style.borderColor = '#E8E5DC';
      });
      btn.style.background = '#1C4B8E';
      btn.style.color = 'white';
      btn.style.borderColor = '#1C4B8E';

      const val = btn.dataset.days;
      const n = new Date();
      let from, to = n.toISOString().slice(0, 10);
      if (val === 'month') {
        from = new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0, 10);
      } else if (val === 'lastmonth') {
        from = new Date(n.getFullYear(), n.getMonth() - 1, 1).toISOString().slice(0, 10);
        to = new Date(n.getFullYear(), n.getMonth(), 0).toISOString().slice(0, 10);
      } else if (val === 'all') {
        from = '2020-01-01';
      } else {
        const d = new Date(n);
        d.setDate(d.getDate() - parseInt(val));
        from = d.toISOString().slice(0, 10);
      }
      document.getElementById('rep-from').value = from;
      document.getElementById('rep-to').value = to;
      reportRefresh();
    };
  });

  reportRefresh();
}

function getReportFiltered() {
  const from = document.getElementById('rep-from').value;
  const to = document.getElementById('rep-to').value;
  const customer = document.getElementById('rep-customer').value;
  const status = document.getElementById('rep-status').value;

  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to + 'T23:59:59') : null;

  return _requests.filter(r => {
    const d = r.created_at?.toDate ? r.created_at.toDate() : (r.created_at ? new Date(r.created_at) : null);
    if (fromDate && (!d || d < fromDate)) return false;
    if (toDate && (!d || d > toDate)) return false;
    if (customer && r.customer !== customer) return false;
    if (status && r.status !== status) return false;
    return true;
  });
}

function reportRefresh() {
  const items = getReportFiltered();
  const preview = document.getElementById('rep-preview');

  if (items.length === 0) {
    preview.innerHTML = `<div style="text-align:center;padding:14px;color:#8A8578;">
      <div style="font-size:24px;">📭</div>
      <div style="font-size:12px;margin-top:6px;">لا توجد طلبات في هذه الفترة</div>
    </div>`;
    return;
  }

  const totalQty = items.reduce((s, r) => s + (parseFloat(r.quantity) || 0), 0).toFixed(2);
  const uniqueCustomers = new Set(items.map(r => r.customer).filter(Boolean)).size;
  const uniqueDrivers = new Set(items.map(r => r.driver_name).filter(Boolean)).size;
  const statuses = { draft: 0, sent: 0, converted: 0 };
  items.forEach(r => statuses[r.status] = (statuses[r.status] || 0) + 1);

  preview.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:10px;margin-bottom:10px;">
      <div style="background:#F5F3EC;padding:10px;border-radius:5px;text-align:center;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#6B6659;font-weight:700;letter-spacing:1px;">TRUCKS</div>
        <div style="font-size:22px;font-weight:900;color:#0E1A2E;">${items.length}</div>
      </div>
      <div style="background:#E7F5EE;padding:10px;border-radius:5px;text-align:center;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#2E8B57;font-weight:700;letter-spacing:1px;">TOTAL QTY (MT)</div>
        <div style="font-size:22px;font-weight:900;color:#2E8B57;">${totalQty}</div>
      </div>
      <div style="background:#FEF6E7;padding:10px;border-radius:5px;text-align:center;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8B6914;font-weight:700;letter-spacing:1px;">CUSTOMERS</div>
        <div style="font-size:22px;font-weight:900;color:#8B6914;">${uniqueCustomers}</div>
      </div>
      <div style="background:#EEF2FF;padding:10px;border-radius:5px;text-align:center;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#1C4B8E;font-weight:700;letter-spacing:1px;">DRIVERS</div>
        <div style="font-size:22px;font-weight:900;color:#1C4B8E;">${uniqueDrivers}</div>
      </div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      ${statuses.draft > 0 ? `<span class="modern-badge gray" style="font-size:10px;">DRAFT ${statuses.draft}</span>` : ''}
      ${statuses.sent > 0 ? `<span class="modern-badge blue" style="font-size:10px;">SENT ${statuses.sent}</span>` : ''}
      ${statuses.converted > 0 ? `<span class="modern-badge amber" style="font-size:10px;">CONVERTED ${statuses.converted}</span>` : ''}
    </div>`;
}

async function reportExport() {
  const items = getReportFiltered();
  if (items.length === 0) return toast('لا توجد طلبات للتصدير', 'error');

  // Reuse xlsx export via temporary selection
  const originalSelected = new Set(_selected);
  _selected.clear();
  items.forEach(r => _selected.add(r.id));
  await exportSelectedExcelXLSX();
  _selected = originalSelected;
}

function reportPrint() {
  const items = getReportFiltered();
  if (items.length === 0) return toast('لا توجد طلبات للطباعة', 'error');

  const originalSelected = new Set(_selected);
  _selected.clear();
  items.forEach(r => _selected.add(r.id));
  printSelected();
  _selected = originalSelected;
}

window._openReports = openReportsModal;
window._reportRefresh = reportRefresh;
window._reportExport = reportExport;
window._reportPrint = reportPrint;
