import {
  getQuotations, createQuotation, updateQuotation, deleteQuotation,
  generateQuotationNumber, QUOTATION_PORTS, QUOTATION_STATUS, KSA_CITIES, PORT_ICONS
} from '../../../src/firebase/quotationsDb.js';
import { getExporters } from '../../../src/firebase/exporters.js';
import { getCurrentProfile } from '../app.js';
import { LOGO_B64 } from '../../../src/utils/assets.js';
import { toast } from '../app.js';

let _quotations = [];
let _customers  = [];

export async function renderQuotations(container) {
  container.innerHTML = `
    <div class="topbar">
      <div>
        <div class="topbar-title">📋 عروض الأسعار</div>
        <div class="topbar-sub">إدارة عروض أسعار التخليص والنقل</div>
      </div>
      <div class="topbar-actions">
        <button class="btn btn-primary" id="btn-new-quotation">
          <i class="ti ti-plus"></i> عرض سعر جديد
        </button>
      </div>
    </div>
    <div class="page-body">
      <div id="quot-stats" class="stats-row"></div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">قائمة العروض</div>
          <input type="text" id="quot-search" placeholder="🔍 بحث بالعميل أو رقم العرض..."
            style="padding:7px 12px;border:0.5px solid var(--border);border-radius:8px;
            font-family:Tajawal,sans-serif;font-size:13px;outline:none;width:220px;">
        </div>
        <div id="quot-list"><div class="loader"><div class="spinner"></div></div></div>
      </div>
    </div>

    <!-- MODAL -->
    <div id="quot-modal" class="modal-overlay hidden">
      <div class="modal-box" style="max-width:580px;max-height:90vh;overflow-y:auto;">
        <div id="quot-modal-content"></div>
      </div>
    </div>`;

  try {
    [_quotations, _customers] = await Promise.all([
      getQuotations(),
      getExporters().catch(() => []),
    ]);
    _renderStats();
    _renderList();
  } catch(e) {
    document.getElementById('quot-list').innerHTML =
      `<div class="empty-state"><div class="empty-title">خطأ في التحميل</div></div>`;
  }

  document.getElementById('btn-new-quotation').onclick = () => openQuotModal();
  document.getElementById('quot-search').oninput = e => _renderList(e.target.value);

  window.openQuotModal    = openQuotModal;
  window.closeQuotModal   = closeQuotModal;
  window.saveQuotation    = saveQuotation;
  window.editQuotation    = editQuotation;
  window.deleteQuotUI     = deleteQuotUI;
  window.changeQuotStatus = changeQuotStatus;
  window.printQuotation   = printQuotation;
  window.onQuotTypeChange = onQuotTypeChange;
}

