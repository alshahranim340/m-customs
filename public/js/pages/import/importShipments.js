import {
  getImportShipments, createImportShipment, updateImportShipment, deleteImportShipment,
  getCustomers, getAgents, IMPORT_PORTS, IMPORT_STATUS
} from '../../../../src/firebase/importDb.js';
import { toast } from '../../app.js';
import { getCurrentProfile } from '../../app.js';

let _shipments = [];
let _customers = [];
let _agents    = [];
let _filter    = 'all';

export async function renderImportShipments(container, params = {}) {
  _filter = params.filter || 'all';

  container.innerHTML = `
    <div class="page-body" style="padding:20px 24px;background:#F5F7FA;">
      <div class="modern-page">
        <!-- Header -->
        <div class="modern-header">
          <div class="modern-header-brand">
            <div class="modern-header-icon"><i class="ti ti-package"></i></div>
            <div>
              <div class="modern-header-title">شحنات الوارد</div>
              <div class="modern-header-sub" id="imp-ship-sub">إدارة الشحنات الواردة</div>
            </div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn modern-btn-primary" id="btn-new-import-shipment">
              <i class="ti ti-plus"></i> شحنة جديدة
            </button>
          </div>
        </div>

        <!-- Search + Filters -->
        <div class="modern-search-bar" style="flex-wrap:wrap;">
          <div class="modern-search-wrap">
            <i class="ti ti-search modern-search-icon"></i>
            <input type="text" id="imp-ship-search" class="modern-search-input"
              placeholder="ابحث برقم البوليصة أو العميل...">
          </div>
        </div>

        <!-- Filter tabs -->
        <div style="padding:0 24px 16px;display:flex;gap:6px;flex-wrap:wrap;">
          ${Object.entries({all:'الكل',...Object.fromEntries(Object.entries(IMPORT_STATUS).map(([k,v])=>[k,v.ar]))})
            .map(([k,v]) => `
              <button data-filter="${k}" onclick="setImportFilter('${k}')"
                style="padding:6px 14px;border-radius:20px;font-family:Tajawal,sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;border:1px solid ${_filter===k?'#1C4B8E':'#E3E8EE'};background:${_filter===k?'#1C4B8E':'white'};color:${_filter===k?'white':'#425466'};">
                ${v}
              </button>`).join('')}
        </div>

        <!-- List -->
        <div id="imp-ship-list" style="padding:0 24px 20px;"><div class="loader"><div class="spinner"></div></div></div>
      </div>
    </div>

    <!-- MODAL -->
    <div id="imp-ship-modal" class="modal-overlay hidden">
      <div class="modal-box" style="max-width:680px;max-height:90vh;overflow-y:auto;">
        <div id="imp-ship-modal-content"></div>
      </div>
    </div>`;

  try {
    [_shipments, _customers, _agents] = await Promise.all([
      getImportShipments(), getCustomers(), getAgents()
    ]);
    _renderList();
  } catch(e) {
    document.getElementById('imp-ship-list').innerHTML =
      `<div class="empty-state"><div class="empty-title">خطأ في التحميل</div></div>`;
  }

  document.getElementById('btn-new-import-shipment').onclick = () => openShipmentModal();
  document.getElementById('imp-ship-search').oninput = (e) => _renderList(e.target.value);

  window.setImportFilter     = setImportFilter;
  window.openShipmentModal   = openShipmentModal;
  window.closeImportShipModal = closeImportShipModal;
  window.saveImportShipment  = saveImportShipment;
  window.editImportShipment  = editImportShipment;
  window.deleteImportShipment = deleteImportShipmentUI;
  window.changeImportStatus  = changeImportStatus;
  window.onImportTypeChange  = onImportTypeChange;

  if (params.action === 'new') openShipmentModal();
  if (params.open) {
    const s = _shipments.find(x => x.id === params.open);
    if (s) openShipmentModal(s);
  }
}

function setImportFilter(f) {
  _filter = f;
  document.querySelectorAll('[data-filter]').forEach(btn => {
    const active = btn.dataset.filter === f;
    btn.style.background = active ? '#1C4B8E' : 'white';
    btn.style.color = active ? 'white' : '#425466';
    btn.style.borderColor = active ? '#1C4B8E' : '#E3E8EE';
  });
  _renderList(document.getElementById('imp-ship-search')?.value || '');
}

