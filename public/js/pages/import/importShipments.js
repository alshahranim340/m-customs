import {
  getImportShipments, createImportShipment, updateImportShipment, deleteImportShipment,
  getCustomers, getAgents, IMPORT_PORTS, IMPORT_STATUS
} from '../../../../src/firebase/importDb.js';
import { toast } from '../../app.js';
import { getCurrentProfile } from '../../app.js';
import { createTrackingLink, updateTrackingStatus } from '../../../../src/firebase/tracking.js';

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
window._generatePDFReport    = _generatePDFReport;
window._generateExcelReport  = _generateExcelReport;
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
    { n: pad(waiting),   label: 'WAITING · قيد الانتظار',   color: '#C8943A', bg: '#FEF3E2' },
    { n: pad(customs),   label: 'التخليص الجمركي', color: '#6B4EAA', bg: '#EDE8F5' },
    { n: pad(delivered), label: 'DELIVERED · تم التسليم',      color: '#2E8B57', bg: '#E7F5EE' },
  ];
  document.getElementById('imp-stats').innerHTML = cards.map(c=>`
    <div style="background:white;border-radius:10px;border:1px solid #E8E5DC;padding:16px;text-align:right;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:900;
                  color:${c.color};line-height:1;">${c.n}</div>
      <div style="font-size:11px;color:#6B6659;margin-top:4px;font-weight:600;">${c.label}</div>
      ${late>0 && c.label==='WAITING · قيد الانتظار' ? `<div style="font-size:10px;color:#CC2229;margin-top:2px;font-weight:700;">⚠ ${late} متأخرة</div>`:''}
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
  const eta  = s.eta ? new Date(s.eta).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—';

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
          <button class="imp-btn ghost" id="wa-btn-${s.id}" onclick="sendWhatsApp('${s.id}',event)"
            style="background:#E7F9ED;color:#128C7E;border-color:#b2dfdb;">
            واتساب
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
  try { return new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); }
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
        <button class="imp-btn ghost" onclick="closeImportModal()">Cancel / إلغاء</button>
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
    btn.textContent = 'Save / حفظ';
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
    if (s) {
      s.status = status;
      // مزامنة رابط التتبع
      if (s.tracking_token) {
        await updateTrackingStatus(s.tracking_token, { status });
      }
    }
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
  /* عرض خيارات التصدير */
  document.getElementById('imp-rep-choice')?.remove();

  const modal = document.createElement('div');
  modal.id = 'imp-rep-choice';
  modal.style.cssText = [
    'position:fixed','inset:0','z-index:3000','display:flex',
    'align-items:center','justify-content:center',
    'background:rgba(10,20,40,.65)','backdrop-filter:blur(3px)',
    'font-family:Tajawal,sans-serif'
  ].join(';');

  modal.innerHTML = `
    <div style="background:white;border-radius:16px;width:100%;max-width:400px;
                overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.3);">

      <div style="background:linear-gradient(135deg,#0E1A2E,#1C2B48);
                  padding:20px 22px;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;
                      color:#D4B266;letter-spacing:2px;font-weight:800;">EXPORT REPORT</div>
          <div style="font-size:16px;font-weight:900;color:white;margin-top:3px;">تصدير التقرير</div>
        </div>
        <button onclick="document.getElementById('imp-rep-choice').remove()"
          style="background:rgba(255,255,255,.1);border:none;color:white;
          width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:14px;">✕</button>
      </div>

      <div style="padding:22px;display:flex;flex-direction:column;gap:12px;">

        <button onclick="_generatePDFReport();document.getElementById('imp-rep-choice').remove();"
          style="display:flex;align-items:center;gap:14px;padding:16px 18px;
          border:2px solid #E8E5DC;border-radius:12px;background:white;
          cursor:pointer;text-align:right;width:100%;transition:all .18s;"
          onmouseover="this.style.borderColor='#CC2229';this.style.background='#FFF5F5'"
          onmouseout="this.style.borderColor='#E8E5DC';this.style.background='white'">
          <div style="width:44px;height:44px;background:#FEF0F0;border-radius:10px;
                      display:flex;align-items:center;justify-content:center;
                      font-size:22px;flex-shrink:0;">PDF</div>
          <div style="text-align:right;">
            <div style="font-weight:800;font-size:14px;color:#0E1A2E;">تقرير PDF احترافي</div>
            <div style="font-size:11px;color:#6B6659;margin-top:2px;">
              بطاقة لكل شحنة · ملخص · جاهز للطباعة
            </div>
          </div>
        </button>

        <button onclick="_generateExcelReport();document.getElementById('imp-rep-choice').remove();"
          style="display:flex;align-items:center;gap:14px;padding:16px 18px;
          border:2px solid #E8E5DC;border-radius:12px;background:white;
          cursor:pointer;text-align:right;width:100%;transition:all .18s;"
          onmouseover="this.style.borderColor='#2E8B57';this.style.background='#F0FFF4'"
          onmouseout="this.style.borderColor='#E8E5DC';this.style.background='white'">
          <div style="width:44px;height:44px;background:#E7F5EE;border-radius:10px;
                      display:flex;align-items:center;justify-content:center;
                      font-size:22px;flex-shrink:0;">XLS</div>
          <div style="text-align:right;">
            <div style="font-weight:800;font-size:14px;color:#0E1A2E;">تصدير Excel</div>
            <div style="font-size:11px;color:#6B6659;margin-top:2px;">
              جدول كامل · SHIPMENT & DELIVERY DATA
            </div>
          </div>
        </button>

      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

