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
let _dropdowns = { customers: [], materials: [], nationalities: [] };
let _drivers = []; // all drivers cached for autocomplete
let _selected = new Set(); // selected request IDs for bulk print/export
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

export async function renderTransportRequests(container) {
  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = `<div class="page-body" style="padding:40px;text-align:center;">يجب تسجيل الدخول</div>`;
    return;
  }
  _profile = await getUserProfile(user.uid);

  // Access control
  if (_profile.role !== 'transport' && _profile.role !== 'admin') {
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
            <button class="modern-btn" id="btn-print-selected" onclick="_printSelected()" style="display:none;">
              <i class="ti ti-printer"></i> طباعة <span id="print-count">0</span>
            </button>
            <button class="modern-btn" id="btn-excel-selected" onclick="_exportSelectedExcel()" style="display:none;">
              <i class="ti ti-file-spreadsheet"></i> Excel
            </button>
            <button class="modern-btn" onclick="navigate('transport-settings')">
              <i class="ti ti-settings"></i> إدارة القوائم
            </button>
            <button class="modern-btn modern-btn-primary" onclick="_addRow()">
              <i class="ti ti-plus"></i> صف جديد
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

  // Wire up filter buttons + search
  document.querySelectorAll('.rep-period-btn').forEach(btn => {
    btn.onclick = () => {
      _filter = btn.dataset.filter;
      document.querySelectorAll('.rep-period-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === _filter));
      renderTable();
    };
    if (btn.dataset.filter === _filter) btn.classList.add('active');
  });
  document.getElementById('tr-search').oninput = (e) => { _search = e.target.value.trim().toLowerCase(); renderTable(); };

  // Expose functions to window
  window._addRow = addNewRow;
  window._saveRow = saveRow;
  window._deleteRow = deleteRow;
  window._sendRow = sendRow;

  await loadData();
}

async function loadData() {
  try {
    [_requests, _dropdowns, _drivers] = await Promise.all([
      getTransportRequests(200),
      getTransportDropdowns(),
      getAllDrivers(),
    ]);
    renderStats();
    renderTable();
  } catch (e) {
    console.error('load transport error:', e);
    toast('خطأ في التحميل', 'error');
  }
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
      <tr><td colspan="14" style="padding:40px;text-align:center;">
        <div style="font-size:44px;">🚛</div>
        <div style="font-size:14px;color:#0E1A2E;font-weight:700;margin-top:8px;">لا توجد طلبات نقل</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B6659;margin-top:4px;letter-spacing:1px;">CLICK "صف جديد" TO ADD</div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((r, idx) => renderRow(r, idx + 1)).join('');

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

  // Filter drivers by name (en/ar), iqama, truck#
  let matches = _drivers.filter(d => {
    if (!d.name_en && !d.name_ar) return false;
    if (!query) return true; // show all if empty
    const inNameEn = (d.name_en || '').toLowerCase().includes(query);
    const inNameAr = (d.name_ar || '').toLowerCase().includes(query);
    const inIqama = (d.iqama || '').toLowerCase().includes(query);
    const inTruck = (d.truck_number || '').toLowerCase().includes(query);
    return inNameEn || inNameAr || inIqama || inTruck;
  });

  // Sort: exact match first, then partial
  matches.sort((a, b) => {
    const aExact = (a.name_en || '').toLowerCase() === query;
    const bExact = (b.name_en || '').toLowerCase() === query;
    if (aExact !== bExact) return aExact ? -1 : 1;
    return (a.name_en || '').localeCompare(b.name_en || '');
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
      return `
        <div class="tr-dd-item" data-driver-id="${d.id}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
            <div style="flex:1;min-width:0;">
              <div style="font-family:'Inter','Segoe UI',sans-serif;font-weight:800;font-size:13px;color:#0E1A2E;direction:ltr;text-align:right;">
                ${d.name_en || '—'}
              </div>
              ${missingAr
                ? `<div style="font-size:10px;color:#C2410C;font-weight:700;margin-top:2px;">⚠ يحتاج اسم عربي</div>`
                : `<div style="font-size:12px;color:#1C4B8E;font-weight:700;margin-top:2px;">${d.name_ar}</div>`
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
              <span style="color:#0E1A2E;font-weight:700;">${d.truck_number || '—'}</span>
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

  // Fill driver name (english)
  _activeInput.value = driver.name_en || '';

  // Always overwrite these fields (user chose this driver)
  const setCell = (field, value) => {
    const cell = row.querySelector(`[data-field="${field}"]`);
    if (cell && value !== undefined && value !== null) cell.value = value;
  };
  setCell('driver_id_number', driver.iqama || '');
  setCell('driver_nationality', driver.nationality || '');
  setCell('truck_number', driver.truck_number || '');

  hideDriverDropdown();
  toast(`✓ ${driver.name_en || driver.name_ar} — البيانات تم تعبئتها`, 'success');
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
        ${isSent ? `<input type="checkbox" class="tr-select" data-req-id="${r.id}" ${isSelected ? 'checked' : ''} onclick="_toggleSelect('${r.id}')" style="accent-color:#2E8B57;cursor:pointer;">` : ''}
      </td>
      <td style="text-align:center;font-family:'JetBrains Mono',monospace;font-size:11px;color:#8A8578;font-weight:700;">${String(num).padStart(2,'0')}</td>
      <td><input type="text" class="tr-cell" data-field="truck_number" value="${r.truck_number||''}" ${roCss} placeholder="9691"></td>
      <td>
        <input type="text" class="tr-cell tr-driver-name" data-field="driver_name" value="${r.driver_name||''}" ${roCss} placeholder="اكتب للبحث..." style="direction:ltr;text-align:right;" autocomplete="off">
      </td>
      <td><input type="text" class="tr-cell" data-field="driver_id_number" value="${r.driver_id_number||''}" ${roCss} placeholder="2481671556" style="direction:ltr;text-align:right;"></td>
      <td>${renderSelect('driver_nationality', r.driver_nationality || '', _dropdowns.nationalities, isSent, 'الجنسية')}</td>
      <td>${renderSelect('customer', r.customer || '', _dropdowns.customers, isSent, 'اختر أو أضف')}</td>
      <td>${renderSelect('material', r.material || '', _dropdowns.materials, isSent, 'اختر أو أضف')}</td>
      <td><input type="number" class="tr-cell" data-field="quantity" value="${r.quantity||''}" ${roCss} placeholder="27.5" style="direction:ltr;text-align:right;" step="0.01"></td>
      <td><input type="text" class="tr-cell tr-hijri" data-field="dispatch_date" value="${r.dispatch_date||''}" ${roCss} placeholder="1447-12-05" style="direction:ltr;text-align:right;"></td>
      <td><input type="text" class="tr-cell" data-field="delivery_number" value="${r.delivery_number||''}" ${roCss} placeholder="33946" style="direction:ltr;text-align:right;"></td>
      <td>${renderDestSelect(r.destination || 'uae', isSent)}</td>
      <td style="text-align:center;"><span class="modern-badge ${status.class}" style="font-size:9px;">${status.en}</span></td>
      <td style="text-align:center;">
        ${!isSent ? `
          <button class="tr-icon-btn tr-success" onclick="_saveRow('${r.id}')" title="حفظ"><i class="ti ti-device-floppy"></i></button>
          <button class="tr-icon-btn" onclick="_sendRow('${r.id}')" title="إرسال للتخليص"><i class="ti ti-send"></i></button>
        ` : ''}
        <button class="tr-icon-btn tr-danger" onclick="_deleteRow('${r.id}')" title="حذف"><i class="ti ti-trash"></i></button>
      </td>
    </tr>`;
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
      await upsertTransportDriver({
        name_en:      updates.driver_name.trim(),
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
      driver = await upsertTransportDriver({
        name_en:      updates.driver_name.trim(),
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
  const sentIds = _requests
    .filter(r => r.status === 'sent' || r.status === 'converted' || r.status === 'done')
    .map(r => r.id);
  if (el.checked) {
    sentIds.forEach(id => _selected.add(id));
  } else {
    sentIds.forEach(id => _selected.delete(id));
  }
  document.querySelectorAll('.tr-select').forEach(cb => { cb.checked = el.checked; });
  updateBulkButtons();
}

function updateBulkButtons() {
  const btnPrint = document.getElementById('btn-print-selected');
  const btnExcel = document.getElementById('btn-excel-selected');
  const cnt = document.getElementById('print-count');
  if (!btnPrint) return;
  if (_selected.size > 0) {
    btnPrint.style.display = '';
    btnExcel.style.display = '';
    if (cnt) cnt.textContent = _selected.size;
  } else {
    btnPrint.style.display = 'none';
    btnExcel.style.display = 'none';
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
      <h1>🚛 طلبات النقل - قوة الفنيين</h1>
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
    <div>M-Customs System · قوة الفنيين</div>
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

  csv += `طلبات النقل - قوة الفنيين,${dateStr}\n`;
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
