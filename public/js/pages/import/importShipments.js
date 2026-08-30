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

/* ══════════════════════════════════════════════════════
   RENDER MAIN PAGE
══════════════════════════════════════════════════════ */
export async function renderImportShipments(container, params = {}) {
  _filter = params.filter || 'all';

  container.innerHTML = `
    <div style="padding:20px 24px;background:#F5F3EC;min-height:100vh;font-family:'Tajawal',sans-serif;" class="imp-page">

      <!-- HEADER -->
      <div style="background:linear-gradient(135deg,#0E1A2E 0%,#1C2B48 100%);color:white;
                  padding:20px 26px;border-radius:12px;margin-bottom:16px;
                  display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:2px;color:#D4B266;font-weight:700;">
            SDS / IMPORT / 2026
          </div>
          <div style="font-size:22px;font-weight:900;margin-top:4px;">📦 شحنات الوارد</div>
          <div id="imp-sub" style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:3px;
                font-family:'JetBrains Mono',monospace;letter-spacing:0.5px;">
            IMPORT SHIPMENTS · LOADING...
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button onclick="exportImportReport()"
            style="background:rgba(212,178,102,0.15);color:#D4B266;border:1px solid rgba(212,178,102,0.4);
            padding:9px 16px;border-radius:8px;font-family:'Tajawal',sans-serif;font-size:12px;font-weight:700;cursor:pointer;">
            📊 تصدير التقرير
          </button>
          <button id="btn-new-import"
            style="background:#D4B266;color:#0E1A2E;border:none;padding:9px 18px;border-radius:8px;
            font-family:'Tajawal',sans-serif;font-size:13px;font-weight:800;cursor:pointer;">
            + شحنة جديدة
          </button>
        </div>
      </div>

      <!-- STATS -->
      <div id="imp-stats" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;"></div>

      <!-- SEARCH + FILTER -->
      <div style="background:white;border-radius:10px;border:1px solid #E8E5DC;padding:12px 16px;
                  margin-bottom:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <input type="text" id="imp-search"
          placeholder="🔍  bl number · customer · job no"
          style="flex:1;min-width:200px;border:1.5px solid #E8E5DC;border-radius:8px;
                 padding:8px 12px;font-family:'Tajawal',sans-serif;font-size:13px;outline:none;
                 background:#FAFAF7;">
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${Object.entries({all:'الكل',...Object.fromEntries(Object.entries(IMPORT_STATUS).map(([k,v])=>[k,v.ar]))})
            .map(([k,v]) => `
              <button data-filter="${k}" onclick="setImportFilter('${k}')"
                style="padding:7px 14px;border-radius:6px;font-family:Tajawal,sans-serif;font-size:11px;
                font-weight:700;cursor:pointer;transition:all .15s;letter-spacing:.3px;
                border:1.5px solid ${_filter===k?'#1C4B8E':'#E8E5DC'};
                background:${_filter===k?'#1C4B8E':'white'};
                color:${_filter===k?'white':'#4A4540'};">
                ${v}
              </button>`).join('')}
        </div>
      </div>

      <!-- LIST -->
      <div id="imp-list"><div style="text-align:center;padding:48px;color:#8A8578;">
        <div style="width:32px;height:32px;border:3px solid rgba(28,75,142,0.15);border-top-color:#1C4B8E;
          border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 12px;"></div>
        جاري التحميل...
      </div></div>

    </div>

    <!-- MODAL -->
    <div id="imp-modal" class="modal-overlay hidden">
      <div class="modal-box" style="max-width:760px;max-height:95vh;overflow-y:auto;padding:0;">
        <div id="imp-modal-body"></div>
      </div>
    </div>

    <!-- REPORT OVERLAY -->
    <div id="imp-report-overlay" style="display:none;position:fixed;inset:0;z-index:2000;
      background:#F2F5F9;overflow:auto;">
      <div id="imp-report-content"></div>
    </div>

    <style>
      @keyframes spin { to { transform:rotate(360deg); } }

      /* ── كرت الشحنة ── */
      .imp-card {
        background:white;border-radius:12px;border:1px solid #E8E5DC;
        overflow:hidden;margin-bottom:10px;
        box-shadow:0 1px 4px rgba(0,0,0,0.04);
        transition:box-shadow .2s,transform .2s;
      }
      .imp-card:hover { box-shadow:0 4px 16px rgba(28,75,142,0.1); }

      .imp-card-stripe { width:4px;flex-shrink:0;border-radius:0; }
      .imp-card-stripe.green  { background:#2E8B57; }
      .imp-card-stripe.blue   { background:#1C4B8E; }
      .imp-card-stripe.amber  { background:#C8943A; }
      .imp-card-stripe.gray   { background:#9CA3AF; }
      .imp-card-stripe.red    { background:#CC2229; }

      .imp-card-top {
        display:flex;align-items:stretch;gap:0;cursor:pointer;
      }
      .imp-card-main {
        flex:1;padding:14px 16px;display:grid;
        grid-template-columns:120px 1fr auto;gap:6px 14px;align-items:start;
      }
      .imp-card-job {
        font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:900;
        color:#1C4B8E;letter-spacing:.5px;
      }
      .imp-card-bl {
        font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B6659;
        margin-top:2px;letter-spacing:.3px;
      }
      .imp-card-customer {
        font-size:15px;font-weight:800;color:#0E1A2E;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      }
      .imp-card-consignee {
        font-size:12px;color:#6B6659;margin-top:2px;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      }
      .imp-card-meta {
        font-size:11px;color:#8A8578;display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;
        font-family:'JetBrains Mono',monospace;letter-spacing:.3px;
      }
      .imp-tag {
        background:#F0EDE4;color:#4A4540;padding:2px 7px;border-radius:4px;
        font-size:9px;font-weight:900;letter-spacing:.5px;
        font-family:'JetBrains Mono',monospace;
      }

      /* الـ select للحالة */
      .imp-status-sel {
        border:none;padding:5px 10px;border-radius:20px;font-family:'Tajawal',sans-serif;
        font-size:11px;font-weight:700;cursor:pointer;outline:none;
        font-family:'JetBrains Mono',monospace;
      }
      .imp-status-sel.green { background:#E7F5EE;color:#1a7a50; }
      .imp-status-sel.blue  { background:#EEF2FF;color:#1C4B8E; }
      .imp-status-sel.amber { background:#FEF3E2;color:#C8943A; }
      .imp-status-sel.gray  { background:#F3F4F6;color:#4B5563; }

      /* تسليم / تفاصيل */
      .imp-delivery-panel {
        border-top:1px solid #F5F3EC;padding:12px 16px 14px 16px;
        background:#FAFAF7;display:none;
      }
      .imp-delivery-panel.open { display:block; }
      .imp-delivery-grid {
        display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px 16px;
        margin-bottom:12px;
      }
      .imp-del-item label {
        font-size:9px;font-weight:800;color:#8A8578;letter-spacing:1px;
        font-family:'JetBrains Mono',monospace;display:block;margin-bottom:3px;
      }
      .imp-del-item span {
        font-size:12px;color:#0E1A2E;font-weight:600;
      }
      .imp-del-item span.empty { color:#C4B9A8;font-style:italic; }

      /* أزرار الإجراءات */
      .imp-actions {
        display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding-top:8px;
        border-top:1px solid #F0EDE4;
      }
      .imp-btn {
        padding:7px 14px;border-radius:7px;border:none;
        font-family:'Tajawal',sans-serif;font-size:12px;font-weight:700;cursor:pointer;
        display:flex;align-items:center;gap:5px;transition:all .15s;
      }
      .imp-btn.ghost { background:#F5F3EC;color:#4A4540; }
      .imp-btn.ghost:hover { background:#E8E5DC; }
      .imp-btn.primary { background:#1C4B8E;color:white; }
      .imp-btn.primary:hover { background:#163B6E; }
      .imp-btn.danger { background:#FEEBEB;color:#CC2229; }
      .imp-btn.danger:hover { background:#FDD;  }
      .imp-btn.gold { background:#D4B266;color:#0E1A2E; }
      .imp-btn.gold:hover { background:#C8A84E; }

      /* التقرير */
      #imp-report-overlay table {
        border-collapse:collapse;width:100%;
        font-family:'Tajawal',sans-serif;font-size:11px;
      }
      #imp-report-overlay th {
        background:#1C4B8E;color:white;padding:7px 10px;
        font-family:'JetBrains Mono',monospace;font-size:9px;
        font-weight:900;letter-spacing:.5px;white-space:nowrap;
        border:1px solid #163B6E;
      }
      #imp-report-overlay th.delivery-h { background:#2E8B57; }
      #imp-report-overlay th.group-h {
        background:#0E1A2E;font-size:10px;letter-spacing:2px;
        text-align:center;padding:8px 10px;
      }
      #imp-report-overlay td {
        padding:6px 10px;border:1px solid #E8E5DC;
        white-space:nowrap;color:#0E1A2E;
        font-size:11px;
      }
      #imp-report-overlay tr:nth-child(even) td { background:#FAFAF7; }
      #imp-report-overlay tr:hover td { background:#EEF2FF; }
    </style>`;

  try {
    [_shipments, _customers, _agents] = await Promise.all([
      getImportShipments(), getCustomers(), getAgents()
    ]);
    _updateStats();
    _renderList();
  } catch(e) {
    document.getElementById('imp-list').innerHTML =
      `<div style="text-align:center;padding:48px;color:#CC2229;">⚠️ خطأ في التحميل</div>`;
  }

  document.getElementById('btn-new-import').onclick = () => openImportModal();
  document.getElementById('imp-search').oninput = e => _renderList(e.target.value);

  window.setImportFilter       = setImportFilter;
  window.openImportModal       = openImportModal;
  window.closeImportModal      = closeImportModal;
  window.saveImportShipment    = saveImportShipment;
  window.editImportShipment    = editImportShipment;
  window.deleteImportShipment  = deleteImportShipmentUI;
  window.changeImportStatus    = changeImportStatus;
  window.onImportTypeChange    = onImportTypeChange;
  window.toggleDelivery        = toggleDelivery;
  window.exportImportReport    = exportImportReport;
  window.closeImportReport     = closeImportReport;
  window.printImportReport     = printImportReport;
  window.closeImportShipModal  = closeImportModal; // compat

  if (params.action === 'new') openImportModal();
}

