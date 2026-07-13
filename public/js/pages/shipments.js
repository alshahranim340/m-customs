import { LOGO_B64, STAMP_B64 } from '../../../src/utils/assets.js';
import { getShipments, updateShipment, getShipment } from '../../../src/firebase/db.js';
import { saveAttachments, getAttachments, saveAttachment, getAttachment } from '../../../src/firebase/attachments.js';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../src/firebase/config.js';
import { fileToBase64, mergePDFs, htmlToPdfBytes, downloadBytes } from '../../../src/utils/fileUtils.js';
import { ATTACHMENTS_ORDER, PORTS } from '../../../src/utils/constants.js';
import { toast } from '../app.js';

const STATUS = {
  draft:          { ar: 'مسودة',        class: 'pill-draft' },
  sent_broker:    { ar: 'أُرسل للمخلص', class: 'pill-sent' },
  broker_replied: { ar: 'رد المخلص',     class: 'pill-replied' },
  sent_driver:    { ar: 'أُرسل للسائق',  class: 'pill-done' },
  done:           { ar: 'مكتمل ✓',       class: 'pill-done' },
};

const STATUS_FLOW = [
  'draft', 'sent_broker', 'broker_replied', 'sent_driver', 'done'
];

const DEST  = { uae: '🇦🇪 إمارات', bahrain: '🇧🇭 بحرين', oman: '🇴🇲 عُمان' };
const PMAPS = { uae: 'جمرك البطحاء', bahrain: 'جمرك جسر الملك فهد' };

let _editingId       = null;
let _editingShipment = null;
let _editFiles       = {};
let _existingFiles   = {};

export async function renderShipments(container) {
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
      <div class="modal-box" style="max-width:700px;width:95%;max-height:92vh;overflow-y:auto;">
        <div class="modal-title" id="edit-modal-title">✏️ تعديل الشحنة</div>
        <div id="edit-form-body"><div class="loader"><div class="spinner"></div></div></div>
        <div class="modal-actions" id="edit-modal-actions"></div>
      </div>
    </div>`;

  await loadShipments();

  window.openEditModal    = openEditModal;
  window.closeEditModal   = closeEditModal;
  window.saveEdit         = saveEdit;
  window.confirmDelete    = confirmDelete;
  window.editFileSelected = editFileSelected;
  window.mergeForBroker   = mergeForBroker;
  window.uploadBrokerReply= uploadBrokerReply;
  window.brokerReplySelected = brokerReplySelected;
  window.mergeForDriver   = mergeForDriver;
  window.updatePortEdit   = updatePortEdit;
}

// ─────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────
async function loadShipments() {
  const shipments = await getShipments(100);
  const list = document.getElementById('shipments-list');

  if (!shipments.length) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📭</div>
      <div class="empty-title">لا توجد شحنات</div><br>
      <button class="btn btn-primary" onclick="navigate('new-shipment')">➕ شحنة جديدة</button>
    </div>`;
    return;
  }

  list.innerHTML = `<div class="ship-list">${shipments.map(s => {
    const statusIdx = STATUS_FLOW.indexOf(s.status);
    const nextStatus = STATUS_FLOW[statusIdx + 1];

    // Action button per status
    let actionBtn = '';
    if (s.status === 'draft') {
      actionBtn = `<button class="btn btn-sm btn-primary" onclick="openEditModal('${s.id}','sent_broker')">
        📤 إرسال للمخلص
      </button>`;
    } else if (s.status === 'sent_broker') {
      actionBtn = `<button class="btn btn-sm" style="background:#8b5cf6;color:white;" onclick="openEditModal('${s.id}','broker_replied')">
        📩 رفع رد المخلص
      </button>`;
    } else if (s.status === 'broker_replied') {
      actionBtn = `<button class="btn btn-sm btn-green" onclick="openEditModal('${s.id}','sent_driver')">
        🚛 إرسال للسائق
      </button>`;
    } else if (s.status === 'sent_driver') {
      actionBtn = `<button class="btn btn-sm btn-ghost" onclick="markDone('${s.id}')">
        ✅ اكتمل
      </button>`;
    }

    return `
    <div class="ship-item">
      <div style="flex:1;">
        <div class="ship-no">بيان #${s.declaration_no||'—'}</div>
        <div class="ship-drv">👤 ${s.driver_snapshot?.name||'—'} &nbsp;|&nbsp; ${s.exporter||''}</div>
        <div class="ship-drv" style="font-size:10px;margin-top:2px;">
          📦 ${s.goods_description||''} &nbsp;|&nbsp; 📅 ${s.date||''}
        </div>
      </div>
      <div class="ship-plate">${s.driver_snapshot?.plate||'—'}</div>
      <div class="ship-dest">${DEST[s.destination]||'—'}</div>
      <span class="pill ${STATUS[s.status]?.class||'pill-draft'}">${STATUS[s.status]?.ar||s.status}</span>
      <div class="ship-actions">
        ${actionBtn}
        <button class="icon-btn" title="عرض وطباعة" onclick="navigate('shipment-view',{id:'${s.id}'})">👁️</button>
        <button class="icon-btn" title="تعديل" onclick="openEditModal('${s.id}','edit')">✏️</button>
        <button class="icon-btn" title="حذف" style="border-color:var(--red);"
          onclick="confirmDelete('${s.id}','${s.declaration_no||''}')">🗑️</button>
      </div>
    </div>`;
  }).join('')}</div>`;

  window.markDone = async (id) => {
    await updateShipment(id, { status: 'done' });
    toast('✅ تم إغلاق الشحنة', 'success');
    await loadShipments();
    window.updateBadges?.();
  };
}

