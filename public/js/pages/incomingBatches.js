// ══════════════════════════════════════════════════════════════
// INCOMING BATCHES — Clearance-side view of batches sent from transport
// Each batch → downloadable Excel (SUNARA-style, matches transport export)
// ══════════════════════════════════════════════════════════════

import { getIncomingBatches, markBatchViewed, softDeleteIncomingBatch, restoreIncomingBatch } from '../../../src/firebase/transportDb.js';
import { getCurrentUser, getUserProfile } from '../../../src/firebase/auth.js';
import { toast } from '../app.js';

let _batches = [];
let _profile = null;
let _filter = 'all'; // 'all' | 'new' | 'viewed'
let _search = '';

const DEST_LABELS = {
  uae:     { ar: 'الإمارات', en: 'UAE' },
  bahrain: { ar: 'البحرين',  en: 'BH' },
  oman:    { ar: 'عُمان',     en: 'OM' },
};

export async function renderIncomingBatches(container) {
  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔒</div><div class="empty-title">غير مسجّل</div></div>';
    return;
  }
  if (!_profile) {
    try { _profile = await getUserProfile(user.uid); } catch (e) { _profile = { uid: user.uid }; }
  }

  container.innerHTML = `
    <div class="page-body" style="padding:20px 24px;background:#F5F3EC;min-height:100vh;font-family:Tajawal,sans-serif;">

      <!-- Header -->
      <div class="modern-header">
        <div class="modern-header-brand">
          <div class="modern-header-badges">
            <div class="modern-header-dots">
              <span class="modern-header-dot" style="background:#CC2229;"></span>
              <span class="modern-header-dot" style="background:#1C4B8E;"></span>
              <span class="modern-header-dot" style="background:#2E8B57;"></span>
            </div>
            <span class="modern-header-code">SDS/CUSTOMS/INCOMING-BATCHES/2026</span>
          </div>
          <div class="modern-header-title">📥 الدفعات الواردة من النقل</div>
          <div class="modern-header-sub">INCOMING BATCHES · DOWNLOAD EXCEL PER BATCH</div>
        </div>
      </div>

      <!-- Stats -->
      <div id="ib-stats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:16px;"></div>

      <!-- Filter + search -->
      <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;align-items:center;">
        <button class="ib-filter-btn" data-f="all"    style="padding:7px 16px;border:1px solid #E8E5DC;background:#0E1A2E;color:white;border-radius:6px;font-family:Tajawal,sans-serif;font-size:12px;font-weight:800;cursor:pointer;">الكل</button>
        <button class="ib-filter-btn" data-f="new"    style="padding:7px 16px;border:1px solid #E8E5DC;background:white;color:#0E1A2E;border-radius:6px;font-family:Tajawal,sans-serif;font-size:12px;font-weight:700;cursor:pointer;">جديدة</button>
        <button class="ib-filter-btn" data-f="viewed" style="padding:7px 16px;border:1px solid #E8E5DC;background:white;color:#0E1A2E;border-radius:6px;font-family:Tajawal,sans-serif;font-size:12px;font-weight:700;cursor:pointer;">مقروءة</button>
        <input id="ib-search" type="text" placeholder="🔍 بحث بالعميل أو المرسل..." style="flex:1;min-width:200px;padding:8px 14px;border:1px solid #E8E5DC;border-radius:6px;font-family:Tajawal,sans-serif;font-size:13px;outline:none;">
      </div>

      <!-- List -->
      <div id="ib-list" style="margin-top:18px;">
        <div style="text-align:center;padding:40px;color:#8A8578;">جاري التحميل...</div>
      </div>

    </div>
  `;

  // Wire filter + search
  container.querySelectorAll('.ib-filter-btn').forEach(btn => {
    btn.onclick = () => {
      _filter = btn.dataset.f;
      container.querySelectorAll('.ib-filter-btn').forEach(b => {
        const active = b.dataset.f === _filter;
        b.style.background = active ? '#0E1A2E' : 'white';
        b.style.color = active ? 'white' : '#0E1A2E';
        b.style.fontWeight = active ? '800' : '700';
      });
      renderList();
    };
  });
  container.querySelector('#ib-search').oninput = (e) => {
    _search = e.target.value.trim().toLowerCase();
    renderList();
  };

  await loadData();
}