/* ══════════════════════════════════════════════════════
   STATS
══════════════════════════════════════════════════════ */
function _updateStats() {
  const total     = _shipments.length;
  const waiting   = _shipments.filter(s=>s.status==='waiting').length;
  const customs   = _shipments.filter(s=>s.status==='customs').length;
  const delivered = _shipments.filter(s=>s.status==='delivered').length;
  const late      = _shipments.filter(s=>{
    const eta = s.eta ? new Date(s.eta) : null;
    return eta && eta < new Date() && s.status !== 'delivered';
  }).length;

  const pad = n => String(n).padStart(2,'0');
  const cards = [
    { n: pad(total),     label: 'إجمالي الشحنات', color: '#1C4B8E', bg: '#EEF2FF' },
    { n: pad(waiting),   label: 'قيد الانتظار',   color: '#C8943A', bg: '#FEF3E2' },
    { n: pad(customs),   label: 'التخليص الجمركي', color: '#6B4EAA', bg: '#EDE8F5' },
    { n: pad(delivered), label: 'تم التسليم',      color: '#2E8B57', bg: '#E7F5EE' },
  ];
  document.getElementById('imp-stats').innerHTML = cards.map(c=>`
    <div style="background:white;border-radius:10px;border:1px solid #E8E5DC;padding:16px;text-align:right;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:900;
                  color:${c.color};line-height:1;">${c.n}</div>
      <div style="font-size:11px;color:#6B6659;margin-top:4px;font-weight:600;">${c.label}</div>
      ${late>0 && c.label==='قيد الانتظار' ? `<div style="font-size:10px;color:#CC2229;margin-top:2px;font-weight:700;">⚠ ${late} متأخرة</div>`:''}
    </div>`).join('');

  const sub = document.getElementById('imp-sub');
  if (sub) sub.textContent = `IMPORT · ${pad(total)} TOTAL · ${pad(_shipments.filter(s=>s.status!=='delivered').length)} ACTIVE`;
}