// ─────────────────────────────────────────────
// OPEN EDIT MODAL — mode: 'edit' | 'sent_broker' | 'broker_replied' | 'sent_driver'
// ─────────────────────────────────────────────
async function openEditModal(id, mode = 'edit') {
  _editingId = id;
  _editFiles = {};
  document.getElementById('edit-modal').classList.remove('hidden');
  document.getElementById('edit-form-body').innerHTML =
    '<div class="loader"><div class="spinner"></div></div>';
  document.getElementById('edit-modal-actions').innerHTML = '';

  const [s, existing] = await Promise.all([
    getShipment(id),
    getAttachments(id)
  ]);

  if (!s) { toast('تعذّر تحميل الشحنة', 'error'); return; }
  _editingShipment = s;
  _existingFiles   = existing;

  if (mode === 'sent_broker') {
    renderBrokerMode(s, existing);
  } else if (mode === 'broker_replied') {
    renderBrokerReplyMode(s);
  } else if (mode === 'sent_driver') {
    renderDriverMode(s, existing);
  } else {
    renderEditMode(s, existing);
  }
}

// ─────────────────────────────────────────────
// MODE 1: EDIT
// ─────────────────────────────────────────────
function renderEditMode(s, existing) {
  document.getElementById('edit-modal-title').textContent = '✏️ تعديل الشحنة';

  const destOpts   = ['uae','bahrain','oman'].map(d =>
    `<option value="${d}" ${s.destination===d?'selected':''}>${DEST[d]}</option>`
  ).join('');
  const statusOpts = Object.entries(STATUS).map(([k,v]) =>
    `<option value="${k}" ${s.status===k?'selected':''}>${v.ar}</option>`
  ).join('');
  const attachHTML = ATTACHMENTS_ORDER.map(a => {
    const has = !!existing[a.key];
    return `
      <label class="upload-item ${has?'uploaded':''}" id="edit-upload-${a.key}">
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" style="display:none"
          onchange="editFileSelected('${a.key}',this)">
        <span class="u-icon">${has?'✅':'📎'}</span>
        <div>
          <div class="u-name">${a.ar}</div>
          <div class="u-state" id="edit-state-${a.key}">${has?(existing[a.key].name||'✓ محفوظ'):'اضغط للرفع'}</div>
        </div>
      </label>`;
  }).join('');

  document.getElementById('edit-form-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
      <div class="field"><label>الوجهة</label>
        <select id="e-dest" onchange="updatePortEdit()">${destOpts}</select></div>
      <div class="field"><label>المنفذ</label>
        <input type="text" id="e-port" value="${PMAPS[s.port]||PMAPS.uae}"></div>
      <div class="field"><label>رقم البيان</label>
        <input type="text" id="e-decl-no" value="${s.declaration_no||''}"></div>
      <div class="field"><label>الرقم الموحد</label>
        <input type="text" id="e-unified-no" value="${s.unified_no||''}"></div>
      <div class="field"><label>التاريخ (هجري)</label>
        <input type="text" id="e-date" value="${s.date||''}"></div>
      <div class="field"><label>الحالة</label>
        <select id="e-status">${statusOpts}</select></div>
      <div class="field" style="grid-column:span 2;"><label>اسم المصدر</label>
        <input type="text" id="e-exporter" value="${s.exporter||''}"></div>
      <div class="field" style="grid-column:span 2;"><label>وصف البضاعة</label>
        <input type="text" id="e-goods" value="${s.goods_description||''}"></div>
    </div>
    <div style="background:var(--surface);border-radius:8px;padding:14px;margin-bottom:16px;">
      <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:10px;">بيانات السائق</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="field"><label>اسم السائق</label>
          <input type="text" id="e-drv-name" value="${s.driver_snapshot?.name||''}"></div>
        <div class="field"><label>الجنسية</label>
          <input type="text" id="e-drv-nat" value="${s.driver_snapshot?.nationality||''}"></div>
        <div class="field"><label>بلد الجواز</label>
          <input type="text" id="e-drv-passport" value="${s.driver_snapshot?.passport_country||''}"></div>
        <div class="field"><label>رقم اللوحة</label>
          <input type="text" id="e-drv-plate" value="${s.driver_snapshot?.plate||''}"></div>
        <div class="field"><label>نوع السيارة</label>
          <input type="text" id="e-drv-vtype" value="${s.driver_snapshot?.vehicle_type||''}"></div>
        <div class="field"><label>نوع الناقل</label>
          <input type="text" id="e-drv-ctype" value="${s.driver_snapshot?.carrier_type||''}"></div>
        <div class="field"><label>جنسية اللوحة</label>
          <input type="text" id="e-drv-pnat" value="${s.driver_snapshot?.plate_nationality||''}"></div>
      </div>
    </div>
    <div style="background:var(--surface);border-radius:8px;padding:14px;">
      <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:10px;">
        المرفقات — <span style="color:var(--green);">✅ محفوظة</span> &nbsp;|&nbsp;
        <span style="color:var(--muted);">📎 اضغط للرفع</span>
      </div>
      <div class="upload-grid">${attachHTML}</div>
    </div>`;

  document.getElementById('edit-modal-actions').innerHTML = `
    <button class="btn btn-ghost"   onclick="closeEditModal()">إلغاء</button>
    <button class="btn btn-gold"    id="btn-merge-broker" onclick="mergeForBroker()">📦 دمج وتحميل</button>
    <button class="btn btn-primary" onclick="saveEdit()">💾 حفظ</button>`;
}

// ─────────────────────────────────────────────
// MODE 2: SENT TO BROKER — merge & download
// ─────────────────────────────────────────────
function renderBrokerMode(s, existing) {
  document.getElementById('edit-modal-title').textContent = '📤 إرسال للمخلص الإماراتي';
  const attachCount = ATTACHMENTS_ORDER.filter(a => existing[a.key]).length;
  const attachHTML  = ATTACHMENTS_ORDER.map(a => {
    const has = !!existing[a.key];
    return `
      <label class="upload-item ${has?'uploaded':''}" id="edit-upload-${a.key}">
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" style="display:none"
          onchange="editFileSelected('${a.key}',this)">
        <span class="u-icon">${has?'✅':'📎'}</span>
        <div>
          <div class="u-name">${a.ar}</div>
          <div class="u-state" id="edit-state-${a.key}">${has?(existing[a.key].name||'✓ محفوظ'):'اضغط للرفع'}</div>
        </div>
      </label>`;
  }).join('');

  document.getElementById('edit-form-body').innerHTML = `
    <div style="background:var(--amber-light);border-radius:8px;padding:14px;margin-bottom:16px;border:1px solid var(--amber);">
      <div style="font-size:13px;font-weight:700;color:var(--amber);margin-bottom:6px;">📋 ملف المخلص يحتوي على:</div>
      <div style="font-size:12px;color:var(--text);line-height:2;">
        ١. فورم البيان الجمركي (يُولَّد تلقائياً)<br>
        ٢. محضر استقطاع العينة (يُولَّد تلقائياً)<br>
        ٣. المرفقات المرفوعة (${attachCount} من ${ATTACHMENTS_ORDER.length})
      </div>
    </div>
    <div style="background:var(--surface);border-radius:8px;padding:14px;margin-bottom:16px;">
      <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:10px;">
        تحقق من المرفقات — أضف الناقصة
      </div>
      <div class="upload-grid">${attachHTML}</div>
    </div>
    <div class="field">
      <label>ملاحظات للمخلص (اختياري)</label>
      <textarea id="broker-notes" rows="2" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:'Tajawal',sans-serif;font-size:13px;resize:none;"></textarea>
    </div>`;

  document.getElementById('edit-modal-actions').innerHTML = `
    <button class="btn btn-ghost" onclick="closeEditModal()">إلغاء</button>
    <button class="btn btn-green" id="btn-merge-driver" onclick="mergeForDriver()">🚛 دمج للسائق</button>
    <button class="btn btn-gold"  id="btn-merge-broker" onclick="mergeForBroker()">📦 دمج للمخلص</button>`;
}

// ─────────────────────────────────────────────
// MODE 3: BROKER REPLIED — upload broker PDF
// ─────────────────────────────────────────────
function renderBrokerReplyMode(s) {
  document.getElementById('edit-modal-title').textContent = '📩 رفع رد المخلص';

  document.getElementById('edit-form-body').innerHTML = `
    <div style="background:var(--surface);border-radius:8px;padding:20px;text-align:center;margin-bottom:16px;">
      <div style="font-size:32px;margin-bottom:10px;">📄</div>
      <div style="font-size:14px;font-weight:700;color:var(--navy);margin-bottom:6px;">ارفع PDF رد المخلص</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:16px;">
        الملف الذي أرسله المخلص الإماراتي — الموعد مرفق داخله
      </div>
      <label class="upload-item" id="broker-reply-upload" style="max-width:320px;margin:0 auto;cursor:pointer;">
        <input type="file" accept=".pdf" style="display:none" onchange="brokerReplySelected(this)">
        <span class="u-icon" id="broker-reply-icon">📎</span>
        <div>
          <div class="u-name">رد المخلص PDF</div>
          <div class="u-state" id="broker-reply-state">اضغط للرفع</div>
        </div>
      </label>
    </div>`;

  document.getElementById('edit-modal-actions').innerHTML = `
    <button class="btn btn-ghost"   onclick="closeEditModal()">إلغاء</button>
    <button class="btn btn-gold"    id="btn-merge-broker" onclick="mergeForBroker()">📦 دمج للمخلص</button>
    <button class="btn btn-green"   id="btn-merge-driver" onclick="mergeForDriver()">🚛 دمج للسائق</button>
    <button class="btn btn-primary" id="btn-save-reply"   onclick="uploadBrokerReply()">💾 حفظ رد المخلص</button>`;
}

// ─────────────────────────────────────────────
// MODE 4: SEND TO DRIVER — merge without driver docs
// ─────────────────────────────────────────────
function renderDriverMode(s, existing) {
  document.getElementById('edit-modal-title').textContent = '🚛 إرسال للسائق';
  const hasBrokerReply = !!existing['broker_reply'];

  document.getElementById('edit-form-body').innerHTML = `
    <div style="background:var(--green-light);border-radius:8px;padding:14px;margin-bottom:16px;border:1px solid var(--green);">
      <div style="font-size:13px;font-weight:700;color:var(--green);margin-bottom:6px;">🚛 ملف السائق يحتوي على:</div>
      <div style="font-size:12px;color:var(--text);line-height:2;">
        ١. فورم البيان الجمركي<br>
        ٢. محضر استقطاع العينة<br>
        ٣. رد المخلص (يتضمن الموعد) ${hasBrokerReply ? '✅' : '⚠️ غير مرفوع'}<br>
        ٤. الفاتورة وباقي المستندات<br>
        <span style="color:var(--red);">✗ بدون بيانات السائق (تُستثنى تلقائياً)</span>
      </div>
    </div>
    ${!hasBrokerReply ? `
    <div style="background:var(--amber-light);border-radius:8px;padding:12px;margin-bottom:12px;border:1px solid var(--amber);">
      <div style="font-size:12px;color:var(--amber);font-weight:600;margin-bottom:8px;">⚠️ لم يُرفع رد المخلص بعد — ارفعه الآن</div>
      <label class="upload-item" style="cursor:pointer;">
        <input type="file" accept=".pdf" style="display:none" onchange="brokerReplySelected(this)">
        <span class="u-icon" id="broker-reply-icon">📎</span>
        <div><div class="u-name">رد المخلص PDF</div>
          <div class="u-state" id="broker-reply-state">اضغط للرفع</div></div>
      </label>
    </div>` : ''}`;

  document.getElementById('edit-modal-actions').innerHTML = `
    <button class="btn btn-ghost" onclick="closeEditModal()">إلغاء</button>
    <button class="btn btn-gold"  id="btn-merge-broker" onclick="mergeForBroker()">📦 دمج للمخلص</button>
    <button class="btn btn-green btn-lg" id="btn-merge-driver" onclick="mergeForDriver()">
      🚛 دمج للسائق
    </button>`;
}

// ─────────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────────
function updatePortEdit() {
  const d = document.getElementById('e-dest')?.value;
  if (d) document.getElementById('e-port').value = PMAPS[d] || PMAPS.uae;
}

async function editFileSelected(key, input) {
  const file = input.files[0];
  if (!file) return;
  const state = document.getElementById(`edit-state-${key}`);
  const item  = document.getElementById(`edit-upload-${key}`);
  state.textContent = '⏳ جاري التحميل...';
  try {
    const b64 = await fileToBase64(file);
    _editFiles[key] = { name: file.name, base64: b64, type: file.type };
    item.classList.add('uploaded');
    item.querySelector('.u-icon').textContent = '✅';
    state.textContent = file.name.length > 22 ? file.name.substring(0,22)+'…' : file.name;
    // Update existing files cache
    _existingFiles[key] = _editFiles[key];
    toast(`✅ ${file.name}`, 'success');
  } catch(e) {
    state.textContent = 'خطأ في الرفع';
  }
}

let _brokerReplyFile = null;

async function brokerReplySelected(input) {
  const file = input.files[0];
  if (!file) return;
  document.getElementById('broker-reply-state').textContent = '⏳ جاري التحميل...';
  try {
    const b64 = await fileToBase64(file);
    _brokerReplyFile = { name: file.name, base64: b64, type: file.type };
    document.getElementById('broker-reply-icon').textContent = '✅';
    document.getElementById('broker-reply-state').textContent = file.name;
    toast(`✅ ${file.name}`, 'success');
  } catch(e) {
    document.getElementById('broker-reply-state').textContent = 'خطأ في الرفع';
  }
}

// ── SAVE EDIT ──
async function saveEdit() {
  if (!_editingId) return;
  const dest = document.getElementById('e-dest').value;
  try {
    await updateShipment(_editingId, {
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
        passport_country:  document.getElementById('e-drv-passport').value.trim(),
        plate:             document.getElementById('e-drv-plate').value.trim(),
        vehicle_type:      document.getElementById('e-drv-vtype').value.trim(),
        carrier_type:      document.getElementById('e-drv-ctype').value.trim(),
        plate_nationality: document.getElementById('e-drv-pnat').value.trim(),
      }
    });
    if (Object.keys(_editFiles).length > 0) {
      await saveAttachments(_editingId, _editFiles);
    }
    toast('✅ تم الحفظ', 'success');
    closeEditModal();
    await loadShipments();
    window.updateBadges?.();
  } catch(e) {
    console.error(e);
    toast('خطأ في الحفظ', 'error');
  }
}

// ── MERGE FOR BROKER ──
async function mergeForBroker() {
  const btn = document.getElementById('btn-merge-broker');
  btn.disabled = true;
  btn.textContent = '⏳ جاري الدمج...';
  try {
    const s   = _editingShipment;
    const drv = s?.driver_snapshot || {};

    // Save any new files
    if (Object.keys(_editFiles).length > 0) {
      await saveAttachments(_editingId, _editFiles);
      Object.assign(_existingFiles, _editFiles);
    }

    toast('⏳ جاري تجهيز الفورمات...', 'info');
    const form1Bytes = await htmlToPdfBytes(buildDeclarationHTML(s, drv));
    const form2Bytes = await htmlToPdfBytes(buildSampleHTML(s, drv));

    const sources = [
      { type: 'arraybuffer', data: form1Bytes },
      { type: 'arraybuffer', data: form2Bytes },
      ...ATTACHMENTS_ORDER
        .filter(a => _existingFiles[a.key])
        .map(a => ({ type: 'base64', data: _existingFiles[a.key].base64 }))
    ];

    toast('⏳ جاري دمج الملفات...', 'info');
    const merged   = await mergePDFs(sources);
    const filename = `مخلص_${drv.name||'شحنة'}_${s?.declaration_no||''}.pdf`.replace(/\s+/g,'_');
    downloadBytes(merged, filename);

    // Update status
    await updateShipment(_editingId, {
      status: 'sent_broker',
      broker_notes: document.getElementById('broker-notes')?.value || ''
    });

    toast('✅ تم تحميل ملف المخلص — الحالة: أُرسل للمخلص', 'success');
    closeEditModal();
    await loadShipments();
    window.updateBadges?.();
  } catch(e) {
    console.error(e);
    toast('خطأ في الدمج', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '📦 دمج وتحميل PDF للمخلص';
  }
}

// ── UPLOAD BROKER REPLY ──
async function uploadBrokerReply() {
  if (!_brokerReplyFile) { toast('ارفع PDF رد المخلص أولاً', 'error'); return; }
  const btn = document.getElementById('btn-save-reply');
  btn.disabled = true;
  btn.textContent = '⏳ جاري الحفظ...';
  try {
    await saveAttachment(_editingId, 'broker_reply', _brokerReplyFile);
    await updateShipment(_editingId, { status: 'broker_replied' });
    toast('✅ تم حفظ رد المخلص', 'success');
    closeEditModal();
    await loadShipments();
    window.updateBadges?.();
  } catch(e) {
    console.error(e);
    toast('خطأ في الحفظ', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 حفظ رد المخلص';
  }
}

// ── MERGE FOR DRIVER ──
async function mergeForDriver() {
  const btn = document.getElementById('btn-merge-driver');
  btn.disabled = true;
  btn.textContent = '⏳ جاري الدمج...';

  try {
    const s   = _editingShipment;
    const drv = s?.driver_snapshot || {};

    // Save broker reply if uploaded now
    if (_brokerReplyFile) {
      await saveAttachment(_editingId, 'broker_reply', _brokerReplyFile);
      _existingFiles['broker_reply'] = _brokerReplyFile;
    }

    toast('⏳ جاري تجهيز الفورمات...', 'info');
    const form1Bytes = await htmlToPdfBytes(buildDeclarationHTML(s, drv));
    const form2Bytes = await htmlToPdfBytes(buildSampleHTML(s, drv));

    // Driver file: forms + broker reply + attachments EXCEPT driver_docs
    const DRIVER_EXCLUDE = ['driver_docs'];
    const sources = [
      { type: 'arraybuffer', data: form1Bytes },
      { type: 'arraybuffer', data: form2Bytes },
    ];

    // Add broker reply
    if (_existingFiles['broker_reply']) {
      sources.push({ type: 'base64', data: _existingFiles['broker_reply'].base64 });
    }

    // Add other attachments (exclude driver_docs)
    ATTACHMENTS_ORDER
      .filter(a => !DRIVER_EXCLUDE.includes(a.key) && _existingFiles[a.key])
      .forEach(a => sources.push({ type: 'base64', data: _existingFiles[a.key].base64 }));

    toast('⏳ جاري دمج الملفات...', 'info');
    const merged   = await mergePDFs(sources);
    const filename = `سائق_${drv.name||'شحنة'}_${s?.declaration_no||''}.pdf`.replace(/\s+/g,'_');
    downloadBytes(merged, filename);

    await updateShipment(_editingId, { status: 'sent_driver' });

    toast('✅ تم تحميل ملف السائق — الحالة: أُرسل للسائق', 'success');
    closeEditModal();
    await loadShipments();
    window.updateBadges?.();
  } catch(e) {
    console.error(e);
    toast('خطأ في الدمج', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🚛 دمج وتحميل PDF للسائق';
  }
}

// ── DELETE ──
async function confirmDelete(id, declNo) {
  if (!window.confirm(`هل تريد حذف الشحنة رقم ${declNo||id}؟`)) return;
  try {
    await deleteDoc(doc(db, 'shipments', id));
    toast('🗑️ تم الحذف', 'success');
    await loadShipments();
    window.updateBadges?.();
  } catch(e) { toast('خطأ في الحذف', 'error'); }
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.add('hidden');
  _editingId = null;
  _editingShipment = null;
  _editFiles = {};
  _existingFiles = {};
  _brokerReplyFile = null;
}

// ─────────────────────────────────────────────
// HTML BUILDERS
// ─────────────────────────────────────────────
function buildDeclarationHTML(s, drv) {
  const port = PORTS[s?.port] || PORTS.uae;
  return `<div style="font-family:'Tajawal',sans-serif;direction:rtl;padding:20px;background:white;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1C2D4E;padding-bottom:12px;">
      <div>
        <div style="font-size:14px;font-weight:800;color:#1C2D4E;">شركة عبدالرحمن عبدالعزيز السديس للخدمات اللوجستية</div>
        <div style="font-size:10px;color:#1C2D4E;letter-spacing:0.5px;">ABDULRAHMAN ABDULAZIZ AL-SUDAIS LOGISTICS SERVICES COMPANY</div>
        <div style="font-size:9px;color:#5a7090;margin-top:3px;">سجل تجاري 4030126911 – جدة – حي الجوهرة – المملكة العربية السعودية</div>
      </div>
      <img src="${LOGO_B64}" style="height:60px;object-fit:contain;">
    </div>
    <div style="background:#1C2D4E;color:white;padding:7px 16px;font-size:12px;font-weight:700;display:flex;justify-content:space-between;">
      <span>Customs Export Declaration</span><span>البيان الجمركي للصادر — ${port.ar}</span>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <tr>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;background:#f4f7fb;font-weight:700;color:#1C2D4E;width:18%;">جمرك</td>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;">${port.ar} — نظام التصدير الآلي</td>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;background:#f4f7fb;font-weight:700;color:#1C2D4E;width:18%;">المخلص الجمركي</td>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;">شركة عبدالرحمن عبدالعزيز السديس</td>
      </tr>
      <tr>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;background:#f4f7fb;font-weight:700;color:#1C2D4E;">المصدر</td>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;font-weight:700;" colspan="3">${s?.exporter||'—'}</td>
      </tr>
    </table>
    <div style="background:#1C2D4E;color:white;padding:6px 16px;font-size:11px;font-weight:700;">أرقام البيان</div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <tr>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;background:#f4f7fb;font-weight:700;color:#1C2D4E;">رقم البيان</td>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;font-weight:800;font-size:15px;text-align:center;">${s?.declaration_no||'—'}</td>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;background:#f4f7fb;font-weight:700;color:#1C2D4E;">الرقم الموحد</td>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;font-weight:800;font-size:15px;text-align:center;">${s?.unified_no||'—'}</td>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;background:#f4f7fb;font-weight:700;color:#1C2D4E;">التاريخ</td>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;font-weight:700;text-align:center;">${s?.date||'—'}</td>
      </tr>
    </table>
    <div style="background:#1C2D4E;color:white;padding:6px 16px;font-size:11px;font-weight:700;">وصف البضاعة</div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <tr>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;background:#f4f7fb;font-weight:700;color:#1C2D4E;width:18%;">البضاعة</td>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;font-weight:700;font-size:14px;">${s?.goods_description||'—'}</td>
      </tr>
    </table>
    <div style="background:#1C2D4E;color:white;padding:6px 16px;font-size:11px;font-weight:700;">بيانات الشاحنة والسائق</div>
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <thead><tr style="background:#e8edf4;">
        <th style="border:1px solid #1C2D4E;padding:6px;text-align:center;">عدد</th>
        <th style="border:1px solid #1C2D4E;padding:6px;text-align:center;">قيد حركة الشاحنة</th>
        <th style="border:1px solid #1C2D4E;padding:6px;text-align:center;">أرقام اللوحات</th>
        <th style="border:1px solid #1C2D4E;padding:6px;text-align:center;">جنسيتها</th>
        <th style="border:1px solid #1C2D4E;padding:6px;text-align:center;">أسم السائق</th>
        <th style="border:1px solid #1C2D4E;padding:6px;text-align:center;">جنسيته</th>
        <th style="border:1px solid #1C2D4E;padding:6px;text-align:center;">نوع السيارة</th>
        <th style="border:1px solid #1C2D4E;padding:6px;text-align:center;">نوع الناقل</th>
      </tr></thead>
      <tbody>
        <tr>
          <td style="border:1px solid #1C2D4E;padding:6px;text-align:center;font-weight:700;">1</td>
          <td style="border:1px solid #1C2D4E;padding:6px;text-align:center;">${drv.movement_ref||''}</td>
          <td style="border:1px solid #1C2D4E;padding:6px;text-align:center;font-weight:700;">${drv.plate||'—'}</td>
          <td style="border:1px solid #1C2D4E;padding:6px;text-align:center;">${drv.plate_nationality||'—'}</td>
          <td style="border:1px solid #1C2D4E;padding:6px;font-weight:700;">${drv.name||'—'}</td>
          <td style="border:1px solid #1C2D4E;padding:6px;text-align:center;">${drv.nationality||'—'}</td>
          <td style="border:1px solid #1C2D4E;padding:6px;text-align:center;">${drv.vehicle_type||'—'}</td>
          <td style="border:1px solid #1C2D4E;padding:6px;text-align:center;">${drv.carrier_type||'—'}</td>
        </tr>
        <tr><td style="border:1px solid #1C2D4E;padding:10px;" colspan="8">&nbsp;</td></tr>
        <tr><td style="border:1px solid #1C2D4E;padding:10px;" colspan="8">&nbsp;</td></tr>
      </tbody>
    </table>
    <div style="background:#1C2D4E;color:rgba(255,255,255,0.7);font-size:9px;padding:7px 16px;display:flex;justify-content:space-between;">
      <span>www.sudais.com.sa | info@sudais.com.sa | 9200 08305</span>
      <span>Jeddah – Al Jawhara District – Building 3508 – Unit 14 – Postal 22416</span>
    </div>
  </div>`;
}

function buildSampleHTML(s, drv) {
  const port = PORTS[s?.port] || PORTS.uae;
  return `<div style="font-family:'Tajawal',sans-serif;direction:rtl;padding:20px;background:white;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1C2D4E;padding-bottom:12px;margin-bottom:14px;">
      <div>
        <div style="font-size:14px;font-weight:800;color:#1C2D4E;">شركة عبدالرحمن عبدالعزيز السديس للخدمات اللوجستية</div>
        <div style="font-size:10px;color:#1C2D4E;">ABDULRAHMAN ABDULAZIZ AL-SUDAIS LOGISTICS SERVICES COMPANY</div>
        <div style="font-size:9px;color:#5a7090;margin-top:3px;">سجل تجاري 4030126911 – جدة – حي الجوهرة – C.R 4030126911</div>
      </div>
      <img src="${LOGO_B64}" style="height:60px;object-fit:contain;">
    </div>
    <div style="font-size:18px;font-weight:800;color:#1C2D4E;text-align:right;border-right:5px solid #1C2D4E;padding-right:10px;margin-bottom:6px;">${port.ar} / الصادرات</div>
    <div style="font-size:14px;font-weight:600;color:#1C2D4E;text-align:right;padding-right:16px;margin-bottom:16px;">( محضر استقطاع عينه ) مشتقات بتروليه (</div>
    <div style="font-size:12px;color:#333;line-height:2.2;text-align:right;border-right:3px solid #D0DCE8;padding-right:12px;margin-bottom:20px;">
      اشاره الى تعميم معالي مدير عام الجمارك رقم <strong>1004 س/43م هـ</strong>
      بشأن الاشراف على استخراج عينات المواد بتاريخ <strong>1428-10-08 هـ</strong>
      البترولية تمهيدا لارسالها الى مختبرات تحليل المنتجات البتروليه
    </div>
    <div style="font-size:14px;color:#1a2535;line-height:3.2;text-align:right;margin-bottom:36px;">
      <p>انه في <strong>الأربعاء الموافق ${s?.date||'—'} هـ</strong> تم استقطاع عينه من الشاحنه</p>
      <p>رقم اللوحه <strong>${drv.plate||'—'}</strong> بقياده السائق <strong>${drv.name||'—'}</strong> لجنسيه <strong>${drv.nationality||'—'}</strong></p>
      <p>بموجب جواز سفر صادر من <strong>${drv.passport_country||drv.nationality||'—'}</strong></p>
      <p>وبموجب بيان رقم : <strong>${s?.declaration_no||'—'}</strong> بتاريخ <strong>${s?.date||'—'}</strong></p>
      <p>والارساليه باسم المصدر : <strong>${s?.exporter||'—'}</strong> .</p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;margin-bottom:48px;padding:0 10px;">
      <div style="text-align:right;"><div style="font-size:13px;font-weight:700;color:#1C2D4E;margin-bottom:40px;">اسم السائق / ${drv.name||'—'}</div></div>
      <div style="text-align:center;">
        <div style="font-size:13px;font-weight:700;color:#1C2D4E;margin-bottom:10px;">الختم</div>
        <img src="${STAMP_B64}" style="width:90px;height:90px;object-fit:contain;opacity:0.92;">
      </div>
      <div style="text-align:left;"><div style="font-size:13px;font-weight:700;color:#1C2D4E;margin-bottom:40px;">مندوب صاحب الشأن</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;margin-bottom:24px;padding:0 10px;">
      <div style="text-align:right;"><div style="font-size:13px;font-weight:700;color:#1C2D4E;">المعاين المختص</div></div>
      <div style="text-align:center;"><div style="font-size:13px;font-weight:700;color:#1C2D4E;">موظف التفتيش المعاكس</div></div>
      <div style="text-align:left;"><div style="font-size:13px;font-weight:700;color:#1C2D4E;">موظف الدعم والتشغيل</div></div>
    </div>
    <div style="background:#1C2D4E;color:rgba(255,255,255,0.7);font-size:9px;padding:7px 16px;display:flex;justify-content:space-between;">
      <span>www.sudais.com.sa | info@sudais.com.sa | 9200 08305</span>
      <span>Jeddah – Al Jawhara District – Building 3508 – Unit 14 – Postal 22416 .6204</span>
    </div>
  </div>`;
}