async function loadData() {
  try {
    _batches = await getIncomingBatches(200);
    renderStats();
    renderList();
  } catch (e) {
    console.error(e);
    document.getElementById('ib-list').innerHTML = `<div style="color:#CC2229;text-align:center;padding:40px;">خطأ في التحميل: ${e.message}</div>`;
  }
}

function renderStats() {
  const total = _batches.length;
  const news = _batches.filter(b => b.status === 'new').length;
  const totalTrucks = _batches.reduce((s, b) => s + (b.trucks_count || 0), 0);
  const totalQty = _batches.reduce((s, b) => s + (b.total_qty || 0), 0);

  const card = (label, value, color, bg, sub) => `
    <div style="background:white;padding:16px 18px;border-radius:8px;border:1px solid #E8E5DC;position:relative;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;letter-spacing:1.5px;font-weight:700;">${label}</div>
      <div style="font-size:26px;font-weight:900;color:${color};margin-top:4px;font-family:'JetBrains Mono',monospace;">${value}</div>
      <div style="font-size:11px;color:#6B6659;margin-top:2px;">${sub}</div>
    </div>
  `;
  document.getElementById('ib-stats').innerHTML =
    card('TOTAL BATCHES',    String(total).padStart(2,'0'),        '#0E1A2E', '#F5F3EC', 'إجمالي الدفعات') +
    card('NEW',              String(news).padStart(2,'0'),         news > 0 ? '#CC2229' : '#8A8578', '#FEEBEB', news > 0 ? 'دفعات جديدة تحتاج مراجعة' : 'كل الدفعات مقروءة') +
    card('TRUCKS',           String(totalTrucks).padStart(2,'0'),   '#1C4B8E', '#EEF2FF', 'إجمالي الشاحنات') +
    card('QTY (MT)',         String(Math.round(totalQty)).padStart(2,'0'), '#2E8B57', '#E7F5EE', 'إجمالي الكميات');
}

function renderList() {
  let list = _batches;
  if (_filter !== 'all') list = list.filter(b => b.status === _filter);
  if (_search) {
    list = list.filter(b =>
      (b.customer || '').toLowerCase().includes(_search) ||
      (b.material || '').toLowerCase().includes(_search) ||
      (b.sent_by_name || '').toLowerCase().includes(_search) ||
      (b.sent_by_email || '').toLowerCase().includes(_search)
    );
  }

  const el = document.getElementById('ib-list');
  if (list.length === 0) {
    el.innerHTML = `
      <div style="background:white;border:1px solid #E8E5DC;border-radius:10px;padding:60px 40px;text-align:center;">
        <div style="font-size:48px;opacity:0.5;">📥</div>
        <div style="font-size:15px;color:#0E1A2E;font-weight:800;margin-top:12px;">لا توجد دفعات</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;margin-top:6px;letter-spacing:1.5px;">NO INCOMING BATCHES</div>
      </div>
    `;
    return;
  }

  el.innerHTML = list.map(b => renderBatchCard(b)).join('');
  // Wire buttons
  list.forEach(b => {
    const excelBtn = document.querySelector(`[data-excel-btn="${b.id}"]`);
    if (excelBtn) excelBtn.onclick = () => downloadBatchExcel(b);
    const viewBtn = document.querySelector(`[data-view-btn="${b.id}"]`);
    if (viewBtn) viewBtn.onclick = () => markAsViewed(b);
    const deleteBtn = document.querySelector(`[data-delete-btn="${b.id}"]`);
    if (deleteBtn) deleteBtn.onclick = () => deleteBatch(b);
  });
}

