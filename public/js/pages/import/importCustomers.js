import { getCustomers, addCustomer, updateCustomer, deleteCustomer, getImportShipments } from '../../../../src/firebase/importDb.js';
import { createClientPortal } from '../../../../src/firebase/clientPortal.js';
import { toast } from '../../app.js';

let _customers = [];

export async function renderImportCustomers(container) {
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
              <span class="modern-header-code">SDS/CUSTOMERS/2026</span>
            </div>
            <div class="modern-header-title">قاعدة العملاء</div>
            <div class="modern-header-sub" id="cust-sub">CUSTOMERS · IMPORT · v2.4</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn modern-btn-primary" id="btn-new-customer">
              <i class="ti ti-plus"></i> عميل جديد
            </button>
          </div>
        </div>
        <div class="modern-search-bar">
          <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B6659;letter-spacing:1.5px;font-weight:700;">FIND ›</span>
          <div class="modern-search-wrap">
            <i class="ti ti-search modern-search-icon"></i>
            <input type="text" id="cust-search" class="modern-search-input" placeholder="company name · cr number · vat number">
          </div>
        </div>
        <div id="cust-list" style="padding:12px 24px 20px;"><div class="loader"><div class="spinner"></div></div></div>
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
    el.innerHTML = `<div class="modern-empty">
      <div class="modern-empty-icon">👥</div>
      <div class="modern-empty-title">لا يوجد عملاء</div>
      <div class="modern-empty-sub">EMPTY</div>
    </div>`;
    return;
  }
  const subEl = document.getElementById('cust-sub');
  if (subEl) subEl.textContent = `CUSTOMERS · ${String(_customers.length).padStart(2,'0')} REGISTERED`;

  el.innerHTML = list.map((c, idx) => `
    <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:16px 18px;margin-bottom:8px;">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px;">
        <div style="width:42px;height:42px;background:#0E1A2E;color:white;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;flex-shrink:0;">
          ${c.company_name?.charAt(0)||'؟'}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;font-weight:700;letter-spacing:1px;">CLIENT · ${String(idx+1).padStart(3,'0')}</span>
          </div>
          <div style="font-size:14px;font-weight:700;color:#0E1A2E;margin-top:2px;">${c.company_name||'—'}</div>
          <div class="modern-row-sub">
            → CR/${c.cr_number||'—'} · VAT/${c.vat_number||'—'}
          </div>
        </div>
        <div style="display:flex;gap:4px;">
          <button class="modern-icon-btn" title="تعديل" onclick="editCustomer('${c.id}')"><i class="ti ti-edit"></i></button>
          <button class="modern-icon-btn danger" title="حذف" onclick="deleteCustomerUI('${c.id}')"><i class="ti ti-trash"></i></button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;background:#FAFAF7;border:1px solid #F0EDE4;border-radius:4px;padding:12px 14px;">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">Address</div>
          <div style="font-size:12px;font-weight:600;color:#0E1A2E;margin-top:2px;">${c.national_address||'—'}</div>
        </div>
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">Phone</div>
          <div style="font-size:12px;font-weight:600;color:#0E1A2E;margin-top:2px;direction:ltr;">${c.phone||'—'}</div>
        </div>
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">City</div>
          <div style="font-size:12px;font-weight:600;color:#0E1A2E;margin-top:2px;">${c.city||'—'}</div>
        </div>
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">Owner ID</div>
          <div style="font-size:12px;font-weight:600;color:#0E1A2E;margin-top:2px;">${c.owner_id||'—'}</div>
        </div>
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">Email</div>
          <div style="font-size:12px;font-weight:600;color:#0E1A2E;margin-top:2px;direction:ltr;">${c.email||'—'}</div>
        </div>
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">Contact</div>
          <div style="font-size:12px;font-weight:600;color:#0E1A2E;margin-top:2px;">${c.contact_person||'—'}</div>
        </div>
      </div>
      ${c.notes ? `<div style="font-size:12px;color:#6B6659;padding:10px 4px 0;font-family:'JetBrains Mono',monospace;">→ ${c.notes}</div>` : ''}
    </div>`).join('');
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
      <button class="btn btn-ghost" onclick="closeCustomerModal()">Cancel / إلغاء</button>
      <button class="btn btn-primary" id="cust-save-btn" onclick="saveCustomer()">Save / حفظ</button>
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
    btn.textContent = 'Save / حفظ';
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