function _renderList(search = '') {
  let list = _shipments;
  if (_filter !== 'all') list = list.filter(s => s.status === _filter);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(s =>
      s.bl_number?.toLowerCase().includes(q) ||
      s.customer_name?.toLowerCase().includes(q) ||
      s.internal_no?.toLowerCase().includes(q)
    );
  }

  const el = document.getElementById('imp-ship-list');
  if (!el) return;

  if (list.length === 0) {
    el.innerHTML = `<div style="text-align:center;padding:40px;background:#FAFBFC;border-radius:10px;">
      <div style="font-size:36px;margin-bottom:8px;">📦</div>
      <div style="font-size:14px;font-weight:600;color:#0A2540;">لا توجد شحنات</div>
      <div style="font-size:12px;color:#697386;margin-top:4px;">ابدأ بإضافة شحنة جديدة</div>
    </div>`;
    return;
  }

  const subEl = document.getElementById('imp-ship-sub');
  if (subEl) subEl.textContent = `${_shipments.length} شحنة · ${list.length} معروضة`;

  el.innerHTML = list.map(s => {
    const st = IMPORT_STATUS[s.status] || IMPORT_STATUS.waiting;
    const typeName = s.type === 'air' ? 'جوي' : s.type === 'sea' ? 'بحري' : 'بري';
    const etaDate  = s.eta ? new Date(s.eta) : null;
    const isLate   = etaDate && etaDate < new Date() && s.status !== 'delivered';

    // Badge color
    let badgeClass = 'gray';
    if (st.class === 'pill-done') badgeClass = 'green';
    else if (st.class === 'pill-sent') badgeClass = 'blue';
    else if (st.class === 'pill-replied') badgeClass = 'amber';

    // Icon color
    const iconColor = st.class === 'pill-done' ? 'green' : (isLate ? 'red' : 'blue');
    const iconName = s.type === 'air' ? 'ti-plane' : s.type === 'sea' ? 'ti-ship' : 'ti-truck';

    return `
      <div style="background:white;border:1px solid #E3E8EE;border-radius:10px;padding:14px 16px;margin-bottom:8px;display:grid;grid-template-columns:auto 1fr auto auto auto auto;gap:14px;align-items:center;transition:all 0.15s;" onmouseover="this.style.borderColor='#1C4B8E'" onmouseout="this.style.borderColor='#E3E8EE'">
        <div class="modern-row-icon ${iconColor}"><i class="ti ${iconName}"></i></div>
        <div style="min-width:0;">
          <div style="font-size:13px;font-weight:600;color:#0A2540;">
            ${s.bl_number || '—'}
            <span style="color:#697386;font-weight:400;font-size:12px;">· ${s.internal_no || '—'}</span>
          </div>
          <div style="font-size:11px;color:#697386;margin-top:3px;">
            🏢 ${s.customer_name || '—'} · ${typeName}
          </div>
        </div>
        <div style="font-size:11px;color:${isLate?'#CC2229':'#697386'};font-weight:${isLate?'600':'400'};white-space:nowrap;">
          ${isLate ? '⚠ ' : ''}${_fmtDate(s.eta)}
        </div>
        <select onchange="changeImportStatus('${s.id}',this.value)"
          style="background:${badgeClass==='green'?'#E7F5EE':badgeClass==='blue'?'#E3F0FF':badgeClass==='amber'?'#FFF7ED':'#F0F1F5'};color:${badgeClass==='green'?'#2E8B57':badgeClass==='blue'?'#0055CC':badgeClass==='amber'?'#C2410C':'#425466'};border:none;border-radius:12px;font-family:Tajawal,sans-serif;font-size:11px;font-weight:600;padding:4px 10px;cursor:pointer;">
          ${Object.entries(IMPORT_STATUS).map(([k,v]) =>
            `<option value="${k}" ${s.status===k?'selected':''}>${v.ar}</option>`
          ).join('')}
        </select>
        <div style="display:flex;gap:4px;">
          <button class="modern-icon-btn" title="تعديل" onclick="editImportShipment('${s.id}')">
            <i class="ti ti-edit"></i>
          </button>
          <button class="modern-icon-btn danger" title="حذف" onclick="deleteImportShipment('${s.id}')">
            <i class="ti ti-trash"></i>
          </button>
        </div>
      </div>`;
  }).join('');
}

