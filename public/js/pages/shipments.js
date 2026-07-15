import { buildHijriPicker, todayHijri } from '../../../src/utils/hijriDate.js';
import { LOGO_B64, STAMP_B64, AEO_PDF_B64 } from '../../../src/utils/assets.js';
import { getShipments, updateShipment, getShipment } from '../../../src/firebase/db.js';
import { saveAttachments, getAttachments, saveAttachment } from '../../../src/firebase/attachments.js';
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

const DEST  = { uae: '🇦🇪 إمارات', bahrain: '🇧🇭 بحرين', oman: '🇴🇲 عُمان' };
const PMAPS = { uae: 'جمرك البطحاء', bahrain: 'جمرك جسر الملك فهد' };

let _editingId       = null;
let _editingShipment = null;
let _editFiles       = {};
let _existingFiles   = {};
let _brokerReplyFile = null;

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
      <!-- Search bar -->
      <div style="margin-bottom:14px;">
        <input type="text" id="search-input"
          placeholder="🔍 بحث برقم البيان، اسم السائق، المصدر، رقم اللوحة..."
          oninput="searchShipments(this.value)"
          style="width:100%;padding:11px 16px;border:1.5px solid var(--border);
          border-radius:10px;font-size:14px;font-family:'Tajawal',sans-serif;
          background:white;outline:none;transition:border-color 0.15s;"
          onfocus="this.style.borderColor='var(--blue)'"
          onblur="this.style.borderColor='var(--border)'">
      </div>
      <div class="card">
        <div id="shipments-list"><div class="loader"><div class="spinner"></div></div></div>
      </div>
    </div>

    <!-- EDIT MODAL -->
    <div id="edit-modal" class="modal-overlay hidden">
      <div class="modal-box" style="max-width:700px;width:95%;max-height:92vh;overflow-y:auto;">
        <div class="modal-title">✏️ تعديل الشحنة</div>
        <div id="edit-form-body"><div class="loader"><div class="spinner"></div></div></div>
        <div class="modal-actions">
          <button class="btn btn-ghost"   onclick="closeEditModal()">إلغاء</button>
          <button class="btn btn-gold"    id="btn-merge" onclick="previewMerge()">👁️ معاينة ودمج PDF</button>
          <button class="btn btn-primary" id="btn-save"  onclick="saveEdit()">💾 حفظ</button>
        </div>
      </div>
    </div>`;

  await loadShipments();

  window.openEditModal    = openEditModal;
  window.closeEditModal   = closeEditModal;
  window.saveEdit         = saveEdit;
  window.confirmDelete    = confirmDelete;
  window.editFileSelected = editFileSelected;
  window.mergeAll         = mergeAll;
  window.previewMerge     = previewMerge;
  window.doMergeDownload  = mergeAll;

  // Listen for merge signal from preview tab (via localStorage)
  window.removeEventListener('message', window._mergeMessageHandler || (()=>{}));
  if (window._storageListener) window.removeEventListener('storage', window._storageListener);
  window._storageListener = (e) => {
    if (e.key === 'm-customs-merge') {
      mergeAll();
      localStorage.removeItem('m-customs-merge');
    }
  };
  window.addEventListener('storage', window._storageListener);
  window.addEventListener('message', (e) => {
    if (e.data === 'do-merge-download') mergeAll();
  });
  window.updatePortEdit   = updatePortEdit;
}

// ─────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────
let _allShipments = [];

function searchShipments(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    renderShipmentsList(_allShipments);
    return;
  }
  const filtered = _allShipments.filter(s =>
    (s.declaration_no||'').toLowerCase().includes(q) ||
    (s.driver_snapshot?.name||'').toLowerCase().includes(q) ||
    (s.driver_snapshot?.plate||'').toLowerCase().includes(q) ||
    (s.exporter||'').toLowerCase().includes(q) ||
    (s.goods_description||'').toLowerCase().includes(q) ||
    (s.created_by?.name||'').toLowerCase().includes(q)
  );
  renderShipmentsList(filtered);
}

async function loadShipments() {
  _allShipments = await getShipments(100);
  const list = document.getElementById('shipments-list');

  renderShipmentsList(_allShipments);
  window.searchShipments = searchShipments;
}

function renderShipmentsList(shipments) {
  const list = document.getElementById('shipments-list');
  if (!list) return;

  if (!shipments.length) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📭</div>
      <div class="empty-title">لا توجد نتائج</div>
    </div>`;
    return;
  }

  list.innerHTML = `<div class="ship-list">${shipments.map(s => `
    <div class="ship-item">
      <div style="flex:1;">
        <div class="ship-no">بيان #${s.declaration_no||'—'}</div>
        <div class="ship-drv">👤 ${s.driver_snapshot?.name||'—'} &nbsp;|&nbsp; ${s.exporter||''}</div>
        <div class="ship-drv" style="font-size:10px;margin-top:2px;">
          📦 ${s.goods_description||''} &nbsp;|&nbsp; 📅 ${s.date||''}
          ${s.created_by?.name ? `&nbsp;|&nbsp; <span class="emp-tag"><i class="ti ti-user" style="font-size:10px"></i>${s.created_by.name}</span>` : ''}
        </div>
      </div>
      <div class="ship-plate">${s.driver_snapshot?.plate||'—'}</div>
      <div class="ship-dest">${DEST[s.destination]||'—'}</div>
      <span class="pill ${STATUS[s.status]?.class||'pill-draft'}">${STATUS[s.status]?.ar||s.status}</span>
      <div class="ship-actions">
        <button class="icon-btn" title="عرض وطباعة" onclick="navigate('shipment-view',{id:'${s.id}'})"><i class="ti ti-eye"></i></button>
        <button class="icon-btn" title="تعديل" onclick="openEditModal('${s.id}')"><i class="ti ti-edit"></i></button>
        <button class="icon-btn" title="حذف" style="border-color:var(--red-light);" onclick="confirmDelete('${s.id}','${s.declaration_no||''}')"><i class="ti ti-trash" style="color:var(--red)"></i></button>
      </div>
    </div>`).join('')}</div>`;
}