/* ══════════════════════════════════════════════
   بوابة العميل — إنشاء ومشاركة
══════════════════════════════════════════════ */
async function openClientPortalForCustomer(customerId) {
  const c   = _customers.find(x => x.id === customerId);
  if (!c) return;

  const btn = document.querySelector(`[data-portal-btn="${customerId}"]`);
  const origHTML = btn?.innerHTML || '';
  if (btn) { btn.innerHTML = '<i class="ti ti-loader"></i>'; btn.disabled = true; }

  try {
    // جلب شحنات العميل
    const all       = await getImportShipments();
    const shipments = all.filter(s => s.customer_id === customerId);

    // إنشاء أو تحديث البوابة
    const token = await createClientPortal(customerId, c, shipments);
    const url   = `${location.origin}/client.html?token=${token}`;

    // تحديث الـ token محلياً
    c.portal_token = token;

    _showPortalModal(url, token, c.company_name, shipments.length);
  } catch(e) {
    console.error('[ClientPortal]', e);
    toast('خطأ في إنشاء البوابة', 'error');
  } finally {
    if (btn) { btn.innerHTML = origHTML; btn.disabled = false; }
  }
}

function _showPortalModal(url, token, customerName, shipmentCount) {
  document.getElementById('portal-modal')?.remove();

  const waMsg = encodeURIComponent(
    `السلام عليكم ${customerName}،

يمكنكم متابعة شحناتكم عبر البوابة الإلكترونية:
${url}

البوابة تُحدَّث تلقائياً مع كل تغيير.

شركة السديس للخدمات اللوجستية`
  );

  const modal = document.createElement('div');
  modal.id = 'portal-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:3000;display:flex;align-items:center;justify-content:center;background:rgba(10,20,40,.65);padding:16px;backdrop-filter:blur(3px);font-family:Tajawal,sans-serif;';
  modal.innerHTML = `
    <div style="background:white;border-radius:16px;width:100%;max-width:440px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.3);">

      <div style="background:linear-gradient(135deg,#0E1A2E,#1C2B48);padding:20px 22px;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#D4B266;letter-spacing:2px;font-weight:800;">CLIENT PORTAL</div>
          <div style="font-size:16px;font-weight:900;color:white;margin-top:3px;">بوابة العميل</div>
        </div>
        <button onclick="document.getElementById('portal-modal').remove()"
          style="background:rgba(255,255,255,.1);border:none;color:white;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:14px;">✕</button>
      </div>

      <div style="padding:22px;">

        <div style="background:#F5F3EC;border-radius:10px;padding:12px 16px;margin-bottom:16px;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:1.5px;font-weight:800;margin-bottom:4px;">CUSTOMER</div>
          <div style="font-size:14px;font-weight:800;color:#0E1A2E;">${customerName}</div>
          <div style="font-size:11px;color:#2E8B57;margin-top:3px;font-weight:700;">✓ ${shipmentCount} shipment${shipmentCount!==1?'s':''} synced</div>
        </div>

        <div style="background:#FAFAF7;border:1.5px solid #E8E5DC;border-radius:10px;padding:11px 14px;margin-bottom:14px;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:1px;font-weight:800;margin-bottom:5px;">🔗 PORTAL URL</div>
          <div style="font-size:11px;color:#1C4B8E;font-family:'JetBrains Mono',monospace;font-weight:600;word-break:break-all;">${url}</div>
        </div>

        <div style="display:flex;gap:10px;">
          <button onclick="_copyPortalUrl('${url}',this)"
            style="flex:1;padding:11px;border:1.5px solid #E8E5DC;border-radius:9px;background:white;font-family:Tajawal,sans-serif;font-size:13px;font-weight:700;cursor:pointer;">
            📋 نسخ الرابط
          </button>
          <a href="https://wa.me/?text=${waMsg}" target="_blank"
            style="flex:1;padding:11px;background:#25D366;color:white;border-radius:9px;font-family:Tajawal,sans-serif;font-size:13px;font-weight:700;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:6px;">
            واتساب
          </a>
        </div>

        <div style="text-align:center;margin-top:10px;font-size:11px;color:#8A8578;">
          البوابة تتحدث تلقائياً مع كل تغيير في الحالة
        </div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target===modal) modal.remove(); });

  // نسخ تلقائي
  navigator.clipboard.writeText(url).catch(()=>{});
}

window._copyPortalUrl = async function(url, btn) {
  await navigator.clipboard.writeText(url);
  btn.textContent = '✅ تم النسخ';
  setTimeout(() => btn.textContent = '📋 نسخ الرابط', 2000);
};
