import {
  getQuotations, createQuotation, updateQuotation, deleteQuotation,
  generateQuotationNumber, QUOTATION_PORTS, QUOTATION_STATUS, KSA_CITIES, PORT_ICONS
} from '../../../src/firebase/quotationsDb.js';
import { getExporters } from '../../../src/firebase/exporters.js';
import { getCustomers as getImportCustomers } from '../../../src/firebase/importDb.js';

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
        <button class="btn btn-ghost" id="btn-quot-report" onclick="openQuotReport()">
          <i class="ti ti-chart-bar"></i> تقرير العروض
        </button>
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
    const [quotRes, exportRes, importRes] = await Promise.all([
      getQuotations(),
      getExporters().catch(() => []),
      getImportCustomers().catch(() => []),
    ]);
    _quotations = quotRes;
    // Merge exporters (have .name) and import customers (have .company_name)
    // exporters: name field OR id (which is name with underscores)
    const exportList = exportRes.map(c => ({
      id: c.id,
      display: c.name || c.id?.replace(/_/g, ' ')
    }));
    // import customers: company_name field
    const importList = importRes.map(c => ({
      id: c.id,
      display: c.company_name || c.name || ''
    }));
    _customers = [...exportList, ...importList].filter(c => c.display && c.display !== 'undefined');
    _renderStats();
    _renderList();
  } catch(e) {
    document.getElementById('quot-list').innerHTML =
      `<div class="empty-state"><div class="empty-title">خطأ في التحميل</div></div>`;
  }

  document.getElementById('btn-new-quotation').onclick = () => openQuotModal();
  document.getElementById('quot-search').oninput = e => _renderList(e.target.value);

  window.openQuotModal    = openQuotModal;
  window.addCityRow       = addCityRow;
  window.removeCityRow    = removeCityRow;
  window.openQuotReport   = openQuotReport;
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
            <td style="padding:11px 14px;color:var(--muted);font-size:11px;">
            \${(q.transport_rows||[{city:q.city}]).map(r=>r.city).join('، ')||'—'}
          </td>
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
    `<option value="${c.display}" ${q.customer_name===c.display?'selected':''}>${c.display}</option>`
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

    <div style="background:var(--surface);border-radius:8px;padding:14px;margin-bottom:12px;">
      <div style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:10px;border-bottom:1px solid var(--border);padding-bottom:6px;">
        💰 الأسعار
      </div>
      <div class="field" style="margin-bottom:12px;">
        <label>Customs Clearance (ر.س) *</label>
        <input type="number" id="quot-customs" placeholder="300" value="${q.customs_price||''}">
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--navy);margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
        <span>🚛 Transportation — مدن التوصيل</span>
        <button type="button" class="btn btn-sm btn-ghost" onclick="addCityRow()" style="font-size:11px;">
          <i class="ti ti-plus"></i> إضافة مدينة
        </button>
      </div>
      <div id="quot-cities">
        ${(q.transport_rows && q.transport_rows.length > 0
          ? q.transport_rows
          : [{ city: q.city||'', price: q.transport_price||'' }]
        ).map((r,i) => `
          <div class="city-row" data-idx="${i}" style="display:grid;grid-template-columns:1fr 120px 36px;gap:8px;margin-bottom:8px;align-items:center;">
            <select class="city-sel" style="padding:8px;border:0.5px solid var(--border);border-radius:8px;font-family:Tajawal,sans-serif;font-size:13px;">
              <option value="">— المدينة —</option>
              ${KSA_CITIES.map(c => `<option value="${c}" ${r.city===c?'selected':''}>${c}</option>`).join('')}
            </select>
            <input type="number" class="city-price" placeholder="السعر" value="${r.price||''}"
              style="padding:8px;border:0.5px solid var(--border);border-radius:8px;font-family:Tajawal,sans-serif;font-size:13px;text-align:center;">
            <button type="button" onclick="removeCityRow(${i})"
              style="background:var(--red-light);color:var(--red);border:none;border-radius:8px;width:36px;height:36px;cursor:pointer;font-size:16px;">×</button>
          </div>`).join('')}
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
  if (q.customer_name && !_customers.find(c => c.display === q.customer_name)) {
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

function addCityRow() {
  const rows  = document.getElementById('quot-cities');
  const i     = rows.querySelectorAll('.city-row').length;
  const cityOpts = KSA_CITIES.map(c => `<option value="${c}">${c}</option>`).join('');
  const div = document.createElement('div');
  div.className = 'city-row';
  div.dataset.idx = i;
  div.style.cssText = 'display:grid;grid-template-columns:1fr 120px 36px;gap:8px;margin-bottom:8px;align-items:center;';
  div.innerHTML = `
    <select class="city-sel" style="padding:8px;border:0.5px solid var(--border);border-radius:8px;font-family:Tajawal,sans-serif;font-size:13px;">
      <option value="">— المدينة —</option>
      ${cityOpts}
    </select>
    <input type="number" class="city-price" placeholder="السعر"
      style="padding:8px;border:0.5px solid var(--border);border-radius:8px;font-family:Tajawal,sans-serif;font-size:13px;text-align:center;">
    <button type="button" onclick="removeCityRow(${i})"
      style="background:var(--red-light);color:var(--red);border:none;border-radius:8px;width:36px;height:36px;cursor:pointer;font-size:16px;">×</button>`;
  rows.appendChild(div);
}

function removeCityRow(i) {
  const row = document.querySelector(`.city-row[data-idx="${i}"]`);
  if (row && document.querySelectorAll('.city-row').length > 1) row.remove();
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
  const customs  = document.getElementById('quot-customs')?.value;
  const notes    = document.getElementById('quot-notes')?.value;
  const errEl    = document.getElementById('quot-error');
  const btn      = document.getElementById('quot-save-btn');

  // Collect transport rows
  const transportRows = [];
  document.querySelectorAll('.city-row').forEach(row => {
    const city  = row.querySelector('.city-sel')?.value;
    const price = row.querySelector('.city-price')?.value;
    if (city && price) transportRows.push({ city, price: parseFloat(price) });
  });

  let customerName = custSel?.value === '__manual__'
    ? document.getElementById('quot-customer-manual')?.value.trim()
    : custSel?.value;

  if (!customerName || !portType || !port || !customs || transportRows.length === 0) {
    errEl.textContent = 'يرجى تعبئة جميع الحقول وإضافة مدينة توصيل واحدة على الأقل *';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true; btn.textContent = '⏳ جاري الحفظ...';
  errEl.style.display = 'none';

  const profile = getCurrentProfile();
  const portLabel = _getPortLabel(portType, port);
  const portLabelEn = _getPortLabelEn(portType, port);

  const transportTotal = transportRows.reduce((s, r) => s + r.price, 0);
  const data = {
    number, date, customer_name: customerName,
    port_type: portType, port, port_label: portLabel, port_label_en: portLabelEn,
    city: transportRows[0]?.city || '',
    transport_rows: transportRows,
    customs_price: parseFloat(customs),
    transport_price: transportTotal,
    total: parseFloat(customs) + transportTotal,
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
function printQuotation(id, lang = null) {
  const q = _quotations.find(x => x.id === id);
  if (!q) return;

  // If no language chosen, show picker
  if (!lang) {
    _showLangPicker(id);
    return;
  }

  const total = (parseFloat(q.customs_price)||0) + (parseFloat(q.transport_price)||0);
  const fmt   = n => parseFloat(n||0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
  const typeIcon = q.port_type === 'air' ? '✈' : q.port_type === 'sea' ? '🚢' : '🚛';
  const dateFormatted = q.date
    ? new Date(q.date).toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' })
    : new Date().toLocaleDateString('en-GB');
  const shortNum = q.number || 'QT-26-0001';
  const isAr = lang === 'ar';

  // Labels
  const L = isAr ? {
    dir:'rtl', align:'right', alignOpp:'left',
    title:'عرض سعر',
    quotNo:'رقم العرض',
    date:'التاريخ',
    client:'اسم العميل',
    quotDate:'تاريخ العرض',
    port:'المنفذ / نقطة الدخول',
    city:'مدينة التوصيل',
    sn:'م',
    desc:'الوصف',
    amount:'المبلغ (ر.س)',
    customs:'التخليص الجمركي',
    customsSub:'معالجة وتوثيق التخليص الجمركي للاستيراد',
    transport:'النقل',
    transportSub:'توصيل من',
    net:'الإجمالي',
    grand:'★ الإجمالي الكلي / Grand Total',
    notesTitle:'الشروط والملاحظات',
    note1:'يتم احتساب <strong>150 ريال سعودي</strong> لكل حاوية إضافية في نفس الشحنة.',
    note2:'في حال احتاجت الشحنة إلى ساحة تخزين:',
    note3:'— حاوية 40 قدم: <strong>150 ريال</strong> لأول 10 أيام، ثم <strong>60 ريال/يوم</strong> بعدها.',
    note4:'— حاوية 20 قدم: <strong>100 ريال</strong> لأول 10 أيام، ثم <strong>50 ريال/يوم</strong> بعدها.',
    manager:'مدير قسم التخليص الجمركي',
    sig:'التوقيع المعتمد',
    lic:'رقم الترخيص 4605',
    coName:'شركة السديس للخدمات اللوجستية',
    coSub:'عبدالرحمن عبدالعزيز السديس',
    coAddr:'جدة – حي الجوهرة – المملكة العربية السعودية',
    quot:'عرض سعر',
    page:'صفحة 1 / 1',
    portVal: q.port_label || q.port,
  } : {
    dir:'ltr', align:'left', alignOpp:'right',
    title:'QUOTATION',
    quotNo:'QUOTATION NO.',
    date:'Date',
    client:'CLIENT NAME',
    quotDate:'QUOTATION DATE',
    port:'PORT / ENTRY POINT',
    city:'DELIVERY CITY',
    sn:'SN',
    desc:'DESCRIPTION',
    amount:'AMOUNT (SAR)',
    customs:'Customs Clearance',
    customsSub:'Import customs processing & documentation',
    transport:'Transportation',
    transportSub:'Door delivery:',
    net:'Net Total / الإجمالي',
    grand:'★ Grand Total / الإجمالي الكلي',
    notesTitle:'Terms, Conditions & Notes / الشروط والملاحظات',
    note1:'An additional fee of <strong>SAR 150</strong> applies per extra container in the same shipment.',
    note2:'Storage fees (if applicable):',
    note3:'— 40ft container: <strong>SAR 150</strong> for the first 10 days, then <strong>SAR 60/day</strong> thereafter.',
    note4:'— 20ft container: <strong>SAR 100</strong> for the first 10 days, then <strong>SAR 50/day</strong> thereafter.',
    manager:'Customs Clearance Department Manager',
    sig:'Authorized Signature / التوقيع المعتمد',
    lic:'License No. 4605 | رقم الترخيص 4605',
    coName:'AL SUDAIS Logistics Services Co.',
    coSub:'Abdulrahman Abdulaziz Al-Sudais',
    coAddr:'Jeddah – Al Jawhara District – KSA',
    quot:'Quotation',
    page:'Page 1 / 1',
    portVal: q.port_label_en || q.port_label || q.port,
  };

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html lang="${isAr ? 'ar' : 'en'}" dir="${L.dir}">
    <head>
      <meta charset="UTF-8">
      <title>${L.quot} — ${shortNum}</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Tajawal',Arial,sans-serif; background:white; color:#1a1a1a; font-size:12px; line-height:1.5; direction:${L.dir}; }
        .page { max-width:740px; margin:0 auto; }
        .header { display:flex; justify-content:space-between; align-items:center; padding:18px 24px; border-bottom:3px solid #1C4B8E; }
        .logo-area { display:flex; align-items:center; gap:14px; }
        .logo-box { width:58px; height:58px; object-fit:contain; }
        .co-name { font-size:15px; font-weight:800; color:#1C4B8E; }
        .co-sub  { font-size:11px; color:#2E8B57; font-weight:600; margin-top:2px; }
        .co-addr { font-size:10px; color:#999; margin-top:2px; }
        .quot-no-area { text-align:${L.alignOpp}; }
        .quot-no-lbl { font-size:10px; color:#999; letter-spacing:.5px; text-transform:uppercase; }
        .quot-no-val { font-size:22px; font-weight:800; color:#1C4B8E; margin-top:2px; }
        .title-bar { background:#1C4B8E; padding:8px 24px; display:flex; justify-content:space-between; align-items:center; }
        .title-t { color:white; font-size:13px; font-weight:700; letter-spacing:2px; }
        .title-d { color:rgba(255,255,255,.65); font-size:11px; }
        .info-row { display:grid; border-bottom:0.5px solid #e0e0e0; }
        .cols3 { grid-template-columns:1fr 1fr 1fr; }
        .cols2 { grid-template-columns:1fr 1fr; }
        .info-cell { padding:10px 16px; border-${isAr?'left':'right'}:0.5px solid #e0e0e0; }
        .info-cell:last-child { border:none; }
        .info-lbl { font-size:9px; font-weight:700; color:#1C4B8E; letter-spacing:.5px; text-transform:uppercase; margin-bottom:3px; }
        .info-val { font-size:12px; font-weight:700; }
        table { width:100%; border-collapse:collapse; }
        thead tr { background:#1C4B8E; }
        th { padding:9px 16px; color:white; font-size:10px; font-weight:700; letter-spacing:.3px; text-transform:uppercase; text-align:${L.align}; }
        th.r { text-align:${L.alignOpp}; }
        td { padding:11px 16px; border-bottom:0.5px solid #ebebeb; font-size:12px; vertical-align:top; }
        tr.alt td { background:#f9fafb; }
        .sn { font-size:12px; font-weight:700; color:#CC2229; width:36px; }
        .svc-name { font-size:12px; font-weight:700; }
        .svc-sub  { font-size:10px; color:#888; margin-top:2px; }
        .amt { text-align:${L.alignOpp}; font-size:13px; font-weight:700; }
        .net-row td { border-top:0.5px solid #ddd; font-size:11px; color:#555; font-weight:600; }
        .net-amt { text-align:${L.alignOpp}; font-size:12px; font-weight:700; }
        .grand-row td { background:#1C4B8E; color:white; font-size:12px; font-weight:700; padding:10px 16px; border:none; }
        .grand-amt { text-align:${L.alignOpp}; font-size:16px; font-weight:800; color:white; }
        .notes-section { border-top:2px solid #2E8B57; padding:13px 18px; background:#fafffe; }
        .notes-title { font-size:10px; font-weight:800; color:#1C4B8E; margin-bottom:9px; }
        .notes-body { font-size:10px; color:#333; line-height:1.85; }
        .sig-area { border-top:0.5px solid #ddd; padding:13px 24px; display:flex; justify-content:space-between; align-items:flex-end; }
        .sig-name { font-size:12px; font-weight:700; color:#1C4B8E; }
        .sig-role { font-size:10px; color:#666; margin-top:2px; }
        .sig-line { margin-top:14px; width:120px; border-top:0.5px solid #aaa; padding-top:3px; font-size:9px; color:#999; }
        .contact { text-align:${L.alignOpp}; font-size:10px; color:#666; line-height:1.75; }
        .contact .lic { font-size:10px; font-weight:700; color:#1C4B8E; margin-bottom:3px; }
        .footer { background:#1C4B8E; padding:7px 24px; display:flex; justify-content:space-between; align-items:center; }
        .footer span { font-size:9px; color:rgba(255,255,255,.55); }
        .footer-dots { display:flex; gap:5px; }
        .dot { width:7px; height:7px; border-radius:50%; }
        @media print { body{print-color-adjust:exact;-webkit-print-color-adjust:exact;} @page{margin:.5cm;size:A4;} }
      </style>
    </head>
    <body>
    <div class="page">

      <div class="header">
        <div class="logo-area">
          <img src="${LOGO_B64}" class="logo-box" alt="Logo">
          <div>
            <div class="co-name">${L.coName}</div>
            <div class="co-sub">${L.coSub}</div>
            <div class="co-addr">${L.coAddr}</div>
          </div>
        </div>
        <div class="quot-no-area">
          <div class="quot-no-lbl">${L.quotNo}</div>
          <div class="quot-no-val">${shortNum}</div>
        </div>
      </div>

      <div class="title-bar">
        <div class="title-t">${L.title}</div>
        <div class="title-d">${L.date}: ${dateFormatted}</div>
      </div>

      <div class="info-row cols2">
        <div class="info-cell">
          <div class="info-lbl">${L.client}</div>
          <div class="info-val">${q.customer_name}</div>
        </div>
        <div class="info-cell">
          <div class="info-lbl">${L.quotDate}</div>
          <div class="info-val">${dateFormatted}</div>
        </div>
      </div>
      <div class="info-row cols2" style="border-bottom:1px solid #ddd;">
        <div class="info-cell">
          <div class="info-lbl">${L.port}</div>
          <div class="info-val">${typeIcon} ${L.portVal}</div>
        </div>
        <div class="info-cell">
          <div class="info-lbl">${L.city}</div>
          <div class="info-val">${q.city}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:36px;">${L.sn}</th>
            <th>${L.desc}</th>
            <th class="r">${L.amount}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="sn">1</td>
            <td>
              <div class="svc-name">${L.customs}</div>
              <div class="svc-sub">${L.customsSub} — ${L.portVal}</div>
            </td>
            <td class="amt">${fmt(q.customs_price)}</td>
          </tr>
          <tr class="alt">
            <td class="sn">2</td>
            <td>
              <div class="svc-name">${L.transport}</div>
              <div class="svc-sub">${L.transportSub} ${L.portVal} → ${q.city}</div>
            </td>
            <td class="amt">${fmt(q.transport_price)}</td>
          </tr>
          <tr class="net-row">
            <td colspan="2" style="text-align:${L.alignOpp};padding-${L.alignOpp}:16px;">${L.net}</td>
            <td class="net-amt">${fmt(total)}</td>
          </tr>
          <tr class="grand-row">
            <td colspan="2" style="text-align:${L.alignOpp};padding-${L.alignOpp}:16px;">${L.grand}</td>
            <td class="grand-amt">${fmt(total)} SAR</td>
          </tr>
        </tbody>
      </table>

      <div class="notes-section">
        <div class="notes-title">${L.notesTitle}</div>
        <div class="notes-body">
          • ${L.note1}<br>
          • ${L.note2}<br>
          &nbsp;&nbsp;${L.note3}<br>
          &nbsp;&nbsp;${L.note4}
        </div>
      </div>

      <div class="sig-area">
        <div>
          <div class="sig-name">${q.employee_name || '—'}</div>
          <div class="sig-role">${L.manager}</div>
          <div class="sig-line">${L.sig}</div>
        </div>
        <div class="contact">
          <div class="lic">${L.lic}</div>
          <div>9200 08305</div>
          <div>info@sudais.com.sa</div>
          <div>www.sudais.com.sa</div>
        </div>
      </div>

      <div class="footer">
        <span>${L.coName}</span>
        <div class="footer-dots">
          <div class="dot" style="background:#CC2229;"></div>
          <div class="dot" style="background:rgba(255,255,255,.4);"></div>
          <div class="dot" style="background:#2E8B57;"></div>
        </div>
        <span>${L.page}</span>
      </div>

    </div>
    <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `);
  win.document.close();
}

function _showLangPicker(id) {
  const existing = document.getElementById('lang-picker-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'lang-picker-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  modal.innerHTML = `
    <div style="background:white;border-radius:12px;padding:28px 32px;width:320px;text-align:center;font-family:Tajawal,sans-serif;">
      <div style="font-size:16px;font-weight:700;color:#1C4B8E;margin-bottom:6px;">اختر لغة الطباعة</div>
      <div style="font-size:13px;color:#888;margin-bottom:20px;">Choose print language</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <button onclick="printQuotation('${id}','en');document.getElementById('lang-picker-modal').remove();"
          style="padding:14px;border:1.5px solid #1C4B8E;border-radius:8px;background:white;cursor:pointer;font-family:Tajawal,sans-serif;font-size:13px;font-weight:700;color:#1C4B8E;transition:all .2s;"
          onmouseover="this.style.background='#1C4B8E';this.style.color='white'"
          onmouseout="this.style.background='white';this.style.color='#1C4B8E'">
          🇬🇧 English
        </button>
        <button onclick="printQuotation('${id}','ar');document.getElementById('lang-picker-modal').remove();"
          style="padding:14px;border:1.5px solid #2E8B57;border-radius:8px;background:white;cursor:pointer;font-family:Tajawal,sans-serif;font-size:13px;font-weight:700;color:#2E8B57;transition:all .2s;"
          onmouseover="this.style.background='#2E8B57';this.style.color='white'"
          onmouseout="this.style.background='white';this.style.color='#2E8B57'">
          🇸🇦 عربي
        </button>
      </div>
      <button onclick="document.getElementById('lang-picker-modal').remove();"
        style="margin-top:14px;background:none;border:none;color:#aaa;font-size:12px;cursor:pointer;font-family:Tajawal,sans-serif;">
        إلغاء / Cancel
      </button>
    </div>`;
  document.body.appendChild(modal);
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

// ─────────────────────────────────────────────
// QUOTATION REPORT
// ─────────────────────────────────────────────
function openQuotReport() {
  const existing = document.getElementById('quot-report-modal');
  if (existing) existing.remove();

  const currentYear  = new Date().getFullYear();
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

  const modal = document.createElement('div');
  modal.id = 'quot-report-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:460px;">
      <div class="modal-title">📊 تقرير عروض الأسعار</div>

      <div class="field">
        <label>نوع التقرير</label>
        <select id="rpt-period">
          <option value="all">جميع العروض</option>
          <option value="year">سنوي</option>
          <option value="month">شهري</option>
        </select>
      </div>

      <div id="rpt-year-field" class="field" style="display:none;">
        <label>السنة</label>
        <select id="rpt-year">
          ${[currentYear, currentYear-1, currentYear-2].map(y =>
            `<option value="${y}">${y}</option>`).join('')}
        </select>
      </div>

      <div id="rpt-month-field" style="display:none;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field">
            <label>السنة</label>
            <select id="rpt-month-year">
              ${[currentYear, currentYear-1].map(y =>
                `<option value="${y}">${y}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>الشهر</label>
            <select id="rpt-month">
              ${months.map((m,i) =>
                `<option value="${i}" ${i===new Date().getMonth()?'selected':''}>${m}</option>`
              ).join('')}
            </select>
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="document.getElementById('quot-report-modal').remove()">إلغاء</button>
        <button class="btn btn-primary" onclick="printQuotReport()">
          <i class="ti ti-printer"></i> طباعة التقرير
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  document.getElementById('rpt-period').onchange = function() {
    document.getElementById('rpt-year-field').style.display  = this.value === 'year'  ? 'block' : 'none';
    document.getElementById('rpt-month-field').style.display = this.value === 'month' ? 'block' : 'none';
  };

  window.printQuotReport = printQuotReport;
}

function printQuotReport() {
  const period   = document.getElementById('rpt-period')?.value || 'all';
  const year     = parseInt(document.getElementById('rpt-year')?.value || new Date().getFullYear());
  const monthYear= parseInt(document.getElementById('rpt-month-year')?.value || new Date().getFullYear());
  const month    = parseInt(document.getElementById('rpt-month')?.value ?? new Date().getMonth());

  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const monthsAr= ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

  // Filter quotations
  let list = [..._quotations];
  let periodLabel = 'جميع العروض';

  if (period === 'year') {
    list = list.filter(q => q.date?.startsWith(year.toString()));
    periodLabel = `سنة ${year}`;
  } else if (period === 'month') {
    list = list.filter(q => {
      if (!q.date) return false;
      const d = new Date(q.date);
      return d.getFullYear() === monthYear && d.getMonth() === month;
    });
    periodLabel = `${monthsAr[month]} ${monthYear}`;
  }

  if (list.length === 0) { toast('لا توجد بيانات لهذه الفترة', 'error'); return; }

  document.getElementById('quot-report-modal')?.remove();

  const fmt = n => parseFloat(n||0).toLocaleString('en-US', { minimumFractionDigits:2 });

  const total    = list.length;
  const accepted = list.filter(q => q.status === 'accepted');
  const pending  = list.filter(q => q.status === 'pending');
  const rejected = list.filter(q => q.status === 'rejected');

  const totalAmt    = list.reduce((s,q) => s + (q.total||0), 0);
  const acceptedAmt = accepted.reduce((s,q) => s + (q.total||0), 0);
  const pendingAmt  = pending.reduce((s,q) => s + (q.total||0), 0);
  const rejectedAmt = rejected.reduce((s,q) => s + (q.total||0), 0);

  const acceptRate = total > 0 ? Math.round((accepted.length / total) * 100) : 0;

  // Group by month if yearly
  let monthlyBreakdown = '';
  if (period === 'year') {
    const byMonth = {};
    list.forEach(q => {
      if (!q.date) return;
      const m = new Date(q.date).getMonth();
      if (!byMonth[m]) byMonth[m] = { count:0, accepted:0, total:0 };
      byMonth[m].count++;
      if (q.status === 'accepted') byMonth[m].accepted++;
      byMonth[m].total += q.total || 0;
    });
    monthlyBreakdown = `
      <div style="margin-bottom:20px;">
        <div style="font-size:13px;font-weight:700;color:#1C4B8E;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e0e0e0;">
          التوزيع الشهري — Monthly Breakdown
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="background:#1C4B8E;color:white;">
            <th style="padding:8px 12px;text-align:right;">الشهر</th>
            <th style="padding:8px 12px;text-align:center;">العروض</th>
            <th style="padding:8px 12px;text-align:center;">مقبول</th>
            <th style="padding:8px 12px;text-align:right;">الإجمالي (ر.س)</th>
          </tr></thead>
          <tbody>
            ${Object.entries(byMonth).sort((a,b)=>a[0]-b[0]).map(([m,d]) => `
              <tr style="border-bottom:0.5px solid #e8e8e8;">
                <td style="padding:8px 12px;">${monthsAr[m]}</td>
                <td style="padding:8px 12px;text-align:center;">${d.count}</td>
                <td style="padding:8px 12px;text-align:center;color:#2E8B57;font-weight:600;">${d.accepted}</td>
                <td style="padding:8px 12px;text-align:right;font-weight:600;">${fmt(d.total)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  const now = new Date().toLocaleDateString('ar-SA', { year:'numeric', month:'long', day:'numeric' });

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>تقرير عروض الأسعار</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Tajawal',sans-serif; direction:rtl; color:#1a1a1a; padding:28px; background:white; }
        .header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:14px; border-bottom:3px solid #1C4B8E; margin-bottom:20px; }
        .co-name { font-size:15px; font-weight:800; color:#1C4B8E; }
        .co-sub  { font-size:11px; color:#2E8B57; font-weight:600; margin-top:2px; }
        .report-title { font-size:20px; font-weight:800; text-align:center; color:#1C4B8E; margin-bottom:4px; }
        .report-period { text-align:center; font-size:13px; color:#666; margin-bottom:20px; }
        .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px; }
        .stat { border:1px solid #e0e0e0; border-radius:8px; padding:14px; text-align:center; }
        .stat-num { font-size:24px; font-weight:800; }
        .stat-lbl { font-size:11px; color:#666; margin-top:3px; }
        .finance { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:20px; }
        .fin-card { border-radius:8px; padding:14px; text-align:center; }
        .fin-num { font-size:20px; font-weight:800; }
        .fin-lbl { font-size:11px; margin-top:3px; }
        .section-title { font-size:13px; font-weight:800; color:#1C4B8E; margin:18px 0 8px; padding-bottom:5px; border-bottom:1px solid #e0e0e0; }
        table { width:100%; border-collapse:collapse; font-size:12px; margin-bottom:16px; }
        thead tr { background:#1C4B8E; color:white; }
        th { padding:8px 12px; text-align:right; font-weight:600; }
        td { padding:9px 12px; border-bottom:0.5px solid #ebebeb; }
        tr:nth-child(even) td { background:#f9f9f9; }
        .pill { display:inline-block; padding:2px 10px; border-radius:12px; font-size:11px; font-weight:700; }
        .p-acc { background:#dcfce7; color:#166534; }
        .p-pen { background:#fef3c7; color:#92400e; }
        .p-rej { background:#fee2e2; color:#b91c1c; }
        .footer { margin-top:24px; text-align:center; font-size:11px; color:#999; border-top:1px solid #e0e0e0; padding-top:10px; }
        @media print { body{padding:16px;} @page{margin:.5cm;} }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="co-name">شركة عبدالرحمن عبدالعزيز السديس للخدمات اللوجستية</div>
          <div class="co-sub">AL SUDAIS Logistics Services Co.</div>
        </div>
        <div style="text-align:left;font-size:11px;color:#666;">
          <div>تاريخ التقرير</div>
          <div style="font-weight:700;margin-top:2px;">${now}</div>
        </div>
      </div>

      <div class="report-title">📋 تقرير عروض الأسعار</div>
      <div class="report-period">الفترة: ${periodLabel}</div>

      <!-- Stats -->
      <div class="stats">
        <div class="stat">
          <div class="stat-num" style="color:#1C4B8E;">${total}</div>
          <div class="stat-lbl">إجمالي العروض</div>
        </div>
        <div class="stat">
          <div class="stat-num" style="color:#2E8B57;">${accepted.length}</div>
          <div class="stat-lbl">مقبول</div>
        </div>
        <div class="stat">
          <div class="stat-num" style="color:#92400e;">${pending.length}</div>
          <div class="stat-lbl">قيد الانتظار</div>
        </div>
        <div class="stat">
          <div class="stat-num" style="color:#b91c1c;">${rejected.length}</div>
          <div class="stat-lbl">مرفوض</div>
        </div>
      </div>

      <!-- Finance -->
      <div class="finance">
        <div class="fin-card" style="background:#EFF6FF;">
          <div class="fin-num" style="color:#1C4B8E;">${fmt(totalAmt)}</div>
          <div class="fin-lbl" style="color:#1C4B8E;">إجمالي العروض (ر.س)</div>
        </div>
        <div class="fin-card" style="background:#f0fdf4;">
          <div class="fin-num" style="color:#2E8B57;">${fmt(acceptedAmt)}</div>
          <div class="fin-lbl" style="color:#2E8B57;">قيمة الموافقات (ر.س)</div>
        </div>
        <div class="fin-card" style="background:#f9fafb;border:1px solid #e0e0e0;">
          <div class="fin-num" style="color:#1C4B8E;">${acceptRate}%</div>
          <div class="fin-lbl" style="color:#666;">نسبة القبول</div>
        </div>
      </div>

      ${monthlyBreakdown}

      <!-- Detail table -->
      <div class="section-title">📋 تفاصيل العروض</div>
      <table>
        <thead><tr>
          <th>رقم العرض</th>
          <th>العميل</th>
          <th>المنفذ</th>
          <th>التاريخ</th>
          <th style="text-align:center;">الحالة</th>
          <th style="text-align:left;">الإجمالي (ر.س)</th>
        </tr></thead>
        <tbody>
          ${list.map(q => `
            <tr>
              <td style="font-weight:700;color:#1C4B8E;">${q.number||'—'}</td>
              <td>${q.customer_name||'—'}</td>
              <td style="font-size:11px;color:#666;">${q.port_label||'—'}</td>
              <td style="font-size:11px;">${q.date||'—'}</td>
              <td style="text-align:center;">
                <span class="pill ${q.status==='accepted'?'p-acc':q.status==='rejected'?'p-rej':'p-pen'}">
                  ${q.status==='accepted'?'مقبول':q.status==='rejected'?'مرفوض':'قيد الانتظار'}
                </span>
              </td>
              <td style="text-align:left;font-weight:700;">${fmt(q.total||0)}</td>
            </tr>`).join('')}
        </tbody>
      </table>

      <div class="footer">
        M-Customs — نظام التخليص الجمركي &nbsp;|&nbsp; شركة السديس للخدمات اللوجستية
      </div>
      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `);
  win.document.close();
}
