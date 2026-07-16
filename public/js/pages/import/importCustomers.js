import { getCustomers, addCustomer, updateCustomer, deleteCustomer } from '../../../../src/firebase/importDb.js';
import { toast } from '../../app.js';

let _customers = [];

export async function renderImportCustomers(container) {
  container.innerHTML = `
    <div class="topbar">
      <div>
        <div class="topbar-title">👥 قاعدة العملاء</div>
        <div class="topbar-sub">عملاء قسم الوارد</div>
      </div>
      <div class="topbar-actions">
        <button class="btn btn-primary" id="btn-new-customer">
          <i class="ti ti-plus"></i> عميل جديد
        </button>
      </div>
    </div>
    <div class="page-body">
      <div class="card">
        <div class="card-header">
          <div class="card-title">📋 العملاء</div>
          <input type="text" id="cust-search" placeholder="🔍 بحث بالاسم أو السجل..."
            style="padding:7px 12px;border:0.5px solid var(--border);border-radius:8px;font-family:Tajawal,sans-serif;font-size:13px;outline:none;width:220px;">
        </div>
        <div id="cust-list"><div class="loader"><div class="spinner"></div></div></div>
      </div>
    </div>

    <!-- MODAL -->
    <div id="cust-modal" class="modal-overlay hidden">
      <div class="modal-box" style="max-width:520px;">
        <div id="cust-modal-content"></div>
      </div>
    </div>`;

  try {
    _customers = await getCustomers();
    _renderList();
  } catch(e) {
    document.getElementById('cust-list').innerHTML =
      `<div class="empty-state"><div class="empty-title">خطأ في التحميل</div></div>`;
  }

  document.getElementById('btn-new-customer').onclick = () => openCustomerModal();
  document.getElementById('cust-search').oninput = e => _renderList(e.target.value);

  window.openCustomerModal  = openCustomerModal;
  window.closeCustomerModal = closeCustomerModal;
  window.saveCustomer       = saveCustomer;
  window.editCustomer       = editCustomer;
  window.deleteCustomerUI   = deleteCustomerUI;
}

