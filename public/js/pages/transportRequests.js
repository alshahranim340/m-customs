import { getCurrentUser, isAdmin } from '../../../src/firebase/auth.js';
import { getUserProfile } from '../../../src/firebase/db.js';
import {
  getTransportRequests, createTransportRequest, updateTransportRequest,
  deleteTransportRequest, getTransportDropdowns, addDropdownValue
} from '../../../src/firebase/transportDb.js';
import { getAllDrivers, upsertTransportDriver } from '../../../src/firebase/db.js';
import { toast } from '../app.js';
import { todayHijri, buildHijriPicker } from '../../../src/utils/hijriDate.js';

let _profile = null;
let _requests = [];
let _dropdowns = { customers: [], materials: [], nationalities: [] };
let _drivers = []; // all drivers cached for autocomplete
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
      <tr><td colspan="13" style="padding:40px;text-align:center;">
        <div style="font-size:44px;">🚛</div>
        <div style="font-size:14px;color:#0E1A2E;font-weight:700;margin-top:8px;">لا توجد طلبات نقل</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B6659;margin-top:4px;letter-spacing:1px;">CLICK "صف جديد" TO ADD</div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((r, idx) => renderRow(r, idx + 1)).join('');

  // Global datalist for drivers (used by all rows)
  let dl = document.getElementById('dl-drivers');
  if (!dl) {
    dl = document.createElement('datalist');
    dl.id = 'dl-drivers';
    document.body.appendChild(dl);
  }
  dl.innerHTML = _drivers
    .filter(d => d.name_en)
    .map(d => `<option value="${d.name_en}"></option>`)
    .join('');

  // Attach auto-fill on driver name change
  document.querySelectorAll('.tr-driver-name').forEach(input => {
    input.addEventListener('change', (e) => {
      const val = e.target.value.trim();
      if (!val) return;
      const driver = _drivers.find(d =>
        (d.name_en || '').toLowerCase() === val.toLowerCase()
      );
      if (driver) {
        // Auto-fill sibling cells in the same row
        const row = e.target.closest('tr');
        if (!row) return;
        const fillIfEmpty = (field, value) => {
          const cell = row.querySelector(`[data-field="${field}"]`);
          if (cell && value && !cell.value) cell.value = value;
        };
        const fillAlways = (field, value) => {
          const cell = row.querySelector(`[data-field="${field}"]`);
          if (cell && value) cell.value = value;
        };
        // Fill iqama & nationality only if empty (they rarely change)
        fillIfEmpty('driver_id_number', driver.iqama);
        fillIfEmpty('driver_nationality', driver.nationality);
        // Fill truck# with last known (user can change it)
        fillAlways('truck_number', driver.truck_number);
        toast(`✓ بيانات ${driver.name_en} تم تعبئتها`, 'success');
      }
    });
  });
}

function renderRow(r, num) {
  const dest = DEST_LABELS[r.destination] || DEST_LABELS.uae;
  const status = STATUS_LABELS[r.status] || STATUS_LABELS.draft;
  const isSent = r.status === 'sent' || r.status === 'converted' || r.status === 'done';
  const rowClass = isSent ? 'tr-row tr-sent' : 'tr-row';
  const roCss = isSent ? 'readonly' : '';

  return `
    <tr class="${rowClass}" data-id="${r.id}">
      <td style="text-align:center;font-family:'JetBrains Mono',monospace;font-size:11px;color:#8A8578;font-weight:700;">${String(num).padStart(2,'0')}</td>
      <td><input type="text" class="tr-cell" data-field="truck_number" value="${r.truck_number||''}" ${roCss} placeholder="9691"></td>
      <td>
        <input list="dl-drivers" type="text" class="tr-cell tr-driver-name" data-field="driver_name" value="${r.driver_name||''}" ${roCss} placeholder="DRIVER NAME" style="direction:ltr;text-align:right;">
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

  if (!confirm('هل تريد إرسال هذا الطلب للتخليص؟\nلن يمكن التعديل عليه بعد الإرسال.')) return;

  try {
    // Save first, then mark as sent
    const updates = {};
    inputs.forEach(el => {
      const f = el.dataset.field;
      let v = el.value;
      if (f === 'quantity') v = parseFloat(v) || 0;
      updates[f] = v;
    });
    updates.status = 'sent';
    await updateTransportRequest(id, updates);

    // Upsert driver record
    if (updates.driver_name && updates.driver_name.trim()) {
      await upsertTransportDriver({
        name_en:      updates.driver_name.trim(),
        iqama:        updates.driver_id_number || '',
        nationality:  updates.driver_nationality || '',
        truck_number: updates.truck_number || '',
        phone:        '',
      });
    }

    // Learn dropdowns
    if (updates.customer && !_dropdowns.customers.includes(updates.customer)) {
      await addDropdownValue('customers', updates.customer);
    }
    if (updates.material && !_dropdowns.materials.includes(updates.material)) {
      await addDropdownValue('materials', updates.material);
    }
    if (updates.driver_nationality && !_dropdowns.nationalities.includes(updates.driver_nationality)) {
      await addDropdownValue('nationalities', updates.driver_nationality);
    }

    await loadData();
    toast('✓ تم الإرسال للتخليص', 'success');
  } catch (e) {
    console.error(e);
    toast('خطأ في الإرسال', 'error');
  }
}

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