// ─────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────
function openShipmentModal(shipment = null) {
  const isEdit = !!shipment;
  const s = shipment || {};

  const custOptions = _customers.map(c =>
    `<option value="${c.id}" data-name="${c.company_name}" ${s.customer_id===c.id?'selected':''}>${c.company_name}</option>`
  ).join('');

  const agentOptions = _agents.map(a =>
    `<option value="${a.id}" data-name="${a.name}" ${s.agent_id===a.id?'selected':''}>${a.name}</option>`
  ).join('');

  document.getElementById('imp-ship-modal-content').innerHTML = `
    <div class="modal-title">${isEdit ? '✏️ تعديل شحنة' : '📦 شحنة جديدة'}</div>
    <input type="hidden" id="ims-id" value="${s.id||''}">

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="field">
        <label>رقم البوليصة (BL) *</label>
        <input type="text" id="ims-bl" placeholder="BLKH2026-XXXX" value="${s.bl_number||''}">
      </div>
      <div class="field">
        <label>الرقم الداخلي *</label>
        <input type="text" id="ims-internal" placeholder="IMP-2026-0001" value="${s.internal_no||''}">
      </div>
    </div>

    <div class="field">
      <label>العميل (المستورد) *</label>
      <select id="ims-customer">
        <option value="">— اختر العميل —</option>
        ${custOptions}
      </select>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="field">
        <label>نوع الشحنة *</label>
        <select id="ims-type" onchange="onImportTypeChange(this.value)">
          <option value="">— اختر النوع —</option>
          <option value="sea"  ${s.type==='sea'?'selected':''}>🚢 بحري</option>
          <option value="air"  ${s.type==='air'?'selected':''}>✈️ جوي</option>
          <option value="land" ${s.type==='land'?'selected':''}>🚛 بري</option>
        </select>
      </div>
      <div class="field">
        <label>المنفذ *</label>
        <select id="ims-port">
          <option value="">— اختر النوع أولاً —</option>
          ${s.type ? IMPORT_PORTS[s.type].map(p =>
            `<option value="${p.value}" ${s.port===p.value?'selected':''}>${p.ar}</option>`
          ).join('') : ''}
        </select>
      </div>
    </div>

    <div class="field">
      <label>الوكيل الملاحي</label>
      <select id="ims-agent">
        <option value="">— اختر الوكيل —</option>
        ${agentOptions}
      </select>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="field">
        <label>تاريخ الوصول (ETA) *</label>
        <input type="date" id="ims-eta" value="${s.eta||''}">
      </div>
      <div class="field">
        <label>تاريخ المغادرة (ETD)</label>
        <input type="date" id="ims-etd" value="${s.etd||''}">
      </div>
    </div>

    <!-- Dynamic fields -->
    <div id="ims-dynamic">
      ${s.type ? _buildDynamicFields(s.type, s) : ''}
    </div>

    <div class="field">
      <label>رقم البيان الجمركي</label>
      <input type="text" id="ims-customs-no" value="${s.customs_no||''}">
    </div>

    <div class="field">
      <label>أكواد HS (اختياري — افصل بفاصلة)</label>
      <input type="text" id="ims-hs" placeholder="8471.30, 8528.72" value="${s.hs_codes||''}">
    </div>

    <!-- Attachments -->
    <div style="margin-top:8px;">
      <div style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border);">
        📎 المرفقات
        <span style="font-weight:400;color:var(--muted);font-size:11px;margin-right:6px;">اضغط لاختيار الملف</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        ${[
          {key:'att_invoice',    label:'الفاتورة'},
          {key:'att_bl',        label:'البوليصة'},
          {key:'att_coo',       label:'شهادة المنشأ'},
          {key:'att_saber',     label:'شهادة سابر'},
          {key:'att_customs',   label:'البيان الجمركي'},
          {key:'att_payments',  label:'فواتير المدفوعات', multi:true},
        ].map(a => `
          <div class="field" style="margin:0;">
            <label style="font-size:11px;">${a.label}</label>
            <input type="file" id="${a.key}" accept=".pdf,image/*" ${a.multi?'multiple':''}
              style="font-size:11px;padding:6px;">
          </div>`).join('')}
      </div>
    </div>

    <div id="ims-error" style="display:none;background:var(--red-light);color:var(--red);border-radius:8px;padding:9px 12px;font-size:12px;margin-top:8px;"></div>

    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeImportShipModal()">إلغاء</button>
      <button class="btn btn-primary" id="ims-save-btn" onclick="saveImportShipment()">
        💾 ${isEdit ? 'حفظ التعديلات' : 'إنشاء الشحنة'}
      </button>
    </div>`;

  document.getElementById('imp-ship-modal').classList.remove('hidden');
}

function _buildDynamicFields(type, s = {}) {
  if (type === 'sea') return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="field"><label>اسم السفينة</label>
        <input type="text" id="ims-vessel" value="${s.vessel||''}"></div>
      <div class="field"><label>رقم الشحنة (اختياري)</label>
        <input type="text" id="ims-voyage" value="${s.voyage_no||''}"></div>
      <div class="field"><label>رقم الحاوية</label>
        <input type="text" id="ims-container" placeholder="افصل بفاصلة" value="${s.container_no||''}"></div>
      <div class="field"><label>ميناء الشحن</label>
        <input type="text" id="ims-load-port" value="${s.load_port||''}"></div>
    </div>`;
  if (type === 'air') return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="field"><label>رقم الشحن الجوي (AWB)</label>
        <input type="text" id="ims-awb" value="${s.awb||''}"></div>
      <div class="field"><label>رقم الرحلة</label>
        <input type="text" id="ims-flight" value="${s.flight_no||''}"></div>
    </div>`;
  return ''; // land — no extra fields
}