function renderBatchCard(b) {
  const dateStr = b.sent_at?.toDate ? b.sent_at.toDate() : (b.sent_at ? new Date(b.sent_at) : null);
  const dateFmt = dateStr ? dateStr.toLocaleString('en-GB', { hour12: false }) : '—';
  const timeAgo = dateStr ? formatTimeAgo(dateStr) : '';
  const destInfo = DEST_LABELS[b.destination] || { ar: b.destination, en: (b.destination || '').toUpperCase() };
  const isNew = b.status === 'new';
  const canDelete = _profile?.role === 'admin' || _profile?.role === 'manager';

  return `
    <div style="background:white;border:1px solid ${isNew ? '#F0C040' : '#E8E5DC'};border-radius:10px;margin-bottom:12px;overflow:hidden;box-shadow:0 2px 8px rgba(14,26,46,0.04);${isNew ? 'box-shadow:0 4px 16px rgba(240,192,64,0.15);' : ''}">
      <!-- Header row -->
      <div style="padding:14px 18px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;background:${isNew ? 'linear-gradient(90deg,#FEF9E7 0%,white 100%)' : 'white'};">
        <div style="min-width:0;flex:1;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            ${isNew ? `<span style="background:#CC2229;color:white;padding:2px 8px;border-radius:10px;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:800;letter-spacing:1px;">NEW</span>` : ''}
            <div style="font-size:16px;font-weight:900;color:#0E1A2E;">${b.customer || 'بلا عميل'}</div>
            <span style="color:#8A8578;font-size:12px;">·</span>
            <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#6B6659;font-weight:700;letter-spacing:0.5px;">${b.material || '—'}</span>
            <span style="color:#8A8578;font-size:12px;">·</span>
            <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:${b.destination === 'uae' ? '#1C4B8E' : b.destination === 'bahrain' ? '#CC2229' : '#2E8B57'};font-weight:800;">${destInfo.en} · ${destInfo.ar}</span>
          </div>
          <div style="font-size:11px;color:#8A8578;margin-top:4px;font-family:'JetBrains Mono',monospace;">
            <i class="ti ti-user" style="font-size:11px;"></i> ${b.sent_by_name || 'غير معروف'}
            <span style="margin:0 6px;">·</span>
            <i class="ti ti-clock" style="font-size:11px;"></i> ${timeAgo}
            <span style="margin:0 6px;">·</span>
            <span style="font-size:10px;">${dateFmt}</span>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${isNew ? `<button data-view-btn="${b.id}" style="background:white;color:#6B6659;border:1px solid #E8E5DC;border-radius:5px;padding:8px 14px;font-family:Tajawal,sans-serif;font-size:12px;font-weight:700;cursor:pointer;">
            <i class="ti ti-eye"></i> تم الاطلاع
          </button>` : ''}
          <button data-excel-btn="${b.id}" style="background:#2E8B57;color:white;border:none;border-radius:5px;padding:8px 16px;font-family:Tajawal,sans-serif;font-size:12px;font-weight:800;cursor:pointer;">
            <i class="ti ti-file-spreadsheet"></i> تحميل Excel
          </button>
          ${canDelete ? `<button data-delete-btn="${b.id}" title="حذف الدفعة" style="background:transparent;color:#CC2229;border:1px solid #FCA5A5;border-radius:5px;padding:8px 12px;font-family:Tajawal,sans-serif;font-size:12px;font-weight:700;cursor:pointer;">
            <i class="ti ti-trash"></i>
          </button>` : ''}
        </div>
      </div>

      <!-- Stats strip -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:1px;background:#F0EDE4;">
        <div style="background:white;padding:10px 14px;text-align:center;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:1.5px;font-weight:700;">TRUCKS</div>
          <div style="font-size:20px;font-weight:900;color:#0E1A2E;font-family:'JetBrains Mono',monospace;">${String(b.trucks_count || 0).padStart(2,'0')}</div>
        </div>
        <div style="background:white;padding:10px 14px;text-align:center;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:1.5px;font-weight:700;">TOTAL QTY</div>
          <div style="font-size:20px;font-weight:900;color:#2E8B57;font-family:'JetBrains Mono',monospace;">${(b.total_qty || 0).toFixed(2)}</div>
        </div>
        <div style="background:white;padding:10px 14px;text-align:center;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:1.5px;font-weight:700;">LOCATION</div>
          <div style="font-size:13px;font-weight:800;color:#0E1A2E;font-family:'JetBrains Mono',monospace;margin-top:3px;">${b.loading_location || '—'}</div>
        </div>
        <div style="background:white;padding:10px 14px;text-align:center;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:1.5px;font-weight:700;">DATE</div>
          <div style="font-size:13px;font-weight:800;color:#0E1A2E;font-family:'JetBrains Mono',monospace;margin-top:3px;">${b.dispatch_date || '—'}</div>
        </div>
      </div>
    </div>
  `;
}

function formatTimeAgo(date) {
  const now = new Date();
  const then = date instanceof Date ? date : new Date(date);
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `قبل ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `قبل ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `قبل ${days} يوم`;
  return then.toLocaleDateString('en-GB');
}