/* ══════════════════════════════════════════════════════
   PDF REPORT — Professional card-per-shipment layout
══════════════════════════════════════════════════════ */
function _generatePDFReport() {
  const rows = [..._shipments].sort((a,b) =>
    (a.job_no||a.internal_no||'') > (b.job_no||b.internal_no||'') ? 1 : -1
  );

  const now  = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});
  const d    = s => { if(!s) return '\u2014'; try{ return new Date(s).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }catch{return s;} };
  const total     = rows.length;
  const waiting   = rows.filter(s=>s.status==='waiting').length;
  const clearance = rows.filter(s=>s.status==='clearance'||s.status==='customs').length;
  const delivered = rows.filter(s=>s.status==='delivered').length;

  const ST = {waiting:'WAITING',clearance:'CLEARANCE',customs:'CLEARANCE',delivered:'DELIVERED'};
  const stColor = {WAITING:'#C8943A',CLEARANCE:'#1C4B8E',DELIVERED:'#2E8B57'};

  const cards = rows.map((s,i) => {
    const stKey   = ST[s.status] || 'WAITING';
    const stClr   = stColor[stKey] || '#8A8578';
    const stAr    = {WAITING:'\u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631',
                     CLEARANCE:'\u0642\u064a\u062f \u0627\u0644\u062a\u062e\u0644\u064a\u0635',
                     DELIVERED:'\u062a\u0645 \u0627\u0644\u062a\u0633\u0644\u064a\u0645'}[stKey]||'';
    const job = s.job_no||s.internal_no||String(i+1).padStart(3,'0');
    const hasDelivery = s.customs_no||s.terminal||s.do_date||s.bayan_date||s.delivered_date;

    return `
    <div class="card" style="page-break-inside:avoid;">
      <!-- Card Header -->
      <div class="card-head">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="job-badge">JOB #${job}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:900;color:#0E1A2E;">
            ${s.bl_number||'\u2014'}
          </div>
        </div>
        <div class="status-pill" style="background:${stClr}15;color:${stClr};border:1.5px solid ${stClr}40;">
          ${stKey} &middot; ${stAr}
        </div>
      </div>

      <!-- Shipment Data -->
      <div class="section-label">SHIPMENT DATA</div>
      <div class="grid-4">
        <div class="field"><div class="fl">CUSTOMER</div><div class="fv">${s.customer_name||'\u2014'}</div></div>
        <div class="field"><div class="fl">CONSIGNEE</div><div class="fv">${s.consignee||'\u2014'}</div></div>
        <div class="field"><div class="fl">ETA</div><div class="fv mono">${d(s.eta)}</div></div>
        <div class="field"><div class="fl">PORT</div><div class="fv mono">${s.port||'\u2014'}</div></div>
        <div class="field"><div class="fl">TYPE</div><div class="fv mono">${(s.type||'').toUpperCase()} / ${s.lcl_fcl||'\u2014'}</div></div>
        <div class="field"><div class="fl">QTY</div><div class="fv">${s.qty||'\u2014'}</div></div>
        <div class="field"><div class="fl">WEIGHT</div><div class="fv">${s.weight||'\u2014'}</div></div>
        <div class="field"><div class="fl">DRAFT NO</div><div class="fv mono">${s.draft_no||'\u2014'}</div></div>
      </div>
      ${s.container_no ? `
        <div class="field" style="margin-top:6px;">
          <div class="fl">CONTAINER(S)</div>
          <div class="fv mono">${s.container_no}</div>
        </div>` : ''}
      ${s.remarks ? `
        <div class="field" style="margin-top:4px;">
          <div class="fl">REMARKS</div>
          <div class="fv">${s.remarks}</div>
        </div>` : ''}

      <!-- Delivery Data -->
      ${hasDelivery ? `
      <div class="section-label" style="margin-top:12px;color:#2E8B57;border-color:#2E8B57;">
        DELIVERY DATA
      </div>
      <div class="grid-4">
        <div class="field"><div class="fl">BAYAN</div><div class="fv mono">${s.customs_no||'\u2014'}</div></div>
        <div class="field"><div class="fl">BYN DATE</div><div class="fv mono">${d(s.bayan_date)}</div></div>
        <div class="field"><div class="fl">TERMINAL</div><div class="fv">${s.terminal||'\u2014'}</div></div>
        <div class="field"><div class="fl">D/O DATE</div><div class="fv mono">${d(s.do_date)}</div></div>
        <div class="field"><div class="fl">MWANI</div><div class="fv mono">${d(s.mwani_date)}</div></div>
        <div class="field"><div class="fl">PORT DUES</div><div class="fv mono">${d(s.port_dues_date)}</div></div>
        <div class="field"><div class="fl">CUSTOM DUTY</div><div class="fv">${s.custom_duty||'\u2014'}</div></div>
        <div class="field"><div class="fl">ERI FREE</div><div class="fv mono">${d(s.eri_free_date)}</div></div>
        <div class="field"><div class="fl">INVOICE NO</div><div class="fv mono">${s.invoice_no||'\u2014'}</div></div>
        <div class="field"><div class="fl">LOADING</div><div class="fv mono">${d(s.loading_date)}</div></div>
        <div class="field"><div class="fl">TRANSPORTER</div><div class="fv">${s.transporter||'\u2014'}</div></div>
        <div class="field"><div class="fl">LOCATION</div><div class="fv">${s.location||'\u2014'}</div></div>
        ${s.delivered_date ? `
        <div class="field" style="grid-column:1/-1;">
          <div class="fl">DELIVERED</div>
          <div class="fv" style="color:#2E8B57;font-weight:700;">${d(s.delivered_date)}</div>
        </div>` : ''}
      </div>` : `
      <div style="margin-top:10px;padding:8px 12px;background:#F9FBF9;border-radius:6px;
                  font-size:10px;color:#8A8578;font-family:'JetBrains Mono',monospace;letter-spacing:1px;">
        NO DELIVERY DATA YET
      </div>`}
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<title>Import Report - ${now}</title>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;700;800&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Tajawal',sans-serif; color:#0E1A2E; background:#F5F3EC; padding:20px; }

  /* Letterhead */
  .letterhead {
    background:linear-gradient(135deg,#0E1A2E 0%,#1C2B48 100%);
    color:white; border-radius:12px; padding:24px 28px;
    margin-bottom:16px; display:flex; justify-content:space-between; align-items:flex-end;
  }
  .lh-left .code {
    font-family:'JetBrains Mono',monospace; font-size:9px;
    letter-spacing:2.5px; color:#D4B266; font-weight:800; margin-bottom:5px;
  }
  .lh-left h1 { font-size:22px; font-weight:900; }
  .lh-left p  { font-size:11px; color:rgba(255,255,255,.5); margin-top:3px;
                font-family:'JetBrains Mono',monospace; letter-spacing:.5px; }
  .lh-right   { text-align:right; }
  .lh-right .gen { font-family:'JetBrains Mono',monospace; font-size:9px; color:rgba(255,255,255,.45); }
  .lh-right .total{ font-size:28px; font-weight:900; color:#D4B266; line-height:1; }
  .lh-right .tlbl { font-size:10px; color:rgba(255,255,255,.5); margin-top:2px; }

  /* Summary */
  .summary {
    display:grid; grid-template-columns:repeat(4,1fr);
    gap:10px; margin-bottom:16px;
  }
  .sum-cell {
    background:white; border-radius:10px; border:1px solid #E8E5DC;
    padding:14px 16px;
  }
  .sum-label { font-family:'JetBrains Mono',monospace; font-size:9px; font-weight:800;
               letter-spacing:1.5px; color:#8A8578; margin-bottom:5px; }
  .sum-value { font-family:'JetBrains Mono',monospace; font-size:28px; font-weight:900; }
  .sum-value.amber  { color:#C8943A; }
  .sum-value.blue   { color:#1C4B8E; }
  .sum-value.green  { color:#2E8B57; }

  /* Cards */
  .card {
    background:white; border-radius:12px; border:1px solid #E8E5DC;
    margin-bottom:14px; overflow:hidden;
    box-shadow:0 2px 8px rgba(0,0,0,.05);
  }
  .card-head {
    display:flex; align-items:center; justify-content:space-between;
    padding:14px 18px; border-bottom:1px solid #F0EDE4;
    background:#FAFAF7;
  }
  .job-badge {
    background:#0E1A2E; color:white;
    font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:800;
    padding:4px 10px; border-radius:6px; letter-spacing:0.5px;
  }
  .status-pill {
    font-family:'JetBrains Mono',monospace; font-size:9px; font-weight:800;
    padding:5px 12px; border-radius:12px; letter-spacing:.5px;
  }

  .section-label {
    font-family:'JetBrains Mono',monospace; font-size:9px; font-weight:800;
    letter-spacing:2px; color:#1C4B8E;
    padding:10px 18px 6px;
    border-bottom:1.5px solid #EEF2FF;
  }

  .grid-4 {
    display:grid; grid-template-columns:repeat(4,1fr);
    gap:0; padding:10px 18px 14px;
  }
  .field { padding:4px 8px 4px 0; }
  .fl {
    font-family:'JetBrains Mono',monospace; font-size:8px; font-weight:800;
    letter-spacing:1px; color:#8A8578; margin-bottom:3px;
  }
  .fv { font-size:12px; font-weight:600; color:#0E1A2E; }
  .fv.mono { font-family:'JetBrains Mono',monospace; font-size:11px; }

  /* Print */
  @page { margin:15mm; size:A4; }
  @media print {
    body { background:white; padding:0; }
    .no-print { display:none !important; }
    .card { box-shadow:none; }
    .letterhead { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  }

  .print-bar {
    position:fixed; top:0; left:0; right:0;
    background:#0E1A2E; padding:12px 20px;
    display:flex; gap:10px; align-items:center; z-index:999;
  }
  .pb-title { color:rgba(255,255,255,.6); font-size:12px; flex:1;
              font-family:'JetBrains Mono',monospace; letter-spacing:.5px; }
  .pb-btn {
    padding:8px 18px; border-radius:8px; border:none; cursor:pointer;
    font-family:'Tajawal',sans-serif; font-size:13px; font-weight:700;
  }
  .pb-pdf { background:#D4B266; color:#0E1A2E; }
  .pb-close { background:rgba(255,255,255,.1); color:white;
              border:1px solid rgba(255,255,255,.2) !important; }
  body { padding-top: 52px; }
</style>
</head>
<body>

<div class="print-bar no-print">
  <span class="pb-title">IMPORT SHIPMENTS REPORT · ${rows.length} shipment${rows.length!==1?'s':''}</span>
  <button class="pb-btn pb-pdf" onclick="window.print()">Print / Save as PDF</button>
  <button class="pb-btn pb-close" onclick="window.close()">Close</button>
</div>

<!-- Letterhead -->
<div class="letterhead">
  <div class="lh-left">
    <div class="code">SDS / IMPORT / REPORT / 2026</div>
    <h1>Import Shipments Report</h1>
    <p>${now}</p>
  </div>
  <div class="lh-right">
    <div class="gen">TOTAL SHIPMENTS</div>
    <div class="total">${String(rows.length).padStart(2,'0')}</div>
    <div class="tlbl">شركة السديس للخدمات اللوجستية</div>
  </div>
</div>

<!-- Summary -->
<div class="summary">
  <div class="sum-cell">
    <div class="sum-label">01 · TOTAL</div>
    <div class="sum-value">${String(total).padStart(2,'0')}</div>
  </div>
  <div class="sum-cell">
    <div class="sum-label">02 · WAITING</div>
    <div class="sum-value amber">${String(waiting).padStart(2,'0')}</div>
  </div>
  <div class="sum-cell">
    <div class="sum-label">03 · CLEARANCE</div>
    <div class="sum-value blue">${String(clearance).padStart(2,'0')}</div>
  </div>
  <div class="sum-cell">
    <div class="sum-label">04 · DELIVERED</div>
    <div class="sum-value green">${String(delivered).padStart(2,'0')}</div>
  </div>
</div>

<!-- Shipment Cards -->
${cards}

</body></html>`;

  const win = window.open('', '_blank');
  if (!win) { toast('Please allow popups for this site', 'error'); return; }
  win.document.write(html);
  win.document.close();
}

/* ══════════════════════════════════════════════════════
   EXCEL EXPORT — Full data table using SheetJS
══════════════════════════════════════════════════════ */
function _generateExcelReport() {
  function doExport() {
    const XLSX = window.XLSX;
    const d = s => { if(!s) return ''; try{ return new Date(s).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }catch{return s||'';} };

    const rows = [..._shipments].sort((a,b)=>
      (a.job_no||a.internal_no||'') > (b.job_no||b.internal_no||'') ? 1 : -1
    );

    const headers = [
      'JOB','DATE','PORT','TYPE','AW-B/L','CUSTOMER','CONSIGNEE','ETA',
      'LCL/FCL','QTY','CONTAINER NO','WEIGHT','DRAFT NO','REMARKS',
      'BAYAN','BYN DATE','TERMINAL','D/O DATE','MWANI DATE',
      'PORT DUES DATE','CUSTOM DUTY','ERI FREE DATE','DEL REMARKS',
      'INVOICE NO','LOADING DATE','TRANSPORTER','LOCATION','DELIVERED','REMARKS2'
    ];

    const data = [headers, ...rows.map(s => [
      s.job_no||s.internal_no||'',  s.date||'',
      s.port||'',                    (s.type||'').toUpperCase(),
      s.bl_number||'',               s.customer_name||'',
      s.consignee||'',               d(s.eta),
      s.lcl_fcl||'',                 s.qty||'',
      s.container_no||'',            s.weight||'',
      s.draft_no||'',                s.remarks||'',
      s.customs_no||'',              d(s.bayan_date),
      s.terminal||'',                d(s.do_date),
      d(s.mwani_date),               d(s.port_dues_date),
      s.custom_duty||'',             d(s.eri_free_date),
      s.del_remarks||'',             s.invoice_no||'',
      d(s.loading_date),             s.transporter||'',
      s.location||'',                d(s.delivered_date),
      s.remarks2||''
    ])];

    const ws = XLSX.utils.aoa_to_sheet(data);

    /* Column widths */
    ws['!cols'] = [
      {wch:8},{wch:12},{wch:12},{wch:6},{wch:20},{wch:20},{wch:20},{wch:12},
      {wch:8},{wch:6},{wch:30},{wch:10},{wch:14},{wch:20},
      {wch:14},{wch:12},{wch:12},{wch:12},{wch:12},{wch:14},{wch:12},{wch:12},
      {wch:20},{wch:14},{wch:12},{wch:16},{wch:14},{wch:12},{wch:20}
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Import Shipments');

    const now = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}).replace(/ /g,'-');
    XLSX.writeFile(wb, `import-shipments-${now}.xlsx`);
    toast('Excel file downloaded', 'success');
  }

  if (window.XLSX) { doExport(); return; }

  toast('Loading Excel library...', 'success');
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  s.onload = doExport;
  s.onerror = () => toast('Failed to load Excel library', 'error');
  document.head.appendChild(s);
}