// ─────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────
function _renderStats() {
  const total    = _quotations.length;
  const pending  = _quotations.filter(q => q.status === 'pending').length;
  const accepted = _quotations.filter(q => q.status === 'accepted').length;
  const rejected = _quotations.filter(q => q.status === 'rejected').length;

  document.getElementById('quot-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon si-blue"><i class="ti ti-file-text" style="font-size:22px;color:var(--blue)"></i></div>
      <div><div class="stat-num">${total}</div><div class="stat-label">إجمالي العروض</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon si-amber"><i class="ti ti-clock" style="font-size:22px;color:var(--amber)"></i></div>
      <div><div class="stat-num">${pending}</div><div class="stat-label">قيد الانتظار</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon si-green"><i class="ti ti-circle-check" style="font-size:22px;color:var(--green)"></i></div>
      <div><div class="stat-num">${accepted}</div><div class="stat-label">مقبول</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon si-red"><i class="ti ti-circle-x" style="font-size:22px;color:var(--red)"></i></div>
      <div><div class="stat-num">${rejected}</div><div class="stat-label">مرفوض</div></div>
    </div>`;
}

// ─────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────
function _renderList(search = '') {
  let list = _quotations;
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(x =>
      x.customer_name?.toLowerCase().includes(q) ||
      x.number?.toLowerCase().includes(q)
    );
  }

  const el = document.getElementById('quot-list');
  if (!list.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📋</div>
      <div class="empty-title">لا توجد عروض أسعار</div>
      <div class="empty-sub">ابدأ بإنشاء أول عرض سعر</div>
    </div>`;
    return;
  }

  el.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:var(--surface);border-bottom:1px solid var(--border);">
          <th style="padding:10px 14px;text-align:right;font-weight:600;color:var(--muted);font-size:12px;">رقم العرض</th>
          <th style="padding:10px 14px;text-align:right;font-weight:600;color:var(--muted);font-size:12px;">العميل</th>
          <th style="padding:10px 14px;text-align:right;font-weight:600;color:var(--muted);font-size:12px;">المنفذ</th>
          <th style="padding:10px 14px;text-align:right;font-weight:600;color:var(--muted);font-size:12px;">المدينة</th>
          <th style="padding:10px 14px;text-align:center;font-weight:600;color:var(--muted);font-size:12px;">تخليص</th>
          <th style="padding:10px 14px;text-align:center;font-weight:600;color:var(--muted);font-size:12px;">نقل</th>
          <th style="padding:10px 14px;text-align:center;font-weight:600;color:var(--muted);font-size:12px;">الحالة</th>
          <th style="padding:10px 14px;text-align:center;font-weight:600;color:var(--muted);font-size:12px;">إجراءات</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(q => {
          const st = QUOTATION_STATUS[q.status] || QUOTATION_STATUS.pending;
          const portLabel = _getPortLabel(q.port_type, q.port);
          return `
          <tr style="border-bottom:0.5px solid var(--border);">
            <td style="padding:11px 14px;font-weight:700;color:var(--navy);font-size:12px;">${q.number||'—'}</td>
            <td style="padding:11px 14px;font-weight:600;">${q.customer_name||'—'}</td>
            <td style="padding:11px 14px;color:var(--muted);">${PORT_ICONS[q.port_type]||''} ${portLabel}</td>
            <td style="padding:11px 14px;color:var(--muted);">${q.city||'—'}</td>
            <td style="padding:11px 14px;text-align:center;font-weight:600;">${q.customs_price ? q.customs_price+' ر.س' : '—'}</td>
            <td style="padding:11px 14px;text-align:center;font-weight:600;">${q.transport_price ? q.transport_price+' ر.س' : '—'}</td>
            <td style="padding:11px 14px;text-align:center;">
              <select onchange="changeQuotStatus('${q.id}',this.value)"
                style="background:${st.bg};color:${st.color};border:none;border-radius:20px;
                font-family:Tajawal,sans-serif;font-size:11px;font-weight:700;padding:3px 8px;cursor:pointer;">
                ${Object.entries(QUOTATION_STATUS).map(([k,v])=>
                  `<option value="${k}" ${q.status===k?'selected':''}>${v.ar}</option>`
                ).join('')}
              </select>
            </td>
            <td style="padding:11px 14px;text-align:center;">
              <div style="display:flex;gap:5px;justify-content:center;">
                <button class="btn btn-sm btn-ghost" onclick="printQuotation('${q.id}')" title="طباعة PDF">
                  <i class="ti ti-printer"></i>
                </button>
                <button class="btn btn-sm btn-ghost" onclick="editQuotation('${q.id}')">
                  <i class="ti ti-edit"></i>
                </button>
                <button class="btn btn-sm btn-ghost" onclick="deleteQuotUI('${q.id}')" style="color:var(--red);">
                  <i class="ti ti-trash"></i>
                </button>
              </div>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

// ─────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────
async function openQuotModal(quotation = null) {
  const isEdit = !!quotation;
  const q = quotation || {};
  const number = isEdit ? q.number : await generateQuotationNumber();

  const custOptions = _customers.map(c =>
    `<option value="${c.name}" ${q.customer_name===c.name?'selected':''}>${c.name}</option>`
  ).join('');

  const cityOptions = KSA_CITIES.map(c =>
    `<option value="${c}" ${q.city===c?'selected':''}>${c}</option>`
  ).join('');

  document.getElementById('quot-modal-content').innerHTML = `
    <div class="modal-title">${isEdit ? '✏️ تعديل عرض سعر' : '📋 عرض سعر جديد'}</div>
    <input type="hidden" id="quot-id" value="${q.id||''}">

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="field">
        <label>رقم العرض</label>
        <input type="text" id="quot-number" value="${number}" readonly
          style="background:var(--surface);color:var(--muted);cursor:default;">
      </div>
      <div class="field">
        <label>التاريخ</label>
        <input type="date" id="quot-date" value="${q.date || new Date().toISOString().split('T')[0]}">
      </div>
    </div>

    <div class="field">
      <label>العميل *</label>
      <select id="quot-customer">
        <option value="">— اختر العميل —</option>
        ${custOptions}
        <option value="__manual__">✏️ كتابة يدوي</option>
      </select>
    </div>
    <div class="field" id="quot-manual-field" style="display:none;">
      <label>اسم العميل (يدوي)</label>
      <input type="text" id="quot-customer-manual" placeholder="اسم الشركة" value="${q.customer_name||''}">
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="field">
        <label>نوع الشحنة *</label>
        <select id="quot-type" onchange="onQuotTypeChange(this.value)">
          <option value="">— اختر النوع —</option>
          <option value="sea"  ${q.port_type==='sea'?'selected':''}>🚢 بحري</option>
          <option value="air"  ${q.port_type==='air'?'selected':''}>✈️ جوي</option>
          <option value="land" ${q.port_type==='land'?'selected':''}>🚛 بري</option>
        </select>
      </div>
      <div class="field">
        <label>المنفذ *</label>
        <select id="quot-port">
          <option value="">— اختر النوع أولاً —</option>
          ${q.port_type ? QUOTATION_PORTS[q.port_type].map(p =>
            `<option value="${p.value}" ${q.port===p.value?'selected':''}>${p.ar}</option>`
          ).join('') : ''}
        </select>
      </div>
    </div>

    <div class="field">
      <label>مدينة التوصيل *</label>
      <select id="quot-city">
        <option value="">— اختر المدينة —</option>
        ${cityOptions}
      </select>
    </div>

    <div style="background:var(--surface);border-radius:8px;padding:14px;margin-bottom:12px;">
      <div style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:12px;border-bottom:1px solid var(--border);padding-bottom:6px;">
        💰 الأسعار
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="field" style="margin:0;">
          <label>Customs Clearance (ر.س) *</label>
          <input type="number" id="quot-customs" placeholder="300" value="${q.customs_price||''}">
        </div>
        <div class="field" style="margin:0;">
          <label>Transportation (ر.س) *</label>
          <input type="number" id="quot-transport" placeholder="750" value="${q.transport_price||''}">
        </div>
      </div>
    </div>

    <div class="field">
      <label>ملاحظات</label>
      <textarea id="quot-notes" rows="2" style="width:100%;padding:9px 12px;border:0.5px solid var(--border);
        border-radius:8px;font-family:Tajawal,sans-serif;font-size:13px;resize:vertical;outline:none;"
        placeholder="أي ملاحظات إضافية...">${q.notes||''}</textarea>
    </div>

    <div id="quot-error" style="display:none;background:var(--red-light);color:var(--red);
      border-radius:8px;padding:9px 12px;font-size:12px;margin-top:4px;"></div>

    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeQuotModal()">إلغاء</button>
      <button class="btn btn-primary" id="quot-save-btn" onclick="saveQuotation()">
        💾 ${isEdit ? 'حفظ التعديلات' : 'إنشاء العرض'}
      </button>
    </div>`;

  // Handle manual customer
  document.getElementById('quot-customer').onchange = function() {
    const manual = document.getElementById('quot-manual-field');
    manual.style.display = this.value === '__manual__' ? 'block' : 'none';
  };
  if (q.customer_name && !_customers.find(c => (c.name||c.id) === q.customer_name)) {
    document.getElementById('quot-customer').value = '__manual__';
    document.getElementById('quot-manual-field').style.display = 'block';
  }

  document.getElementById('quot-modal').classList.remove('hidden');
}

function onQuotTypeChange(type) {
  const portSel = document.getElementById('quot-port');
  if (QUOTATION_PORTS[type]) {
    portSel.innerHTML = QUOTATION_PORTS[type].map(p =>
      `<option value="${p.value}">${p.ar}</option>`
    ).join('');
  } else {
    portSel.innerHTML = '<option value="">— اختر النوع أولاً —</option>';
  }
}

function closeQuotModal() {
  document.getElementById('quot-modal').classList.add('hidden');
}

async function saveQuotation() {
  const id       = document.getElementById('quot-id')?.value;
  const number   = document.getElementById('quot-number')?.value;
  const date     = document.getElementById('quot-date')?.value;
  const custSel  = document.getElementById('quot-customer');
  const portType = document.getElementById('quot-type')?.value;
  const port     = document.getElementById('quot-port')?.value;
  const city     = document.getElementById('quot-city')?.value;
  const customs  = document.getElementById('quot-customs')?.value;
  const transport= document.getElementById('quot-transport')?.value;
  const notes    = document.getElementById('quot-notes')?.value;
  const errEl    = document.getElementById('quot-error');
  const btn      = document.getElementById('quot-save-btn');

  let customerName = custSel?.value === '__manual__'
    ? document.getElementById('quot-customer-manual')?.value.trim()
    : custSel?.value;

  if (!customerName || !portType || !port || !city || !customs || !transport) {
    errEl.textContent = 'يرجى تعبئة جميع الحقول المطلوبة *';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true; btn.textContent = '⏳ جاري الحفظ...';
  errEl.style.display = 'none';

  const profile = getCurrentProfile();
  const portLabel = _getPortLabel(portType, port);
  const portLabelEn = _getPortLabelEn(portType, port);

  const data = {
    number, date, customer_name: customerName,
    port_type: portType, port, port_label: portLabel, port_label_en: portLabelEn,
    city, customs_price: parseFloat(customs), transport_price: parseFloat(transport),
    total: parseFloat(customs) + parseFloat(transport),
    notes: notes || '',
    employee_name: profile?.name || '—',
    employee_role: profile?.role || '—',
  };

  try {
    if (id) {
      await updateQuotation(id, data);
      toast('✅ تم تحديث العرض', 'success');
    } else {
      await createQuotation(data);
      toast('✅ تم إنشاء العرض', 'success');
    }
    closeQuotModal();
    _quotations = await getQuotations();
    _renderStats();
    _renderList();
  } catch(e) {
    errEl.textContent = 'حدث خطأ، حاول مرة أخرى';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 حفظ';
  }
}

async function editQuotation(id) {
  const q = _quotations.find(x => x.id === id);
  if (q) openQuotModal(q);
}

async function deleteQuotUI(id) {
  if (!confirm('هل أنت متأكد من حذف هذا العرض؟')) return;
  try {
    await deleteQuotation(id);
    toast('تم حذف العرض', 'error');
    _quotations = await getQuotations();
    _renderStats();
    _renderList();
  } catch(e) { toast('خطأ في الحذف', 'error'); }
}

async function changeQuotStatus(id, status) {
  try {
    await updateQuotation(id, { status });
    const q = _quotations.find(x => x.id === id);
    if (q) q.status = status;
    _renderStats();
    toast(`✅ تم تغيير الحالة إلى ${QUOTATION_STATUS[status]?.ar}`, 'success');
  } catch(e) { toast('خطأ في التحديث', 'error'); }
}

// ─────────────────────────────────────────────
// PRINT PDF
// ─────────────────────────────────────────────
function printQuotation(id) {
  const q = _quotations.find(x => x.id === id);
  if (!q) return;

  const total = (parseFloat(q.customs_price)||0) + (parseFloat(q.transport_price)||0);
  const fmt   = n => parseFloat(n||0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
  const typeIcon = PORT_ICONS[q.port_type] || '';
  const dateFormatted = q.date
    ? new Date(q.date).toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' })
    : new Date().toLocaleDateString('en-GB');

  // Short quotation number: QT-26-0001
  const shortNum = q.number || 'QT-26-0001';

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Quotation — ${shortNum}</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Tajawal',Arial,sans-serif; background:white; color:#1a1a1a; font-size:12px; line-height:1.5; }
        .page { max-width:740px; margin:0 auto; }

        .header { display:flex; justify-content:space-between; align-items:center; padding:18px 24px; border-bottom:3px solid #1C4B8E; }
        .logo-area { display:flex; align-items:center; gap:14px; }
        .logo-box { width:60px; height:60px; object-fit:contain; }
        .co-name { font-size:15px; font-weight:800; color:#1C4B8E; letter-spacing:.3px; }
        .co-sub  { font-size:11px; color:#2E8B57; font-weight:600; margin-top:2px; }
        .co-addr { font-size:10px; color:#999; margin-top:2px; }
        .quot-no-area { text-align:right; }
        .quot-no-lbl  { font-size:10px; color:#999; letter-spacing:.5px; text-transform:uppercase; }
        .quot-no-val  { font-size:22px; font-weight:800; color:#CC2229; margin-top:2px; }

        .title-bar { background:#1C4B8E; padding:8px 24px; display:flex; justify-content:space-between; align-items:center; }
        .title-bar .t { color:white; font-size:13px; font-weight:700; letter-spacing:2px; }
        .title-bar .d { color:rgba(255,255,255,.65); font-size:11px; }

        .info-row { display:grid; border-bottom:0.5px solid #e0e0e0; }
        .info-row.cols3 { grid-template-columns:1fr 1fr 1fr; }
        .info-row.cols2 { grid-template-columns:1fr 1fr; }
        .info-cell { padding:10px 16px; border-right:0.5px solid #e0e0e0; }
        .info-cell:last-child { border-right:none; }
        .info-lbl { font-size:9px; font-weight:700; color:#1C4B8E; letter-spacing:.5px; text-transform:uppercase; margin-bottom:3px; }
        .info-lbl.red { color:#CC2229; }
        .info-val { font-size:12px; font-weight:700; }
        .info-val.red { color:#CC2229; }

        table { width:100%; border-collapse:collapse; }
        thead tr { background:#1C4B8E; }
        th { padding:9px 16px; color:white; font-size:10px; font-weight:700; letter-spacing:.3px; text-transform:uppercase; }
        th.left { text-align:left; }
        th.right { text-align:right; }
        td { padding:11px 16px; border-bottom:0.5px solid #ebebeb; font-size:12px; vertical-align:top; }
        tr.alt td { background:#f9fafb; }
        .sn { font-size:12px; font-weight:700; color:#CC2229; width:32px; }
        .svc-name { font-size:12px; font-weight:700; color:#1a1a1a; }
        .svc-sub  { font-size:10px; color:#888; margin-top:2px; }
        .amt { text-align:right; font-size:13px; font-weight:700; }
        .net-row td { border-top:0.5px solid #ddd; font-size:11px; color:#555; font-weight:600; }
        .net-row .amt { font-size:12px; font-weight:700; color:#1a1a1a; }
        .grand-row td { background:#1C4B8E; color:white; font-size:12px; font-weight:700; padding:10px 16px; border:none; }
        .grand-row .amt { font-size:16px; font-weight:800; color:white; }

        .notes-section { border-top:2px solid #2E8B57; padding:12px 18px; background:#fafffe; }
        .notes-title { font-size:10px; font-weight:800; color:#1C4B8E; letter-spacing:.3px; margin-bottom:8px; }
        .notes-en { font-size:10px; color:#333; line-height:1.75; margin-bottom:8px; }
        .notes-ar { font-size:10px; color:#333; line-height:1.75; direction:rtl; text-align:right; }

        .sig-area { border-top:0.5px solid #ddd; padding:12px 24px; display:flex; justify-content:space-between; align-items:flex-end; }
        .sig-name { font-size:12px; font-weight:700; color:#1C4B8E; }
        .sig-role { font-size:10px; color:#666; margin-top:2px; }
        .sig-line { margin-top:14px; width:120px; border-top:0.5px solid #aaa; padding-top:3px; }
        .sig-line-lbl { font-size:9px; color:#999; }
        .contact { text-align:right; font-size:10px; color:#666; line-height:1.7; }
        .contact .lic { font-size:10px; font-weight:700; color:#1C4B8E; margin-bottom:3px; }

        .footer { background:#1C4B8E; padding:7px 24px; display:flex; justify-content:space-between; align-items:center; }
        .footer span { font-size:9px; color:rgba(255,255,255,.55); }
        .footer-dots { display:flex; gap:5px; }
        .dot { width:7px; height:7px; border-radius:50%; }

        @media print {
          body { print-color-adjust:exact; -webkit-print-color-adjust:exact; }
          @page { margin:.5cm; size:A4; }
        }
      </style>
    </head>
    <body>
    <div class="page">

      <!-- Header -->
      <div class="header">
        <div class="logo-area">
          <img src="${LOGO_B64}" class="logo-box" alt="Al Sudais Logo">
          <div>
            <div class="co-name">AL SUDAIS</div>
            <div class="co-sub">Logistics Services Co.</div>
            <div class="co-addr">Abdulrahman Abdulaziz Al-Sudais &nbsp;|&nbsp; Jeddah – Al Jawhara – KSA</div>
          </div>
        </div>
        <div class="quot-no-area">
          <div class="quot-no-lbl">Quotation No.</div>
          <div class="quot-no-val">${shortNum}</div>
        </div>
      </div>

      <!-- Title bar -->
      <div class="title-bar">
        <div class="t">QUOTATION</div>
        <div class="d">Date: ${dateFormatted}</div>
      </div>

      <!-- Info row 1 -->
      <div class="info-row cols3">
        <div class="info-cell">
          <div class="info-lbl">Client Name</div>
          <div class="info-val">${q.customer_name}</div>
        </div>
        <div class="info-cell">
          <div class="info-lbl">Quotation Date</div>
          <div class="info-val">${dateFormatted}</div>
        </div>
        <div class="info-cell">
          <div class="info-lbl red">Quotation No.</div>
          <div class="info-val red">${shortNum}</div>
        </div>
      </div>

      <!-- Info row 2 -->
      <div class="info-row cols2" style="border-bottom:1px solid #ddd;margin-bottom:0;">
        <div class="info-cell">
          <div class="info-lbl">Port / Entry Point</div>
          <div class="info-val">${typeIcon} ${q.port_label_en || q.port_label}</div>
        </div>
        <div class="info-cell">
          <div class="info-lbl">Delivery City</div>
          <div class="info-val">${q.city}</div>
        </div>
      </div>

      <!-- Services Table -->
      <table style="margin-top:0;">
        <thead>
          <tr>
            <th class="left" style="width:36px;">SN</th>
            <th class="left">Description</th>
            <th class="right">Amount (SAR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="sn">1</td>
            <td>
              <div class="svc-name">Customs Clearance</div>
              <div class="svc-sub">Import customs processing & documentation — ${q.port_label_en || q.port_label}</div>
            </td>
            <td class="amt">${fmt(q.customs_price)}</td>
          </tr>
          <tr class="alt">
            <td class="sn">2</td>
            <td>
              <div class="svc-name">Transportation</div>
              <div class="svc-sub">Door delivery: ${q.port_label_en || q.port_label} → ${q.city}</div>
            </td>
            <td class="amt">${fmt(q.transport_price)}</td>
          </tr>
          <tr class="net-row">
            <td colspan="2" style="text-align:right;padding-right:16px;">Net Total / الإجمالي</td>
            <td class="amt">${fmt(total)}</td>
          </tr>
          <tr class="grand-row">
            <td colspan="2" style="text-align:right;padding-right:16px;">★ Grand Total / الإجمالي الكلي</td>
            <td class="amt">${fmt(total)} SAR</td>
          </tr>
        </tbody>
      </table>

      <!-- Notes -->
      <div class="notes-section">
        <div class="notes-title">Terms, Conditions & Notes / الشروط والملاحظات</div>
        <div class="notes-en">
          • An additional fee of <strong>SAR 150</strong> applies per extra container in the same shipment.<br>
          • Storage fees (if applicable):<br>
          &nbsp;&nbsp;— 40ft container: <strong>SAR 150</strong> for the first 10 days, then <strong>SAR 60/day</strong> thereafter.<br>
          &nbsp;&nbsp;— 20ft container: <strong>SAR 100</strong> for the first 10 days, then <strong>SAR 50/day</strong> thereafter.
        </div>
        <div class="notes-ar">
          • يتم احتساب <strong>150 ريال سعودي</strong> لكل حاوية إضافية في نفس الشحنة<br>
          • في حال احتاجت الشحنة إلى ساحة تخزين:<br>
          &nbsp;&nbsp;— حاوية 40 قدم: <strong>150 ريال</strong> لأول 10 أيام، ثم <strong>60 ريال/يوم</strong><br>
          &nbsp;&nbsp;— حاوية 20 قدم: <strong>100 ريال</strong> لأول 10 أيام، ثم <strong>50 ريال/يوم</strong>
        </div>
      </div>

      <!-- Signature -->
      <div class="sig-area">
        <div>
          <div class="sig-name">${q.employee_name || '—'}</div>
          <div class="sig-role">Customs Clearance Department Manager</div>
          <div class="sig-role">مدير قسم التخليص الجمركي</div>
          <div class="sig-line"><div class="sig-line-lbl">Authorized Signature / التوقيع المعتمد</div></div>
        </div>
        <div class="contact">
          <div class="lic">License No. 4605 &nbsp;|&nbsp; رقم الترخيص 4605</div>
          <div>9200 08305</div>
          <div>info@sudais.com.sa</div>
          <div>www.sudais.com.sa</div>
          <div>Jeddah – Al Jawhara District – KSA</div>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <span>AL SUDAIS Logistics Services Co.</span>
        <div class="footer-dots">
          <div class="dot" style="background:#CC2229;"></div>
          <div class="dot" style="background:rgba(255,255,255,.4);"></div>
          <div class="dot" style="background:#2E8B57;"></div>
        </div>
        <span>Page 1 / 1</span>
      </div>

    </div>
    <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `);
  win.document.close();
}

  win.document.close();
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function _getPortLabel(type, value) {
  if (!type || !value) return '—';
  return QUOTATION_PORTS[type]?.find(p => p.value === value)?.ar || value;
}

function _getPortLabelEn(type, value) {
  if (!type || !value) return '—';
  return QUOTATION_PORTS[type]?.find(p => p.value === value)?.en || value;
}
