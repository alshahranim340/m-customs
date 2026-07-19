import {
  getExpenses, createExpense, updateExpense, deleteExpense,
  getImportShipments, getCustomers, getFeeTypes, addFeeType
} from '../../../../src/firebase/importDb.js';
import { toast } from '../../app.js';
import { fileToBase64 } from '../../../../src/utils/fileUtils.js';
import { downloadBytes, mergePDFs, base64ToUint8Array } from '../../../../src/utils/fileUtils.js';

let _expenses   = [];
let _shipments  = [];
let _customers  = [];
let _feeTypes   = [];

export async function renderImportExpenses(container) {
  container.innerHTML = `
    <div class="topbar">
      <div>
        <div class="topbar-title">💰 المصاريف</div>
        <div class="topbar-sub">فواتير مصاريف العملاء</div>
      </div>
      <div class="topbar-actions">
        <button class="btn btn-ghost" id="btn-print-expenses" onclick="openExpensesReportModal()">
          <i class="ti ti-printer"></i> طباعة تقرير
        </button>
        <button class="btn btn-primary" id="btn-new-expense">
          <i class="ti ti-plus"></i> فاتورة جديدة
        </button>
      </div>
    </div>
    <div class="page-body">
      <!-- Summary -->
      <div class="stats-row" id="exp-stats"></div>
      <!-- List -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">📋 الفواتير</div>
          <input type="text" id="exp-search" placeholder="🔍 بحث..."
            style="padding:7px 12px;border:0.5px solid var(--border);border-radius:8px;font-family:Tajawal,sans-serif;font-size:13px;outline:none;width:200px;">
        </div>
        <div id="exp-list"><div class="loader"><div class="spinner"></div></div></div>
      </div>
    </div>

    <!-- MODAL -->
    <div id="exp-modal" class="modal-overlay hidden">
      <div class="modal-box" style="max-width:640px;max-height:90vh;overflow-y:auto;">
        <div id="exp-modal-content"></div>
      </div>
    </div>`;

  try {
    [_expenses, _shipments, _customers, _feeTypes] = await Promise.all([
      getExpenses(), getImportShipments(), getCustomers(), getFeeTypes()
    ]);
    _renderStats();
    _renderList();
  } catch(e) {
    document.getElementById('exp-list').innerHTML =
      `<div class="empty-state"><div class="empty-title">خطأ في التحميل</div></div>`;
  }

  document.getElementById('btn-new-expense').onclick = () => openExpenseModal();
  document.getElementById('exp-search').oninput = e => _renderList(e.target.value);

  window.openExpensesReportModal = openExpensesReportModal;
  window.printExpensesReport     = printExpensesReport;
  window.openExpenseModal  = openExpenseModal;
  window.closeExpenseModal = closeExpenseModal;
  window.saveExpense       = saveExpense;
  window.editExpense       = editExpense;
  window.deleteExpenseUI   = deleteExpenseUI;
  window.togglePaid        = togglePaid;
  window.addFeeRow         = addFeeRow;
  window.removeFeeRow      = removeFeeRow;
  window.exportExpensePdf  = exportExpensePdf;
  window.onExpCustomerChange = onExpCustomerChange;
}

function _totalOf(exp) {
  return (exp.items || []).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
}

