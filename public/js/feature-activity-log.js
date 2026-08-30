/**
 * feature-activity-log.js — M-Customs
 * ميزة: سجل النشاطات
 * المسار: public/js/feature-activity-log.js
 *
 * - يضيف "سجل النشاطات" في القائمة الجانبية تحت "الموظفون"
 * - يسجّل كل إجراء: حفظ شحنة، تغيير حالة، رفع مرفق، دمج PDF...
 * - يعرض السجل بتصفية حسب القسم (صادر / وارد / نقل)
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════
     CSS
  ══════════════════════════════════════════════════════ */
  const CSS = `
    /* ── عنصر القائمة الجانبية ── */
    .mc-log-nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      cursor: pointer;
      border-radius: 8px;
      margin: 2px 8px;
      font-size: 13.5px;
      font-weight: 500;
      color: rgba(255,255,255,0.75);
      transition: background 0.18s, color 0.18s;
      font-family: 'Tajawal', sans-serif;
      user-select: none;
    }
    .mc-log-nav-item:hover {
      background: rgba(255,255,255,0.1);
      color: #fff;
    }
    .mc-log-nav-item.active {
      background: rgba(255,255,255,0.15);
      color: #fff;
    }
    .mc-log-nav-item .mc-log-icon {
      font-size: 16px;
      opacity: 0.85;
      flex-shrink: 0;
    }

    /* ── صفحة السجل ── */
    .mc-log-page {
      padding: 24px;
      font-family: 'Tajawal', sans-serif;
      background: #F5F3EC;
      min-height: 100vh;
      direction: rtl;
    }

    .mc-log-header {
      background: linear-gradient(135deg, #0E1A2E 0%, #1C2B48 100%);
      color: white;
      padding: 20px 24px;
      border-radius: 12px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }
    .mc-log-header h2 {
      font-size: 18px;
      font-weight: 800;
      margin: 0;
    }
    .mc-log-header p {
      font-size: 12px;
      color: rgba(255,255,255,0.55);
      margin: 4px 0 0;
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: 0.5px;
    }

    /* ── شريط الفلتر ── */
    .mc-log-filters {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }
    .mc-log-filter-btn {
      padding: 7px 16px;
      border-radius: 20px;
      border: 1.5px solid #E8E5DC;
      background: white;
      font-family: 'Tajawal', sans-serif;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.18s;
      color: #4A4540;
    }
    .mc-log-filter-btn:hover {
      border-color: #1C4B8E;
      color: #1C4B8E;
    }
    .mc-log-filter-btn.active {
      background: #1C4B8E;
      border-color: #1C4B8E;
      color: white;
    }

    /* ── الإدخالات ── */
    .mc-log-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .mc-log-entry {
      background: white;
      border-radius: 10px;
      border: 1px solid #E8E5DC;
      padding: 14px 16px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      transition: box-shadow 0.18s;
    }
    .mc-log-entry:hover {
      box-shadow: 0 3px 12px rgba(28,75,142,0.08);
    }

    .mc-log-entry-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
    }

    .mc-log-entry-body { flex: 1; min-width: 0; }
    .mc-log-entry-action {
      font-size: 13.5px;
      font-weight: 700;
      color: #0E1A2E;
      margin-bottom: 3px;
    }
    .mc-log-entry-detail {
      font-size: 12px;
      color: #6B6659;
      line-height: 1.5;
    }
    .mc-log-entry-meta {
      font-size: 10px;
      color: #8A8578;
      font-family: 'JetBrains Mono', monospace;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 5px;
      flex-wrap: wrap;
    }
    .mc-log-section-tag {
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 700;
      font-family: 'Tajawal', sans-serif;
    }
    .mc-log-section-tag.export  { background: #EEF2FF; color: #1C4B8E; }
    .mc-log-section-tag.import  { background: #E7F5EE; color: #2E8B57; }
    .mc-log-section-tag.transport { background: #FEF3E2; color: #C8943A; }
    .mc-log-section-tag.system  { background: #F5F3EC; color: #6B6659; }

    /* ── تحميل / فارغ ── */
    .mc-log-loading {
      text-align: center;
      padding: 48px 24px;
      color: #8A8578;
      font-size: 14px;
    }
    .mc-log-spinner {
      width: 32px; height: 32px;
      border: 3px solid rgba(28,75,142,0.15);
      border-top-color: #1C4B8E;
      border-radius: 50%;
      animation: mcLogSpin 0.7s linear infinite;
      margin: 0 auto 12px;
    }
    @keyframes mcLogSpin { to { transform: rotate(360deg); } }

    .mc-log-empty {
      text-align: center;
      padding: 48px 24px;
      color: #8A8578;
    }
    .mc-log-empty-icon { font-size: 40px; margin-bottom: 12px; }

    /* ── زر تحميل المزيد ── */
    .mc-log-load-more {
      display: block;
      width: 100%;
      padding: 12px;
      margin-top: 12px;
      background: white;
      border: 1.5px dashed #D0D5DD;
      border-radius: 10px;
      font-family: 'Tajawal', sans-serif;
      font-size: 13px;
      font-weight: 700;
      color: #1C4B8E;
      cursor: pointer;
      transition: all 0.18s;
      text-align: center;
    }
    .mc-log-load-more:hover {
      background: #EEF2FF;
      border-color: #1C4B8E;
    }
  `;

  /* ══════════════════════════════════════════════════════
     تهيئة إعدادات الأيقونات / الألوان لكل إجراء
  ══════════════════════════════════════════════════════ */
  const ACTION_META = {
    'save_shipment'    : { icon: '💾', label: 'حفظ شحنة',       bg: '#EEF2FF', color: '#1C4B8E'  },
    'create_shipment'  : { icon: '➕', label: 'إنشاء شحنة',     bg: '#E7F5EE', color: '#2E8B57'  },
    'delete_shipment'  : { icon: '🗑️', label: 'حذف شحنة',       bg: '#FEEBEB', color: '#CC2229'  },
    'status_change'    : { icon: '🔄', label: 'تغيير الحالة',    bg: '#FEF3E2', color: '#C8943A'  },
    'upload_attachment': { icon: '📎', label: 'رفع مرفق',        bg: '#F0F4FF', color: '#4B5EAA'  },
    'delete_attachment': { icon: '🗑️', label: 'حذف مرفق',        bg: '#FEEBEB', color: '#CC2229'  },
    'merge_pdf'        : { icon: '📄', label: 'دمج PDF',         bg: '#EDE8F5', color: '#6B4EAA'  },
    'login'            : { icon: '🔐', label: 'تسجيل دخول',      bg: '#E7F5EE', color: '#2E8B57'  },
    'save_request'     : { icon: '💾', label: 'حفظ طلب نقل',     bg: '#FEF3E2', color: '#C8943A'  },
    'create_request'   : { icon: '🚛', label: 'إنشاء طلب نقل',   bg: '#FEF3E2', color: '#C8943A'  },
    'default'          : { icon: '📋', label: 'إجراء',           bg: '#F5F3EC', color: '#6B6659'  },
  };

  const SECTION_LABELS = {
    export    : 'الصادر',
    import    : 'الوارد',
    transport : 'النقل',
    system    : 'النظام',
  };

  /* ══════════════════════════════════════════════════════
     تسجيل نشاط في Firestore
  ══════════════════════════════════════════════════════ */
  async function logActivity(action, detail = '', section = 'system', extra = {}) {
    try {
      const fb = window.firebase;
      if (!fb?.firestore || !fb?.auth) return;

      const user = fb.auth().currentUser;
      const userName = user?.displayName || user?.email || 'مجهول';
      const userId   = user?.uid || 'unknown';

      await fb.firestore().collection('activity_logs').add({
        action,
        detail,
        section,
        user_name  : userName,
        user_id    : userId,
        created_at : fb.firestore.FieldValue.serverTimestamp(),
        ...extra,
      });
    } catch (e) {
      console.warn('[Activity Log] خطأ في التسجيل:', e.message);
    }
  }

  /* ══════════════════════════════════════════════════════
     اعتراض الدوال لتسجيل النشاطات تلقائياً
  ══════════════════════════════════════════════════════ */
  function patchAppFunctions() {
    /* انتظر حتى تُعرَّف الدوال */
    function tryPatch() {
      let patched = 0;

      /* اعتراض saveEdit (حفظ شحنة) */
      if (typeof window.saveEdit === 'function' && !window.saveEdit._logPatched) {
        const orig = window.saveEdit;
        window.saveEdit = async function (...args) {
          const result = await orig.apply(this, args);
          const s = window._editingShipment;
          logActivity(
            'save_shipment',
            s ? `بيان #${s.declaration_no || '—'} — ${s.exporter || ''}` : 'تعديل شحنة',
            guessSection()
          );
          return result;
        };
        window.saveEdit._logPatched = true;
        patched++;
      }

      /* اعتراض confirmDelete (حذف شحنة) */
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

      /* اعتراض mergeAll (دمج PDF) */
      if (typeof window.mergeAll === 'function' && !window.mergeAll._logPatched) {
        const orig = window.mergeAll;
        window.mergeAll = async function (...args) {
          const result = await orig.apply(this, args);
          const s = window._editingShipment;
          logActivity(
            'merge_pdf',
            s ? `دمج ملف — بيان #${s.declaration_no || '—'}` : 'دمج PDF',
            guessSection()
          );
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

  /* تخمين القسم الحالي من الـ URL أو من الصفحة النشطة */
  function guessSection() {
    const page = window._currentPage || '';
    if (page.includes('import') || page.includes('وارد')) return 'import';
    if (page.includes('transport') || page.includes('نقل'))  return 'transport';
    if (page.includes('export')  || page.includes('صادر'))  return 'export';
    /* من القائمة النشطة */
    const active = document.querySelector('.nav-item.active, .nav-item[aria-current]');
    if (active) {
      const txt = active.textContent;
      if (txt.includes('وارد'))  return 'import';
      if (txt.includes('نقل'))   return 'transport';
      if (txt.includes('صادر'))  return 'export';
    }
    return 'export'; /* افتراضي */
  }

  /* ══════════════════════════════════════════════════════
     عرض صفحة السجل
  ══════════════════════════════════════════════════════ */
  let _currentFilter = 'all';
  let _lastDoc       = null;
  const PAGE_SIZE    = 30;

  async function renderLogPage() {
    const container = document.getElementById('page-container');
    if (!container) return;

    _lastDoc       = null;
    _currentFilter = 'all';

    container.innerHTML = `
      <div class="mc-log-page">
        <div class="mc-log-header">
          <div>
            <h2>📋 سجل النشاطات</h2>
            <p>ACTIVITY LOG · جميع الإجراءات على النظام</p>
          </div>
          <button onclick="window.navigate && window.navigate('home')"
            style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);
            color:white;padding:8px 16px;border-radius:8px;font-family:'Tajawal',sans-serif;
            font-size:12px;font-weight:700;cursor:pointer;">
            ← رجوع
          </button>
        </div>

        <div class="mc-log-filters">
          <button class="mc-log-filter-btn active" onclick="mcLogFilter('all',this)">الكل</button>
          <button class="mc-log-filter-btn" onclick="mcLogFilter('export',this)">📦 الصادر</button>
          <button class="mc-log-filter-btn" onclick="mcLogFilter('import',this)">📥 الوارد</button>
          <button class="mc-log-filter-btn" onclick="mcLogFilter('transport',this)">🚛 النقل</button>
          <button class="mc-log-filter-btn" onclick="mcLogFilter('system',this)">⚙️ النظام</button>
        </div>

        <div class="mc-log-list" id="mc-log-list">
          <div class="mc-log-loading">
            <div class="mc-log-spinner"></div>
            جاري تحميل السجل...
          </div>
        </div>
      </div>
    `;

    window.mcLogFilter = (section, btn) => {
      document.querySelectorAll('.mc-log-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _currentFilter = section;
      _lastDoc = null;
      loadLogs(true);
    };

    window.mcLogMore = () => loadLogs(false);

    await loadLogs(true);
  }

  /* ── تحميل الإدخالات من Firestore ── */
  async function loadLogs(reset = true) {
    const list = document.getElementById('mc-log-list');
    if (!list) return;

    if (reset) {
      list.innerHTML = `<div class="mc-log-loading">
        <div class="mc-log-spinner"></div>جاري التحميل...</div>`;
      _lastDoc = null;
    }

    const fb = window.firebase;
    if (!fb?.firestore) {
      list.innerHTML = `<div class="mc-log-empty">
        <div class="mc-log-empty-icon">⚠️</div>
        <div>Firebase غير متاح</div>
      </div>`;
      return;
    }

    try {
      let query = fb.firestore()
        .collection('activity_logs')
        .orderBy('created_at', 'desc')
        .limit(PAGE_SIZE);

      if (_currentFilter !== 'all') {
        query = fb.firestore()
          .collection('activity_logs')
          .where('section', '==', _currentFilter)
          .orderBy('created_at', 'desc')
          .limit(PAGE_SIZE);
      }

      if (_lastDoc) query = query.startAfter(_lastDoc);

      const snap = await query.get();

      if (reset) list.innerHTML = '';

      if (snap.empty && reset) {
        list.innerHTML = `<div class="mc-log-empty">
          <div class="mc-log-empty-icon">📭</div>
          <div style="font-weight:700;margin-bottom:6px;">لا توجد نشاطات بعد</div>
          <div style="font-size:12px;">ستظهر هنا كل الإجراءات عند تنفيذها</div>
        </div>`;
        return;
      }

      snap.docs.forEach(doc => {
        const d = doc.data();
        list.insertAdjacentHTML('beforeend', buildEntry(d));
      });

      /* زر تحميل المزيد */
      const oldMore = document.getElementById('mc-log-more-btn');
      if (oldMore) oldMore.remove();

      if (snap.docs.length === PAGE_SIZE) {
        _lastDoc = snap.docs[snap.docs.length - 1];
        list.insertAdjacentHTML('beforeend', `
          <button class="mc-log-load-more" id="mc-log-more-btn" onclick="mcLogMore()">
            ⬇️ تحميل المزيد
          </button>
        `);
      }

    } catch(e) {
      console.error('[Activity Log]', e);
      if (reset) list.innerHTML = `<div class="mc-log-empty">
        <div class="mc-log-empty-icon">❌</div>
        <div>خطأ في تحميل السجل</div>
        <div style="font-size:11px;color:#CC2229;margin-top:6px;">${e.message}</div>
      </div>`;
    }
  }

  /* ── بناء HTML لإدخال واحد ── */
  function buildEntry(d) {
    const meta    = ACTION_META[d.action] || ACTION_META['default'];
    const section = d.section || 'system';
    const secTag  = SECTION_LABELS[section] || section;
    const time    = formatTime(d.created_at);

    return `
      <div class="mc-log-entry">
        <div class="mc-log-entry-icon" style="background:${meta.bg};color:${meta.color};">
          ${meta.icon}
        </div>
        <div class="mc-log-entry-body">
          <div class="mc-log-entry-action">${meta.label}</div>
          <div class="mc-log-entry-detail">${d.detail || ''}</div>
          <div class="mc-log-entry-meta">
            <span class="mc-log-section-tag ${section}">${secTag}</span>
            <span>👤 ${d.user_name || '—'}</span>
            <span>🕐 ${time}</span>
          </div>
        </div>
      </div>
    `;
  }

  /* ── تنسيق الوقت ── */
  function formatTime(ts) {
    if (!ts) return '—';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(date)) return '—';

    const now   = new Date();
    const diff  = Math.floor((now - date) / 1000);

    if (diff < 60)    return 'الآن';
    if (diff < 3600)  return `منذ ${Math.floor(diff/60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff/3600)} ساعة`;

    return date.toLocaleDateString('ar-SA', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  /* ══════════════════════════════════════════════════════
     إضافة عنصر السجل في القائمة الجانبية
     تحت "الموظفون"
  ══════════════════════════════════════════════════════ */
  function injectNavItem(sidebar) {
    if (sidebar.querySelector('.mc-log-nav-item')) return; /* موجود بالفعل */

    const navItem = document.createElement('div');
    navItem.className = 'mc-log-nav-item nav-item';
    navItem.setAttribute('data-page', 'activity-log');
    navItem.innerHTML = `
      <span class="mc-log-icon">📋</span>
      <span>سجل النشاطات</span>
    `;
    navItem.addEventListener('click', () => {
      /* إزالة active من الكل */
      sidebar.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      navItem.classList.add('active');
      renderLogPage();
      /* إغلاق القائمة على الجوال */
      if (window.MobileNav && window.innerWidth <= 768) window.MobileNav.close();
    });

    /* ابحث عن عنصر "الموظفون" وأدرج بعده */
    const allNavItems = sidebar.querySelectorAll('.nav-item, li');
    let inserted = false;

    for (const item of allNavItems) {
      if (item.textContent.includes('الموظف')) {
        item.insertAdjacentElement('afterend', navItem);
        inserted = true;
        break;
      }
    }

    /* إذا لم يجد "الموظفون"، أضفه في آخر القائمة */
    if (!inserted) {
      const nav = sidebar.querySelector('.sidebar-nav, nav, ul');
      if (nav) nav.appendChild(navItem);
      else sidebar.appendChild(navItem);
    }

    /* ربط navigate('activity-log') */
    const origNavigate = window.navigate;
    if (origNavigate && !origNavigate._activityPatched) {
      window.navigate = function (page, ...args) {
        if (page === 'activity-log') {
          sidebar.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
          navItem.classList.add('active');
          renderLogPage();
          return;
        }
        navItem.classList.remove('active');
        return origNavigate.call(this, page, ...args);
      };
      window.navigate._activityPatched = true;
      if (origNavigate._mcPatched) window.navigate._mcPatched = true;
    }
  }

  /* ══════════════════════════════════════════════════════
     حقن CSS
  ══════════════════════════════════════════════════════ */
  function injectCSS() {
    if (document.getElementById('mcal-style')) return;
    const s = document.createElement('style');
    s.id = 'mcal-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════════════════
     التهيئة
  ══════════════════════════════════════════════════════ */
  function init() {
    injectCSS();
    patchAppFunctions();

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

    /* تسجيل دخول المستخدم */
    function tryLogLogin() {
      const fb = window.firebase;
      if (!fb?.auth) return false;
      fb.auth().onAuthStateChanged(user => {
        if (user && !window._mcLoginLogged) {
          window._mcLoginLogged = true;
          logActivity('login', `دخل ${user.displayName || user.email}`, 'system');
        }
      });
      return true;
    }

    if (!tryLogLogin()) {
      const t = setInterval(() => { if (tryLogLogin()) clearInterval(t); }, 500);
      setTimeout(() => clearInterval(t), 15000);
    }

    console.log('[M-Customs Activity Log] ✔ Loaded');
  }

  /* ══════════════════════════════════════════════════════
     تشغيل
  ══════════════════════════════════════════════════════ */
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else
    init();

})();
