import { getShipments, updateShipment, getShipment } from '../../../src/firebase/db.js';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../src/firebase/config.js';
import { toast } from '../app.js';

const STATUS = {
  draft:          { ar: 'مسودة',          class: 'pill-draft',   next: 'sent_broker',    nextAr: 'إرسال للمخلص' },
  sent_broker:    { ar: 'أُرسل للمخلص',   class: 'pill-sent',    next: 'broker_replied', nextAr: 'رفع رد المخلص' },
  broker_replied: { ar: 'رد المخلص',       class: 'pill-replied', next: 'sent_driver',    nextAr: 'إرسال للسائق' },
  sent_driver:    { ar: 'أُرسل للسائق',    class: 'pill-done',    next: 'done',           nextAr: 'اكتمل' },
  done:           { ar: 'مكتمل ✓',         class: 'pill-done',    next: null,             nextAr: null },
};

const DEST     = { uae: '🇦🇪 إمارات', bahrain: '🇧🇭 بحرين', oman: '🇴🇲 عُمان' };
const PORTS    = { uae: 'جمرك البطحاء', bahrain: 'جمرك جسر الملك فهد' };
const DEST_KEYS= { uae: 'uae', bahrain: 'bahrain', oman: 'oman' };

let _container;

export async function renderShipments(container) {
  _container = container;

  container.innerHTML = `
    <div class="topbar">
      <div>
        <div class="topbar-title">📋 سجل الشحنات</div>
        <div class="topbar-sub">جميع الشحنات المسجلة</div>
      </div>
      <div class="topbar-actions">
        <button class="btn btn-primary" onclick="navigate('new-shipment')">➕ شحنة جديدة</button>
      </div>
    </div>
    <div class="page-body">
      <div class="card">
        <div id="shipments-list"><div class="loader"><div class="spinner"></div></div></div>
      </div>
    </div>

    <!-- EDIT MODAL -->
    <div id="edit-modal" class="modal-overlay hidden">
      <div class="modal-box" style="max-width:640px;width:95%;max-height:90vh;overflow-y:auto;">
        <div class="modal-title">✏️ تعديل الشحنة</div>
        <div id="edit-form-body"></div>
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="closeEditModal()">إلغاء</button>
          <button class="btn btn-primary" onclick="saveEdit()">💾 حفظ التعديل</button>
        </div>
      </div>
    </div>`;

  await loadShipments();

  // Expose functions
  window.advanceStatus  = advanceStatus;
  window.openEditModal  = openEditModal;
  window.closeEditModal = closeEditModal;
  window.saveEdit       = saveEdit;
  window.confirmDelete  = confirmDelete;
}

