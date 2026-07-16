import { getAgents, addAgent } from '../../../src/firebase/importDb.js';
import { toast } from '../app.js';

let _agents = [];

export async function renderImportAgents(container) {
  container.innerHTML = `
    <div class="topbar">
      <div>
        <div class="topbar-title">🤝 قائمة الوكلاء</div>
        <div class="topbar-sub">وكلاء الشحن الملاحي</div>
      </div>
      <div class="topbar-actions">
        <button class="btn btn-primary" id="btn-new-agent">
          <i class="ti ti-plus"></i> وكيل جديد
        </button>
      </div>
    </div>
    <div class="page-body">
      <div class="card">
        <div class="card-header">
          <div class="card-title">📋 الوكلاء (${0})</div>
          <input type="text" id="agent-search" placeholder="🔍 بحث بالاسم أو الإيميل..."
            style="padding:7px 12px;border:0.5px solid var(--border);border-radius:8px;font-family:Tajawal,sans-serif;font-size:13px;outline:none;width:240px;">
        </div>
        <div id="agent-list"><div class="loader"><div class="spinner"></div></div></div>
      </div>
    </div>

    <!-- MODAL -->
    <div id="agent-modal" class="modal-overlay hidden">
      <div class="modal-box" style="max-width:480px;">
        <div class="modal-title">🤝 إضافة وكيل جديد</div>
        <div class="field">
          <label>اسم الشركة *</label>
          <input type="text" id="agent-name">
        </div>
        <div class="field">
          <label>الإيميلات (سطر لكل إيميل)</label>
          <textarea id="agent-emails" rows="5" style="width:100%;padding:9px 12px;border:0.5px solid var(--border);border-radius:8px;font-family:Tajawal,sans-serif;font-size:13px;resize:vertical;outline:none;direction:ltr;"></textarea>
        </div>
        <div id="agent-error" style="display:none;background:var(--red-light);color:var(--red);border-radius:8px;padding:9px 12px;font-size:12px;"></div>
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="closeAgentModal()">إلغاء</button>
          <button class="btn btn-primary" id="agent-save-btn" onclick="saveAgent()">💾 حفظ الوكيل</button>
        </div>
      </div>
    </div>`;

  try {
    _agents = await getAgents();
    _updateCount();
    _renderList();
  } catch(e) {
    document.getElementById('agent-list').innerHTML =
      `<div class="empty-state"><div class="empty-title">خطأ في التحميل</div></div>`;
  }

  document.getElementById('btn-new-agent').onclick = () =>
    document.getElementById('agent-modal').classList.remove('hidden');
  document.getElementById('agent-search').oninput = e => _renderList(e.target.value);

  window.closeAgentModal = () => document.getElementById('agent-modal').classList.add('hidden');
  window.saveAgent       = saveAgent;
  window.copyEmail       = copyEmail;
}

function _updateCount() {
  const title = document.querySelector('#agent-list')?.previousElementSibling?.querySelector('.card-title');
  if (title) title.textContent = `📋 الوكلاء (${_agents.length})`;
}

function _renderList(search = '') {
  let list = _agents;
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(a =>
      a.name?.toLowerCase().includes(q) ||
      a.emails?.some(e => e.toLowerCase().includes(q))
    );
  }

  const el = document.getElementById('agent-list');
  if (!list.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🤝</div>
      <div class="empty-title">لا توجد نتائج</div>
    </div>`;
    return;
  }

  el.innerHTML = `
    <div class="ship-list">
      ${list.map(a => `
        <div class="ship-item" style="flex-direction:column;align-items:stretch;padding:14px 18px;gap:8px;">
          <div style="font-weight:700;color:var(--navy);font-size:15px;">${a.name}</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${(a.emails||[]).map(email => `
              <div style="display:flex;align-items:center;gap:4px;background:var(--surface);border:0.5px solid var(--border);border-radius:6px;padding:5px 10px;">
                <span style="font-size:12px;direction:ltr;color:#2563a8;">${email}</span>
                <button onclick="copyEmail('${email}')" title="نسخ"
                  style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:13px;padding:0 2px;">
                  <i class="ti ti-copy"></i>
                </button>
                <a href="mailto:${email}" title="إرسال إيميل"
                  style="color:var(--muted);font-size:13px;text-decoration:none;">
                  <i class="ti ti-mail"></i>
                </a>
              </div>`).join('')}
          </div>
        </div>`).join('')}
    </div>`;
}

async function saveAgent() {
  const name   = document.getElementById('agent-name')?.value.trim();
  const emails = document.getElementById('agent-emails')?.value
    .split('\n').map(e => e.trim()).filter(Boolean);
  const errEl  = document.getElementById('agent-error');
  const btn    = document.getElementById('agent-save-btn');

  if (!name) {
    errEl.textContent = 'اسم الشركة مطلوب';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true; btn.textContent = '⏳ جاري الحفظ...';
  errEl.style.display = 'none';

  try {
    await addAgent({ name, emails: emails || [], id: 'agent_' + Date.now() });
    toast('✅ تم إضافة الوكيل', 'success');
    document.getElementById('agent-modal').classList.add('hidden');
    document.getElementById('agent-name').value = '';
    document.getElementById('agent-emails').value = '';
    _agents = await getAgents();
    _updateCount();
    _renderList();
  } catch(e) {
    errEl.textContent = 'حدث خطأ، حاول مرة أخرى';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 حفظ الوكيل';
  }
}

function copyEmail(email) {
  navigator.clipboard.writeText(email).then(() => toast('✅ تم نسخ الإيميل', 'success'));
}