function _renderList(search = '') {
  let list = _customers;
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(c =>
      c.company_name?.toLowerCase().includes(q) ||
      c.cr_number?.toLowerCase().includes(q) ||
      c.vat_number?.toLowerCase().includes(q)
    );
  }

  const el = document.getElementById('cust-list');
  if (!list.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-icon">👥</div>
      <div class="empty-title">لا يوجد عملاء</div>
      <div class="empty-sub">ابدأ بإضافة عميل جديد</div>
    </div>`;
    return;
  }

  el.innerHTML = `
    <div class="ship-list">
      ${list.map(c => `
        <div class="ship-item" style="flex-direction:column;align-items:stretch;padding:14px 18px;gap:8px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:42px;height:42px;border-radius:50%;background:var(--blue);color:white;
              display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;flex-shrink:0;">
              ${c.company_name?.charAt(0)||'؟'}
            </div>
            <div style="flex:1;">
              <div style="font-weight:700;color:var(--navy);font-size:15px;">${c.company_name||'—'}</div>
              <div style="font-size:12px;color:var(--muted);margin-top:3px;">
                📋 ${c.cr_number||'—'} &nbsp;|&nbsp; 🏛️ ${c.vat_number||'—'}
              </div>
            </div>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-sm btn-ghost" onclick="editCustomer('${c.id}')">
                <i class="ti ti-edit"></i>
              </button>
              <button class="btn btn-sm btn-ghost" onclick="deleteCustomerUI('${c.id}')" style="color:var(--red);">
                <i class="ti ti-trash"></i>
              </button>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;background:var(--surface);border-radius:8px;padding:10px 12px;">
            <div><div style="font-size:10px;color:var(--muted);">العنوان الوطني</div><div style="font-size:12px;font-weight:600;">${c.national_address||'—'}</div></div>
            <div><div style="font-size:10px;color:var(--muted);">الجوال</div><div style="font-size:12px;font-weight:600;direction:ltr;">${c.phone||'—'}</div></div>
            <div><div style="font-size:10px;color:var(--muted);">المدينة</div><div style="font-size:12px;font-weight:600;">${c.city||'—'}</div></div>
            <div><div style="font-size:10px;color:var(--muted);">الهوية (صاحب السجل)</div><div style="font-size:12px;font-weight:600;">${c.owner_id||'—'}</div></div>
            <div><div style="font-size:10px;color:var(--muted);">البريد الإلكتروني</div><div style="font-size:12px;font-weight:600;direction:ltr;">${c.email||'—'}</div></div>
            <div><div style="font-size:10px;color:var(--muted);">جهة الاتصال</div><div style="font-size:12px;font-weight:600;">${c.contact_person||'—'}</div></div>
          </div>
          ${c.notes ? `<div style="font-size:12px;color:var(--muted);padding:0 2px;">📝 ${c.notes}</div>` : ''}
        </div>`).join('')}
    </div>`;
}

function openCustomerModal(customer = null) {
  const isEdit = !!customer;
  const c = customer || {};

  document.getElementById('cust-modal-content').innerHTML = `
    <div class="modal-title">${isEdit ? '✏️ تعديل عميل' : '👤 عميل جديد'}</div>
    <input type="hidden" id="cust-id" value="${c.id||''}">

    <div class="field">
      <label>اسم الشركة *</label>
      <input type="text" id="cust-company" value="${c.company_name||''}">
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="field">
        <label>السجل التجاري</label>
        <input type="text" id="cust-cr" value="${c.cr_number||''}">
      </div>
      <div class="field">
        <label>الرقم الضريبي (VAT)</label>
        <input type="text" id="cust-vat" value="${c.vat_number||''}">
      </div>
    </div>

    <div class="field">
      <label>العنوان الوطني</label>
      <input type="text" id="cust-address" value="${c.national_address||''}">
    </div>

    <div class="field">
      <label>هوية صاحب السجل</label>
      <input type="text" id="cust-owner-id" value="${c.owner_id||''}">
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="field">
        <label>جهة الاتصال</label>
        <input type="text" id="cust-contact" value="${c.contact_person||''}">
      </div>
      <div class="field">
        <label>المدينة</label>
        <input type="text" id="cust-city" value="${c.city||''}">
      </div>
      <div class="field">
        <label>الجوال</label>
        <input type="text" id="cust-phone" value="${c.phone||''}" style="direction:ltr;">
      </div>
      <div class="field">
        <label>البريد الإلكتروني</label>
        <input type="email" id="cust-email" value="${c.email||''}" style="direction:ltr;">
      </div>
    </div>

    <div class="field">
      <label>ملاحظات</label>
      <textarea id="cust-notes" rows="2" style="width:100%;padding:9px 12px;border:0.5px solid var(--border);border-radius:8px;font-family:Tajawal,sans-serif;font-size:13px;resize:vertical;outline:none;">${c.notes||''}</textarea>
    </div>

    <div id="cust-error" style="display:none;background:var(--red-light);color:var(--red);border-radius:8px;padding:9px 12px;font-size:12px;"></div>

    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeCustomerModal()">إلغاء</button>
      <button class="btn btn-primary" id="cust-save-btn" onclick="saveCustomer()">💾 حفظ العميل</button>
    </div>`;

  document.getElementById('cust-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('cust-company')?.focus(), 100);
}

function closeCustomerModal() {
  document.getElementById('cust-modal').classList.add('hidden');
}

async function saveCustomer() {
  const id      = document.getElementById('cust-id')?.value;
  const company = document.getElementById('cust-company')?.value.trim();
  const errEl   = document.getElementById('cust-error');
  const btn     = document.getElementById('cust-save-btn');

  if (!company) {
    errEl.textContent = 'اسم الشركة مطلوب';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true; btn.textContent = '⏳ جاري الحفظ...';
  errEl.style.display = 'none';

  const data = {
    company_name:    company,
    cr_number:       document.getElementById('cust-cr')?.value.trim() || '',
    vat_number:      document.getElementById('cust-vat')?.value.trim() || '',
    national_address:document.getElementById('cust-address')?.value.trim() || '',
    owner_id:        document.getElementById('cust-owner-id')?.value.trim() || '',
    contact_person:  document.getElementById('cust-contact')?.value.trim() || '',
    city:            document.getElementById('cust-city')?.value.trim() || '',
    phone:           document.getElementById('cust-phone')?.value.trim() || '',
    email:           document.getElementById('cust-email')?.value.trim() || '',
    notes:           document.getElementById('cust-notes')?.value.trim() || '',
  };

  try {
    if (id) {
      await updateCustomer(id, data);
      toast('✅ تم تحديث العميل', 'success');
    } else {
      await addCustomer(data);
      toast('✅ تم إضافة العميل', 'success');
    }
    closeCustomerModal();
    _customers = await getCustomers();
    _renderList();
  } catch(e) {
    errEl.textContent = 'حدث خطأ، حاول مرة أخرى';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 حفظ العميل';
  }
}

async function editCustomer(id) {
  const c = _customers.find(x => x.id === id);
  if (c) openCustomerModal(c);
}

async function deleteCustomerUI(id) {
  if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return;
  try {
    await deleteCustomer(id);
    toast('تم حذف العميل', 'error');
    _customers = await getCustomers();
    _renderList();
  } catch(e) {
    toast('خطأ في الحذف', 'error');
  }
}