// ─────────────────────────────────────────────
// EDIT MODAL
// ─────────────────────────────────────────────
async function openEditModal(id) {
  _editingId = id;
  _editFiles = {};
  _brokerReplyFile = null;
  document.getElementById('edit-modal').classList.remove('hidden');
  document.getElementById('edit-form-body').innerHTML =
    '<div class="loader"><div class="spinner"></div></div>';

  const [s, existing] = await Promise.all([
    getShipment(id),
    getAttachments(id)
  ]);

  if (!s) { toast('تعذّر تحميل الشحنة', 'error'); return; }
  _editingShipment = s;
  _existingFiles   = existing;

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
          <div class="u-state" id="edit-state-${a.key}">
            ${has?(existing[a.key].name||'✓ محفوظ'):'اضغط للرفع'}
          </div>
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
      <div id="e-date-wrap"></div>
      <div id="e-sample-date-wrap"></div>
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

    <div style="background:var(--surface);border-radius:8px;padding:14px;margin-bottom:16px;">
      <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:10px;">
        المرفقات — <span style="color:var(--green);">✅ محفوظة</span> &nbsp;|&nbsp;
        <span style="color:var(--muted);">📎 اضغط للرفع أو التحديث</span>
      </div>
      <div class="upload-grid">${attachHTML}</div>
    </div>
`;

  // Init hijri date pickers AFTER innerHTML is set
  const dateWrap = document.getElementById('e-date-wrap');
  if (dateWrap) {
    dateWrap.innerHTML = '';
    dateWrap.appendChild(buildHijriPicker('e-date', s.date || todayHijri(), 'تاريخ البيان'));
  }
  const sampleWrap = document.getElementById('e-sample-date-wrap');
  if (sampleWrap) {
    sampleWrap.innerHTML = '';
    sampleWrap.appendChild(buildHijriPicker('e-sample-date', s.sample_date || s.date || todayHijri(), 'تاريخ استقطاع العينة'));
  }
}

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
    _existingFiles[key] = _editFiles[key];
    item.classList.add('uploaded');
    item.querySelector('.u-icon').textContent = '✅';
    state.textContent = file.name.length > 22 ? file.name.substring(0,22)+'…' : file.name;
    toast(`✅ ${file.name}`, 'success');
  } catch(e) { state.textContent = 'خطأ في الرفع'; }
}

async function brokerReplySelected(input) {
  const file = input.files[0];
  if (!file) return;
  document.getElementById('broker-reply-state').textContent = '⏳ جاري التحميل...';
  try {
    const b64 = await fileToBase64(file);
    _brokerReplyFile = { name: file.name, base64: b64, type: file.type };
    _existingFiles['broker_reply'] = _brokerReplyFile;
    document.getElementById('broker-reply-icon').textContent = '✅';
    document.getElementById('broker-reply-state').textContent = file.name;
    toast(`✅ ${file.name}`, 'success');
  } catch(e) {
    document.getElementById('broker-reply-state').textContent = 'خطأ في الرفع';
  }
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.add('hidden');
  _editingId = null;
  _editingShipment = null;
  _editFiles = {};
  _existingFiles = {};
}

// ─────────────────────────────────────────────
// SAVE
// ─────────────────────────────────────────────
async function saveEdit() {
  if (!_editingId) return;
  const btn = document.getElementById('btn-save');
  btn.disabled = true;
  btn.textContent = '⏳ حفظ...';

  try {
    const dest = document.getElementById('e-dest').value;
    await updateShipment(_editingId, {
      destination:       dest,
      port:              dest === 'bahrain' ? 'bahrain' : 'uae',
      declaration_no:    document.getElementById('e-decl-no').value.trim(),
      unified_no:        document.getElementById('e-unified-no').value.trim(),
      date:              document.getElementById('e-date').value.trim(),
      sample_date:       document.getElementById('e-sample-date')?.value?.trim() || document.getElementById('e-date').value.trim(),
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
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 حفظ';
  }
}

// ─────────────────────────────────────────────
// PREVIEW IN NEW TAB — معاينة قبل الدمج
// ─────────────────────────────────────────────
function previewMerge() {
  if (!_editingShipment) return;
  const s   = _editingShipment;
  const drv = s?.driver_snapshot || {};

  // Build attachment list
  const allFiles = { ...(_existingFiles||{}), ..._editFiles };
  const attachList = [
    { label: 'شهادة المشغل الاقتصادي GCC AEO', fixed: true, available: true },
    ...ATTACHMENTS_ORDER.map(a => ({
      label: a.ar,
      fixed: false,
      available: !!allFiles[a.key],
      name: allFiles[a.key]?.name || ''
    }))
  ];

  const previewHTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>معاينة — بيان #${s.declaration_no||'—'}</title>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Tajawal',sans-serif; direction:rtl; background:#F2F5F9; color:#1a2535; }
  .no-print { }
  @media print { .no-print { display:none !important; } body { background:white; } }

  /* Header */
  .preview-header {
    background:#1C2D4E; color:white; padding:16px 28px;
    display:flex; align-items:center; justify-content:space-between;
    position:sticky; top:0; z-index:100;
  }
  .preview-title { font-size:17px; font-weight:700; }
  .preview-sub   { font-size:12px; color:rgba(255,255,255,0.5); margin-top:3px; }
  .btn-download  {
    background:#C8943A; color:white; border:none; border-radius:8px;
    padding:10px 22px; font-size:14px; font-weight:700;
    font-family:'Tajawal',sans-serif; cursor:pointer;
  }
  .btn-download:hover { opacity:0.9; }

  /* Content */
  .preview-body { padding:24px; max-width:900px; margin:0 auto; }

  /* Checklist */
  .checklist-card {
    background:white; border-radius:10px; border:1px solid #D0DCE8;
    margin-bottom:24px; overflow:hidden;
  }
  .checklist-header {
    background:#1C2D4E; color:white; padding:12px 18px;
    font-size:13px; font-weight:700;
  }
  .checklist-item {
    display:flex; align-items:center; gap:12px;
    padding:10px 18px; border-bottom:1px solid #F2F5F9;
    font-size:13px;
  }
  .checklist-item:last-child { border-bottom:none; }
  .check-num  { width:24px; height:24px; border-radius:50%; background:#1C2D4E; color:white; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .check-icon { font-size:16px; flex-shrink:0; }
  .check-label { flex:1; font-weight:500; }
  .check-name  { font-size:11px; color:#5a7090; margin-top:2px; }
  .check-status { font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; }
  .s-yes   { background:#e6f5ed; color:#1a7a50; }
  .s-fixed { background:#EBF4FF; color:#2563a8; }
  .s-no    { background:#fef3e2; color:#b86a0a; }

  /* Forms preview */
  .form-wrap { background:white; border-radius:10px; border:1px solid #D0DCE8; overflow:hidden; margin-bottom:20px; }
  .form-label { background:#e8edf4; padding:10px 18px; font-size:12px; font-weight:700; color:#1C2D4E; border-bottom:1px solid #D0DCE8; }
</style>
</head>
<body>

<div class="preview-header no-print">
  <div>
    <div class="preview-title">معاينة الملف الموحد — بيان #${s.declaration_no||'—'}</div>
    <div class="preview-sub">👤 ${drv.name||'—'} &nbsp;|&nbsp; ${drv.plate||'—'} &nbsp;|&nbsp; ${s.exporter||'—'}</div>
  </div>
  <button class="btn-download" id="btn-confirm-download"
    onclick="this.disabled=true;this.textContent='⏳ جاري...';localStorage.setItem('m-customs-merge',Date.now().toString());setTimeout(()=>{this.textContent='✅ تم — سيبدأ التحميل';},800);">
    📥 تأكيد وتحميل PDF
  </button>
</div>

<div class="preview-body">

  <!-- Checklist -->
  <div class="checklist-card">
    <div class="checklist-header">📋 محتويات الملف الموحد — ${attachList.filter(a=>a.available).length + 2} ملف</div>
    <div class="checklist-item">
      <div class="check-num">١</div>
      <span class="check-icon">📄</span>
      <div style="flex:1;"><div class="check-label">فورم البيان الجمركي</div></div>
      <span class="check-status s-yes">✓ تلقائي</span>
    </div>
    <div class="checklist-item">
      <div class="check-num">٢</div>
      <span class="check-icon">📋</span>
      <div style="flex:1;"><div class="check-label">محضر استقطاع العينة</div></div>
      <span class="check-status s-yes">✓ تلقائي</span>
    </div>
    ${attachList.map((a, i) => `
    <div class="checklist-item">
      <div class="check-num">${i+3}</div>
      <span class="check-icon">${a.available ? '✅' : '⚠️'}</span>
      <div style="flex:1;">
        <div class="check-label">${a.label} ${a.fixed?'<span style="font-size:10px;color:#2563a8;">(ثابتة)</span>':''}</div>
        ${a.name ? `<div class="check-name">${a.name}</div>` : ''}
      </div>
      <span class="check-status ${a.available?(a.fixed?'s-fixed':'s-yes'):'s-no'}">
        ${a.available ? (a.fixed?'ثابتة':'✓ موجود') : '⚠️ غير مرفوع'}
      </span>
    </div>`).join('')}
  </div>

  <!-- Form 1 Preview -->
  <div class="form-label">📄 فورم البيان الجمركي</div>
  <div class="form-wrap">
    ${buildDeclarationHTML(s, drv)}
  </div>

  <!-- Form 2 Preview -->
  <div class="form-label">📋 محضر استقطاع العينة</div>
  <div class="form-wrap">
    ${buildSampleHTML(s, drv)}
  </div>

</div>
</body>
</html>`;

  // Open in new tab
  const win = window.open('', '_blank');
  win.document.write(previewHTML);
  win.document.close();

  // Expose download function to parent window
  window.doMergeDownload = mergeAll;
}