// ─────────────────────────────────────────────
// LOAD LIST
// ─────────────────────────────────────────────
async function loadShipments() {
  const shipments = await getShipments(100);
  const list = document.getElementById('shipments-list');

  if (shipments.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-title">لا توجد شحنات</div>
        <br>
        <button class="btn btn-primary" onclick="navigate('new-shipment')">➕ شحنة جديدة</button>
      </div>`;
    return;
  }

  list.innerHTML = `
    <div class="ship-list">
      ${shipments.map(s => `
        <div class="ship-item" id="ship-${s.id}">
          <div style="flex:1;">
            <div class="ship-no">بيان #${s.declaration_no || '—'}</div>
            <div class="ship-drv">
              👤 ${s.driver_snapshot?.name || '—'}
              &nbsp;|&nbsp;
              ${s.exporter || ''}
            </div>
            <div class="ship-drv" style="margin-top:2px;font-size:10px;">
              📦 ${s.goods_description || ''} &nbsp;|&nbsp; 📅 ${s.date || ''}
            </div>
          </div>
          <div class="ship-plate">${s.driver_snapshot?.plate || '—'}</div>
          <div class="ship-dest">${DEST[s.destination] || '—'}</div>
          <span class="pill ${STATUS[s.status]?.class || 'pill-draft'}">
            ${STATUS[s.status]?.ar || s.status}
          </span>
          <div class="ship-actions">
            ${STATUS[s.status]?.next ? `
              <button class="btn btn-sm btn-primary"
                onclick="advanceStatus('${s.id}','${STATUS[s.status].next}')">
                ${STATUS[s.status].nextAr}
              </button>` : ''}
            <button class="icon-btn" title="تعديل" onclick="openEditModal('${s.id}')">✏️</button>
            <button class="icon-btn" title="حذف"
              style="border-color:var(--red);"
              onclick="confirmDelete('${s.id}','${s.declaration_no || ''}')">🗑️</button>
          </div>
        </div>
      `).join('')}
    </div>`;
}

// ─────────────────────────────────────────────
// ADVANCE STATUS
// ─────────────────────────────────────────────
async function advanceStatus(id, newStatus) {
  await updateShipment(id, { status: newStatus });
  toast('✅ تم تحديث الحالة', 'success');
  await loadShipments();
}

// ─────────────────────────────────────────────
// EDIT MODAL
// ─────────────────────────────────────────────
let _editingId = null;

async function openEditModal(id) {
  _editingId = id;
  const s = await getShipment(id);
  if (!s) { toast('تعذّر تحميل الشحنة', 'error'); return; }

  const destOptions = ['uae','bahrain','oman'].map(d =>
    `<option value="${d}" ${s.destination===d?'selected':''}>${DEST[d]}</option>`
  ).join('');

  const statusOptions = Object.entries(STATUS).map(([k,v]) =>
    `<option value="${k}" ${s.status===k?'selected':''}>${v.ar}</option>`
  ).join('');

  document.getElementById('edit-form-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">

      <div class="field">
        <label>الوجهة</label>
        <select id="e-dest" onchange="updatePort()">
          ${destOptions}
        </select>
      </div>
      <div class="field">
        <label>المنفذ</label>
        <input type="text" id="e-port" value="${PORTS[s.port] || PORTS.uae}">
      </div>

      <div class="field">
        <label>رقم البيان</label>
        <input type="text" id="e-decl-no" value="${s.declaration_no || ''}">
      </div>
      <div class="field">
        <label>الرقم الموحد</label>
        <input type="text" id="e-unified-no" value="${s.unified_no || ''}">
      </div>

      <div class="field">
        <label>التاريخ (هجري)</label>
        <input type="text" id="e-date" value="${s.date || ''}">
      </div>
      <div class="field">
        <label>الحالة</label>
        <select id="e-status">${statusOptions}</select>
      </div>

      <div class="field" style="grid-column:span 2;">
        <label>اسم المصدر</label>
        <input type="text" id="e-exporter" value="${s.exporter || ''}">
      </div>
      <div class="field" style="grid-column:span 2;">
        <label>وصف البضاعة</label>
        <input type="text" id="e-goods" value="${s.goods_description || ''}">
      </div>

    </div>

    <div style="background:var(--surface);border-radius:8px;padding:12px;margin-bottom:4px;">
      <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:10px;">بيانات السائق</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="field">
          <label>اسم السائق</label>
          <input type="text" id="e-drv-name" value="${s.driver_snapshot?.name || ''}">
        </div>
        <div class="field">
          <label>الجنسية</label>
          <input type="text" id="e-drv-nat" value="${s.driver_snapshot?.nationality || ''}">
        </div>
        <div class="field">
          <label>رقم اللوحة</label>
          <input type="text" id="e-drv-plate" value="${s.driver_snapshot?.plate || ''}">
        </div>
        <div class="field">
          <label>نوع السيارة</label>
          <input type="text" id="e-drv-vtype" value="${s.driver_snapshot?.vehicle_type || ''}">
        </div>
        <div class="field">
          <label>نوع الناقل</label>
          <input type="text" id="e-drv-ctype" value="${s.driver_snapshot?.carrier_type || ''}">
        </div>
        <div class="field">
          <label>جنسية اللوحة</label>
          <input type="text" id="e-drv-pnat" value="${s.driver_snapshot?.plate_nationality || ''}">
        </div>
      </div>
    </div>`;

  document.getElementById('edit-modal').classList.remove('hidden');

  window.updatePort = () => {
    const dest = document.getElementById('e-dest').value;
    document.getElementById('e-port').value = PORTS[dest] || PORTS.uae;
  };
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.add('hidden');
  _editingId = null;
}

async function saveEdit() {
  if (!_editingId) return;

  const dest = document.getElementById('e-dest').value;
  const updates = {
    destination:       dest,
    port:              dest === 'bahrain' ? 'bahrain' : 'uae',
    declaration_no:    document.getElementById('e-decl-no').value.trim(),
    unified_no:        document.getElementById('e-unified-no').value.trim(),
    date:              document.getElementById('e-date').value.trim(),
    status:            document.getElementById('e-status').value,
    exporter:          document.getElementById('e-exporter').value.trim(),
    goods_description: document.getElementById('e-goods').value.trim(),
    driver_snapshot: {
      name:              document.getElementById('e-drv-name').value.trim(),
      nationality:       document.getElementById('e-drv-nat').value.trim(),
      plate:             document.getElementById('e-drv-plate').value.trim(),
      vehicle_type:      document.getElementById('e-drv-vtype').value.trim(),
      carrier_type:      document.getElementById('e-drv-ctype').value.trim(),
      plate_nationality: document.getElementById('e-drv-pnat').value.trim(),
    }
  };

  try {
    await updateShipment(_editingId, updates);
    toast('✅ تم حفظ التعديل', 'success');
    closeEditModal();
    await loadShipments();
  } catch(e) {
    toast('خطأ في الحفظ', 'error');
  }
}

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────
async function confirmDelete(id, declNo) {
  const confirmed = window.confirm(
    `هل تريد حذف الشحنة رقم ${declNo || id}؟\nلا يمكن التراجع عن هذا الإجراء.`
  );
  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, 'shipments', id));
    toast('🗑️ تم حذف الشحنة', 'success');
    await loadShipments();
  } catch(e) {
    toast('خطأ في الحذف', 'error');
  }
}
