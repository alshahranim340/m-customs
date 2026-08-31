/**
 * feature-activity-log.js — M-Customs
 * سجل النشاطات — مُعاد كتابته بـ Firebase v9 Modular
 * المسار: public/js/feature-activity-log.js
 */

import { db }  from '../../src/firebase/config.js';
import { getAuth } from 'firebase/auth';
import {
  collection, addDoc, getDocs, query,
  orderBy, limit, where, startAfter, serverTimestamp
} from 'firebase/firestore';

/* ══════════════════════════════════════════════════════
   CSS
══════════════════════════════════════════════════════ */
const CSS = `
  .mc-log-nav-item {
    display:flex;align-items:center;gap:10px;padding:10px 16px;
    cursor:pointer;border-radius:8px;margin:2px 8px;font-size:13.5px;
    font-weight:500;color:rgba(255,255,255,0.75);
    transition:background .18s,color .18s;font-family:'Tajawal',sans-serif;
    user-select:none;
  }
  .mc-log-nav-item:hover { background:rgba(255,255,255,.1);color:#fff; }
  .mc-log-nav-item.active{ background:rgba(255,255,255,.15);color:#fff; }

  .mc-log-page {
    padding:24px;font-family:'Tajawal',sans-serif;
    background:#F5F3EC;min-height:100vh;direction:rtl;
  }
  .mc-log-header {
    background:linear-gradient(135deg,#0E1A2E 0%,#1C2B48 100%);
    color:white;padding:20px 24px;border-radius:12px;
    margin-bottom:16px;display:flex;align-items:center;
    justify-content:space-between;flex-wrap:wrap;gap:12px;
  }
  .mc-log-header h2 { font-size:18px;font-weight:800;margin:0; }
  .mc-log-header p  { font-size:10px;color:rgba(255,255,255,.45);margin:4px 0 0;
                      font-family:'JetBrains Mono',monospace;letter-spacing:.5px; }

  .mc-log-filters { display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px; }
  .mc-log-filter-btn {
    padding:7px 16px;border-radius:20px;border:1.5px solid #E8E5DC;
    background:white;font-family:'Tajawal',sans-serif;font-size:12px;
    font-weight:700;cursor:pointer;transition:all .18s;color:#4A4540;
  }
  .mc-log-filter-btn:hover   { border-color:#1C4B8E;color:#1C4B8E; }
  .mc-log-filter-btn.active  { background:#1C4B8E;border-color:#1C4B8E;color:white; }

  .mc-log-list { display:flex;flex-direction:column;gap:8px; }

  .mc-log-entry {
    background:white;border-radius:10px;border:1px solid #E8E5DC;
    padding:14px 16px;display:flex;align-items:flex-start;gap:12px;
    transition:box-shadow .18s;
  }
  .mc-log-entry:hover { box-shadow:0 3px 12px rgba(28,75,142,.08); }

  .mc-log-icon {
    width:36px;height:36px;border-radius:10px;display:flex;
    align-items:center;justify-content:center;font-size:16px;flex-shrink:0;
  }
  .mc-log-body { flex:1;min-width:0; }
  .mc-log-action { font-size:13.5px;font-weight:700;color:#0E1A2E;margin-bottom:3px; }
  .mc-log-detail { font-size:12px;color:#6B6659;line-height:1.5; }
  .mc-log-meta {
    font-size:10px;color:#8A8578;font-family:'JetBrains Mono',monospace;
    display:flex;align-items:center;gap:8px;margin-top:5px;flex-wrap:wrap;
  }
  .mc-log-tag {
    padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;
    font-family:'Tajawal',sans-serif;
  }
  .mc-log-tag.export    { background:#EEF2FF;color:#1C4B8E; }
  .mc-log-tag.import    { background:#E7F5EE;color:#2E8B57; }
  .mc-log-tag.transport { background:#FEF3E2;color:#C8943A; }
  .mc-log-tag.system    { background:#F5F3EC;color:#6B6659; }

  .mc-log-loading { text-align:center;padding:48px 24px;color:#8A8578;font-size:14px; }
  .mc-log-spinner {
    width:32px;height:32px;border:3px solid rgba(28,75,142,.15);
    border-top-color:#1C4B8E;border-radius:50%;
    animation:mcLogSpin .7s linear infinite;margin:0 auto 12px;
  }
  @keyframes mcLogSpin { to { transform:rotate(360deg); } }

  .mc-log-empty { text-align:center;padding:48px 24px;color:#8A8578; }
  .mc-log-empty-icon { font-size:40px;margin-bottom:12px; }

  .mc-log-load-more {
    display:block;width:100%;padding:12px;margin-top:12px;
    background:white;border:1.5px dashed #D0D5DD;border-radius:10px;
    font-family:'Tajawal',sans-serif;font-size:13px;font-weight:700;
    color:#1C4B8E;cursor:pointer;transition:all .18s;text-align:center;
  }
  .mc-log-load-more:hover { background:#EEF2FF;border-color:#1C4B8E; }
`;

