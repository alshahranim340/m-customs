import { getCurrentUser } from '../../../src/firebase/auth.js';
import { getUserProfile } from '../../../src/firebase/db.js';
import { getTransportDropdowns, updateTransportDropdowns } from '../../../src/firebase/transportDb.js';
import { toast } from '../app.js';

let _profile = null;
let _dropdowns = { customers: [], materials: [], nationalities: [] };

const CATEGORIES = [
  { key: 'customers',     ar: 'العملاء',     en: 'CUSTOMERS',     icon: '🏢', color: '#1C4B8E', desc: 'قائمة العملاء / المصدرين' },
  { key: 'materials',     ar: 'المواد',      en: 'MATERIALS',     icon: '📦', color: '#2E8B57', desc: 'أنواع البضائع المشحونة' },
  { key: 'nationalities', ar: 'الجنسيات',   en: 'NATIONALITIES', icon: '🌍', color: '#C2410C', desc: 'جنسيات السائقين' },
];

export async function renderTransportSettings(container) {
  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = `<div class="page-body" style="padding:40px;text-align:center;">يجب تسجيل الدخول</div>`;
    return;
  }
  _profile = await getUserProfile(user.uid);

  if (_profile.role !== 'transport' && _profile.role !== 'admin') {
    container.innerHTML = `
      <div class="page-body" style="padding:40px;text-align:center;">
        <div style="font-size:56px;">🔒</div>
        <div style="font-size:18px;color:#0E1A2E;font-weight:800;margin-top:12px;">لا تملك صلاحية الوصول</div>
      </div>`;
    return;
  }

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
              <span class="modern-header-code">SDS/TRANSPORT/SETTINGS/2026</span>
            </div>
            <div class="modern-header-title">⚙ إدارة القوائم</div>
            <div class="modern-header-sub">TRANSPORT DROPDOWN MANAGEMENT</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" onclick="navigate('transport-requests')">
              <i class="ti ti-arrow-right"></i> رجوع
            </button>
          </div>
        </div>

        <div id="ts-body" style="padding:20px 24px 24px;">
          <div class="loader"><div class="spinner"></div></div>
        </div>

      </div>
    </div>`;

  await loadData();
}

async function loadData() {
  try {
    _dropdowns = await getTransportDropdowns();
    render();
  } catch (e) {
    console.error(e);
    toast('خطأ في التحميل', 'error');
  }
}

function render() {
  const el = document.getElementById('ts-body');
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px;">
      ${CATEGORIES.map(cat => renderCategory(cat)).join('')}
    </div>`;

  // Wire up
  CATEGORIES.forEach(cat => {
    const addBtn = document.getElementById(`add-${cat.key}`);
    const addInput = document.getElementById(`input-${cat.key}`);
    if (addBtn && addInput) {
      const addFn = () => addValue(cat.key, addInput.value);
      addBtn.onclick = addFn;
      addInput.onkeydown = (e) => { if (e.key === 'Enter') addFn(); };
    }
  });
}

function renderCategory(cat) {
  const list = _dropdowns[cat.key] || [];
  return `
    <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:20px;position:relative;overflow:hidden;">
      <div style="position:absolute;top:0;right:0;width:6px;height:100%;background:${cat.color};"></div>

      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:2px;font-weight:700;">${cat.en}</div>
          <div style="font-size:18px;color:#0E1A2E;font-weight:800;margin-top:4px;">${cat.icon} ${cat.ar}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B6659;margin-top:2px;">${cat.desc}</div>
        </div>
        <span class="modern-badge blue" style="font-size:10px;">${String(list.length).padStart(2,'0')} ITEMS</span>
      </div>

      <!-- Add input -->
      <div style="display:flex;gap:6px;margin-bottom:12px;">
        <input type="text" id="input-${cat.key}" placeholder="أضف ${cat.ar.slice(0,-1)} جديد..."
          style="flex:1;border:1.5px solid #E8E5DC;border-radius:4px;padding:8px 12px;font-family:Tajawal,sans-serif;font-size:12px;outline:none;">
        <button id="add-${cat.key}" style="background:${cat.color};color:white;border:none;border-radius:4px;padding:8px 14px;font-family:Tajawal,sans-serif;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">
          + إضافة
        </button>
      </div>

      <!-- List -->
      <div style="max-height:280px;overflow-y:auto;background:#FAFAF7;border:1px solid #F0EDE4;border-radius:4px;padding:8px;">
        ${list.length === 0 ? `
          <div style="text-align:center;padding:20px;color:#8A8578;font-size:12px;">
            <div style="font-size:24px;">📝</div>
            <div style="margin-top:6px;">القائمة فارغة</div>
          </div>
        ` : list.map((val, idx) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;border-radius:3px;margin-bottom:3px;background:white;border:1px solid #F0EDE4;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;font-weight:700;min-width:20px;">${String(idx+1).padStart(2,'0')}</span>
              <span style="font-size:13px;color:#0E1A2E;">${val}</span>
            </div>
            <button onclick="_removeValue('${cat.key}', ${idx})" style="background:transparent;border:none;color:#8A8578;cursor:pointer;padding:2px 6px;border-radius:3px;font-size:14px;" title="حذف">
              ×
            </button>
          </div>
        `).join('')}
      </div>
    </div>`;
}

async function addValue(field, value) {
  if (!value || !value.trim()) {
    toast('اكتب قيمة أولاً', 'error');
    return;
  }
  const trimmed = value.trim();
  const list = _dropdowns[field] || [];
  if (list.includes(trimmed)) {
    toast('موجود بالفعل', 'error');
    return;
  }
  try {
    await updateTransportDropdowns({
      [field]: [...list, trimmed].sort(),
    });
    await loadData();
    toast(`✓ تمت الإضافة: ${trimmed}`, 'success');
  } catch (e) {
    console.error(e);
    toast('خطأ في الإضافة', 'error');
  }
}

async function removeValue(field, idx) {
  const list = _dropdowns[field] || [];
  const val = list[idx];
  if (!confirm(`حذف "${val}"؟`)) return;
  const newList = list.filter((_, i) => i !== idx);
  try {
    await updateTransportDropdowns({ [field]: newList });
    await loadData();
    toast('✓ تم الحذف', 'success');
  } catch (e) {
    console.error(e);
    toast('خطأ في الحذف', 'error');
  }
}

window._removeValue = removeValue;
