/**
 * feature-animations.js — M-Customs
 * ميزة: انتقالات وتحريك
 * المسار: public/js/feature-animations.js
 * v2 — محدّث بعد قراءة dashboard.js الحقيقي
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════
     CSS
  ══════════════════════════════════════════════════════ */
  const CSS = `

    /* ══ 1. انتقالات الصفحات ══ */
    @keyframes mcPageIn {
      from { opacity: 0; transform: translateY(20px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0)    scale(1);    }
    }
    @keyframes mcPageOut {
      from { opacity: 1; transform: translateY(0) scale(1);    }
      to   { opacity: 0; transform: translateY(-12px) scale(0.98); }
    }

    .mc-page-enter {
      animation: mcPageIn 0.38s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .mc-page-exit {
      animation: mcPageOut 0.22s ease-in both;
      pointer-events: none;
    }

    /* ══ 2. ظهور الكروت — dash-stat-card ══ */
    @keyframes mcCardIn {
      from { opacity: 0; transform: translateY(24px) scale(0.95); }
      to   { opacity: 1; transform: translateY(0)    scale(1);    }
    }

    .mc-card-anim {
      animation: mcCardIn 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    /* Hover lift للكروت */
    .dash-stat-card {
      transition: transform 0.22s cubic-bezier(0.22,1,0.36,1),
                  box-shadow 0.22s,
                  border-color 0.22s !important;
    }
    .dash-stat-card:hover {
      transform: translateY(-4px) scale(1.01) !important;
      box-shadow: 0 10px 28px rgba(28,75,142,0.13) !important;
      border-color: rgba(212,178,102,0.4) !important;
    }
    .dash-stat-card:active {
      transform: translateY(-1px) scale(0.99) !important;
    }

    /* ══ 3. ظهور أقسام الـ Dashboard ══ */
    @keyframes mcSectionIn {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .mc-section-anim {
      animation: mcSectionIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    /* ══ 4. أزرار ══ */
    .btn,
    button[onclick],
    .section-btn,
    .nav-btn,
    .idle-btn {
      transition: transform 0.12s cubic-bezier(0.22,1,0.36,1),
                  opacity 0.12s,
                  background 0.18s,
                  box-shadow 0.18s !important;
    }
    .btn:active,
    button[onclick]:active,
    .section-btn:active { transform: scale(0.93) !important; }

    /* ══ 5. Nav items ══ */
    .nav-item {
      transition: color 0.18s, background 0.18s,
                  border-color 0.18s, transform 0.15s !important;
    }
    .nav-item:active { transform: translateX(-3px); }

    /* ══ 6. Badge نبض ══ */
    @keyframes mcBadgePulse {
      0%,100% { transform: scale(1);    box-shadow: 0 0 0 0 rgba(204,34,41,0.5); }
      60%      { transform: scale(1.2); box-shadow: 0 0 0 5px rgba(204,34,41,0);  }
    }
    #badge-incoming-batches {
      animation: mcBadgePulse 2s ease-in-out infinite;
    }
    .nav-badge.red { animation: mcBadgePulse 2s ease-in-out infinite; }

    /* ══ 7. Spinner محسّن ══ */
    .loader { display:flex; align-items:center; justify-content:center; min-height:220px; }
    .spinner, .dash-spinner {
      border: 3px solid rgba(28,75,142,0.12) !important;
      border-top-color: #1C4B8E !important;
      animation: mcSpin 0.65s linear infinite !important;
    }
    @keyframes mcSpin { to { transform: rotate(360deg); } }

    /* ══ 8. Sidebar Logo ══ */
    .sidebar-logo .logo-icon {
      transition: transform 0.25s cubic-bezier(0.22,1,0.36,1),
                  box-shadow 0.25s !important;
    }
    .sidebar-logo:hover .logo-icon {
      transform: rotate(-10deg) scale(1.12) !important;
      box-shadow: 0 6px 18px rgba(212,178,102,0.4) !important;
    }

    /* ══ 9. Toast ══ */
    @keyframes mcToastIn {
      from { opacity:0; transform:translateY(20px) scale(0.92); }
      to   { opacity:1; transform:translateY(0)    scale(1);    }
    }
    .toast { animation: mcToastIn 0.3s cubic-bezier(0.22,1,0.36,1) both !important; }

    /* ══ 10. Modal ══ */
    @keyframes mcModalIn {
      from { opacity:0; transform:translateY(28px) scale(0.96); }
      to   { opacity:1; transform:translateY(0)    scale(1);    }
    }
    .modal-overlay:not(.hidden) #modal-box {
      animation: mcModalIn 0.32s cubic-bezier(0.22,1,0.36,1) both;
    }

    /* ══ 11. User avatar ══ */
    #user-avatar-wrap {
      transition: transform 0.22s cubic-bezier(0.22,1,0.36,1) !important;
    }
    #user-avatar-wrap:hover { transform: scale(1.1) !important; }

    /* ══ إلغاء الكل عند prefers-reduced-motion ══ */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  `;

  /* ══════════════════════════════════════════════════════
     حقن CSS
  ══════════════════════════════════════════════════════ */
  function injectCSS() {
    if (document.getElementById('mca-style')) return;
    const s = document.createElement('style');
    s.id = 'mca-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════════════════
     انتقالات الصفحات — اعتراض window.navigate
  ══════════════════════════════════════════════════════ */
  function patchNavigate() {
    function tryPatch() {
      if (typeof window.navigate !== 'function') return false;
      if (window.navigate._mcPatched) return true;

      const original = window.navigate;

      window.navigate = function (page, params = {}) {
        const container = document.getElementById('page-container');

        /* إذا لا يوجد محتوى — تشغيل مباشر */
        if (!container || !container.children.length) {
          original.call(this, page, params);
          requestAnimationFrame(() => triggerEnter(container));
          return;
        }

        /* خروج المحتوى القديم */
        container.classList.add('mc-page-exit');
        container.style.pointerEvents = 'none';

        setTimeout(() => {
          container.classList.remove('mc-page-exit');
          container.style.pointerEvents = '';
          /* تشغيل الصفحة الجديدة */
          original.call(this, page, params);
          /* دخول */
          requestAnimationFrame(() => triggerEnter(container));
        }, 200);
      };

      window.navigate._mcPatched = true;
      console.log('[M-Customs Animations] ✔ navigate patched');
      return true;
    }

    if (!tryPatch()) {
      const t = setInterval(() => { if (tryPatch()) clearInterval(t); }, 200);
      setTimeout(() => clearInterval(t), 15000);
    }
  }

  /* ══════════════════════════════════════════════════════
     تشغيل انتقال الدخول
  ══════════════════════════════════════════════════════ */
  function triggerEnter(container) {
    if (!container) return;
    container.classList.add('mc-page-enter');
    container.addEventListener('animationend', () => {
      container.classList.remove('mc-page-enter');
    }, { once: true });
  }

  /* ══════════════════════════════════════════════════════
     تحريك كروت الـ Dashboard (dash-stat-card)
     — تُحمَّل ديناميكياً داخل #dash-stats
  ══════════════════════════════════════════════════════ */
  function watchDashStats() {
    function animateNewCards(root) {
      const cards = root.querySelectorAll('.dash-stat-card:not([data-mc-anim])');
      cards.forEach((card, i) => {
        card.dataset.mcAnim = '1';
        card.style.opacity = '0';
        setTimeout(() => {
          card.style.opacity = '';
          card.classList.add('mc-card-anim');
          card.style.animationDelay = `${i * 70}ms`;
          card.addEventListener('animationend', () => {
            card.classList.remove('mc-card-anim');
            card.style.animationDelay = '';
          }, { once: true });
        }, i * 70);
      });
    }

    function animateSection(el) {
      if (!el || el.dataset.mcSec) return;
      el.dataset.mcSec = '1';
      el.classList.add('mc-section-anim');
      el.addEventListener('animationend', () => {
        el.classList.remove('mc-section-anim');
      }, { once: true });
    }

    /* مراقبة #page-container لاكتشاف الصفحات الجديدة */
    const pageContainer = document.getElementById('page-container');
    if (!pageContainer) return;

    const pageObs = new MutationObserver(() => {
      /* ابحث عن sections الـ dashboard */
      const dashStats   = document.getElementById('dash-stats');
      const dashPrayer  = document.getElementById('dash-prayer');
      const dashAlerts  = document.getElementById('dash-alerts');
      const dashNews    = document.getElementById('dash-news');

      /* راقب #dash-stats لأن الكروت تُحمَّل async */
      if (dashStats && !dashStats.dataset.mcWatched) {
        dashStats.dataset.mcWatched = '1';
        const statsObs = new MutationObserver(() => {
          animateNewCards(dashStats);
        });
        statsObs.observe(dashStats, { childList: true, subtree: true });
        /* حرّك أي كروت موجودة */
        animateNewCards(dashStats);
      }

      /* راقب باقي الأقسام */
      [dashPrayer, dashAlerts, dashNews].forEach(sec => {
        if (!sec || sec.dataset.mcWatched) return;
        sec.dataset.mcWatched = '1';
        const secObs = new MutationObserver(() => {
          if (sec.children.length) {
            animateSection(sec);
            secObs.disconnect();
          }
        });
        secObs.observe(sec, { childList: true });
        if (sec.children.length) animateSection(sec);
      });
    });

    pageObs.observe(pageContainer, { childList: true, subtree: true });

    /* حرّك المحتوى الحالي إذا كان موجوداً */
    const dashStats = document.getElementById('dash-stats');
    if (dashStats) {
      animateNewCards(dashStats);
      if (!dashStats.dataset.mcWatched) {
        dashStats.dataset.mcWatched = '1';
        new MutationObserver(() => animateNewCards(dashStats))
          .observe(dashStats, { childList: true, subtree: true });
      }
    }
  }

  /* ══════════════════════════════════════════════════════
     التهيئة الرئيسية
  ══════════════════════════════════════════════════════ */
  function init() {
    injectCSS();
    patchNavigate();

    /* انتظر وجود page-container */
    function tryWatch() {
      if (document.getElementById('page-container')) {
        watchDashStats();
        return true;
      }
      return false;
    }

    if (!tryWatch()) {
      const obs = new MutationObserver(() => {
        if (tryWatch()) obs.disconnect();
      });
      obs.observe(document.getElementById('root') || document.body, {
        childList: true, subtree: true
      });
    }

    console.log('[M-Customs Animations] ✔ Loaded');
  }

  /* ══════════════════════════════════════════════════════
     تشغيل
  ══════════════════════════════════════════════════════ */
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else
    init();

})();