// ─────────────────────────────────────────────
// MERGE ALL — ملف موحد كامل
// ─────────────────────────────────────────────
async function mergeAll() {
  const btn = document.getElementById('btn-merge');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ جاري الدمج...'; }
  try {
    const s   = _editingShipment;
    const drv = s?.driver_snapshot || {};

    // Save any new files first
    if (Object.keys(_editFiles).length > 0) await saveAttachments(_editingId, _editFiles);

    toast('⏳ جاري تجهيز الفورمات...', 'info');
    const form1Bytes = await htmlToPdfBytes(buildDeclarationHTML(s, drv));
    const form2Bytes = await htmlToPdfBytes(buildSampleHTML(s, drv));

    // Build sources: forms + AEO + attachments
    const sources = [
      { type: 'arraybuffer', data: form1Bytes },
      { type: 'arraybuffer', data: form2Bytes },
      { type: 'base64',      data: AEO_PDF_B64 },
      ...ATTACHMENTS_ORDER
        .filter(a => _existingFiles[a.key])
        .map(a => ({ type: 'base64', data: _existingFiles[a.key].base64 }))
    ];

    toast('⏳ جاري دمج الملفات...', 'info');
    const merged   = await mergePDFs(sources);
    const filename = `${drv.name||'شحنة'}_${s?.declaration_no||''}.pdf`.replace(/\s+/g,'_');
    downloadBytes(merged, filename);
    toast('✅ تم تحميل الملف الموحد', 'success');
  } catch(e) {
    console.error(e);
    toast('خطأ في الدمج', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '📦 دمج وتحميل PDF'; }
  }
}

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────
async function confirmDelete(id, declNo) {
  if (!window.confirm(`هل تريد حذف الشحنة رقم ${declNo||id}؟`)) return;
  try {
    await deleteDoc(doc(db, 'shipments', id));
    toast('🗑️ تم الحذف', 'success');
    await loadShipments();
    window.updateBadges?.();
  } catch(e) { toast('خطأ في الحذف', 'error'); }
}

