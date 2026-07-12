import { getShipments, updateShipment, getShipment } from '../../../src/firebase/db.js';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../src/firebase/config.js';
import { fileToBase64, mergePDFs, htmlToPdfBytes, downloadBytes } from '../../../src/utils/fileUtils.js';
import { ATTACHMENTS_ORDER, PORTS } from '../../../src/utils/constants.js';
import { toast } from '../app.js';

const STATUS = {
  draft:          { ar: 'مسودة',        class: 'pill-draft',   next: 'sent_broker',    nextAr: 'إرسال للمخلص' },
  sent_broker:    { ar: 'أُرسل للمخلص', class: 'pill-sent',    next: 'broker_replied', nextAr: 'رفع رد المخلص' },
  broker_replied: { ar: 'رد المخلص',     class: 'pill-replied', next: 'sent_driver',    nextAr: 'إرسال للسائق' },
  sent_driver:    { ar: 'أُرسل للسائق',  class: 'pill-done',    next: 'done',           nextAr: 'اكتمل' },
  done:           { ar: 'مكتمل ✓',       class: 'pill-done',    next: null,             nextAr: null },
};

const DEST  = { uae: '🇦🇪 إمارات', bahrain: '🇧🇭 بحرين', oman: '🇴🇲 عُمان' };
const PMAPS = { uae: 'جمرك البطحاء', bahrain: 'جمرك جسر الملك فهد' };

let _editFiles = {};

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
        <div class="modal-title">✏️ تعديل الشحنة</div>
        <div id="edit-form-body"></div>
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="closeEditModal()">إلغاء</button>
          <button class="btn btn-gold" onclick="mergeAndDownload()" id="btn-merge">📦 دمج وتحميل PDF</button>
          <button class="btn btn-primary" onclick="saveEdit()">💾 حفظ</button>
        </div>
      </div>
    </div>`;

  await loadShipments();

  window.advanceStatus   = advanceStatus;
  window.openEditModal   = openEditModal;
  window.closeEditModal  = closeEditModal;
  window.saveEdit        = saveEdit;
  window.confirmDelete   = confirmDelete;
  window.editFileSelected= editFileSelected;
  window.mergeAndDownload= mergeAndDownload;
  window.updatePortEdit  = updatePortEdit;
}

// ── LIST ──
async function loadShipments() {
  const shipments = await getShipments(100);
  const list = document.getElementById('shipments-list');
  if (!shipments.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">لا توجد شحنات</div><br><button class="btn btn-primary" onclick="navigate('new-shipment')">➕ شحنة جديدة</button></div>`;
    return;
  }
  list.innerHTML = `<div class="ship-list">${shipments.map(s => `
    <div class="ship-item">
      <div style="flex:1;">
        <div class="ship-no">بيان #${s.declaration_no||'—'}</div>
        <div class="ship-drv">👤 ${s.driver_snapshot?.name||'—'} &nbsp;|&nbsp; ${s.exporter||''}</div>
        <div class="ship-drv" style="font-size:10px;margin-top:2px;">📦 ${s.goods_description||''} &nbsp;|&nbsp; 📅 ${s.date||''}</div>
      </div>
      <div class="ship-plate">${s.driver_snapshot?.plate||'—'}</div>
      <div class="ship-dest">${DEST[s.destination]||'—'}</div>
      <span class="pill ${STATUS[s.status]?.class||'pill-draft'}">${STATUS[s.status]?.ar||s.status}</span>
      <div class="ship-actions">
        ${STATUS[s.status]?.next ? `<button class="btn btn-sm btn-primary" onclick="advanceStatus('${s.id}','${STATUS[s.status].next}')">${STATUS[s.status].nextAr}</button>` : ''}
        <button class="icon-btn" title="عرض وطباعة" onclick="navigate('shipment-view',{id:'${s.id}'})">👁️</button>
        <button class="icon-btn" title="تعديل ورفع ملفات" onclick="openEditModal('${s.id}')">✏️</button>
        <button class="icon-btn" title="حذف" style="border-color:var(--red);" onclick="confirmDelete('${s.id}','${s.declaration_no||''}')">🗑️</button>
      </div>
    </div>`).join('')}</div>`;
}

// ── ADVANCE STATUS ──
async function advanceStatus(id, newStatus) {
  await updateShipment(id, { status: newStatus });
  toast('✅ تم تحديث الحالة', 'success');
  await loadShipments();
}

// ── EDIT MODAL ──
let _editingId = null;
let _editingShipment = null;