/* ══════════════════════════════════════════════════════
   Action metadata
══════════════════════════════════════════════════════ */
const ACTION_META = {
  save_shipment    : { icon:'💾', label:'Save Shipment',      bg:'#EEF2FF', color:'#1C4B8E' },
  create_shipment  : { icon:'➕', label:'New Shipment',        bg:'#E7F5EE', color:'#2E8B57' },
  delete_shipment  : { icon:'🗑️', label:'Delete Shipment',     bg:'#FEEBEB', color:'#CC2229' },
  status_change    : { icon:'🔄', label:'Status Changed',      bg:'#FEF3E2', color:'#C8943A' },
  upload_attachment: { icon:'📎', label:'Upload Attachment',   bg:'#F0F4FF', color:'#4B5EAA' },
  merge_pdf        : { icon:'📄', label:'Merge PDF',           bg:'#EDE8F5', color:'#6B4EAA' },
  login            : { icon:'🔐', label:'User Login',          bg:'#E7F5EE', color:'#2E8B57' },
  default          : { icon:'📋', label:'Activity',            bg:'#F5F3EC', color:'#6B6659' },
};

const SECTION_LABELS = { export:'الصادر', import:'الوارد', transport:'النقل', system:'النظام' };
const PAGE_SIZE = 30;
let _currentFilter = 'all';
let _lastDoc = null;

/* ══════════════════════════════════════════════════════
   Log activity (Firebase v9)
══════════════════════════════════════════════════════ */
async function logActivity(action, detail = '', section = 'system', extra = {}) {
  try {
    const auth     = getAuth();
    const user     = auth.currentUser;
    const userName = user?.displayName || user?.email || 'مجهول';
    const userId   = user?.uid         || 'unknown';

    await addDoc(collection(db, 'activity_logs'), {
      action, detail, section,
      user_name : userName,
      user_id   : userId,
      created_at: serverTimestamp(),
      ...extra,
    });
  } catch (e) {
    console.warn('[Activity Log] خطأ:', e.message);
  }
}

/* ══════════════════════════════════════════════════════
   Load logs from Firestore (Firebase v9)
══════════════════════════════════════════════════════ */
async function loadLogs(reset = true) {
  const list = document.getElementById('mc-log-list');
  if (!list) return;

  if (reset) {
    list.innerHTML = `<div class="mc-log-loading">
      <div class="mc-log-spinner"></div>جاري التحميل...</div>`;
    _lastDoc = null;
  }

  try {
    const col = collection(db, 'activity_logs');
    let q;

    if (_currentFilter !== 'all') {
      q = query(col,
        where('section', '==', _currentFilter),
        orderBy('created_at', 'desc'),
        limit(PAGE_SIZE)
      );
    } else {
      q = query(col, orderBy('created_at', 'desc'), limit(PAGE_SIZE));
    }

    if (_lastDoc) q = query(q, startAfter(_lastDoc));

    const snap = await getDocs(q);

    if (reset) list.innerHTML = '';

    if (snap.empty && reset) {
      list.innerHTML = `<div class="mc-log-empty">
        <div class="mc-log-empty-icon">📭</div>
        <div style="font-weight:700;margin-bottom:6px;">لا توجد نشاطات بعد</div>
        <div style="font-size:12px;color:#8A8578;">ستظهر هنا كل الإجراءات عند تنفيذها</div>
      </div>`;
      return;
    }

    snap.docs.forEach(doc => {
      const d = doc.data();
      list.insertAdjacentHTML('beforeend', buildEntry(d));
    });

    const oldMore = document.getElementById('mc-log-more-btn');
    if (oldMore) oldMore.remove();

    if (snap.docs.length === PAGE_SIZE) {
      _lastDoc = snap.docs[snap.docs.length - 1];
      list.insertAdjacentHTML('beforeend', `
        <button class="mc-log-load-more" id="mc-log-more-btn"
          onclick="window._mcLogMore()">
          ⬇️ تحميل المزيد
        </button>`);
    }

  } catch(e) {
    console.error('[Activity Log]', e);
    if (reset) list.innerHTML = `<div class="mc-log-empty">
      <div class="mc-log-empty-icon">⚠️</div>
      <div style="font-weight:700;">خطأ في تحميل السجل</div>
      <div style="font-size:11px;color:#CC2229;margin-top:4px;">${e.message}</div>
    </div>`;
  }
}

