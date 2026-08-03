import { buildHijriPicker, todayHijri, getDayName, dayNameFromHijri } from '../../../src/utils/hijriDate.js';
import { LOGO_B64, STAMP_B64, AEO_PDF_B64 } from '../../../src/utils/assets.js';
import { getShipments, updateShipment, getShipment } from '../../../src/firebase/db.js';
import { saveAttachments, getAttachments, saveAttachment, deleteAttachment } from '../../../src/firebase/attachments.js';
import { getFolders, createFolder, deleteFolder } from '../../../src/firebase/folders.js';
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
    <div class="page-body" style="padding:20px 24px;background:#F5F3EC;">
      <div class="modern-page">

        <!-- Header -->
        <div class="modern-header">
          <div class="modern-header-brand">
            <div class="modern-header-badges">
              <div class="modern-header-dots">
                <span class="modern-header-dot" style="background:#CC2229;"></span>
                <span class="modern-header-dot" style="background:#1C4B8E;"></span>
                <span class="modern-header-dot" style="background:#2E8B57;"></span>
              </div>
              <span class="modern-header-code">SDS/EXPORT/2026</span>
            </div>
            <div class="modern-header-title">سجل الشحنات</div>
            <div class="modern-header-sub">SHIPMENTS · EXPORT LEDGER · v2.4</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" onclick="openNewFolder()">
              <i class="ti ti-folder-plus"></i> مجلد جديد
            </button>
            <button class="modern-btn modern-btn-primary" onclick="navigate('new-shipment')">
              <i class="ti ti-plus"></i> شحنة جديدة
            </button>
          </div>
        </div>

        <!-- Stats -->
        <div class="modern-stats modern-stats-3">
          <div class="modern-stat">
            <div class="modern-stat-lbl">01 · TOTAL</div>
            <div class="modern-stat-val" id="stat-total">0</div>
            <div class="modern-stat-hint">إجمالي الشحنات المسجلة</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">02 · FOLDERS</div>
            <div class="modern-stat-val blue" id="stat-folders">0</div>
            <div class="modern-stat-hint">مجلد نشط</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl" style="color:#CC2229;">03 · UNSORTED ●</div>
            <div class="modern-stat-val danger" id="stat-unassigned">0</div>
            <div class="modern-stat-hint">تحتاج تصنيف</div>
          </div>
        </div>

        <!-- Search -->
        <div class="modern-search-bar">
          <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B6659;letter-spacing:1.5px;font-weight:700;">FIND ›</span>
          <div class="modern-search-wrap">
            <i class="ti ti-search modern-search-icon"></i>
            <input type="text" id="search-input" class="modern-search-input"
              placeholder="declaration number · driver · exporter · plate"
              oninput="searchShipments(this.value)">
          </div>
        </div>

        <!-- Selection toolbar -->
        <div id="selection-bar" style="display:none;align-items:center;gap:10px;
          background:#0E1A2E;color:white;padding:10px 16px;margin:12px 24px 0;border-radius:6px;">
          <span id="sel-count" style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;letter-spacing:1px;"></span>
          <button class="modern-btn" onclick="moveSelectedToFolder()" style="background:rgba(255,255,255,0.15);color:white;border-color:rgba(255,255,255,0.2);">
            <i class="ti ti-folder-plus"></i> نقل إلى مجلد
          </button>
          <button class="modern-btn" onclick="clearSelection()" style="background:rgba(255,255,255,0.08);color:white;border-color:transparent;">
            إلغاء
          </button>
        </div>

        <!-- List -->
        <div id="shipments-list"><div class="loader"><div class="spinner"></div></div></div>

      </div>
    </div>`;

    try {
    await deleteAttachment(_editingId, key);
    delete _existingFiles[key];
    delete _editFiles[key];
    // Update UI
    const item = document.getElementById(`edit-upload-${key}`);
    if (item) {
      item.classList.remove('uploaded');
      item.querySelector('.u-icon').textContent = '📎';
      const state = document.getElementById(`edit-state-${key}`);
      if (state) state.textContent = 'اضغط للرفع';
      const delBtn = item.querySelector('button');
      if (delBtn) delBtn.remove();
    }
    toast('🗑️ تم حذف المرفق', 'success');
  } catch(e) {
    console.error(e);
    toast('خطأ في الحذف', 'error');
  }
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
      sample_day_name:   document.getElementById('e-sample-date')?.dataset?.dayName || '',
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
// Sync current form inputs into _editingShipment (for live preview)
function syncFormToShipment() {
  if (!_editingShipment) return;
  const g = (id) => document.getElementById(id);
  if (g('e-decl-no'))   _editingShipment.declaration_no = g('e-decl-no').value.trim();
  if (g('e-unified-no'))_editingShipment.unified_no     = g('e-unified-no').value.trim();
  if (g('e-date'))      _editingShipment.date           = g('e-date').value.trim();
  if (g('e-sample-date')) {
    _editingShipment.sample_date     = g('e-sample-date').value.trim();
    _editingShipment.sample_day_name = g('e-sample-date').dataset?.dayName || '';
  }
  if (g('e-exporter')) _editingShipment.exporter          = g('e-exporter').value.trim();
  if (g('e-goods'))    _editingShipment.goods_description = g('e-goods').value.trim();
  if (g('e-dest')) {
    const dest = g('e-dest').value;
    _editingShipment.destination = dest;
    _editingShipment.port = dest === 'bahrain' ? 'bahrain' : 'uae';
  }
  // Driver
  _editingShipment.driver_snapshot = {
    name:              g('e-drv-name')?.value?.trim() || '',
    nationality:       g('e-drv-nat')?.value?.trim() || '',
    passport_country:  g('e-drv-passport')?.value?.trim() || '',
    plate:             g('e-drv-plate')?.value?.trim() || '',
    vehicle_type:      g('e-drv-vtype')?.value?.trim() || '',
    carrier_type:      g('e-drv-ctype')?.value?.trim() || '',
    plate_nationality: g('e-drv-pnat')?.value?.trim() || '',
  };
}

function previewMerge() {
  if (!_editingShipment) return;
  // Refresh shipment data from current form inputs (so preview shows latest)
  syncFormToShipment();
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
    syncFormToShipment();
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
      <p>انه في <strong>${s?.sample_day_name || (s?.sample_date ? dayNameFromHijri(s.sample_date) : '—')} الموافق ${s?.sample_date||'—'} هـ</strong> تم استقطاع عينه من الشاحنه</p>
      <p>رقم اللوحه <strong>${drv.plate||'—'}</strong> بقياده السائق <strong>${drv.name||'—'}</strong> لجنسيه <strong>${drv.nationality||'—'}</strong></p>
      <p>بموجب جواز سفر صادر من <strong>${drv.passport_country||drv.nationality||'—'}</strong></p>
      <p>وبموجب بيان رقم : <strong>${s?.declaration_no||'—'}</strong> بتاريخ <strong>${s?.date||'—'}</strong></p>
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
}function applyFiltersAndRender() {
  const list = document.getElementById('shipments-list');
  if (!list) return;

  const inFolder = {};
  const noFolder = [];
  _folders.forEach(f => inFolder[f.id] = []);

  _allShipments.filter(matchSearch).forEach(s => {
    if (s.folder_id && inFolder[s.folder_id]) {
      inFolder[s.folder_id].push(s);
    } else {
      noFolder.push(s);
    }
  });

  Object.keys(inFolder).forEach(k => sortList(inFolder[k]));
  sortList(noFolder);

  // Update stats
  const totalAll = _allShipments.length;
  const totalUnassigned = _allShipments.filter(s => !s.folder_id).length;
  const totalFolders = _folders.length;
  const pad = n => String(n).padStart(2, '0');
  const elTotal = document.getElementById('stat-total');
  const elFolders = document.getElementById('stat-folders');
  const elUnassigned = document.getElementById('stat-unassigned');
  if (elTotal) elTotal.textContent = pad(totalAll);
  if (elFolders) elFolders.textContent = pad(totalFolders);
  if (elUnassigned) elUnassigned.textContent = pad(totalUnassigned);

  const totalShown = _allShipments.filter(matchSearch).length;
  if (totalShown === 0) {
    list.innerHTML = `<div style="padding:24px;"><div class="modern-empty">
      <div class="modern-empty-icon">📭</div>
      <div class="modern-empty-title">لا توجد شحنات</div>
      <div class="modern-empty-sub">NO RESULTS</div>
    </div></div>`;
    return;
  }

  let html = '';

  // Section 1: Unassigned
  if (noFolder.length > 0) {
    html += `
      <div class="modern-section">
        <div class="modern-section-title">
          → UNSORTED / تحتاج تصنيف
          <div class="divider"></div>
          <span class="count">${pad(noFolder.length)} items</span>
        </div>
      </div>
      <div class="modern-list">
        <div class="modern-list-box">`;
    noFolder.forEach(s => { html += renderManifestRow(s, true); });
    html += `</div></div>`;
  }

  // Section 2: Folders
  if (_folders.length > 0) {
    html += `
      <div class="modern-section">
        <div class="modern-section-title">
          → FOLDERS / المجلدات
          <div class="divider"></div>
          <span class="count">${pad(_folders.length)} folders</span>
        </div>
      </div>
      <div class="modern-folders-grid">`;

    _folders.forEach((f, idx) => {
      const items = inFolder[f.id] || [];
      if (_searchQuery && items.length === 0) return;
      html += `
        <div class="modern-folder-card" onclick="toggleFolder('${f.id}')">
          <button class="modern-folder-menu" onclick="event.stopPropagation();openFolderMenu('${f.id}','${(f.name||'').replace(/'/g,"&#39;")}')" title="خيارات">
            <i class="ti ti-dots" style="font-size:14px;"></i>
          </button>
          <div class="modern-folder-topline">
            <span class="modern-folder-code">FOLDER · ${pad(idx+1)}</span>
            <span class="modern-folder-count">${pad(items.length)}</span>
          </div>
          <div class="modern-folder-name">${f.name}</div>
          <div class="modern-folder-meta">${items.length === 1 ? 'shipment' : 'shipments'}</div>
        </div>`;
    });
    html += `</div>`;

    // Open folders content
    _folders.forEach(f => {
      if (!_openFolders.has(f.id)) return;
      const items = inFolder[f.id] || [];
      html += `
        <div class="modern-section">
          <div class="modern-section-title">
            → ${f.name.toUpperCase()}
            <div class="divider"></div>
            <button onclick="toggleFolder('${f.id}')" style="background:none;border:none;color:#1C4B8E;font-family:'JetBrains Mono',monospace;font-size:10px;cursor:pointer;font-weight:700;letter-spacing:1px;">CLOSE ×</button>
          </div>
        </div>
        <div class="modern-list">
          <div class="modern-list-box">`;
      if (items.length === 0) {
        html += `<div style="padding:20px;text-align:center;color:#8A8578;font-family:'JetBrains Mono',monospace;font-size:11px;">EMPTY</div>`;
      } else {
        items.forEach(s => { html += renderManifestRow(s, false); });
      }
      html += `</div></div>`;
    });
  }

  list.innerHTML = html;
  updateSelectionBar();
}

function renderManifestRow(s, isUnassigned) {
  const checked = _selected.has(s.id);
  const st = STATUS[s.status] || { ar: s.status, class: 'pill-draft' };

  let badgeClass = 'gray';
  let stripeClass = 'gray';
  let stKey = 'DRAFT';
  if (st.class === 'pill-done') { badgeClass = 'green'; stripeClass = 'green'; stKey = 'DONE'; }
  else if (st.class === 'pill-sent') { badgeClass = 'blue'; stripeClass = 'blue'; stKey = 'SENT'; }
  else if (st.class === 'pill-replied') { badgeClass = 'amber'; stripeClass = 'amber'; stKey = 'REPLIED'; }
  if (isUnassigned && st.class === 'pill-draft') { stripeClass = 'red'; }

  const destCode = s.destination === 'uae' ? 'AE / EMIRATES'
    : s.destination === 'bahrain' ? 'BH / BAHRAIN'
    : s.destination === 'oman' ? 'OM / OMAN' : '—';

  const driver = s.driver_snapshot?.name || '';
  const plate = s.driver_snapshot?.plate || '';
  const exporter = s.exporter || '';

  return `
    <div class="modern-row">
      <input type="checkbox" class="modern-row-check" ${checked?'checked':''}
        onchange="toggleSelect('${s.id}')" onclick="event.stopPropagation()">
      <div class="modern-row-stripe ${stripeClass}"></div>
      <div class="modern-row-code">${s.declaration_no || '—'}</div>
      <div class="modern-row-body">
        <div class="modern-row-title">
          ${driver || '<span class="muted">— no driver</span>'}
          ${plate ? `<span class="modern-row-plate">${plate}</span>` : ''}
          ${exporter ? `<span class="muted"> · ${exporter}</span>` : ''}
        </div>
        <div class="modern-row-sub">→ ${destCode}${s.goods_description ? ' · ' + s.goods_description : ''}</div>
      </div>
      <span class="modern-badge ${badgeClass}">${stKey}</span>
      <span class="modern-row-date">${s.date || '—'}</span>
      <div class="modern-row-actions">
        <button class="modern-icon-btn" title="نقل" onclick="moveToFolder('${s.id}')"><i class="ti ti-folder-plus"></i></button>
        <button class="modern-icon-btn" title="عرض" onclick="navigate('shipment-view',{id:'${s.id}'})"><i class="ti ti-eye"></i></button>
        <button class="modern-icon-btn" title="تعديل" onclick="openEditModal('${s.id}')"><i class="ti ti-edit"></i></button>
        <button class="modern-icon-btn danger" title="حذف" onclick="confirmDelete('${s.id}','${s.declaration_no||''}')"><i class="ti ti-trash"></i></button>
      </div>
    </div>`;
}

function openFolderMenu(id, name) {
  const choice = window.prompt(`المجلد: ${name}\n\n1 - تعديل الاسم\n2 - حذف المجلد`);
  if (choice === '1') renameFolderFn(id, name);
  else if (choice === '2') deleteFolderFn(id, name);
}

async function renameFolderFn(id, oldName) {
  const newName = window.prompt('الاسم الجديد للمجلد:', oldName);
  if (!newName || !newName.trim() || newName.trim() === oldName) return;
  const { updateFolder } = await import('../../../src/firebase/folders.js');
  await updateFolder(id, { name: newName.trim() });
  _folders = await getFolders();
  applyFiltersAndRender();
  toast('✅ تم تعديل اسم المجلد', 'success');
}


