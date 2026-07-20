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
  const fmt   = n => parseFloat(n||0).toLocaleString('en-US');
  const typeIcon = PORT_ICONS[q.port_type] || '';
  const dateFormatted = q.date
    ? new Date(q.date).toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' })
    : new Date().toLocaleDateString('en-GB');

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>عرض سعر — ${q.number}</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Tajawal',sans-serif; direction:rtl; background:white; color:#1C2D4E; }
        .page { max-width:720px; margin:0 auto; padding:0; }

        /* Header */
        .header { background:#1C2D4E; padding:22px 28px; display:flex; justify-content:space-between; align-items:center; }
        .co-info .co-name { font-size:16px; font-weight:700; color:white; }
        .co-info .co-name-en { font-size:10px; color:rgba(255,255,255,0.6); margin-top:2px; letter-spacing:.5px; }
        .co-info .co-addr { font-size:9px; color:rgba(255,255,255,0.4); margin-top:4px; }
        .logo-box img { height:56px; object-fit:contain; }

        /* Title bar */
        .title-bar { background:#243859; padding:10px 28px; display:flex; justify-content:space-between; align-items:center; }
        .title-bar .doc-title { font-size:14px; font-weight:700; color:white; letter-spacing:.5px; }
        .title-bar .doc-meta { font-size:12px; color:rgba(255,255,255,0.65); }

        /* Body */
        .body { padding:24px 28px; }

        /* Info grid */
        .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px; }
        .info-box { background:#f8fafc; border-radius:8px; padding:12px 16px; border:0.5px solid #e2e8f0; }
        .info-box .lbl { font-size:10px; color:#5a7090; margin-bottom:3px; }
        .info-box .val { font-size:14px; font-weight:700; color:#1C2D4E; }

        /* Route */
        .route-box { background:#EFF6FF; border:0.5px solid #BFDBFE; border-radius:8px; padding:14px 18px; margin-bottom:20px; }
        .route-box .route-title { font-size:13px; font-weight:700; color:#1D4ED8; margin-bottom:4px; }
        .route-box .route-sub { font-size:11px; color:#3B82F6; }

        /* Table */
        table { width:100%; border-collapse:collapse; margin-bottom:20px; }
        thead tr { background:#1C2D4E; }
        th { padding:11px 16px; text-align:right; color:white; font-size:12px; font-weight:600; }
        td { padding:13px 16px; border-bottom:0.5px solid #e2e8f0; font-size:13px; }
        tr:nth-child(even) td { background:#f8fafc; }
        .bund-name { font-weight:600; color:#1C2D4E; }
        .bund-sub { font-size:10px; color:#5a7090; margin-top:2px; }
        .price-cell { text-align:left; direction:ltr; font-weight:700; font-size:15px; color:#1C2D4E; }
        .total-row td { background:#1C2D4E !important; color:white; font-weight:700; font-size:15px; padding:14px 16px; }
        .total-row .price-cell { color:white; font-size:18px; }

        /* Note */
        .note { background:#FFFBEB; border:0.5px solid #FDE68A; border-radius:8px; padding:10px 14px; margin-bottom:20px; font-size:11px; color:#92400E; text-align:center; font-style:italic; }

        /* Signature */
        .sig-area { display:flex; justify-content:space-between; align-items:flex-end; padding-top:16px; border-top:0.5px solid #e2e8f0; }
        .sig-left .sig-name { font-size:14px; font-weight:700; color:#1C2D4E; }
        .sig-left .sig-role { font-size:11px; color:#5a7090; margin-top:3px; }

        /* Footer */
        .footer { background:#1C2D4E; padding:10px 28px; display:flex; justify-content:space-between; margin-top:24px; }
        .footer span { font-size:9px; color:rgba(255,255,255,0.45); }

        @media print { body { print-color-adjust:exact; -webkit-print-color-adjust:exact; } @page { margin:.5cm; } }
      </style>
    </head>
    <body>
    <div class="page">

      <!-- Header -->
      <div class="header">
        <div class="co-info">
          <div class="co-name">شركة عبدالرحمن عبدالعزيز السديس للخدمات اللوجستية</div>
          <div class="co-name-en">ABDULRAHMAN ABDULAZIZ AL-SUDAIS LOGISTICS SERVICES CO.</div>
          <div class="co-addr">جدة – حي الجوهرة – المملكة العربية السعودية &nbsp;|&nbsp; Jeddah – Al Jawhara – KSA</div>
        </div>
        <div class="logo-box">
          <img src="${LOGO_B64}" alt="Logo">
        </div>
      </div>

      <!-- Title bar -->
      <div class="title-bar">
        <div class="doc-title">Quotation &nbsp;—&nbsp; عرض سعر</div>
        <div class="doc-meta">
          <span style="margin-left:16px;">No. ${q.number}</span>
          <span>Date: ${dateFormatted}</span>
        </div>
      </div>

      <div class="body">

        <!-- Info -->
        <div class="info-grid">
          <div class="info-box">
            <div class="lbl">To / إلى</div>
            <div class="val">${q.customer_name}</div>
          </div>
          <div class="info-box">
            <div class="lbl">Quotation No. / رقم العرض</div>
            <div class="val" style="direction:ltr;">${q.number}</div>
          </div>
        </div>

        <!-- Route -->
        <div class="route-box">
          <div class="route-title">${typeIcon} ${q.port_label_en || q.port_label} → ${q.city}</div>
          <div class="route-sub">
            يشمل هذا العرض التخليص الجمركي والنقل من ${q.port_label} إلى ${q.city}
            &nbsp;|&nbsp;
            This quotation includes customs clearance and transportation from ${q.port_label_en||q.port_label} to ${q.city}
          </div>
        </div>

        <!-- Prices Table -->
        <table>
          <thead>
            <tr>
              <th>Service / البند</th>
              <th style="text-align:left;direction:ltr;">Price / السعر</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div class="bund-name">Customs Clearance</div>
                <div class="bund-sub">التخليص الجمركي</div>
              </td>
              <td class="price-cell">${fmt(q.customs_price)} SAR</td>
            </tr>
            <tr>
              <td>
                <div class="bund-name">Transportation</div>
                <div class="bund-sub">النقل — ${q.port_label} ← ${q.city}</div>
              </td>
              <td class="price-cell">${fmt(q.transport_price)} SAR</td>
            </tr>
            <tr class="total-row">
              <td>Total / الإجمالي</td>
              <td class="price-cell">${fmt(total)} SAR</td>
            </tr>
          </tbody>
        </table>

        ${q.notes ? `<div class="note">${q.notes}</div>` : ''}

        <!-- Thank you note -->
        <div style="text-align:center;font-size:12px;color:#5a7090;margin-bottom:20px;font-style:italic;">
          Thank you for your interest in our company and we hope to gain your satisfaction
          <br>
          <span style="font-size:11px;">شكراً لاهتمامكم بشركتنا ونأمل أن نكون عند حسن ظنكم</span>
        </div>

        <!-- Signature -->
        <div class="sig-area">
          <div class="sig-left">
            <div class="sig-name">${q.employee_name || '—'}</div>
            <div class="sig-role">Customs Clearance Department Manager</div>
            <div class="sig-role" style="margin-top:2px;">مدير قسم التخليص الجمركي</div>
          </div>
          <div style="text-align:left;">
            <div style="font-size:10px;color:#5a7090;margin-bottom:6px;">Authorized Signature / التوقيع المعتمد</div>
            <div style="width:140px;border-bottom:1px solid #1C2D4E;"></div>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="footer">
        <span>License No. 4605 &nbsp;|&nbsp; رقم الترخيص 4605</span>
        <span>9200 08305 &nbsp;|&nbsp; info@sudais.com.sa &nbsp;|&nbsp; www.sudais.com.sa</span>
      </div>

    </div>
    <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `);
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