function closeImportReport() {
  document.getElementById('imp-report-overlay')?.remove();
}

function printImportReport() { window.print(); }


/* ══════════════════════════════════════════════
   رابط التتبع — إنشاء ومشاركة
══════════════════════════════════════════════ */

async function generateTrackingLink(shipmentId, event) {
  event.stopPropagation();
  const s   = _shipments.find(x => x.id === shipmentId);
  if (!s) return;

  const btn = document.getElementById(`trk-btn-${shipmentId}`);
  if (btn) { btn.disabled = true; btn.textContent = '⏳'; }

  try {
    let token = s.tracking_token;

    /* إنشاء token جديد إذا لم يكن موجوداً */
    if (!token) {
      token = await createTrackingLink(shipmentId, s);
      await updateImportShipment(shipmentId, { tracking_token: token });
      s.tracking_token = token;
    }

    const url = `${location.origin}/track.html?token=${token}`;

    /* نسخ الرابط */
    await navigator.clipboard.writeText(url);

    /* عرض Modal الرابط */
    _showTrackingModal(url, token, s);

    if (btn) { btn.textContent = '✅ نُسخ'; }
    setTimeout(() => { if (btn) { btn.disabled = false; btn.textContent = '🔗 رابط التتبع'; } }, 2500);

  } catch(e) {
    console.error(e);
    toast('❌ خطأ في إنشاء الرابط', 'error');
    if (btn) { btn.disabled = false; btn.textContent = '🔗 رابط التتبع'; }
  }
}