async function markAsViewed(b) {
  try {
    await markBatchViewed(b.id, _profile?.name || _profile?.email || 'مستخدم');
    toast('✓ تم وضع علامة "مقروء"', 'success');
    await loadData();
    // Update badge in sidebar if function is exposed
    if (window.updateBadges) window.updateBadges();
  } catch (e) {
    console.error(e);
    toast('فشل التحديث', 'error');
  }
}

// Soft-delete a batch. Shows undo toast for 5 seconds.
let _undoTimer = null;
async function deleteBatch(b) {
  const trucksTxt = `${b.trucks_count || 0} شاحنة`;
  const customerTxt = b.customer || 'بلا عميل';
  if (!confirm(`حذف دفعة "${customerTxt}" (${trucksTxt})؟\nيمكن استرجاعها من زر التراجع خلال 5 ثوانٍ.`)) return;

  try {
    const by = _profile?.name || _profile?.email || 'مستخدم';
    await softDeleteIncomingBatch(b.id, by, 'manual');
    await loadData();
    if (window.updateBadges) window.updateBadges();
    showBatchUndoToast(`حُذفت دفعة ${customerTxt}`, b.id);
  } catch (e) {
    console.error(e);
    toast('خطأ في الحذف', 'error');
  }
}

function showBatchUndoToast(message, batchId) {
  const existing = document.getElementById('ib-undo-toast');
  if (existing) existing.remove();
  if (_undoTimer) clearTimeout(_undoTimer);

  const t = document.createElement('div');
  t.id = 'ib-undo-toast';
  t.style.cssText = `
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:#0E1A2E;color:white;padding:12px 18px;border-radius:8px;
    box-shadow:0 8px 24px rgba(14,26,46,0.35);z-index:100000;
    display:flex;align-items:center;gap:14px;font-family:'Tajawal',sans-serif;
    font-size:13px;font-weight:700;min-width:280px;
  `;
  t.innerHTML = `
    <span><i class="ti ti-trash" style="color:#F0C040;"></i> ${message}</span>
    <button id="ib-undo-btn" style="background:#D4B266;color:#0E1A2E;border:none;border-radius:5px;padding:6px 14px;font-family:'Tajawal',sans-serif;font-size:12px;font-weight:800;cursor:pointer;">
      <i class="ti ti-arrow-back-up"></i> تراجع
    </button>
    <button id="ib-undo-close" style="background:transparent;border:none;color:#B8B0A0;cursor:pointer;font-size:18px;padding:0 4px;">×</button>
  `;
  document.body.appendChild(t);

  document.getElementById('ib-undo-btn').onclick = async () => {
    clearTimeout(_undoTimer);
    t.remove();
    try {
      await restoreIncomingBatch(batchId);
      await loadData();
      if (window.updateBadges) window.updateBadges();
      toast('✓ استُعيدت الدفعة', 'success');
    } catch (e) {
      console.error(e);
      toast('فشل الاستعادة', 'error');
    }
  };
  document.getElementById('ib-undo-close').onclick = () => {
    clearTimeout(_undoTimer);
    t.remove();
  };

  _undoTimer = setTimeout(() => t.remove(), 5000);
}

// ══════════════════════════════════════════════════════════════
// EXCEL DOWNLOAD — SUNARA-style xlsx (matches transport export)
// ══════════════════════════════════════════════════════════════

function extractPlateDigits(plate) {
  if (!plate) return '';
  const digits = String(plate).match(/\d+/g);
  return digits ? digits.join('') : String(plate);
}