function _renderStats() {
  const total   = _expenses.reduce((s, e) => s + _totalOf(e), 0);
  const paid    = _expenses.filter(e => e.paid).reduce((s, e) => s + _totalOf(e), 0);
  const unpaid  = total - paid;
  const fmt = n => n.toLocaleString('ar-SA', { minimumFractionDigits: 2 });

  document.getElementById('exp-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon" style="background:#FFF7ED;"><i class="ti ti-receipt" style="font-size:22px;color:#f97316"></i></div>
      <div><div class="stat-num" style="font-size:18px;">${fmt(total)}</div><div class="stat-label">إجمالي (ر.س)</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon si-green"><i class="ti ti-cash" style="font-size:22px;color:var(--green)"></i></div>
      <div><div class="stat-num" style="font-size:18px;color:var(--green);">${fmt(paid)}</div><div class="stat-label">المدفوع (ر.س)</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon si-red"><i class="ti ti-alert-circle" style="font-size:22px;color:var(--red)"></i></div>
      <div><div class="stat-num" style="font-size:18px;color:var(--red);">${fmt(unpaid)}</div><div class="stat-label">المتبقي (ر.س)</div></div>
    </div>`;
}

function _renderList(search = '') {
  let list = _expenses;
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(e =>
      e.customer_name?.toLowerCase().includes(q) ||
      e.shipment_bl?.toLowerCase().includes(q)
    );
  }

  const el = document.getElementById('exp-list');
  if (!el) return;

  if (list.length === 0) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-icon">💰</div>
      <div class="empty-title">لا توجد فواتير</div>
      <div class="empty-sub">ابدأ بإضافة فاتورة جديدة</div>
    </div>`;
    return;
  }

  const fmt = n => parseFloat(n || 0).toLocaleString('ar-SA', { minimumFractionDigits: 2 });

  el.innerHTML = `
    <div class="ship-list">
      ${list.map(e => {
        const total = _totalOf(e);
        return `
        <div class="ship-item" style="flex-direction:column;align-items:stretch;padding:14px 18px;gap:10px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="flex:1;">
              <div style="font-weight:700;color:var(--navy);font-size:14px;">🏢 ${e.customer_name||'—'}</div>
              <div style="font-size:12px;color:var(--muted);margin-top:2px;">📦 ${e.shipment_bl||'—'} &nbsp;|&nbsp; 📅 ${_fmtDate(e.invoice_date)}</div>
            </div>
            <div style="text-align:left;">
              <div style="font-size:18px;font-weight:800;color:var(--navy);">${fmt(total)} ر.س</div>
              <div style="text-align:center;">
                <span class="pill ${e.paid ? 'pill-done' : 'pill-draft'}" style="cursor:pointer;"
                  onclick="togglePaid('${e.id}',${e.paid})">
                  ${e.paid ? '✅ مدفوع' : '⏳ لم يتم الدفع'}
                </span>
              </div>
            </div>
          </div>
          <!-- Fee items -->
          <div style="background:var(--surface);border-radius:8px;padding:10px 12px;">
            <table style="width:100%;font-size:12px;border-collapse:collapse;">
              <thead>
                <tr style="color:var(--muted);font-weight:600;">
                  <th style="text-align:right;padding:3px 6px;">نوع الرسوم</th>
                  <th style="text-align:center;padding:3px 6px;">المبلغ (ر.س)</th>
                  <th style="text-align:center;padding:3px 6px;">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                ${(e.items||[]).map(i => `
                  <tr style="border-top:0.5px solid var(--border);">
                    <td style="padding:5px 6px;">${i.fee_type||'—'}</td>
                    <td style="padding:5px 6px;text-align:center;font-weight:600;">${fmt(i.amount)}</td>
                    <td style="padding:5px 6px;text-align:center;color:var(--muted);">${_fmtDate(i.date)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <!-- Actions -->
          <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="btn btn-sm btn-ghost" onclick="exportExpensePdf('${e.id}')">
              <i class="ti ti-file-download"></i> PDF
            </button>
            <button class="btn btn-sm btn-ghost" onclick="editExpense('${e.id}')">
              <i class="ti ti-edit"></i> تعديل
            </button>
            <button class="btn btn-sm btn-ghost" onclick="deleteExpenseUI('${e.id}')" style="color:var(--red);">
              <i class="ti ti-trash"></i>
            </button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

// ─────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────
function openExpenseModal(expense = null) {
  const isEdit = !!expense;
  const e = expense || {};
  const items = e.items || [{ fee_type: '', amount: '', date: '' }];

  const custOptions = _customers.map(c =>
    `<option value="${c.id}" data-name="${c.company_name}" ${e.customer_id===c.id?'selected':''}>${c.company_name}</option>`
  ).join('');

  // Shipments filtered by customer (show all initially)
  const shipOptions = _shipments.map(s =>
    `<option value="${s.id}" data-bl="${s.bl_number}" ${e.shipment_id===s.id?'selected':''}>${s.bl_number} — ${s.customer_name}</option>`
  ).join('');

  document.getElementById('exp-modal-content').innerHTML = `
    <div class="modal-title">${isEdit ? '✏️ تعديل فاتورة' : '💰 فاتورة جديدة'}</div>
    <input type="hidden" id="exp-id" value="${e.id||''}">

    <div class="field">
      <label>العميل *</label>
      <select id="exp-customer" onchange="onExpCustomerChange(this.value)">
        <option value="">— اختر العميل —</option>
        ${custOptions}
      </select>
    </div>

    <div class="field">
      <label>الشحنة *</label>
      <select id="exp-shipment">
        <option value="">— اختر الشحنة —</option>
        ${shipOptions}
      </select>
    </div>

    <div class="field">
      <label>تاريخ الفاتورة *</label>
      <input type="date" id="exp-date" value="${e.invoice_date || new Date().toISOString().split('T')[0]}">
    </div>

    <!-- Fee rows -->
    <div style="margin:12px 0 8px;font-weight:700;color:var(--navy);font-size:13px;border-bottom:1px solid var(--border);padding-bottom:6px;">
      بنود الرسوم
      <button type="button" class="btn btn-sm btn-ghost" onclick="addFeeRow()" style="margin-right:8px;">
        <i class="ti ti-plus"></i> إضافة بند
      </button>
    </div>
    <div id="fee-rows">
      ${items.map((item, i) => _feeRowHtml(i, item)).join('')}
    </div>

    <div id="exp-error" style="display:none;background:var(--red-light);color:var(--red);border-radius:8px;padding:9px 12px;font-size:12px;margin-top:8px;"></div>

    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeExpenseModal()">إلغاء</button>
      <button class="btn btn-primary" id="exp-save-btn" onclick="saveExpense()">💾 حفظ الفاتورة</button>
    </div>`;

  document.getElementById('exp-modal').classList.remove('hidden');
}

function _feeRowHtml(i, item = {}) {
  const feeOpts = _feeTypes.map(f =>
    `<option value="${f}" ${item.fee_type===f?'selected':''}>${f}</option>`
  ).join('');
  return `
    <div class="fee-row" data-idx="${i}" style="display:grid;grid-template-columns:1fr 120px 140px 36px;gap:8px;margin-bottom:8px;align-items:center;">
      <select class="fee-type" style="padding:8px;border:0.5px solid var(--border);border-radius:8px;font-family:Tajawal,sans-serif;font-size:13px;">
        <option value="">— نوع الرسوم —</option>
        ${feeOpts}
        <option value="__new__">➕ إضافة نوع جديد...</option>
      </select>
      <input type="number" class="fee-amount" placeholder="المبلغ" value="${item.amount||''}"
        style="padding:8px;border:0.5px solid var(--border);border-radius:8px;font-family:Tajawal,sans-serif;font-size:13px;text-align:center;">
      <input type="date" class="fee-date" value="${item.date||new Date().toISOString().split('T')[0]}"
        style="padding:8px;border:0.5px solid var(--border);border-radius:8px;font-family:Tajawal,sans-serif;font-size:13px;">
      <button type="button" onclick="removeFeeRow(${i})" style="background:var(--red-light);color:var(--red);border:none;border-radius:8px;width:36px;height:36px;cursor:pointer;font-size:16px;">×</button>
    </div>`;
}

function addFeeRow() {
  const rows = document.getElementById('fee-rows');
  const i = rows.querySelectorAll('.fee-row').length;
  rows.insertAdjacentHTML('beforeend', _feeRowHtml(i));
  // Handle new fee type option
  rows.querySelectorAll('.fee-type').forEach(sel => {
    sel.onchange = async function() {
      if (this.value === '__new__') {
        const name = prompt('اسم نوع الرسوم الجديد:');
        if (name?.trim()) {
          await addFeeType(name.trim());
          _feeTypes = await getFeeTypes();
          this.innerHTML = _feeTypes.map(f => `<option value="${f}">${f}</option>`).join('') +
            `<option value="__new__">➕ إضافة نوع جديد...</option>`;
          this.value = name.trim();
        } else {
          this.value = '';
        }
      }
    };
  });
}

function removeFeeRow(i) {
  const row = document.querySelector(`.fee-row[data-idx="${i}"]`);
  if (row && document.querySelectorAll('.fee-row').length > 1) row.remove();
}

function onExpCustomerChange(customerId) {
  const shipSel = document.getElementById('exp-shipment');
  const filtered = _shipments.filter(s => s.customer_id === customerId);
  shipSel.innerHTML = `<option value="">— اختر الشحنة —</option>` +
    filtered.map(s => `<option value="${s.id}" data-bl="${s.bl_number}">${s.bl_number}</option>`).join('');
}

function closeExpenseModal() {
  document.getElementById('exp-modal').classList.add('hidden');
}

async function saveExpense() {
  const id        = document.getElementById('exp-id')?.value;
  const custSel   = document.getElementById('exp-customer');
  const shipSel   = document.getElementById('exp-shipment');
  const date      = document.getElementById('exp-date')?.value;
  const errEl     = document.getElementById('exp-error');

  const customerId   = custSel?.value;
  const customerName = custSel?.options[custSel.selectedIndex]?.dataset.name || '';
  const shipmentId   = shipSel?.value;
  const shipmentBl   = shipSel?.options[shipSel.selectedIndex]?.dataset.bl || '';

  // Collect fee rows
  const items = [];
  document.querySelectorAll('.fee-row').forEach(row => {
    const ft = row.querySelector('.fee-type')?.value;
    const am = row.querySelector('.fee-amount')?.value;
    const dt = row.querySelector('.fee-date')?.value;
    if (ft && am) items.push({ fee_type: ft, amount: parseFloat(am), date: dt });
  });

  if (!customerId || !shipmentId || !date || items.length === 0) {
    errEl.textContent = 'يرجى تعبئة جميع الحقول وإضافة بند واحد على الأقل';
    errEl.style.display = 'block';
    return;
  }

  const btn = document.getElementById('exp-save-btn');
  btn.disabled = true; btn.textContent = '⏳ جاري الحفظ...';
  errEl.style.display = 'none';

  try {
    const data = { customer_id: customerId, customer_name: customerName,
                   shipment_id: shipmentId, shipment_bl: shipmentBl,
                   invoice_date: date, items };

    if (id) {
      await updateExpense(id, data);
      toast('✅ تم تحديث الفاتورة', 'success');
    } else {
      await createExpense(data);
      toast('✅ تم حفظ الفاتورة', 'success');
    }

    closeExpenseModal();
    _expenses = await getExpenses();
    _renderStats();
    _renderList();
  } catch(e) {
    errEl.textContent = 'حدث خطأ، حاول مرة أخرى';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 حفظ الفاتورة';
  }
}

async function editExpense(id) {
  const e = _expenses.find(x => x.id === id);
  if (e) openExpenseModal(e);
}

async function deleteExpenseUI(id) {
  if (!confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) return;
  try {
    await deleteExpense(id);
    toast('تم حذف الفاتورة', 'error');
    _expenses = await getExpenses();
    _renderStats();
    _renderList();
  } catch(e) {
    toast('خطأ في الحذف', 'error');
  }
}

async function togglePaid(id, currentPaid) {
  try {
    await updateExpense(id, { paid: !currentPaid });
    const e = _expenses.find(x => x.id === id);
    if (e) e.paid = !currentPaid;
    toast(currentPaid ? '⏳ تم تغيير الحالة لغير مدفوع' : '✅ تم تحديد الفاتورة كمدفوعة', 'success');
    _renderStats();
    _renderList();
  } catch(err) {
    toast('خطأ في التحديث', 'error');
  }
}

async function exportExpensePdf(id) {
  const e = _expenses.find(x => x.id === id);
  if (!e) return;
  toast('⏳ جاري تحضير PDF...', 'success');

  const fmt = n => parseFloat(n||0).toLocaleString('ar-SA', { minimumFractionDigits: 2 });
  const total = _totalOf(e);

  const html = `
    <style>
      body{font-family:Tajawal,sans-serif;direction:rtl;color:#1C2D4E;}
      .header{background:#1C2D4E;color:white;padding:16px 24px;border-radius:8px 8px 0 0;}
      .title{font-size:20px;font-weight:800;}
      .sub{font-size:12px;opacity:.7;margin-top:4px;}
      .info{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px 24px;background:#f8fafc;}
      .info-item label{font-size:11px;color:#5a7090;}
      .info-item div{font-weight:700;font-size:14px;}
      table{width:100%;border-collapse:collapse;margin:16px 24px;width:calc(100% - 48px);}
      th{background:#1C2D4E;color:white;padding:10px;font-size:12px;}
      td{padding:10px;border-bottom:1px solid #e2e8f0;font-size:13px;}
      .total-row{background:#f0f9ff;font-weight:800;font-size:15px;}
      .status{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;
        background:${e.paid?'#dcfce7':'#fef3c7'};color:${e.paid?'#166534':'#92400e'};}
      .footer{text-align:center;font-size:11px;color:#5a7090;padding:16px;border-top:1px solid #e2e8f0;}
    </style>
    <div class="header">
      <div class="title">فاتورة مصاريف</div>
      <div class="sub">شركة السديس للخدمات اللوجستية — نظام الوارد</div>
    </div>
    <div class="info">
      <div class="info-item"><label>العميل</label><div>${e.customer_name}</div></div>
      <div class="info-item"><label>رقم البوليصة</label><div>${e.shipment_bl}</div></div>
      <div class="info-item"><label>تاريخ الفاتورة</label><div>${_fmtDate(e.invoice_date)}</div></div>
      <div class="info-item"><label>الحالة</label><div><span class="status">${e.paid?'مدفوع':'لم يتم الدفع'}</span></div></div>
    </div>
    <table>
      <thead><tr><th>نوع الرسوم</th><th>المبلغ (ر.س)</th><th>التاريخ</th></tr></thead>
      <tbody>
        ${(e.items||[]).map(i => `<tr><td>${i.fee_type}</td><td style="text-align:center;">${fmt(i.amount)}</td><td style="text-align:center;">${_fmtDate(i.date)}</td></tr>`).join('')}
        <tr class="total-row"><td>الإجمالي</td><td style="text-align:center;">${fmt(total)}</td><td></td></tr>
      </tbody>
    </table>
    <div class="footer">M-Customs — نظام التخليص الجمركي</div>`;

  const { htmlToPdfBytes } = await import('../../../../src/utils/fileUtils.js');
  const bytes = await htmlToPdfBytes(html);
  downloadBytes(bytes, `فاتورة-${e.customer_name}-${e.shipment_bl}.pdf`);
}

function _fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-SA', { year:'numeric', month:'short', day:'numeric' });
}

// ─────────────────────────────────────────────
// EXPENSES REPORT MODAL
// ─────────────────────────────────────────────
function openExpensesReportModal() {
  // Build customer options
  const custSet = [...new Set(_expenses.map(e => e.customer_name).filter(Boolean))];
  const custOptions = custSet.map(c => `<option value="${c}">${c}</option>`).join('');

  // Create modal if not exists
  let modal = document.getElementById('exp-report-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'exp-report-modal';
    modal.className = 'modal-overlay hidden';
    modal.innerHTML = `
      <div class="modal-box" style="max-width:420px;">
        <div class="modal-title">🖨️ طباعة تقرير المصاريف</div>

        <div class="field">
          <label>نوع التقرير</label>
          <select id="rpt-type" onchange="toggleReportType(this.value)">
            <option value="all">تقرير شامل — جميع العملاء</option>
            <option value="customer">تقرير عميل محدد</option>
          </select>
        </div>

        <div class="field" id="rpt-cust-field" style="display:none;">
          <label>اختر العميل</label>
          <select id="rpt-customer">
            <option value="">— اختر —</option>
            ${custOptions}
          </select>
        </div>

        <div class="field">
          <label>الحالة</label>
          <select id="rpt-status">
            <option value="all">الكل</option>
            <option value="paid">مدفوع فقط</option>
            <option value="unpaid">غير مدفوع فقط</option>
          </select>
        </div>

        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="document.getElementById('exp-report-modal').classList.add('hidden')">إلغاء</button>
          <button class="btn btn-primary" onclick="printExpensesReport()">
            <i class="ti ti-printer"></i> طباعة
          </button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    window.toggleReportType = (v) => {
      document.getElementById('rpt-cust-field').style.display = v === 'customer' ? 'block' : 'none';
    };
  }
  modal.classList.remove('hidden');
}

function printExpensesReport() {
  const type     = document.getElementById('rpt-type')?.value || 'all';
  const custName = document.getElementById('rpt-customer')?.value || '';
  const status   = document.getElementById('rpt-status')?.value || 'all';

  // Filter expenses
  let list = [..._expenses];
  if (type === 'customer' && custName) list = list.filter(e => e.customer_name === custName);
  if (status === 'paid')   list = list.filter(e => e.paid);
  if (status === 'unpaid') list = list.filter(e => !e.paid);

  if (list.length === 0) {
    toast('لا توجد بيانات لطباعتها', 'error');
    return;
  }

  document.getElementById('exp-report-modal').classList.add('hidden');

  const now        = new Date().toLocaleDateString('ar-SA', { year:'numeric', month:'long', day:'numeric' });
  const fmt        = n => parseFloat(n||0).toLocaleString('ar-SA', { minimumFractionDigits: 2 });
  const totalAll   = list.reduce((s, e) => s + _totalOf(e), 0);
  const totalPaid  = list.filter(e => e.paid).reduce((s, e) => s + _totalOf(e), 0);
  const totalUnpaid = totalAll - totalPaid;

  // Group by customer for summary
  const byCustomer = {};
  list.forEach(e => {
    if (!byCustomer[e.customer_name]) byCustomer[e.customer_name] = { total: 0, paid: 0, count: 0 };
    byCustomer[e.customer_name].total += _totalOf(e);
    if (e.paid) byCustomer[e.customer_name].paid += _totalOf(e);
    byCustomer[e.customer_name].count++;
  });

  const reportTitle = type === 'customer' && custName
    ? `تقرير مصاريف — ${custName}`
    : 'تقرير مصاريف شامل';

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${reportTitle}</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Tajawal',sans-serif; direction:rtl; color:#1C2D4E; padding:28px; }

        .header { display:flex; justify-content:space-between; align-items:flex-start;
          padding-bottom:14px; border-bottom:3px solid #1C2D4E; margin-bottom:20px; }
        .co-name { font-size:15px; font-weight:800; }
        .co-sub  { font-size:11px; color:#5a7090; margin-top:3px; }
        .report-title { font-size:20px; font-weight:800; text-align:center; margin-bottom:18px; }
        .date { font-size:12px; color:#5a7090; text-align:left; }

        .stats { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:20px; }
        .stat  { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; text-align:center; }
        .stat-num { font-size:22px; font-weight:800; }
        .stat-lbl { font-size:11px; color:#5a7090; margin-top:3px; }

        .section-title { font-size:13px; font-weight:800; margin:18px 0 8px;
          padding-bottom:5px; border-bottom:1px solid #e2e8f0; }

        /* Summary table */
        .summary-table { width:100%; border-collapse:collapse; margin-bottom:20px; font-size:12px; }
        .summary-table thead tr { background:#1C2D4E; color:white; }
        .summary-table th { padding:8px 12px; text-align:right; }
        .summary-table td { padding:8px 12px; border-bottom:0.5px solid #e2e8f0; }
        .summary-table tr:nth-child(even) td { background:#f8fafc; }

        /* Detail cards */
        .exp-card { border:1px solid #e2e8f0; border-radius:8px; margin-bottom:14px; overflow:hidden; page-break-inside:avoid; }
        .exp-card-head { background:#1C2D4E; color:white; padding:10px 14px;
          display:flex; justify-content:space-between; align-items:center; }
        .exp-card-head .title { font-size:13px; font-weight:700; }
        .exp-card-head .meta  { font-size:11px; opacity:.7; }
        .exp-card-body { padding:0; }
        .fee-row { display:flex; justify-content:space-between; padding:8px 14px;
          border-bottom:0.5px solid #f0f0f0; font-size:12px; }
        .fee-row:last-child { border:none; }
        .total-row { background:#f0f9ff; font-weight:800; font-size:13px; padding:10px 14px;
          display:flex; justify-content:space-between; border-top:1px solid #e2e8f0; }
        .badge { display:inline-block; padding:2px 10px; border-radius:12px; font-size:11px; font-weight:700; }
        .b-paid   { background:#dcfce7; color:#166534; }
        .b-unpaid { background:#fef3c7; color:#92400e; }

        .footer { margin-top:28px; text-align:center; font-size:11px; color:#5a7090;
          border-top:1px solid #e2e8f0; padding-top:10px; }
        @media print { body { padding:16px; } @page { margin:1cm; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="co-name">شركة عبدالرحمن عبدالعزيز السديس للخدمات اللوجستية</div>
          <div class="co-sub">ABDULRAHMAN ABDULAZIZ AL-SUDAIS LOGISTICS SERVICES CO.</div>
        </div>
        <div class="date"><div>تاريخ التقرير</div><div style="font-weight:700;margin-top:3px;">${now}</div></div>
      </div>

      <div class="report-title">💰 ${reportTitle}</div>

      <!-- Stats -->
      <div class="stats">
        <div class="stat"><div class="stat-num">${fmt(totalAll)}</div><div class="stat-lbl">الإجمالي (ر.س)</div></div>
        <div class="stat"><div class="stat-num" style="color:#166534;">${fmt(totalPaid)}</div><div class="stat-lbl">المدفوع (ر.س)</div></div>
        <div class="stat"><div class="stat-num" style="color:#b91c1c;">${fmt(totalUnpaid)}</div><div class="stat-lbl">المتبقي (ر.س)</div></div>
      </div>

      ${type === 'all' ? `
      <!-- Customer Summary -->
      <div class="section-title">📊 ملخص حسب العميل</div>
      <table class="summary-table">
        <thead><tr>
          <th>#</th><th>العميل</th><th>عدد الفواتير</th>
          <th>الإجمالي (ر.س)</th><th>المدفوع (ر.س)</th><th>المتبقي (ر.س)</th>
        </tr></thead>
        <tbody>
          ${Object.entries(byCustomer).map(([name, d], i) => `
            <tr>
              <td style="color:#5a7090;">${i+1}</td>
              <td style="font-weight:700;">${name}</td>
              <td style="text-align:center;">${d.count}</td>
              <td style="font-weight:700;">${fmt(d.total)}</td>
              <td style="color:#166534;font-weight:700;">${fmt(d.paid)}</td>
              <td style="color:#b91c1c;font-weight:700;">${fmt(d.total - d.paid)}</td>
            </tr>`).join('')}
        </tbody>
      </table>` : ''}

      <!-- Detail -->
      <div class="section-title">📋 تفاصيل الفواتير</div>
      ${list.map(e => `
        <div class="exp-card">
          <div class="exp-card-head">
            <div>
              <div class="title">🏢 ${e.customer_name||'—'}</div>
              <div class="meta">📦 ${e.shipment_bl||'—'} &nbsp;|&nbsp; 📅 ${_fmtDate(e.invoice_date)}</div>
            </div>
            <span class="badge ${e.paid?'b-paid':'b-unpaid'}">${e.paid?'✅ مدفوع':'⏳ لم يتم الدفع'}</span>
          </div>
          <div class="exp-card-body">
            ${(e.items||[]).map(i => `
              <div class="fee-row">
                <span>${i.fee_type||'—'}</span>
                <span style="color:#5a7090;font-size:11px;">${_fmtDate(i.date)}</span>
                <span style="font-weight:700;">${fmt(i.amount)} ر.س</span>
              </div>`).join('')}
            <div class="total-row">
              <span>الإجمالي</span>
              <span>${fmt(_totalOf(e))} ر.س</span>
            </div>
          </div>
        </div>`).join('')}

      <div class="footer">M-Customs — نظام التخليص الجمركي &nbsp;|&nbsp; شركة السديس للخدمات اللوجستية</div>
      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `);
  win.document.close();
}
