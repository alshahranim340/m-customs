/**
 * feature-responsive.js — M-Customs
 * ميزة: تصميم متجاوب للجوال
 * المسار: public/js/feature-responsive.js
 *
 * ملف مكتفٍ بنفسه — يحقن CSS تلقائياً
 * يدعم الـ Sidebar الديناميكي (يُبنى بعد تحميل الصفحة)
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════
     CSS — يُحقن داخل <style> في <head>
  ══════════════════════════════════════════════════════ */
  const CSS = `
    :root {
      --mob-bar-h: 56px;
      --drawer-w: 280px;
      --mob-ease: cubic-bezier(0.4, 0, 0.2, 1);
      --mob-dur: 0.3s;
    }

    /* ── شريط الجوال العلوي ── */
    .mob-bar {
      display: none;
      position: fixed;
      top: 0; right: 0; left: 0;
      height: var(--mob-bar-h);
      background: #1C4B8E;
      z-index: 1010;
      align-items: center;
      justify-content: space-between;
      padding: 0 14px;
      box-shadow: 0 2px 12px rgba(0,0,0,.28);
      gap: 10px;
      font-family: 'Tajawal', sans-serif;
    }

    .mob-ham {
      background: none; border: none; cursor: pointer;
      padding: 7px; display: flex; flex-direction: column;
      gap: 5px; border-radius: 8px;
      transition: background var(--mob-dur) var(--mob-ease);
      -webkit-tap-highlight-color: transparent;
    }
    .mob-ham:hover { background: rgba(255,255,255,.12); }
    .mob-ham .b {
      display: block; width: 22px; height: 2px;
      background: #fff; border-radius: 2px;
      transition: transform var(--mob-dur) var(--mob-ease),
                  opacity  var(--mob-dur) var(--mob-ease);
    }
    .mob-ham.open .b:nth-child(1){ transform: translateY(7px) rotate(45deg); }
    .mob-ham.open .b:nth-child(2){ opacity:0; transform:scaleX(0); }
    .mob-ham.open .b:nth-child(3){ transform: translateY(-7px) rotate(-45deg); }

    .mob-logo {
      flex: 1; text-align: center;
      font-size: 15px; font-weight: 700;
      color: #fff; letter-spacing: .3px;
      pointer-events: none; user-select: none;
    }

    .mob-av {
      width: 34px; height: 34px; border-radius: 50%;
      background: #2E8B57; border: 2px solid rgba(255,255,255,.25);
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; color: #fff;
      overflow: hidden; flex-shrink: 0; cursor: pointer;
      transition: border-color var(--mob-dur);
    }
    .mob-av:hover { border-color: rgba(255,255,255,.5); }
    .mob-av img { width:100%; height:100%; object-fit:cover; border-radius:50%; }

    /* ── Overlay ── */
    .mob-ov {
      display: none; position: fixed; inset: 0;
      background: rgba(10,20,40,.55);
      z-index: 1005; opacity: 0;
      transition: opacity var(--mob-dur) var(--mob-ease);
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
    }
    .mob-ov.show { opacity: 1; }

    /* ══════════════════════════════════
       Mobile ≤ 768px
    ══════════════════════════════════ */
    @media (max-width: 768px) {

      .mob-bar { display: flex; }
      .mob-ov  { display: block; }

      /* Sidebar → Drawer من اليمين (RTL) */
      .sidebar, #sidebar {
        position: fixed !important;
        top: 0 !important; right: -100% !important; left: auto !important;
        width: var(--drawer-w) !important;
        height: 100dvh !important;
        z-index: 1008 !important;
        overflow-y: auto !important; overflow-x: hidden !important;
        transition: right var(--mob-dur) var(--mob-ease) !important;
        box-shadow: none !important;
      }
      .sidebar::-webkit-scrollbar, #sidebar::-webkit-scrollbar { width: 3px; }
      .sidebar::-webkit-scrollbar-thumb, #sidebar::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,.15); border-radius: 3px;
      }
      .sidebar.mob-open, #sidebar.mob-open {
        right: 0 !important;
        box-shadow: -6px 0 32px rgba(0,0,0,.35) !important;
      }

      /* المحتوى الرئيسي — offset للشريط العلوي */
      .main-content, #main-content, .content-area, .page-wrapper {
        margin: 0 !important; width: 100% !important;
        padding-top: calc(var(--mob-bar-h) + 12px) !important;
        padding-inline: 12px !important;
        box-sizing: border-box !important;
      }

      /* منع scroll عند فتح القائمة */
      body.mob-locked { overflow: hidden !important; touch-action: none !important; }

      /* Dashboard Cards */
      .stats-grid, .dashboard-grid, .cards-grid, .kpi-grid {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 10px !important;
      }
      .card-full { grid-column: 1 / -1 !important; }
      .stat-card, .kpi-card, .info-card { padding: 12px !important; }

      /* جداول */
      .table-wrapper {
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch !important;
        border-radius: 10px !important;
      }
      .table-wrapper::-webkit-scrollbar { height: 3px; }
      .table-wrapper::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      .table-wrapper table { min-width: 640px !important; }
      table th, table td {
        padding: 10px 12px !important; font-size: 13px !important; white-space: nowrap !important;
      }
      table th:first-child, table td:first-child {
        position: sticky !important; right: 0 !important;
        background: inherit !important; z-index: 2 !important;
        box-shadow: -3px 0 6px rgba(0,0,0,.06) !important;
      }

      /* النماذج */
      .form-grid, .form-row, .input-row {
        display: flex !important; flex-direction: column !important; gap: 10px !important;
      }
      input[type=text], input[type=email], input[type=number],
      input[type=date], input[type=tel], select, textarea {
        width: 100% !important; box-sizing: border-box !important;
        font-size: 16px !important;
      }

      /* Modals → Bottom Sheet */
      .modal-overlay { align-items: flex-end !important; }
      .modal-box {
        width: 100% !important; max-width: 100% !important;
        max-height: 92dvh !important;
        border-radius: 20px 20px 0 0 !important;
        margin: 0 !important; overflow-y: auto !important;
      }
      .modal-box::before {
        content: ''; display: block;
        width: 36px; height: 4px;
        background: #d1d5db; border-radius: 2px;
        margin: 10px auto 8px;
      }

      /* Tabs — تمرير أفقي */
      .tabs-bar, .tab-list, .nav-tabs {
        display: flex !important; overflow-x: auto !important;
        scrollbar-width: none !important; gap: 4px !important;
      }
      .tabs-bar::-webkit-scrollbar, .tab-list::-webkit-scrollbar { display: none; }
      .tab-item, .nav-tab { white-space: nowrap !important; flex-shrink: 0 !important; }

      /* الإشعارات */
      #toast-container {
        bottom: 16px !important; right: 12px !important; left: 12px !important;
      }
      #notification-banner { top: var(--mob-bar-h) !important; }

      /* أدوات */
      .hide-mobile   { display: none !important; }
      .show-mobile   { display: block !important; }
      .show-mob-flex { display: flex !important; }

      /* Safe Area — iPhone Notch */
      .mob-bar {
        padding-top: env(safe-area-inset-top, 0px);
        height: calc(var(--mob-bar-h) + env(safe-area-inset-top, 0px));
      }
    }

    /* Small Mobile ≤ 480px */
    @media (max-width: 480px) {
      .stats-grid, .dashboard-grid, .cards-grid, .kpi-grid {
        grid-template-columns: 1fr !important;
      }
      .main-content, #main-content, .content-area {
        padding-inline: 10px !important;
      }
    }

    /* Tablet 769–1024px */
    @media (min-width: 769px) and (max-width: 1024px) {
      .sidebar, #sidebar { width: 220px !important; }
      .main-content, #main-content { margin-right: 220px !important; }
      .stats-grid, .dashboard-grid, .cards-grid {
        grid-template-columns: repeat(2, 1fr) !important;
      }
    }

    /* Reduced Motion */
    @media (prefers-reduced-motion: reduce) {
      .sidebar, #sidebar, .mob-ham .b, .mob-ov {
        transition-duration: 0.01ms !important;
      }
    }

    /* Print */
    @media print {
      .mob-bar, .mob-ov { display: none !important; }
      .sidebar, #sidebar { position: static !important; right: auto !important; }
    }
  `;

  /* ══════════════════════════════════════════════════════
     حقن CSS
  ══════════════════════════════════════════════════════ */
  function injectCSS() {
    if (document.getElementById('mcustoms-responsive')) return;
    const style = document.createElement('style');
    style.id = 'mcustoms-responsive';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /* ══════════════════════════════════════════════════════
     بناء الشريط العلوي
  ══════════════════════════════════════════════════════ */
  function buildBar() {
    if (document.querySelector('.mob-bar')) return null;
    const bar = document.createElement('div');
    bar.className = 'mob-bar';
    bar.setAttribute('role', 'banner');
    bar.innerHTML = `
      <button class="mob-ham" aria-label="فتح القائمة" aria-expanded="false">
        <span class="b"></span><span class="b"></span><span class="b"></span>
      </button>
      <span class="mob-logo">M-Customs • الجمارك</span>
      <div class="mob-av" id="mob-av">؟</div>
    `;
    return bar;
  }

  /* ══════════════════════════════════════════════════════
     التهيئة — تنتظر ظهور الـ Sidebar الديناميكي
  ══════════════════════════════════════════════════════ */
  function setup(sidebar) {
    const bar = buildBar();
    if (!bar) return; // تم التهيئة مسبقاً

    const overlay = document.createElement('div');
    overlay.className = 'mob-ov';

    document.body.insertBefore(bar, document.body.firstChild);
    document.body.appendChild(overlay);

    const ham = bar.querySelector('.mob-ham');
    let isOpen = false;

    const openDrawer = () => {
      isOpen = true;
      sidebar.classList.add('mob-open');
      overlay.classList.add('show');
      ham.classList.add('open');
      ham.setAttribute('aria-expanded', 'true');
      ham.setAttribute('aria-label', 'إغلاق القائمة');
      document.body.classList.add('mob-locked');
    };

    const closeDrawer = () => {
      isOpen = false;
      sidebar.classList.remove('mob-open');
      overlay.classList.remove('show');
      ham.classList.remove('open');
      ham.setAttribute('aria-expanded', 'false');
      ham.setAttribute('aria-label', 'فتح القائمة');
      document.body.classList.remove('mob-locked');
    };

    ham.addEventListener('click', () => isOpen ? closeDrawer() : openDrawer());
    overlay.addEventListener('click', closeDrawer);

    sidebar.addEventListener('click', (e) => {
      if (window.innerWidth > 768) return;
      if (e.target.closest('a, [data-page], .nav-item, li[onclick], button[data-page]'))
        setTimeout(closeDrawer, 180);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) closeDrawer();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && isOpen) closeDrawer();
    });

    syncAvatar(bar);
    watchTitle(bar);

    window.MobileNav = { open: openDrawer, close: closeDrawer };
    console.log('[M-Customs] ✔ Responsive loaded');
  }

  /* ══════════════════════════════════════════════════════
     انتظار الـ Sidebar (يُبنى ديناميكياً بعد initApp)
  ══════════════════════════════════════════════════════ */
  function waitForSidebar() {
    const found = document.querySelector('.sidebar, #sidebar');
    if (found) { setup(found); return; }

    const root = document.getElementById('root') || document.body;
    const observer = new MutationObserver(() => {
      const sb = document.querySelector('.sidebar, #sidebar');
      if (sb) { observer.disconnect(); setup(sb); }
    });
    observer.observe(root, { childList: true, subtree: true });

    // Timeout احتياطي بعد 10 ثواني
    setTimeout(() => {
      observer.disconnect();
      const sb = document.querySelector('.sidebar, #sidebar');
      if (sb) setup(sb);
      else console.warn('[M-Customs] Sidebar not found after 10s');
    }, 10000);
  }

  /* ══════════════════════════════════════════════════════
     مزامنة الأفاتار مع Firebase
  ══════════════════════════════════════════════════════ */
  function syncAvatar(bar) {
    const el = bar.querySelector('#mob-av');
    if (!el) return;

    function tryFB() {
      const fb = window.firebase || window._firebase;
      if (!fb?.auth) return false;
      fb.auth().onAuthStateChanged(user => {
        if (!user) return;
        el.textContent = initial(user.displayName || user.email || '');
        el.title = user.displayName || user.email || '';
        try {
          fb.firestore().collection('users').doc(user.uid).get()
            .then(doc => {
              if (!doc.exists) return;
              const d = doc.data();
              if (d.avatar)
                el.innerHTML = `<img src="${d.avatar}" alt="avatar">`;
              else if (d.name || d.displayName)
                el.textContent = initial(d.name || d.displayName);
            }).catch(() => {});
        } catch (_) {}
      });
      return true;
    }

    if (!tryFB()) {
      const t = setInterval(() => { if (tryFB()) clearInterval(t); }, 400);
      setTimeout(() => clearInterval(t), 10000);
    }
  }

  /* ══════════════════════════════════════════════════════
     تحديث عنوان الصفحة في الشريط العلوي
  ══════════════════════════════════════════════════════ */
  function watchTitle(bar) {
    const logo = bar.querySelector('.mob-logo');
    if (!logo) return;
    const SEL = ['.page-title', 'h1.title', '.section-title', '.content-header h1'];

    function update() {
      for (const s of SEL) {
        const el = document.querySelector(s);
        if (el?.textContent.trim()) { logo.textContent = el.textContent.trim(); return; }
      }
    }

    update();
    const main = document.querySelector('.main-content, #main-content, .content-area, #root');
    if (main) new MutationObserver(update).observe(main, { childList: true, subtree: true });
  }

  /* دالة مساعدة */
  function initial(s) {
    if (!s) return '؟';
    const ar = s.match(/[\u0600-\u06FF]/);
    return ar ? ar[0] : s[0].toUpperCase();
  }

  /* ══════════════════════════════════════════════════════
     تشغيل
  ══════════════════════════════════════════════════════ */
  injectCSS();

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', waitForSidebar);
  else
    waitForSidebar();

})();