function onImportTypeChange(type) {
  // Update port options
  const portSel = document.getElementById('ims-port');
  if (portSel && IMPORT_PORTS[type]) {
    portSel.innerHTML = IMPORT_PORTS[type].map(p =>
      `<option value="${p.value}">${p.ar}</option>`
    ).join('');
  } else if (portSel) {
    portSel.innerHTML = '<option value="">— اختر النوع أولاً —</option>';
  }
  // Update dynamic fields
  const dyn = document.getElementById('ims-dynamic');
  if (dyn) dyn.innerHTML = _buildDynamicFields(type);
}

function closeImportShipModal() {
  document.getElementById('imp-ship-modal').classList.add('hidden');
}

async function saveImportShipment() {
  const id         = document.getElementById('ims-id')?.value;
  const bl         = document.getElementById('ims-bl')?.value.trim();
  const internal   = document.getElementById('ims-internal')?.value.trim();
  const custSel    = document.getElementById('ims-customer');
  const customerId = custSel?.value;
  const customerName = custSel?.options[custSel.selectedIndex]?.dataset.name || '';
  const type       = document.getElementById('ims-type')?.value;
  const port       = document.getElementById('ims-port')?.value;
  const eta        = document.getElementById('ims-eta')?.value;
  const agentSel   = document.getElementById('ims-agent');
  const agentId    = agentSel?.value;
  const agentName  = agentSel?.options[agentSel.selectedIndex]?.text || '';
  const errEl      = document.getElementById('ims-error');

  if (!bl || !internal || !customerId || !type || !port || !eta) {
    errEl.textContent = 'يرجى تعبئة جميع الحقول المطلوبة *';
    errEl.style.display = 'block';
    return;
  }

  const btn = document.getElementById('ims-save-btn');
  btn.disabled = true; btn.textContent = '⏳ جاري الحفظ...';
  errEl.style.display = 'none';

  try {
    const profile = getCurrentProfile();
    const data = {
      bl_number:     bl,
      internal_no:   internal,
      customer_id:   customerId,
      customer_name: customerName,
      type,
      port,
      eta,
      etd:           document.getElementById('ims-etd')?.value || '',
      agent_id:      agentId,
      agent_name:    agentName,
      customs_no:    document.getElementById('ims-customs-no')?.value.trim() || '',
      hs_codes:      document.getElementById('ims-hs')?.value.trim() || '',
      employee_id:   profile?.id || '',
      employee_name: profile?.name || '',
      // Type-specific
      vessel:       document.getElementById('ims-vessel')?.value.trim() || '',
      voyage_no:    document.getElementById('ims-voyage')?.value.trim() || '',
      container_no: document.getElementById('ims-container')?.value.trim() || '',
      load_port:    document.getElementById('ims-load-port')?.value.trim() || '',
      awb:          document.getElementById('ims-awb')?.value.trim() || '',
      flight_no:    document.getElementById('ims-flight')?.value.trim() || '',
    };

    if (id) {
      await updateImportShipment(id, data);
      toast('✅ تم تحديث الشحنة', 'success');
    } else {
      await createImportShipment(data);
      toast('✅ تم إنشاء الشحنة', 'success');
    }

    closeImportShipModal();
    _shipments = await getImportShipments();
    _renderList();
  } catch(e) {
    errEl.textContent = 'حدث خطأ، حاول مرة أخرى';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 حفظ';
  }
}

async function editImportShipment(id) {
  const s = _shipments.find(x => x.id === id);
  if (s) openShipmentModal(s);
}

async function deleteImportShipmentUI(id) {
  if (!confirm('هل أنت متأكد من حذف هذه الشحنة؟')) return;
  try {
    await deleteImportShipment(id);
    toast('تم حذف الشحنة', 'error');
    _shipments = await getImportShipments();
    _renderList();
  } catch(e) {
    toast('خطأ في الحذف', 'error');
  }
}

async function changeImportStatus(id, status) {
  try {
    await updateImportShipment(id, { status });
    const s = _shipments.find(x => x.id === id);
    if (s) s.status = status;
    toast(`✅ تم تغيير الحالة إلى ${IMPORT_STATUS[status]?.ar}`, 'success');
  } catch(e) {
    toast('خطأ في تحديث الحالة', 'error');
  }
}

function _fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-SA', { year:'numeric', month:'short', day:'numeric' });
}