async function downloadBatchExcel(batch) {
  const trucks = batch.trucks || [];
  if (trucks.length === 0) {
    toast('لا توجد شاحنات في هذه الدفعة', 'error');
    return;
  }

  // Lazy-load xlsx-js-style
  if (!window.XLSX || !window.XLSX._styled) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    if (window.XLSX) window.XLSX._styled = true;
  }
  const XLSX = window.XLSX;

  const BORDER = {
    top:    { style: 'thin', color: { rgb: '8B7355' } },
    bottom: { style: 'thin', color: { rgb: '8B7355' } },
    left:   { style: 'thin', color: { rgb: '8B7355' } },
    right:  { style: 'thin', color: { rgb: '8B7355' } },
  };
  const TITLE_STYLE = {
    font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
    fill: { fgColor: { rgb: '0E1A2E' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BORDER,
  };
  const SUBTITLE_STYLE = {
    font: { bold: true, sz: 11, color: { rgb: 'D4B266' }, name: 'Calibri' },
    fill: { fgColor: { rgb: '1C2B48' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BORDER,
  };
  const HEADER_STYLE = {
    font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
    fill: { fgColor: { rgb: '0E1A2E' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: BORDER,
  };
  const CELL_STYLE = (isEven) => ({
    font: { sz: 10, name: 'Calibri', color: { rgb: '0E1A2E' } },
    fill: { fgColor: { rgb: isEven ? 'F8F5EC' : 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BORDER,
  });
  const CELL_STYLE_LEFT = (isEven) => ({
    ...CELL_STYLE(isEven),
    alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
  });

  const headers = [
    'S/N', 'Location', 'Truck Number', 'ETA - Loading', 'Driver Name',
    'Driver Number', 'Driver Nationality', 'Customer', 'Material',
    'Qty (MT)', 'Dispatch Date', 'Delivery SLIP', 'Phone', 'Axles'
  ];

  const dateStr = batch.sent_at?.toDate ? batch.sent_at.toDate().toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
  const customerName = batch.customer || 'Transport';

  const aoa = [
    ['السديس اللوجستية · AL SUDAIS LOGISTICS'],
    [`INCOMING BATCH · ${customerName.toUpperCase()} · ${dateStr}`],
    [],
    headers,
    ...trucks.map((t, i) => {
      const dash = '—';
      return [
        i + 1,
        t.loading_location || batch.loading_location || dash,
        extractPlateDigits(t.truck_number || '') || dash,
        t.dispatch_date || batch.dispatch_date || dash,
        t.driver_name || dash,
        t.driver_id_number || dash,
        t.driver_nationality || dash,
        batch.customer || dash,
        batch.material || dash,
        t.quantity || dash,
        t.dispatch_date || batch.dispatch_date || dash,
        t.delivery_number || dash,
        t.phone || dash,
        dash
      ];
    })
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } },
  ];
  ws['!rows'] = [
    { hpt: 28 }, { hpt: 20 }, { hpt: 10 }, { hpt: 30 },
    ...trucks.map(() => ({ hpt: 22 }))
  ];
  ws['!cols'] = [
    { wch: 6 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 24 },
    { wch: 15 }, { wch: 16 }, { wch: 20 }, { wch: 12 }, { wch: 10 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 8 },
  ];
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = 0; C <= 13; C++) {
    const a = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[a]) ws[a] = { t: 's', v: '' };
    ws[a].s = TITLE_STYLE;
  }
  for (let C = 0; C <= 13; C++) {
    const a = XLSX.utils.encode_cell({ r: 1, c: C });
    if (!ws[a]) ws[a] = { t: 's', v: '' };
    ws[a].s = SUBTITLE_STYLE;
  }
  for (let C = 0; C <= 13; C++) {
    const a = XLSX.utils.encode_cell({ r: 3, c: C });
    if (!ws[a]) continue;
    ws[a].s = HEADER_STYLE;
  }
  for (let R = 4; R <= range.e.r; R++) {
    const isEven = (R - 4) % 2 === 1;
    for (let C = 0; C <= 13; C++) {
      const a = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[a]) ws[a] = { t: 's', v: '' };
      ws[a].s = (C === 4 || C === 7) ? CELL_STYLE_LEFT(isEven) : CELL_STYLE(isEven);
    }
  }
  const wb = XLSX.utils.book_new();
  const sheetName = customerName.substring(0, 25).replace(/[\/\\?*[\]:]/g, '');
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const filename = `${customerName}_${(dateStr || '').replace(/\//g,'-')}.xlsx`;
  XLSX.writeFile(wb, filename);

  toast(`✓ تم تحميل Excel (${trucks.length} شاحنة)`, 'success');

  // Auto-mark as viewed after Excel download
  if (batch.status === 'new') {
    try {
      await markBatchViewed(batch.id, _profile?.name || _profile?.email || 'مستخدم');
      await loadData();
      if (window.updateBadges) window.updateBadges();
    } catch (e) { console.warn('auto-mark viewed failed:', e); }
  }
}