/* ══════════════════════════════════════════════════════
   LIST RENDER
══════════════════════════════════════════════════════ */
function setImportFilter(f) {
  _filter = f;
  document.querySelectorAll('[data-filter]').forEach(btn => {
    const active = btn.dataset.filter === f;
    btn.style.background    = active ? '#1C4B8E' : 'white';
    btn.style.color         = active ? 'white'   : '#4A4540';
    btn.style.borderColor   = active ? '#1C4B8E' : '#E8E5DC';
  });
  _renderList(document.getElementById('imp-search')?.value || '');
}

function _renderList(search = '') {
  let list = [..._shipments];
  if (_filter !== 'all') list = list.filter(s => s.status === _filter);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(s =>
      (s.bl_number||'').toLowerCase().includes(q) ||
      (s.customer_name||'').toLowerCase().includes(q) ||
      (s.job_no||s.internal_no||'').toLowerCase().includes(q) ||
      (s.consignee||'').toLowerCase().includes(q) ||
      (s.container_no||'').toLowerCase().includes(q)
    );
  }
  // Sort by ETA desc
  list.sort((a,b) => (b.eta||'') > (a.eta||'') ? 1 : -1);

  const el = document.getElementById('imp-list');
  if (!el) return;

  if (list.length === 0) {
    el.innerHTML = `<div style="text-align:center;padding:48px;color:#8A8578;">
      <div style="font-size:36px;margin-bottom:12px;">📭</div>
      <div style="font-weight:700;margin-bottom:4px;">لا توجد شحنات</div>
      <div style="font-size:12px;">EMPTY</div>
    </div>`;
    return;
  }

  el.innerHTML = list.map(s => _buildCard(s)).join('');
}