function _getWALink(shipment, trackingUrl) {
  const customer = _customers.find(c => c.id === shipment.customer_id);
  const phone    = _fmtWAPhone(customer?.phone || '');
  const msg      = _buildWAMessage(shipment, trackingUrl);
  return phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

function _showTrackingModal(url, token, shipment) {
  /* إزالة أي modal تتبع قديم */
  document.getElementById('trk-share-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'trk-share-modal';
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(10,20,40,.6);z-index:2000;
    display:flex;align-items:center;justify-content:center;padding:20px;
    backdrop-filter:blur(3px);font-family:'Tajawal',sans-serif;
  `;
  modal.innerHTML = `
    <div style="background:white;border-radius:16px;width:100%;max-width:460px;
                overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.25);">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#0E1A2E,#1C2B48);padding:20px 22px;
                  display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;
                      color:#D4B266;letter-spacing:2px;font-weight:800;">TRACKING LINK</div>
          <div style="font-size:16px;font-weight:900;color:white;margin-top:3px;">رابط تتبع الشحنة</div>
        </div>
        <button onclick="document.getElementById('trk-share-modal').remove()"
          style="background:rgba(255,255,255,.1);border:none;color:white;width:30px;height:30px;
          border-radius:8px;cursor:pointer;font-size:14px;">✕</button>
      </div>

      <div style="padding:22px;">

        <!-- BL Info -->
        <div style="background:#F5F3EC;border-radius:10px;padding:12px 16px;margin-bottom:16px;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;
                      letter-spacing:1.5px;font-weight:800;margin-bottom:4px;">SHIPMENT</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:900;
                      color:#0E1A2E;">${shipment.bl_number || '—'}</div>
          <div style="font-size:12px;color:#6B6659;margin-top:2px;">${shipment.customer_name || ''}</div>
        </div>

        <!-- URL Box -->
        <div style="border:1.5px solid #E8E5DC;border-radius:10px;padding:11px 14px;
                    margin-bottom:14px;background:#FAFAF7;word-break:break-all;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B6659;
                      letter-spacing:1px;font-weight:800;margin-bottom:5px;">🔗 TRACKING URL</div>
          <div style="font-size:12px;color:#1C4B8E;font-family:'JetBrains Mono',monospace;
                      font-weight:600;">${url}</div>
        </div>

        <!-- Token -->
        <div style="text-align:center;margin-bottom:18px;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;
                      letter-spacing:1.5px;margin-bottom:4px;">TOKEN</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:900;
                      color:#1C4B8E;letter-spacing:4px;">${token.replace(/(.{4})/g,'$1 ').trim()}</div>
        </div>

        <!-- Action Buttons -->
        <div style="display:flex;gap:10px;">
          <button onclick="_copyTrackingUrl('${url}',this)"
            style="flex:1;padding:11px;border:1.5px solid #E8E5DC;border-radius:9px;
            background:white;font-family:'Tajawal',sans-serif;font-size:13px;
            font-weight:700;cursor:pointer;transition:all .15s;">
            📋 نسخ الرابط
          </button>
          <a href="${_getWALink(shipment, url)}" target="_blank"
            style="flex:1;padding:11px;background:#25D366;color:white;border-radius:9px;
            font-family:'Tajawal',sans-serif;font-size:13px;font-weight:700;
            text-decoration:none;display:flex;align-items:center;justify-content:center;gap:7px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.118 1.524 5.847L.057 23.93l6.244-1.44A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.848 0-3.574-.474-5.073-1.306l-.363-.214-3.762.867.902-3.663-.237-.379A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
            واتساب
          </a>
        </div>

        <div style="text-align:center;margin-top:12px;font-size:11px;color:#8A8578;">
          ✅ تم نسخ الرابط تلقائياً
        </div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

window._copyTrackingUrl = async function(url, btn) {
  await navigator.clipboard.writeText(url);
  btn.textContent = '✅ تم النسخ';
  setTimeout(() => btn.textContent = '📋 نسخ الرابط', 2000);
};

/* ══════════════════════════════════════════════
   مشاركة واتساب مباشرة
══════════════════════════════════════════════ */
/* ── تنسيق رقم الهاتف لـ WhatsApp ── */
function _fmtWAPhone(phone) {
  if (!phone) return '';
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('00966')) d = d.slice(2);
  else if (d.startsWith('966'))  d = d;
  else if (d.startsWith('05'))   d = '966' + d.slice(1);
  else if (d.startsWith('5'))    d = '966' + d;
  return d;
}

/* ── الرسالة الاحترافية ── */
function _buildWAMessage(s, trackingUrl) {
  var ltr   = '\u200E';
  var today = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
  var eta   = s.eta ? new Date(s.eta).toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' }) : '-';
  var ST    = {
    waiting  :'\u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631',
    clearance:'\u0642\u064a\u062f \u0627\u0644\u062a\u062e\u0644\u064a\u0635 \u0627\u0644\u062c\u0645\u0631\u0643\u064a',
    customs  :'\u0642\u064a\u062f \u0627\u0644\u062a\u062e\u0644\u064a\u0635 \u0627\u0644\u062c\u0645\u0631\u0643\u064a',
    delivered:'\u062a\u0645 \u0627\u0644\u062a\u0633\u0644\u064a\u0645'
  };
  var m =
    '\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u064a\u0643\u0645 \u0648\u0631\u062d\u0645\u0629 \u0627\u0644\u0644\u0647 \u0648\u0628\u0631\u0643\u0627\u062a\u0647\n\n' +
    '*\u0634\u0631\u0643\u0629 \u0627\u0644\u0633\u062f\u064a\u0633 \u0644\u0644\u062e\u062f\u0645\u0627\u062a \u0627\u0644\u0644\u0648\u062c\u0633\u062a\u064a\u0629*\n' +
    '_\u0646\u0638\u0627\u0645 M-Customs \u0644\u0644\u062a\u062e\u0644\u064a\u0635 \u0627\u0644\u062c\u0645\u0631\u0643\u064a_\n\n' +
    '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n' +
    '*\u062a\u062d\u062f\u064a\u062b \u062d\u0627\u0644\u0629 \u0634\u062d\u0646\u062a\u0643\u0645*\n' +
    '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\n' +
    '\u0631\u0642\u0645 \u0627\u0644\u0628\u0648\u0644\u064a\u0635\u0629:\n' +
    '*' + ltr + (s.bl_number||'-') + '*\n\n' +
    '\u0627\u0644\u0645\u0646\u0641\u0630: ' + (s.port||'-') + ' | ' + ltr + (s.lcl_fcl||'') + '\n' +
    '\u0648\u0642\u062a \u0627\u0644\u0648\u0635\u0648\u0644: *' + eta + '*\n' +
    '\u0627\u0644\u062d\u0627\u0644\u0629: *' + (ST[s.status]||s.status) + '*';
  if (s.customs_no) m += '\n\u0631\u0642\u0645 \u0627\u0644\u0628\u064a\u0627\u0646: *' + ltr + s.customs_no + '*';
  if (s.terminal)   m += '\n\u0627\u0644\u0645\u062d\u0637\u0629: ' + s.terminal;
  if (trackingUrl) {
    m += '\n\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n' +
         '\u0631\u0627\u0628\u0637 \u0627\u0644\u062a\u062a\u0628\u0639:\n' +
         ltr + trackingUrl +
         '\n_\u064a\u062a\u062d\u062f\u062b \u062a\u0644\u0642\u0627\u0626\u064a\u0627\u064b \u0645\u0639 \u0643\u0644 \u062a\u063a\u064a\u064a\u0631 \u0641\u064a \u0627\u0644\u062d\u0627\u0644\u0629_';
  }
  m += '\n\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n' +
       '\u0628\u062a\u0627\u0631\u064a\u062e: ' + today + '\n' +
       '\u0634\u0643\u0631\u0627\u064b \u0644\u062b\u0642\u062a\u0643\u0645\n' +
       '_\u0641\u0631\u064a\u0642 \u0627\u0644\u0633\u062f\u064a\u0633 \u0644\u0644\u062e\u062f\u0645\u0627\u062a \u0627\u0644\u0644\u0648\u062c\u0633\u062a\u064a\u0629_';
  return m;
}


/* ONE button: generates token + sends WhatsApp */
async function sendWhatsApp(shipmentId, event) {
  event.stopPropagation();
  const s   = _shipments.find(x => x.id === shipmentId);
  if (!s) return;
  const btn = document.getElementById('wa-btn-' + shipmentId);
  if (btn) { btn.disabled = true; btn.textContent = '...'; }
  try {
    let token = s.tracking_token;
    if (!token) {
      token = await createTrackingLink(shipmentId, s);
      await updateImportShipment(shipmentId, { tracking_token: token });
      s.tracking_token = token;
    }
    const trackingUrl = location.origin + '/track.html?token=' + token;
    const msg         = _buildWAMessage(s, trackingUrl);
    const customer    = _customers.find(c => c.id === s.customer_id);
    const phone       = _fmtWAPhone(customer?.phone || '');
    const url = phone
      ? 'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg)
      : 'https://wa.me/?text='             + encodeURIComponent(msg);
    window.open(url, '_blank');
    if (btn) { btn.textContent = '\u062a\u0645 \u2705'; }
    setTimeout(() => { if (btn) { btn.disabled = false; btn.textContent = '\u0648\u0627\u062a\u0633\u0627\u0628'; } }, 2500);
  } catch(e) {
    if (btn) { btn.disabled = false; btn.textContent = '\u0648\u0627\u062a\u0633\u0627\u0628'; }
    toast('\u062e\u0637\u0623', 'error');
  }
}

window.sendWhatsApp = sendWhatsApp;

