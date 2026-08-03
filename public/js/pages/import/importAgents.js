import { getAgents, addAgent } from '../../../../src/firebase/importDb.js';
import { toast } from '../../app.js';

let _agents = [];

export async function renderImportAgents(container) {
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
              <span class="modern-header-code">SDS/AGENTS/2026</span>
            </div>
            <div class="modern-header-title">قائمة الوكلاء</div>
            <div class="modern-header-sub" id="agent-sub">SHIPPING AGENTS · v2.4</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn modern-btn-primary" id="btn-new-agent">
              <i class="ti ti-plus"></i> وكيل جديد
            </button>
          </div>
        </div>
        <div class="modern-search-bar">
          <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B6659;letter-spacing:1.5px;font-weight:700;">FIND ›</span>
          <div class="modern-search-wrap">
            <i class="ti ti-search modern-search-icon"></i>
            <input type="text" id="agent-search" class="modern-search-input" placeholder="agent name · email">
          </div>
        </div>
        <div id="agent-list" style="padding:12px 24px 20px;"><div class="loader"><div class="spinner"></div></div></div>
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
  const sub = document.getElementById('agent-sub');
  if (sub) sub.textContent = `AGENTS · ${String(_agents.length).padStart(2,'0')} REGISTERED`;
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
    el.innerHTML = `<div class="modern-empty">
      <div class="modern-empty-icon">🤝</div>
      <div class="modern-empty-title">لا توجد نتائج</div>
      <div class="modern-empty-sub">NO RESULTS</div>
    </div>`;
    return;
  }

  el.innerHTML = list.map((a, idx) => `
    <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:14px 18px;margin-bottom:8px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:${(a.emails||[]).length?'10':'0'}px;">
        <div class="modern-row-stripe blue"></div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;font-weight:700;letter-spacing:1px;">AGENT · ${String(idx+1).padStart(3,'0')}</span>
          </div>
          <div style="font-size:14px;font-weight:700;color:#0E1A2E;margin-top:2px;">${a.name}</div>
          <div class="modern-row-sub">→ ${String((a.emails||[]).length).padStart(2,'0')} EMAILS</div>
        </div>
      </div>
      ${(a.emails||[]).length ? `
        <div style="display:flex;flex-wrap:wrap;gap:6px;padding-right:22px;">
          ${(a.emails||[]).map(email => `
            <div style="display:flex;align-items:center;gap:6px;background:#FAFAF7;border:1px solid #F0EDE4;border-radius:4px;padding:6px 10px;">
              <span style="font-family:'JetBrains Mono',monospace;font-size:11px;direction:ltr;color:#1C4B8E;font-weight:600;">${email}</span>
              <button onclick="copyEmail('${email}')" title="نسخ" style="background:none;border:none;cursor:pointer;color:#8A8578;font-size:13px;padding:0 2px;">
                <i class="ti ti-copy"></i>
              </button>
              <a href="mailto:${email}" title="إرسال" style="color:#8A8578;font-size:13px;text-decoration:none;">
                <i class="ti ti-mail"></i>
              </a>
            </div>`).join('')}
        </div>` : ''}
    </div>`).join('');
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