function _buildCard(s) {
  const st    = IMPORT_STATUS[s.status] || IMPORT_STATUS.waiting;
  const isLate= s.eta && new Date(s.eta) < new Date() && s.status !== 'delivered';
  const typeLabel = s.type==='air'?'AIR':s.type==='sea'?'SEA':'LAND';

  let stripe = 'gray', statusCls = 'gray';
  if (st.class==='pill-done')    { stripe='green'; statusCls='green'; }
  else if (st.class==='pill-sent'){ stripe='blue';  statusCls='blue'; }
  else if (st.class==='pill-replied'){ stripe='amber'; statusCls='amber'; }
  if (isLate && s.status!=='delivered') stripe='red';

  const job  = s.job_no || s.internal_no || '—';
  const bl   = s.bl_number || '—';
  const eta  = s.eta ? new Date(s.eta).toLocaleDateString('ar-SA',{day:'numeric',month:'short',year:'numeric'}) : '—';

  // Build delivery indicators
  const hasDelivery = s.customs_no || s.do_date || s.terminal || s.invoice_no;

  return `
    <div class="imp-card" id="imp-card-${s.id}">
      <div class="imp-card-top" onclick="toggleDelivery('${s.id}')">
        <div class="imp-card-stripe ${stripe}"></div>
        <div class="imp-card-main">

          <!-- col 1: JOB + BL -->
          <div>
            <div class="imp-card-job">${job}</div>
            <div class="imp-card-bl">${bl}</div>
            <div style="margin-top:5px;display:flex;gap:4px;flex-wrap:wrap;">
              <span class="imp-tag">${typeLabel}</span>
              ${s.lcl_fcl ? `<span class="imp-tag">${s.lcl_fcl}</span>`:''}
              ${s.qty     ? `<span class="imp-tag">QTY: ${s.qty}</span>`:''}
            </div>
          </div>

          <!-- col 2: CUSTOMER + CONSIGNEE + META -->
          <div>
            <div class="imp-card-customer">${s.customer_name || '—'}</div>
            <div class="imp-card-consignee">${s.consignee || ''}</div>
            <div class="imp-card-meta">
              <span>📍 ${s.port || '—'}</span>
              <span>📅 ETA: ${eta}</span>
              ${s.container_no ? `<span>📦 ${s.container_no.split(',')[0]}${s.container_no.includes(',')?' +…':''}</span>`:''}
              ${s.weight ? `<span>⚖ ${s.weight}</span>`:''}
            </div>
          </div>

          <!-- col 3: STATUS -->
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
            <select class="imp-status-sel ${statusCls}"
              onchange="changeImportStatus('${s.id}',this.value)" onclick="event.stopPropagation()">
              ${Object.entries(IMPORT_STATUS).map(([k,v])=>
                `<option value="${k}" ${s.status===k?'selected':''}>${v.ar}</option>`
              ).join('')}
            </select>
            ${isLate ? '<span style="font-size:9px;color:#CC2229;font-weight:700;font-family:JetBrains Mono,monospace;">⚠ OVERDUE</span>':''}
            ${hasDelivery ? '<span style="font-size:9px;color:#2E8B57;font-weight:700;">● بيانات التسليم</span>':''}
          </div>

        </div>
      </div>

      <!-- DELIVERY PANEL -->
      <div class="imp-delivery-panel" id="imp-del-${s.id}">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:900;
                    color:#D4B266;letter-spacing:2px;margin-bottom:10px;">
          DELIVERY DATA ────────────────
        </div>
        <div class="imp-delivery-grid">
          ${_delItem('BAYAN',      s.customs_no)}
          ${_delItem('BYN/DATE',   _fmt(s.bayan_date))}
          ${_delItem('TERMINAL',   s.terminal)}
          ${_delItem('D/O DATE',   _fmt(s.do_date))}
          ${_delItem('MWANI DATE', _fmt(s.mwani_date))}
          ${_delItem('PORT DUES',  _fmt(s.port_dues_date))}
          ${_delItem('DUTY',       s.custom_duty)}
          ${_delItem('ERI FREE',   _fmt(s.eri_free_date))}
          ${_delItem('INVOICE NO', s.invoice_no)}
          ${_delItem('LOADING',    _fmt(s.loading_date))}
          ${_delItem('TRANSPORTER',s.transporter)}
          ${_delItem('LOCATION',   s.location)}
        </div>
        ${s.remarks      ? `<div style="font-size:12px;color:#4A4540;margin-bottom:4px;">📝 ${s.remarks}</div>`:'' }
        ${s.del_remarks  ? `<div style="font-size:12px;color:#4A4540;margin-bottom:4px;">📝 ${s.del_remarks}</div>`:'' }
        ${s.draft_no     ? `<div style="font-size:11px;font-family:'JetBrains Mono',monospace;color:#6B6659;margin-bottom:8px;">DRAFT: ${s.draft_no}</div>`:'' }

        <div class="imp-actions">
          <button class="imp-btn primary" onclick="editImportShipment('${s.id}')">
            <i class="ti ti-edit"></i> تعديل
          </button>
          <button class="imp-btn ghost" onclick="event.stopPropagation();toggleDelivery('${s.id}')">
            ▲ طي
          </button>
          <button class="imp-btn danger" onclick="deleteImportShipment('${s.id}')">
            <i class="ti ti-trash"></i>
          </button>
        </div>
      </div>
    </div>`;
}

