/**
 * feature-responsive.js — M-Customs
 * ميزة: تصميم متجاوب للجوال
 * المسار: public/js/feature-responsive.js
 * 
 * v2 — إصلاح تعارض main.css + استخدام transform للـ Drawer
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════
     CSS — محقون داخل <style>
     
     ملاحظة: main.css يضع:
       .sidebar { position:fixed; top:0; right:0; bottom:0; }
       @media(max-width:768px) { .sidebar { display:none; } }
     
     نحل هذا بـ:
       display:flex !important  ← نلغي display:none
       transform: translateX(110%)  ← نخفيه خارج الشاشة يميناً
       transform: translateX(0) عند الفتح ← يعود لمكانه الأصلي (right:0)
  ══════════════════════════════════════════════════════ */
  const CSS = `
    :root {
      --mob-h: 54px;
    }

    /* ── شريط الجوال العلوي ── */
    .mob-bar {
      display: none;
      position: fixed;
      top: 0; right: 0; left: 0;
      height: var(--mob-h);
      background: linear-gradient(135deg, #0f1f38 0%, #1a3457 100%);
      border-bottom: 1px solid rgba(255,255,255,0.08);
      z-index: 1010;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      gap: 10px;
      font-family: 'Tajawal', sans-serif;
      box-shadow: 0 2px 16px rgba(0,0,0,0.3);
      /* Safe area للـ iPhone notch */
      padding-top: env(safe-area-inset-top, 0);
      height: calc(var(--mob-h) + env(safe-area-inset-top, 0px));
    }

    /* زر الهامبرغر */
    .mob-ham {
      width: 38px; height: 38px;
      background: rgba(255,255,255,0.06);
      border: none; cursor: pointer;
      border-radius: 10px;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 5px; flex-shrink: 0;
      transition: background 0.2s;
      -webkit-tap-highlight-color: transparent;
    }
    .mob-ham:active { background: rgba(255,255,255,0.15); }
    .mob-ham .b {
      display: block; width: 18px; height: 2px;
      background: rgba(255,255,255,0.85); border-radius: 2px;
      transition: transform 0.25s cubic-bezier(0.4,0,0.2,1),
                  opacity  0.25s;
    }
    .mob-ham.open .b:nth-child(1){ transform: translateY(7px) rotate(45deg); }
    .mob-ham.open .b:nth-child(2){ opacity:0; }
    .mob-ham.open .b:nth-child(3){ transform: translateY(-7px) rotate(-45deg); }

    /* اسم التطبيق في المنتصف */
    .mob-title {
      flex: 1;
      text-align: center;
      font-size: 13.5px; font-weight: 700;
      color: rgba(255,255,255,0.9);
      letter-spacing: 0.3px;
      pointer-events: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .mob-title .gold { color: #D4B266; }

    /* أفاتار المستخدم */
    .mob-av {
      width: 34px; height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1C4B8E, #2E8B57);
      border: 1.5px solid rgba(212,178,102,0.4);
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; color: #fff;
      overflow: hidden; flex-shrink: 0; cursor: pointer;
      transition: border-color 0.2s, transform 0.15s;
      -webkit-tap-highlight-color: transparent;
    }
    .mob-av:active { transform: scale(0.92); border-color: rgba(212,178,102,0.8); }
    .mob-av img { width:100%; height:100%; object-fit:cover; }

    /* ── Overlay التعتيم ── */
    .mob-ov {
      display: none;
      position: fixed; inset: 0;
      background: rgba(10,20,40,0.6);
      z-index: 1005;
      opacity: 0;
      transition: opacity 0.3s cubic-bezier(0.4,0,0.2,1);
      -webkit-backdrop-filter: blur(2px);
      backdrop-filter: blur(2px);
    }
    .mob-ov.show { opacity: 1; }

    /* ══════════════════════════════════
       Mobile ≤ 768px
    ══════════════════════════════════ */
    @media (max-width: 768px) {

      /* إظهار شريط الجوال والـ Overlay */
      .mob-bar { display: flex; }
      .mob-ov  { display: block; }

      /* ── Sidebar: من display:none إلى Drawer ── */
      /*
        main.css: position:fixed; top:0; right:0; bottom:0; → نحتفظ بهذا
        main.css: display:none → نلغيه ونستبدله بـ transform
        الإخفاء: translateX(+110%) يحرك السايدبار خارج الشاشة يميناً
        الإظهار: translateX(0) يعيده لمكانه (right:0)
      */
      .sidebar {
        display: flex !important;
        transform: translateX(110%) !important;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                    box-shadow 0.3s !important;
        z-index: 1008 !important;
        box-shadow: none !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        /* Scrollbar */
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,0.1) transparent;
      }
      .sidebar::-webkit-scrollbar { width: 3px; }
      .sidebar::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.12); border-radius: 3px;
      }

      /* عند الفتح: يعود لـ right:0 (مكانه الأصلي) */
      .sidebar.mob-open {
        transform: translateX(0) !important;
        box-shadow: -8px 0 40px rgba(0,0,0,0.45) !important;
      }

      /* ── المحتوى الرئيسي ── */
      .main-content {
        margin-right: 0 !important;
        padding-top: calc(var(--mob-h) + env(safe-area-inset-top, 0px) + 8px) !important;
        box-sizing: border-box !important;
        width: 100% !important;
      }

      /* منع scroll الجسم عند فتح القائمة */
      body.mob-locked {
        overflow: hidden !important;
        touch-action: none !important;
      }

      /* ── بطاقات الإحصائيات ── */
      .stats-row {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 10px !important;
      }

      /* ── الجداول ── */
      .table-wrap, .table-wrapper, .table-responsive {
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch !important;
      }
      .table-wrap::-webkit-scrollbar,
      .table-wrapper::-webkit-scrollbar { height: 3px; }
      .table-wrap::-webkit-scrollbar-thumb,
      .table-wrapper::-webkit-scrollbar-thumb {
        background: #cbd5e1; border-radius: 3px;
      }

      /* ── النماذج ── */
      .form-grid-2, .form-grid-3 {
        grid-template-columns: 1fr !important;
      }
      input, select, textarea {
        font-size: 16px !important; /* يمنع zoom على iOS */
      }

      /* ── Modal (bottom sheet) ── */
      .modal-overlay:not(.hidden) {
        display: flex !important;
        align-items: flex-end !important;
        padding: 0 !important;
      }
      #modal-box {
        width: 100% !important;
        max-width: 100% !important;
        max-height: 90dvh !important;
        border-radius: 20px 20px 0 0 !important;
        overflow-y: auto !important;
      }
      #modal-box::before {
        content: '';
        display: block;
        width: 32px; height: 4px;
        background: rgba(0,0,0,0.12);
        border-radius: 2px;
        margin: 10px auto 6px;
      }

      /* ── إخفاء الـ CTRL+K FAB على الجوال ── */
      #cp-fab { display: none !important; }

      /* ── Toast ── */
      #toast-container {
        right: 10px !important;
        left: 10px !important;
        bottom: 12px !important;
        top: auto !important;
        max-width: 100% !important;
      }
      #toast-container .toast {
        width: 100% !important;
        box-sizing: border-box !important;
        margin-bottom: 6px !important;
      }

      /* أدوات */
      .hide-mobile   { display: none !important; }
      .show-mobile   { display: block !important; }
    }

    /* Small Mobile ≤ 480px */
    @media (max-width: 480px) {
      .stats-row {
        grid-template-columns: 1fr !important;
      }
      .main-content {
        padding-inline: 10px !important;
      }
    }

    /* Tablet 769–1024px */
    @media (min-width: 769px) and (max-width: 1024px) {
      .sidebar { width: 200px !important; }
      .main-content { margin-right: 200px !important; }
    }

    /* Reduced Motion */
    @media (prefers-reduced-motion: reduce) {
      .sidebar, .mob-ham .b, .mob-ov {
        transition-duration: 0.01ms !important;
      }
    }
  `;

  /* ══════════════════════════════════════════════════════
     حقن CSS في <head>
  ══════════════════════════════════════════════════════ */
  function injectCSS() {
    if (document.getElementById('mcr-style')) return;
    const s = document.createElement('style');
    s.id = 'mcr-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════════════════
     بناء شريط الجوال
  ══════════════════════════════════════════════════════ */
  function buildBar() {
    if (document.querySelector('.mob-bar')) return null;
    const bar = document.createElement('div');
    bar.className = 'mob-bar';
    bar.setAttribute('role', 'banner');
    /* RTL: الهامبرغر على اليمين (start)، الأفاتار على اليسار (end) */
    bar.innerHTML = `
      <button class="mob-ham" aria-label="القائمة" aria-expanded="false" aria-haspopup="true">
        <span class="b"></span>
        <span class="b"></span>
        <span class="b"></span>
      </button>
      <span class="mob-title">M&#8209;Customs <span class="gold">•</span> الجمارك</span>
      <div class="mob-av" id="mob-av" role="img" aria-label="حساب المستخدم">م</div>
    `;
    return bar;
  }

  /* ══════════════════════════════════════════════════════
     التهيئة (تعمل بعد ظهور الـ Sidebar في DOM)
  ══════════════════════════════════════════════════════ */
  function setup(sidebar) {
    /* منع التهيئة المزدوجة */
    if (sidebar.dataset.mobReady === '1') return;
    sidebar.dataset.mobReady = '1';

    const bar = buildBar();
    if (!bar) return;

    const overlay = Object.assign(document.createElement('div'), { className: 'mob-ov' });
    document.body.insertBefore(bar, document.body.firstChild);
    document.body.appendChild(overlay);

    const ham = bar.querySelector('.mob-ham');
    let open = false;

    /* ── فتح ── */
    function openMenu() {
      open = true;
      sidebar.classList.add('mob-open');
      overlay.classList.add('show');
      ham.classList.add('open');
      ham.setAttribute('aria-expanded', 'true');
      document.body.classList.add('mob-locked');
    }

    /* ── إغلاق ── */
    function closeMenu() {
      open = false;
      sidebar.classList.remove('mob-open');
      overlay.classList.remove('show');
      ham.classList.remove('open');
      ham.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('mob-locked');
    }

    ham.addEventListener('click', () => open ? closeMenu() : openMenu());
    overlay.addEventListener('click', closeMenu);

    /* إغلاق عند النقر على رابط في القائمة */
    sidebar.addEventListener('click', e => {
      if (window.innerWidth > 768) return;
      if (e.target.closest('.nav-item, a[data-page]'))
        setTimeout(closeMenu, 200);
    });

    /* Escape */
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && open) closeMenu();
    });

    /* إعادة ضبط عند تدوير الشاشة */
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && open) closeMenu();
    });

    /* مزامنة الأفاتار */
    syncAvatar(bar, sidebar);

    /* تحديث العنوان */
    watchTitle(bar);

    /* API للاستخدام الخارجي */
    window.MobileNav = { open: openMenu, close: closeMenu };
    console.log('[M-Customs Responsive] ✔ Ready');
  }

  /* ══════════════════════════════════════════════════════
     انتظار ظهور الـ Sidebar في DOM (يُبنى ديناميكياً)
  ══════════════════════════════════════════════════════ */
  function waitForSidebar() {
    /* قد يكون موجوداً بالفعل */
    const found = document.querySelector('aside.sidebar, .sidebar');
    if (found) { setup(found); return; }

    /* مراقبة #root لاكتشافه عند إنشائه */
    const root = document.getElementById('root') || document.body;
    const obs = new MutationObserver(() => {
      const sb = document.querySelector('aside.sidebar, .sidebar');
      if (sb) { obs.disconnect(); setup(sb); }
    });
    obs.observe(root, { childList: true, subtree: true });

    /* احتياطي: بعد 15 ثانية */
    setTimeout(() => {
      obs.disconnect();
      const sb = document.querySelector('aside.sidebar, .sidebar');
      if (sb) setup(sb);
    }, 15000);
  }

  /* ══════════════════════════════════════════════════════
     مزامنة الأفاتار مع Firebase Auth
  ══════════════════════════════════════════════════════ */
  function syncAvatar(bar, sidebar) {
    const el = bar.querySelector('#mob-av');
    if (!el) return;

    /* أسرع طريقة: اقرأ الاسم من سيدبار مباشرة */
    const nameEl = sidebar.querySelector('.user-name');
    if (nameEl?.textContent.trim()) {
      el.textContent = initial(nameEl.textContent.trim());
    }

    /* مزامنة مع Firebase */
    function tryFB() {
      const fb = window.firebase;
      if (!fb?.auth) return false;
      fb.auth().onAuthStateChanged(user => {
        if (!user) return;
        el.title = user.displayName || user.email || '';
        /* حاول تحميل الأفاتار المحفوظ */
        try {
          fb.firestore().collection('users').doc(user.uid).get()
            .then(doc => {
              if (!doc.exists) return;
              const d = doc.data();
              if (d?.avatar) {
                el.innerHTML = `<img src="${d.avatar}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
              } else if (d?.name) {
                el.textContent = initial(d.name);
              }
            }).catch(() => {});
        } catch (_) {}
      });
      return true;
    }

    if (!tryFB()) {
      const t = setInterval(() => { if (tryFB()) clearInterval(t); }, 500);
      setTimeout(() => clearInterval(t), 12000);
    }
  }

  /* ══════════════════════════════════════════════════════
     تحديث عنوان الصفحة في الشريط العلوي
  ══════════════════════════════════════════════════════ */
  function watchTitle(bar) {
    const titleEl = bar.querySelector('.mob-title');
    if (!titleEl) return;

    function getTitle() {
      const SEL = ['.page-title', 'h1', '.section-title', '.topbar h1'];
      for (const s of SEL) {
        const el = document.querySelector(s);
        const t = el?.textContent?.trim();
        if (t && t.length < 30) return t;
      }
      return null;
    }

    const main = document.querySelector('.main-content, #page-container');
    if (!main) return;

    new MutationObserver(() => {
      const t = getTitle();
      if (t) titleEl.innerHTML = `${t}`;
      else   titleEl.innerHTML = `M&#8209;Customs <span class="gold">•</span> الجمارك`;
    }).observe(main, { childList: true, subtree: false });
  }

  /* دالة مساعدة: الحرف الأول */
  function initial(s) {
    if (!s) return 'م';
    const ar = s.match(/[\u0600-\u06FF]/);
    return ar ? ar[0] : (s[0] || 'م').toUpperCase();
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