async function openEditModal(id) {
  _editingId = id;
  _editFiles = {};
  const s = await getShipment(id);
  if (!s) { toast('تعذّر تحميل الشحنة', 'error'); return; }
  _editingShipment = s;

  const destOpts   = ['uae','bahrain','oman'].map(d => `<option value="${d}" ${s.destination===d?'selected':''}>${DEST[d]}</option>`).join('');
  const statusOpts = Object.entries(STATUS).map(([k,v]) => `<option value="${k}" ${s.status===k?'selected':''}>${v.ar}</option>`).join('');

  // Check existing attachments
  const existing = s.attachments || {};
  const attachHTML = ATTACHMENTS_ORDER.map(a => {
    const has = !!existing[a.key];
    return `
      <label class="upload-item ${has?'uploaded':''}" id="edit-upload-${a.key}">
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" style="display:none"
          onchange="editFileSelected('${a.key}',this)">
        <span class="u-icon">${has?'✅':'📎'}</span>
        <div>
          <div class="u-name">${a.ar}</div>
          <div class="u-state" id="edit-state-${a.key}">${has ? existing[a.key].name||'تم الرفع' : 'اضغط للرفع'}</div>
        </div>
      </label>`;
  }).join('');

  document.getElementById('edit-form-body').innerHTML = `
    <!-- Ship data -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
      <div class="field"><label>الوجهة</label><select id="e-dest" onchange="updatePortEdit()">${destOpts}</select></div>
      <div class="field"><label>المنفذ</label><input type="text" id="e-port" value="${PMAPS[s.port]||PMAPS.uae}"></div>
      <div class="field"><label>رقم البيان</label><input type="text" id="e-decl-no" value="${s.declaration_no||''}"></div>
      <div class="field"><label>الرقم الموحد</label><input type="text" id="e-unified-no" value="${s.unified_no||''}"></div>
      <div class="field"><label>التاريخ (هجري)</label><input type="text" id="e-date" value="${s.date||''}"></div>
      <div class="field"><label>الحالة</label><select id="e-status">${statusOpts}</select></div>
      <div class="field" style="grid-column:span 2;"><label>اسم المصدر</label><input type="text" id="e-exporter" value="${s.exporter||''}"></div>
      <div class="field" style="grid-column:span 2;"><label>وصف البضاعة</label><input type="text" id="e-goods" value="${s.goods_description||''}"></div>
    </div>

    <!-- Driver -->
    <div style="background:var(--surface);border-radius:8px;padding:14px;margin-bottom:16px;">
      <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:10px;">بيانات السائق</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="field"><label>اسم السائق</label><input type="text" id="e-drv-name" value="${s.driver_snapshot?.name||''}"></div>
        <div class="field"><label>الجنسية</label><input type="text" id="e-drv-nat" value="${s.driver_snapshot?.nationality||''}"></div>
        <div class="field"><label>بلد الجواز</label><input type="text" id="e-drv-passport" value="${s.driver_snapshot?.passport_country||''}"></div>
        <div class="field"><label>رقم اللوحة</label><input type="text" id="e-drv-plate" value="${s.driver_snapshot?.plate||''}"></div>
        <div class="field"><label>نوع السيارة</label><input type="text" id="e-drv-vtype" value="${s.driver_snapshot?.vehicle_type||''}"></div>
        <div class="field"><label>نوع الناقل</label><input type="text" id="e-drv-ctype" value="${s.driver_snapshot?.carrier_type||''}"></div>
        <div class="field"><label>جنسية اللوحة</label><input type="text" id="e-drv-pnat" value="${s.driver_snapshot?.plate_nationality||''}"></div>
      </div>
    </div>

    <!-- Attachments -->
    <div style="background:var(--surface);border-radius:8px;padding:14px;">
      <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:10px;">
        المرفقات — الملفات الخضراء محفوظة مسبقاً
      </div>
      <div class="upload-grid">${attachHTML}</div>
    </div>`;

  document.getElementById('edit-modal').classList.remove('hidden');
}

function updatePortEdit() {
  const d = document.getElementById('e-dest').value;
  document.getElementById('e-port').value = PMAPS[d] || PMAPS.uae;
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
    toast(`✅ تم رفع: ${file.name}`, 'success');
  } catch(e) { state.textContent = 'خطأ في الرفع'; }
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.add('hidden');
  _editingId = null;
  _editingShipment = null;
  _editFiles = {};
}

async function saveEdit() {
  if (!_editingId) return;
  const dest = document.getElementById('e-dest').value;

  // Merge existing attachments with new ones
  const existingAttachments = _editingShipment?.attachments || {};
  const mergedAttachments   = { ...existingAttachments, ..._editFiles };

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
      attachments:       mergedAttachments,
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
    toast('✅ تم حفظ التعديل', 'success');
    closeEditModal();
    await loadShipments();
    window.updateBadges?.();
  } catch(e) {
    console.error(e);
    toast('خطأ في الحفظ — الملفات قد تكون كبيرة جداً', 'error');
  }
}