function _delItem(label, val) {
  return `<div class="imp-del-item">
    <label>${label}</label>
    <span class="${val?'':'empty'}">${val || '—'}</span>
  </div>`;
}

function _fmt(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('ar-SA',{day:'numeric',month:'short',year:'numeric'}); }
  catch { return d; }
}

function toggleDelivery(id) {
  const panel = document.getElementById(`imp-del-${id}`);
  if (panel) panel.classList.toggle('open');
}

/* ══════════════════════════════════════════════════════
   MODAL — FULL FORM (SHIPMENT + DELIVERY)
══════════════════════════════════════════════════════ */
function openImportModal(shipment = null) {
  const isEdit = !!shipment;
  const s = shipment || {};

  const custOpts = _customers.map(c =>
    `<option value="${c.id}" data-name="${c.company_name}" ${s.customer_id===c.id?'selected':''}>${c.company_name}</option>`
  ).join('');
  const agentOpts = _agents.map(a =>
    `<option value="${a.id}" data-name="${a.name}" ${s.agent_id===a.id?'selected':''}>${a.name}</option>`
  ).join('');

  document.getElementById('imp-modal-body').innerHTML = `
    <div style="padding:22px 24px;">
      <!-- Modal Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;
                  padding-bottom:14px;border-bottom:2px solid #F0EDE4;">
        <div>
          <div style="font-size:16px;font-weight:900;color:#0E1A2E;">
            ${isEdit ? '✏️ تعديل شحنة وارد' : '📦 شحنة وارد جديدة'}
          </div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;
                      letter-spacing:1.5px;margin-top:3px;">IMPORT SHIPMENT FORM</div>
        </div>
        <button onclick="closeImportModal()"
          style="background:#F5F3EC;border:none;width:32px;height:32px;border-radius:8px;
          font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
      </div>

      <input type="hidden" id="ims-id" value="${s.id||''}">

      <!-- ══ SECTION 1: SHIPMENT DATA ══ -->
      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:900;
                  color:#1C4B8E;letter-spacing:2px;margin-bottom:12px;
                  padding-bottom:6px;border-bottom:1.5px solid #EEF2FF;">
        ■ SHIPMENT DATA
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px;">
        ${_field('ims-job',      'JOB / الرقم الداخلي', `<input type="text" id="ims-job" value="${s.job_no||s.internal_no||''}" placeholder="IMP-2026-001">`, true)}
        ${_field('ims-date',     'DATE / التاريخ', `<input type="date" id="ims-date" value="${s.date||''}">`, false)}
        ${_field('ims-bl',       'AW-B/L / رقم البوليصة', `<input type="text" id="ims-bl" value="${s.bl_number||''}" placeholder="OOLU2327925988">`, true)}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
        ${_field('ims-customer', 'CUSTOMER / العميل', `<select id="ims-customer"><option value="">— اختر —</option>${custOpts}</select>`, true)}
        ${_field('ims-consignee','CONSIGNEE / المستلم', `<input type="text" id="ims-consignee" value="${s.consignee||''}">`, false)}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:10px;">
        ${_field('ims-type','C/TYP / نوع الشحن',`<select id="ims-type" onchange="onImportTypeChange(this.value)"><option value="">—</option><option value="sea" ${s.type==='sea'?'selected':''}>🚢 SEA</option><option value="air" ${s.type==='air'?'selected':''}>✈️ AIR</option><option value="land" ${s.type==='land'?'selected':''}>🚛 LAND</option></select>`,true)}
        ${_field('ims-port','PORT TYP / المنفذ',`<select id="ims-port">${s.type&&IMPORT_PORTS[s.type]?IMPORT_PORTS[s.type].map(p=>`<option value="${p.value}" ${s.port===p.value?'selected':''}>${p.ar}</option>`).join(''):'<option value="">— اختر النوع أولاً —</option>'}</select>`,true)}
        ${_field('ims-lcl','LCL/FCL',`<select id="ims-lcl"><option value="">—</option><option value="FCL" ${s.lcl_fcl==='FCL'?'selected':''}>FCL</option><option value="LCL" ${s.lcl_fcl==='LCL'?'selected':''}>LCL</option><option value="TRUCK" ${s.lcl_fcl==='TRUCK'?'selected':''}>TRUCK</option></select>`,false)}
        ${_field('ims-qty','QTY / الكمية',`<input type="text" id="ims-qty" value="${s.qty||''}" placeholder="1">`,false)}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px;">
        ${_field('ims-container','CONT NO / رقم الحاوية',`<input type="text" id="ims-container" value="${s.container_no||''}" placeholder="افصل بفاصلة">`,false)}
        ${_field('ims-weight','WEIGHT / الوزن',`<input type="text" id="ims-weight" value="${s.weight||''}" placeholder="kg">`,false)}
        ${_field('ims-draft','DRAFT NO',`<input type="text" id="ims-draft" value="${s.draft_no||''}">`,false)}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
        ${_field('ims-eta','ETA / تاريخ الوصول',`<input type="date" id="ims-eta" value="${s.eta||''}">`,true)}
        ${_field('ims-agent','الوكيل الملاحي',`<select id="ims-agent"><option value="">—</option>${agentOpts}</select>`,false)}
      </div>

      ${_field('ims-remarks1','REMARKS / ملاحظات الشحنة',`<input type="text" id="ims-remarks1" value="${s.remarks||''}">`,false)}

      <!-- ══ SECTION 2: DELIVERY DATA ══ -->
      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:900;
                  color:#2E8B57;letter-spacing:2px;margin:18px 0 12px;
                  padding-bottom:6px;border-bottom:1.5px solid #E7F5EE;">
        ■ DELIVERY DATA
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px;">
        ${_field('ims-bayan','BAYAN / رقم البيان',`<input type="text" id="ims-bayan" value="${s.customs_no||''}">`,false)}
        ${_field('ims-bayan-date','BYN/DATE / تاريخ البيان',`<input type="date" id="ims-bayan-date" value="${s.bayan_date||''}">`,false)}
        ${_field('ims-terminal','TERMINAL / المحطة',`<input type="text" id="ims-terminal" value="${s.terminal||''}">`,false)}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px;">
        ${_field('ims-do','D/O DATE',`<input type="date" id="ims-do" value="${s.do_date||''}">`,false)}
        ${_field('ims-mwani','MWANI DATE',`<input type="date" id="ims-mwani" value="${s.mwani_date||''}">`,false)}
        ${_field('ims-portdues','PORT DUES DATE',`<input type="date" id="ims-portdues" value="${s.port_dues_date||''}">`,false)}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
        ${_field('ims-duty','CUSTOM DUTY / الرسوم الجمركية',`<input type="text" id="ims-duty" value="${s.custom_duty||''}">`,false)}
        ${_field('ims-eri','ERI FREE DATE',`<input type="date" id="ims-eri" value="${s.eri_free_date||''}">`,false)}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px;">
        ${_field('ims-invoice','INVOICE NO',`<input type="text" id="ims-invoice" value="${s.invoice_no||''}">`,false)}
        ${_field('ims-loading','LOADING DATE',`<input type="date" id="ims-loading" value="${s.loading_date||''}">`,false)}
        ${_field('ims-transporter','TRANSPORTER / الناقل',`<input type="text" id="ims-transporter" value="${s.transporter||''}">`,false)}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
        ${_field('ims-location','LOCATION / الموقع',`<input type="text" id="ims-location" value="${s.location||''}">`,false)}
        ${_field('ims-delivered','DELIVERD / تاريخ التسليم',`<input type="date" id="ims-delivered" value="${s.delivered_date||''}">`,false)}
      </div>

      ${_field('ims-del-remarks','DELIVERY REMARKS / ملاحظات التسليم',`<input type="text" id="ims-del-remarks" value="${s.del_remarks||''}">`,false)}
      ${_field('ims-remarks2','REMARKS 2',`<input type="text" id="ims-remarks2" value="${s.remarks2||''}">`,false)}

      <!-- ERROR -->
      <div id="ims-error" style="display:none;background:#FEEBEB;color:#CC2229;border-radius:8px;
            padding:9px 12px;font-size:12px;margin-top:12px;"></div>

      <!-- ACTIONS -->
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;
                  padding-top:14px;border-top:1px solid #F0EDE4;">
        <button class="imp-btn ghost" onclick="closeImportModal()">إلغاء</button>
        <button class="imp-btn gold" id="ims-save" onclick="saveImportShipment()">
          💾 ${isEdit ? 'حفظ التعديلات' : 'إنشاء الشحنة'}
        </button>
      </div>
    </div>`;

  document.getElementById('imp-modal').classList.remove('hidden');
}