function buildEntry(d) {
  const meta    = ACTION_META[d.action] || ACTION_META['default'];
  const section = d.section || 'system';
  const secTag  = SECTION_LABELS[section] || section;
  const time    = formatTime(d.created_at);
  return `
    <div class="mc-log-entry">
      <div class="mc-log-icon" style="background:${meta.bg};color:${meta.color};">
        ${meta.icon}
      </div>
      <div class="mc-log-body">
        <div class="mc-log-action">${meta.label}</div>
        <div class="mc-log-detail">${d.detail || ''}</div>
        <div class="mc-log-meta">
          <span class="mc-log-tag ${section}">${secTag}</span>
          <span>👤 ${d.user_name || '—'}</span>
          <span>🕐 ${time}</span>
        </div>
      </div>
    </div>`;
}

function formatTime(ts) {
  if (!ts) return '—';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(date)) return '—';
  const diff = Math.floor((new Date() - date) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff/60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return date.toLocaleDateString('en-GB', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  });
}

/* ══════════════════════════════════════════════════════
   Render the log page
══════════════════════════════════════════════════════ */
function renderLogPage() {
  const container = document.getElementById('page-container');
  if (!container) return;

  _lastDoc = null;
  _currentFilter = 'all';

  container.innerHTML = `
    <div class="mc-log-page">
      <div class="mc-log-header">
        <div>
          <h2>📋 Activity Log · سجل النشاطات</h2>
          <p>ALL SYSTEM ACTIONS · جميع الإجراءات على النظام</p>
        </div>
        <button onclick="window.navigate && window.navigate('home')"
          style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);
          color:white;padding:8px 16px;border-radius:8px;font-family:'Tajawal',sans-serif;
          font-size:12px;font-weight:700;cursor:pointer;">
          ← رجوع
        </button>
      </div>

      <div class="mc-log-filters">
        <button class="mc-log-filter-btn active" onclick="window._mcLogFilter('all',this)">الكل</button>
        <button class="mc-log-filter-btn" onclick="window._mcLogFilter('export',this)">📦 الصادر</button>
        <button class="mc-log-filter-btn" onclick="window._mcLogFilter('import',this)">📥 الوارد</button>
        <button class="mc-log-filter-btn" onclick="window._mcLogFilter('transport',this)">🚛 النقل</button>
        <button class="mc-log-filter-btn" onclick="window._mcLogFilter('system',this)">⚙️ النظام</button>
      </div>

      <div class="mc-log-list" id="mc-log-list">
        <div class="mc-log-loading">
          <div class="mc-log-spinner"></div>
          جاري تحميل السجل...
        </div>
      </div>
    </div>`;

  window._mcLogFilter = (section, btn) => {
    document.querySelectorAll('.mc-log-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _currentFilter = section;
    _lastDoc = null;
    loadLogs(true);
  };

  window._mcLogMore = () => loadLogs(false);

  loadLogs(true);
}

/* ══════════════════════════════════════════════════════
   Patch app functions to log activities
══════════════════════════════════════════════════════ */
function patchAppFunctions() {
  function tryPatch() {
    let patched = 0;

    if (typeof window.saveEdit === 'function' && !window.saveEdit._logPatched) {
      const orig = window.saveEdit;
      window.saveEdit = async function (...args) {
        const result = await orig.apply(this, args);
        logActivity('save_shipment', 'تم حفظ شحنة', guessSection());
        return result;
      };
      window.saveEdit._logPatched = true;
      patched++;
    }

    if (typeof window.confirmDelete === 'function' && !window.confirmDelete._logPatched) {
      const orig = window.confirmDelete;
      window.confirmDelete = async function (id, declNo, ...rest) {
        const result = await orig.apply(this, [id, declNo, ...rest]);
        logActivity('delete_shipment', `بيان #${declNo || id}`, guessSection());
        return result;
      };
      window.confirmDelete._logPatched = true;
      patched++;
    }

    if (typeof window.mergeAll === 'function' && !window.mergeAll._logPatched) {
      const orig = window.mergeAll;
      window.mergeAll = async function (...args) {
        const result = await orig.apply(this, args);
        logActivity('merge_pdf', 'تم دمج PDF', guessSection());
        return result;
      };
      window.mergeAll._logPatched = true;
      patched++;
    }

    return patched > 0;
  }

  if (!tryPatch()) {
    const t = setInterval(() => { if (tryPatch()) clearInterval(t); }, 500);
    setTimeout(() => clearInterval(t), 30000);
  }
}

function guessSection() {
  const active = document.querySelector('.nav-item.active, .nav-item[aria-current]');
  if (active) {
    const txt = active.textContent;
    if (txt.includes('وارد'))  return 'import';
    if (txt.includes('نقل'))   return 'transport';
    if (txt.includes('صادر'))  return 'export';
  }
  return 'export';
}

/* ══════════════════════════════════════════════════════
   Inject nav item below الموظفون
══════════════════════════════════════════════════════ */
function injectNavItem(sidebar) {
  if (sidebar.querySelector('.mc-log-nav-item')) return;

  const navItem = document.createElement('div');
  navItem.className = 'mc-log-nav-item nav-item';
  navItem.innerHTML = `<span>📋</span><span>سجل النشاطات</span>`;

  navItem.addEventListener('click', () => {
    sidebar.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    navItem.classList.add('active');
    renderLogPage();
    if (window.MobileNav && window.innerWidth <= 768) window.MobileNav.close();
  });

  /* Insert after الموظفون */
  let inserted = false;
  for (const item of sidebar.querySelectorAll('.nav-item, li')) {
    if (item.textContent.includes('الموظف')) {
      item.insertAdjacentElement('afterend', navItem);
      inserted = true;
      break;
    }
  }
  if (!inserted) {
    const nav = sidebar.querySelector('.sidebar-nav, nav, ul');
    (nav || sidebar).appendChild(navItem);
  }

  /* Patch navigate */
  const origNav = window.navigate;
  if (origNav && !origNav._activityPatched) {
    window.navigate = function(page, ...args) {
      navItem.classList.remove('active');
      if (page === 'activity-log') {
        navItem.classList.add('active');
        renderLogPage();
        return;
      }
      return origNav.call(this, page, ...args);
    };
    window.navigate._activityPatched = true;
    if (origNav._mcPatched) window.navigate._mcPatched = true;
  }
}

/* ══════════════════════════════════════════════════════
   Log user login
══════════════════════════════════════════════════════ */
function watchLogin() {
  const auth = getAuth();
  auth.onAuthStateChanged(user => {
    if (user && !window._mcLoginLogged) {
      window._mcLoginLogged = true;
      logActivity('login', `${user.displayName || user.email} logged in`, 'system');
    }
  });
}

/* ══════════════════════════════════════════════════════
   CSS injection
══════════════════════════════════════════════════════ */
function injectCSS() {
  if (document.getElementById('mcal-style')) return;
  const s = document.createElement('style');
  s.id = 'mcal-style';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/* ══════════════════════════════════════════════════════
   Init
══════════════════════════════════════════════════════ */
function init() {
  injectCSS();
  patchAppFunctions();
  watchLogin();

  function trySetup() {
    const sidebar = document.querySelector('aside.sidebar, .sidebar');
    if (!sidebar) return false;
    injectNavItem(sidebar);
    return true;
  }

  if (!trySetup()) {
    const obs = new MutationObserver(() => {
      if (trySetup()) obs.disconnect();
    });
    obs.observe(document.getElementById('root') || document.body, {
      childList: true, subtree: true
    });
  }

  console.log('[M-Customs Activity Log] ✔ Loaded (Firebase v9)');
}

if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', init);
else
  init();