// ─────────────────────────────────────────────
// HTML BUILDERS — مع الشعار والختم الحقيقيين
// ─────────────────────────────────────────────
function buildDeclarationHTML(s, drv) {
  const port = PORTS[s?.port] || PORTS.uae;
  return `<div style="font-family:'Tajawal',sans-serif;direction:rtl;padding:20px;background:white;">
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #1C2D4E;padding-bottom:14px;margin-bottom:0;">
      <div>
        <div style="font-size:15px;font-weight:800;color:#1C2D4E;line-height:1.4;">شركة عبدالرحمن عبدالعزيز السديس<br>للخدمات اللوجستية</div>
        <div style="font-size:10px;color:#1C2D4E;letter-spacing:0.5px;margin-top:3px;">ABDULRAHMAN ABDULAZIZ AL-SUDAIS<br>LOGISTICS SERVICES COMPANY</div>
        <div style="font-size:9px;color:#5a7090;margin-top:4px;">سجل تجاري 4030126911 – جدة – حي الجوهرة – المملكة العربية السعودية | C.R 4030126911</div>
      </div>
      <img src="${LOGO_B64}" style="height:75px;width:75px;object-fit:contain;flex-shrink:0;">
    </div>
    <div style="background:#1C2D4E;color:white;padding:8px 16px;font-size:12px;font-weight:700;display:flex;justify-content:space-between;">
      <span>Customs Export Declaration — نظام التصدير الآلي</span>
      <span>البيان الجمركي للصادر</span>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <tr>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;background:#f4f7fb;font-weight:700;color:#1C2D4E;width:18%;">جمرك / Customs</td>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;">${port.ar} — نظام التصدير الآلي</td>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;background:#f4f7fb;font-weight:700;color:#1C2D4E;width:18%;">أسم المخلص الجمركي</td>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;">شركة عبدالرحمن عبدالعزيز السديس</td>
      </tr>
      <tr>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;background:#f4f7fb;font-weight:700;color:#1C2D4E;">المصدر / Exporter</td>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;font-weight:700;" colspan="3">${s?.exporter||'—'}</td>
      </tr>
      <tr>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;background:#f4f7fb;font-weight:700;color:#1C2D4E;">نوع البيان</td>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;">✅ أخصائي منشأ سعودي</td>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;background:#f4f7fb;font-weight:700;color:#1C2D4E;">إعادة تصدير</td>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;"></td>
      </tr>
    </table>
    <div style="background:#1C2D4E;color:white;padding:6px 16px;font-size:11px;font-weight:700;">أرقام البيان — Declaration Numbers</div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <tr>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;background:#f4f7fb;font-weight:700;color:#1C2D4E;">رقم البيان / No.</td>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;font-weight:800;font-size:15px;text-align:center;">${s?.declaration_no||'—'}</td>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;background:#f4f7fb;font-weight:700;color:#1C2D4E;">الرقم الموحد / Unified</td>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;font-weight:800;font-size:15px;text-align:center;">${s?.unified_no||'—'}</td>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;background:#f4f7fb;font-weight:700;color:#1C2D4E;">التاريخ / Date</td>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;font-weight:700;text-align:center;">${s?.date||'—'}</td>
      </tr>
    </table>
    <div style="background:#1C2D4E;color:white;padding:6px 16px;font-size:11px;font-weight:700;">وصف البضاعة — Cargo Description</div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <tr>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;background:#f4f7fb;font-weight:700;color:#1C2D4E;width:18%;">وصف البضاعة / Goods</td>
        <td style="border:1px solid #1C2D4E;padding:7px 10px;font-weight:700;font-size:14px;">${s?.goods_description||'—'}</td>
      </tr>
    </table>
    <div style="background:#1C2D4E;color:white;padding:6px 16px;font-size:11px;font-weight:700;">بيانات الشاحنة والسائق — Vehicle & Driver Information</div>
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
    <div style="background:#1C2D4E;color:rgba(255,255,255,0.7);font-size:9px;padding:7px 16px;display:flex;justify-content:space-between;margin-top:0;">
      <span>www.sudais.com.sa | info@sudais.com.sa | 9200 08305</span>
      <span>Jeddah – Al Jawhara District – Building 3508 – Unit 14 – Postal 22416</span>
    </div>
  </div>`;
}