function _field(id, label, input, required = false) {
  return `<div>
    <label style="display:block;font-size:10px;font-weight:800;color:${required?'#1C4B8E':'#6B6659'};
           letter-spacing:.5px;font-family:'JetBrains Mono',monospace;margin-bottom:4px;">
      ${label}${required?' *':''}
    </label>
    ${input.replace('>', ` style="width:100%;padding:8px 10px;border:1.5px solid #E8E5DC;
      border-radius:7px;font-family:'Tajawal',sans-serif;font-size:12px;outline:none;
      background:#FAFAF7;box-sizing:border-box;" >`)}
  </div>`;
}

function closeImportModal() {
  document.getElementById('imp-modal').classList.add('hidden');
}

function onImportTypeChange(type) {
  const portSel = document.getElementById('ims-port');
  if (portSel && IMPORT_PORTS[type]) {
    portSel.innerHTML = IMPORT_PORTS[type].map(p =>
      `<option value="${p.value}">${p.ar}</option>`
    ).join('');
  }
}

/* ══════════════════════════════════════════════════════
   SAVE
══════════════════════════════════════════════════════ */
async function saveImportShipment() {
  const id  = document.getElementById('ims-id')?.value;
  const bl  = document.getElementById('ims-bl')?.value.trim();
  const job = document.getElementById('ims-job')?.value.trim();
  const custSel = document.getElementById('ims-customer');
  const type    = document.getElementById('ims-type')?.value;
  const port    = document.getElementById('ims-port')?.value;
  const eta     = document.getElementById('ims-eta')?.value;
  const errEl   = document.getElementById('ims-error');

  if (!bl || !job || !custSel?.value || !type || !port || !eta) {
    errEl.textContent = 'يرجى تعبئة الحقول المطلوبة *';
    errEl.style.display = 'block';
    return;
  }

  const btn = document.getElementById('ims-save');
  btn.disabled = true; btn.textContent = '⏳ جاري الحفظ...';
  errEl.style.display = 'none';

  const agentSel = document.getElementById('ims-agent');
  const profile  = getCurrentProfile();

  try {
    const data = {
      // SHIPMENT DATA
      job_no:        job,
      internal_no:   job, // backward compat
      bl_number:     bl,
      date:          document.getElementById('ims-date')?.value || '',
      customer_id:   custSel.value,
      customer_name: custSel.options[custSel.selectedIndex]?.dataset.name || '',
      consignee:     document.getElementById('ims-consignee')?.value.trim() || '',
      type,
      port,
      lcl_fcl:       document.getElementById('ims-lcl')?.value || '',
      qty:           document.getElementById('ims-qty')?.value.trim() || '',
      container_no:  document.getElementById('ims-container')?.value.trim() || '',
      weight:        document.getElementById('ims-weight')?.value.trim() || '',
      draft_no:      document.getElementById('ims-draft')?.value.trim() || '',
      eta,
      etd:           '',
      agent_id:      agentSel?.value || '',
      agent_name:    agentSel?.options[agentSel?.selectedIndex]?.text || '',
      remarks:       document.getElementById('ims-remarks1')?.value.trim() || '',
      // DELIVERY DATA
      customs_no:    document.getElementById('ims-bayan')?.value.trim() || '',
      bayan_date:    document.getElementById('ims-bayan-date')?.value || '',
      terminal:      document.getElementById('ims-terminal')?.value.trim() || '',
      do_date:       document.getElementById('ims-do')?.value || '',
      mwani_date:    document.getElementById('ims-mwani')?.value || '',
      port_dues_date:document.getElementById('ims-portdues')?.value || '',
      custom_duty:   document.getElementById('ims-duty')?.value.trim() || '',
      eri_free_date: document.getElementById('ims-eri')?.value || '',
      invoice_no:    document.getElementById('ims-invoice')?.value.trim() || '',
      loading_date:  document.getElementById('ims-loading')?.value || '',
      transporter:   document.getElementById('ims-transporter')?.value.trim() || '',
      location:      document.getElementById('ims-location')?.value.trim() || '',
      delivered_date:document.getElementById('ims-delivered')?.value || '',
      del_remarks:   document.getElementById('ims-del-remarks')?.value.trim() || '',
      remarks2:      document.getElementById('ims-remarks2')?.value.trim() || '',
      // Meta
      employee_id:   profile?.id || '',
      employee_name: profile?.name || '',
    };

    if (id) {
      await updateImportShipment(id, data);
      toast('✅ تم تحديث الشحنة', 'success');
    } else {
      await createImportShipment(data);
      toast('✅ تم إنشاء الشحنة', 'success');
    }

    closeImportModal();
    _shipments = await getImportShipments();
    _updateStats();
    _renderList(document.getElementById('imp-search')?.value || '');
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
  if (s) openImportModal(s);
}

async function deleteImportShipmentUI(id) {
  if (!confirm('هل أنت متأكد من حذف هذه الشحنة؟')) return;
  try {
    await deleteImportShipment(id);
    toast('تم حذف الشحنة', 'error');
    _shipments = await getImportShipments();
    _updateStats();
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
    toast(`✅ ${IMPORT_STATUS[status]?.ar}`, 'success');
    _updateStats();
  } catch(e) {
    toast('خطأ في تحديث الحالة', 'error');
  }
}

/* ══════════════════════════════════════════════════════
   REPORT — SHIPMENT & DELIVERY DATA
══════════════════════════════════════════════════════ */
function exportImportReport() {
  const overlay = document.getElementById('imp-report-overlay');
  const content = document.getElementById('imp-report-content');

  const rows = [..._shipments].sort((a,b) =>
    (a.job_no||a.internal_no||'') > (b.job_no||b.internal_no||'') ? 1 : -1
  );

  content.innerHTML = `
    <div style="position:sticky;top:0;background:#0E1A2E;color:white;
                padding:14px 20px;display:flex;align-items:center;
                justify-content:space-between;z-index:10;gap:12px;flex-wrap:wrap;">
      <div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:2px;color:#D4B266;">
          SHIPMENT DATA & DELIVERY SHEET
        </div>
        <div style="font-size:15px;font-weight:800;margin-top:2px;">
          تقرير شحنات الوارد — ${rows.length} شحنة
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button onclick="printImportReport()"
          style="background:#D4B266;color:#0E1A2E;border:none;padding:8px 16px;
          border-radius:7px;font-family:'Tajawal',sans-serif;font-size:12px;font-weight:800;cursor:pointer;">
          🖨️ طباعة
        </button>
        <button onclick="closeImportReport()"
          style="background:rgba(255,255,255,0.1);color:white;border:1px solid rgba(255,255,255,0.2);
          padding:8px 16px;border-radius:7px;font-family:'Tajawal',sans-serif;font-size:12px;font-weight:700;cursor:pointer;">
          ✕ إغلاق
        </button>
      </div>
    </div>

    <div style="padding:16px;overflow-x:auto;">
      <table>
        <thead>
          <tr>
            <th class="group-h" colspan="14">SHIPMENT DATA</th>
            <th class="group-h" colspan="15" style="background:#1a4a2e;">DELIVERY DATA</th>
          </tr>
          <tr>
            <th>JOB</th>
            <th>DATE</th>
            <th>PORT TYP</th>
            <th>C / TYP</th>
            <th>AW-B/L</th>
            <th>CUSTOMER</th>
            <th>ETA</th>
            <th>CONSIGNEE</th>
            <th>LCL/FCL</th>
            <th>QTY</th>
            <th>CONT NO</th>
            <th>WEIGHT</th>
            <th>DRAFT NO</th>
            <th>REMARKS</th>
            <th class="delivery-h">BAYAN</th>
            <th class="delivery-h">BYN/DATE</th>
            <th class="delivery-h">TERMINAL</th>
            <th class="delivery-h">D/O DATE</th>
            <th class="delivery-h">MWANI DATE</th>
            <th class="delivery-h">PORT DUES</th>
            <th class="delivery-h">CUSTOM DUTY</th>
            <th class="delivery-h">ERI FREE DATE</th>
            <th class="delivery-h">REMARKS</th>
            <th class="delivery-h">INVOICE NO</th>
            <th class="delivery-h">LOADING DATE</th>
            <th class="delivery-h">TRANSPORTER</th>
            <th class="delivery-h">LOCATION</th>
            <th class="delivery-h">DELIVERD</th>
            <th class="delivery-h">REMARKS2</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(s => `
            <tr>
              <td><b>${s.job_no||s.internal_no||'—'}</b></td>
              <td>${s.date||'—'}</td>
              <td>${s.port||'—'}</td>
              <td>${(s.type||'').toUpperCase()}</td>
              <td style="font-family:'JetBrains Mono',monospace;font-weight:700;">${s.bl_number||'—'}</td>
              <td>${s.customer_name||'—'}</td>
              <td>${s.eta||'—'}</td>
              <td>${s.consignee||'—'}</td>
              <td><b>${s.lcl_fcl||'—'}</b></td>
              <td>${s.qty||'—'}</td>
              <td style="font-family:'JetBrains Mono',monospace;font-size:10px;">${s.container_no||'—'}</td>
              <td>${s.weight||'—'}</td>
              <td>${s.draft_no||'—'}</td>
              <td>${s.remarks||'—'}</td>
              <td style="background:#F0FFF4;"><b>${s.customs_no||'—'}</b></td>
              <td style="background:#F0FFF4;">${s.bayan_date||'—'}</td>
              <td style="background:#F0FFF4;">${s.terminal||'—'}</td>
              <td style="background:#F0FFF4;">${s.do_date||'—'}</td>
              <td style="background:#F0FFF4;">${s.mwani_date||'—'}</td>
              <td style="background:#F0FFF4;">${s.port_dues_date||'—'}</td>
              <td style="background:#F0FFF4;">${s.custom_duty||'—'}</td>
              <td style="background:#F0FFF4;">${s.eri_free_date||'—'}</td>
              <td style="background:#F0FFF4;">${s.del_remarks||'—'}</td>
              <td style="background:#F0FFF4;">${s.invoice_no||'—'}</td>
              <td style="background:#F0FFF4;">${s.loading_date||'—'}</td>
              <td style="background:#F0FFF4;">${s.transporter||'—'}</td>
              <td style="background:#F0FFF4;">${s.location||'—'}</td>
              <td style="background:#F0FFF4;${s.delivered_date?'color:#2E8B57;font-weight:700;':''}">${s.delivered_date||'—'}</td>
              <td style="background:#F0FFF4;">${s.remarks2||'—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  overlay.style.display = 'block';
}

function closeImportReport() {
  document.getElementById('imp-report-overlay').style.display = 'none';
}

function printImportReport() {
  window.print();
}