// ── MERGE & DOWNLOAD ──
async function mergeAndDownload() {
  const btn = document.getElementById('btn-merge');
  btn.disabled = true;
  btn.textContent = '⏳ جاري الدمج...';

  try {
    const s   = _editingShipment;
    const drv = s?.driver_snapshot || {};

    // Merge existing + new attachments
    const allAttachments = { ...( s?.attachments || {} ), ..._editFiles };

    // 1. Generate Form 1 HTML → PDF
    const form1HTML = buildDeclarationHTML(s, drv);
    const form1Bytes = await htmlToPdfBytes(form1HTML);

    // 2. Generate Form 2 HTML → PDF
    const form2HTML = buildSampleHTML(s, drv);
    const form2Bytes = await htmlToPdfBytes(form2HTML);

    // 3. Build sources array in order
    const sources = [
      { type: 'arraybuffer', data: form1Bytes },
      { type: 'arraybuffer', data: form2Bytes },
      ...ATTACHMENTS_ORDER
        .filter(a => allAttachments[a.key])
        .map(a => ({ type: 'base64', data: allAttachments[a.key].base64 }))
    ];

    // 4. Merge all
    const merged = await mergePDFs(sources);

    // 5. Download
    const name = `${drv.name||'شحنة'}_${s?.declaration_no||''}.pdf`.replace(/\s+/g,'_');
    downloadBytes(merged, name);

    toast('✅ تم تحميل الملف الموحد', 'success');
  } catch(e) {
    console.error(e);
    toast('خطأ في الدمج — تأكد من صحة الملفات', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '📦 دمج وتحميل PDF';
  }
}

// ── DELETE ──
async function confirmDelete(id, declNo) {
  if (!window.confirm(`هل تريد حذف الشحنة رقم ${declNo||id}؟`)) return;
  try {
    await deleteDoc(doc(db, 'shipments', id));
    toast('🗑️ تم حذف الشحنة', 'success');
    await loadShipments();
    window.updateBadges?.();
  } catch(e) { toast('خطأ في الحذف', 'error'); }
}

// ── FORM HTML BUILDERS ──
function buildDeclarationHTML(s, drv) {
  const port = PORTS[s?.port] || PORTS.uae;
  return `
    <div style="font-family:'Tajawal',sans-serif;direction:rtl;padding:20px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1C2D4E;padding-bottom:12px;margin-bottom:0;">
        <div>
          <div style="font-size:13px;font-weight:800;color:#1C2D4E;">شركة عبدالرحمن عبدالعزيز السديس للخدمات اللوجستية</div>
          <div style="font-size:9px;color:#1C2D4E;letter-spacing:0.5px;">ABDULRAHMAN ABDULAZIZ AL-SUDAIS LOGISTICS SERVICES COMPANY</div>
          <div style="font-size:8px;color:#5a7090;margin-top:2px;">سجل تجاري 4030126911 – جدة – حي الجوهرة – C.R 4030126911</div>
        </div>
        <div style="background:#1C2D4E;color:white;padding:8px 14px;border-radius:6px;font-size:12px;font-weight:800;">السديس<br>AL SUDAIS</div>
      </div>
      <div style="background:#1C2D4E;color:white;padding:6px 14px;font-size:11px;font-weight:700;display:flex;justify-content:space-between;">
        <span>Customs Export Declaration</span><span>البيان الجمركي للصادر — ${port.ar}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <tr>
          <td style="border:1px solid #1C2D4E;padding:6px 10px;background:#f4f7fb;font-weight:700;color:#1C2D4E;width:20%;">جمرك</td>
          <td style="border:1px solid #1C2D4E;padding:6px 10px;">${port.ar} — نظام التصدير الآلي</td>
          <td style="border:1px solid #1C2D4E;padding:6px 10px;background:#f4f7fb;font-weight:700;color:#1C2D4E;width:20%;">المخلص</td>
          <td style="border:1px solid #1C2D4E;padding:6px 10px;">شركة عبدالرحمن عبدالعزيز السديس</td>
        </tr>
        <tr>
          <td style="border:1px solid #1C2D4E;padding:6px 10px;background:#f4f7fb;font-weight:700;color:#1C2D4E;">المصدر</td>
          <td style="border:1px solid #1C2D4E;padding:6px 10px;font-weight:700;" colspan="3">${s?.exporter||'—'}</td>
        </tr>
      </table>
      <div style="background:#1C2D4E;color:white;padding:5px 14px;font-size:11px;font-weight:700;">أرقام البيان</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <tr>
          <td style="border:1px solid #1C2D4E;padding:6px 10px;background:#f4f7fb;font-weight:700;color:#1C2D4E;">رقم البيان</td>
          <td style="border:1px solid #1C2D4E;padding:6px 10px;font-weight:800;font-size:15px;text-align:center;">${s?.declaration_no||'—'}</td>
          <td style="border:1px solid #1C2D4E;padding:6px 10px;background:#f4f7fb;font-weight:700;color:#1C2D4E;">الرقم الموحد</td>
          <td style="border:1px solid #1C2D4E;padding:6px 10px;font-weight:800;font-size:15px;text-align:center;">${s?.unified_no||'—'}</td>
          <td style="border:1px solid #1C2D4E;padding:6px 10px;background:#f4f7fb;font-weight:700;color:#1C2D4E;">التاريخ</td>
          <td style="border:1px solid #1C2D4E;padding:6px 10px;font-weight:700;text-align:center;">${s?.date||'—'}</td>
        </tr>
      </table>
      <div style="background:#1C2D4E;color:white;padding:5px 14px;font-size:11px;font-weight:700;">وصف البضاعة</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <tr>
          <td style="border:1px solid #1C2D4E;padding:6px 10px;background:#f4f7fb;font-weight:700;color:#1C2D4E;width:20%;">البضاعة</td>
          <td style="border:1px solid #1C2D4E;padding:6px 10px;font-weight:700;font-size:14px;">${s?.goods_description||'—'}</td>
        </tr>
      </table>
      <div style="background:#1C2D4E;color:white;padding:5px 14px;font-size:11px;font-weight:700;">بيانات الشاحنة والسائق</div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead>
          <tr style="background:#e8edf4;">
            <th style="border:1px solid #1C2D4E;padding:5px;text-align:center;">عدد</th>
            <th style="border:1px solid #1C2D4E;padding:5px;text-align:center;">قيد حركة الشاحنة</th>
            <th style="border:1px solid #1C2D4E;padding:5px;text-align:center;">أرقام اللوحات</th>
            <th style="border:1px solid #1C2D4E;padding:5px;text-align:center;">جنسيتها</th>
            <th style="border:1px solid #1C2D4E;padding:5px;text-align:center;">أسم السائق</th>
            <th style="border:1px solid #1C2D4E;padding:5px;text-align:center;">جنسيته</th>
            <th style="border:1px solid #1C2D4E;padding:5px;text-align:center;">نوع السيارة</th>
            <th style="border:1px solid #1C2D4E;padding:5px;text-align:center;">نوع الناقل</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border:1px solid #1C2D4E;padding:5px;text-align:center;font-weight:700;">1</td>
            <td style="border:1px solid #1C2D4E;padding:5px;text-align:center;">${drv.movement_ref||''}</td>
            <td style="border:1px solid #1C2D4E;padding:5px;text-align:center;font-weight:700;">${drv.plate||'—'}</td>
            <td style="border:1px solid #1C2D4E;padding:5px;text-align:center;">${drv.plate_nationality||'—'}</td>
            <td style="border:1px solid #1C2D4E;padding:5px;font-weight:700;">${drv.name||'—'}</td>
            <td style="border:1px solid #1C2D4E;padding:5px;text-align:center;">${drv.nationality||'—'}</td>
            <td style="border:1px solid #1C2D4E;padding:5px;text-align:center;">${drv.vehicle_type||'—'}</td>
            <td style="border:1px solid #1C2D4E;padding:5px;text-align:center;">${drv.carrier_type||'—'}</td>
          </tr>
          <tr><td style="border:1px solid #1C2D4E;padding:8px;">&nbsp;</td><td style="border:1px solid #1C2D4E;"></td><td style="border:1px solid #1C2D4E;"></td><td style="border:1px solid #1C2D4E;"></td><td style="border:1px solid #1C2D4E;"></td><td style="border:1px solid #1C2D4E;"></td><td style="border:1px solid #1C2D4E;"></td><td style="border:1px solid #1C2D4E;"></td></tr>
        </tbody>
      </table>
      <div style="background:#1C2D4E;color:rgba(255,255,255,0.7);font-size:9px;padding:6px 14px;display:flex;justify-content:space-between;margin-top:0;">
        <span>www.sudais.com.sa | info@sudais.com.sa | 9200 08305</span>
        <span>Jeddah – Al Jawhara – Building 3508 – Unit 14 – Postal 22416</span>
      </div>
    </div>`;
}

function buildSampleHTML(s, drv) {
  const port = PORTS[s?.port] || PORTS.uae;
  return `
    <div style="font-family:'Tajawal',sans-serif;direction:rtl;padding:20px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1C2D4E;padding-bottom:12px;margin-bottom:12px;">
        <div>
          <div style="font-size:13px;font-weight:800;color:#1C2D4E;">شركة عبدالرحمن عبدالعزيز السديس للخدمات اللوجستية</div>
          <div style="font-size:9px;color:#1C2D4E;">ABDULRAHMAN ABDULAZIZ AL-SUDAIS LOGISTICS SERVICES COMPANY</div>
          <div style="font-size:8px;color:#5a7090;margin-top:2px;">سجل تجاري 4030126911 – جدة – حي الجوهرة – C.R 4030126911</div>
        </div>
        <div style="background:#1C2D4E;color:white;padding:8px 14px;border-radius:6px;font-size:12px;font-weight:800;">السديس<br>AL SUDAIS</div>
      </div>
      <div style="font-size:17px;font-weight:800;color:#1C2D4E;text-align:right;border-right:5px solid #1C2D4E;padding-right:10px;margin-bottom:6px;">${port.ar} / الصادرات</div>
      <div style="font-size:14px;font-weight:600;color:#1C2D4E;text-align:right;margin-bottom:14px;padding-right:16px;">( محضر استقطاع عينه ) مشتقات بتروليه (</div>
      <div style="font-size:12px;color:#333;line-height:2;text-align:right;border-right:3px solid #D0DCE8;padding-right:10px;margin-bottom:18px;">
        اشاره الى تعميم معالي مدير عام الجمارك رقم <strong>1004 س/43م هـ</strong> بشأن الاشراف على استخراج عينات المواد بتاريخ <strong>1428-10-08 هـ</strong> البترولية تمهيدا لارسالها الى مختبرات تحليل المنتجات البتروليه
      </div>
      <div style="font-size:14px;color:#1a2535;line-height:3;text-align:right;margin-bottom:32px;">
        <p>انه في <strong>الأربعاء الموافق ${s?.date||'—'} هـ</strong> تم استقطاع عينه من الشاحنه</p>
        <p>رقم اللوحه <strong>${drv.plate||'—'}</strong> بقياده السائق <strong>${drv.name||'—'}</strong> لجنسيه <strong>${drv.nationality||'—'}</strong></p>
        <p>بموجب جواز سفر صادر من <strong>${drv.passport_country||drv.nationality||'—'}</strong></p>
        <p>وبموجب بيان رقم : <strong>${s?.declaration_no||'—'}</strong> بتاريخ <strong>${s?.date||'—'}</strong></p>
        <p>والارساليه باسم المصدر : <strong>${s?.exporter||'—'}</strong> .</p>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;margin-bottom:40px;">
        <div style="text-align:right;padding:0 10px;"><div style="font-size:13px;font-weight:700;color:#1C2D4E;margin-bottom:32px;">اسم السائق / ${drv.name||'—'}</div></div>
        <div style="text-align:center;padding:0 10px;"><div style="font-size:13px;font-weight:700;color:#1C2D4E;margin-bottom:10px;">الختم</div><div style="width:80px;height:80px;border-radius:50%;border:2.5px solid #3a6099;color:#3a6099;font-size:8px;font-weight:700;display:flex;align-items:center;justify-content:center;text-align:center;padding:8px;margin:0 auto;">شركة عبدالرحمن عبدالعزيز السديس للخدمات اللوجستية</div></div>
        <div style="text-align:left;padding:0 10px;"><div style="font-size:13px;font-weight:700;color:#1C2D4E;margin-bottom:32px;">مندوب صاحب الشأن</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;margin-bottom:20px;">
        <div style="text-align:right;padding:0 10px;"><div style="font-size:13px;font-weight:700;color:#1C2D4E;">المعاين المختص</div></div>
        <div style="text-align:center;padding:0 10px;"><div style="font-size:13px;font-weight:700;color:#1C2D4E;">موظف التفتيش المعاكس</div></div>
        <div style="text-align:left;padding:0 10px;"><div style="font-size:13px;font-weight:700;color:#1C2D4E;">موظف الدعم والتشغيل</div></div>
      </div>
      <div style="background:#1C2D4E;color:rgba(255,255,255,0.7);font-size:9px;padding:6px 14px;display:flex;justify-content:space-between;">
        <span>www.sudais.com.sa | info@sudais.com.sa | 9200 08305</span>
        <span>Jeddah – Al Jawhara – Building 3508 – Unit 14 – Postal 22416</span>
      </div>
    </div>`;
}