function buildSampleHTML(s, drv) {
  const port = PORTS[s?.port] || PORTS.uae;
  return `<div style="font-family:'Tajawal',sans-serif;direction:rtl;padding:20px;background:white;">
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #1C2D4E;padding-bottom:14px;margin-bottom:14px;">
      <div>
        <div style="font-size:15px;font-weight:800;color:#1C2D4E;line-height:1.4;">شركة عبدالرحمن عبدالعزيز السديس<br>للخدمات اللوجستية</div>
        <div style="font-size:10px;color:#1C2D4E;letter-spacing:0.5px;margin-top:3px;">ABDULRAHMAN ABDULAZIZ AL-SUDAIS<br>LOGISTICS SERVICES COMPANY</div>
        <div style="font-size:9px;color:#5a7090;margin-top:4px;">سجل تجاري 4030126911 – جدة – حي الجوهرة | C.R 4030126911</div>
      </div>
      <img src="${LOGO_B64}" style="height:75px;width:75px;object-fit:contain;flex-shrink:0;">
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
      <p>وبموجب بيان رقم : <strong>${s?.declaration_no||'—'}</strong> بتاريخ <strong>${s?.sample_date||s?.date||'—'}</strong></p>
      <p>والارساليه باسم المصدر : <strong>${s?.exporter||'—'}</strong> .</p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;margin-bottom:48px;padding:0 10px;">
      <div style="text-align:right;">
        <div style="font-size:13px;font-weight:700;color:#1C2D4E;margin-bottom:40px;">اسم السائق / ${drv.name||'—'}</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:13px;font-weight:700;color:#1C2D4E;margin-bottom:10px;">الختم</div>
        <img src="${STAMP_B64}" style="width:90px;height:90px;object-fit:contain;opacity:0.92;display:block;margin:0 auto;">
      </div>
      <div style="text-align:left;">
        <div style="font-size:13px;font-weight:700;color:#1C2D4E;margin-bottom:40px;">مندوب صاحب الشأن</div>
      </div>
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
