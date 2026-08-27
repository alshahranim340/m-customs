/**
 * feature-animations.js — M-Customs
 * ميزة: انتقالات وتحريك
 * المسار: public/js/feature-animations.js
 *
 * ملف مكتفٍ بنفسه — يحقن CSS تلقائياً، لا يعدّل ملفات موجودة
 * يعترض window.navigate لإضافة انتقالات الصفحات
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════
     CSS — الانتقالات والتحريك
  ══════════════════════════════════════════════════════ */
  const CSS = `

    /* ══ 1. انتقالات الصفحات ══ */
    @keyframes mcPageIn {
      from { opacity: 0; transform: translateY(12px) scale(0.99); }
      to   { opacity: 1; transform: translateY(0)   scale(1); }
    }
    @keyframes mcPageOut {
      from { opacity: 1; transform: translateY(0)    scale(1); }
      to   { opacity: 0; transform: translateY(-8px) scale(0.99); }
    }

    .mc-page-enter {
      animation: mcPageIn 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .mc-page-exit {
      animation: mcPageOut 0.18s ease-in both;
      pointer-events: none;
    }

    /* ══ 2. ظهور الكروت (Stagger) ══ */
    @keyframes mcCardIn {
      from { opacity: 0; transform: translateY(18px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0)    scale(1); }
    }

    .mc-card-anim {
      opacity: 0;
      animation: mcCardIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }
    /* تأخير تتابعي — يُضبط بـ JS */
    .mc-card-anim:nth-child(1)  { animation-delay: 0.00s; }
    .mc-card-anim:nth-child(2)  { animation-delay: 0.06s; }
    .mc-card-anim:nth-child(3)  { animation-delay: 0.12s; }
    .mc-card-anim:nth-child(4)  { animation-delay: 0.18s; }
    .mc-card-anim:nth-child(5)  { animation-delay: 0.24s; }
    .mc-card-anim:nth-child(6)  { animation-delay: 0.30s; }
    .mc-card-anim:nth-child(7)  { animation-delay: 0.36s; }
    .mc-card-anim:nth-child(8)  { animation-delay: 0.42s; }
    .mc-card-anim:nth-child(n+9){ animation-delay: 0.48s; }

    /* ══ 3. ظهور عناصر القوائم (Stagger) ══ */
    @keyframes mcRowIn {
      from { opacity: 0; transform: translateX(10px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    .mc-row-anim {
      opacity: 0;
      animation: mcRowIn 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }

    /* ══ 4. عداد الأرقام — ظهور الإحصائيات ══ */
    .mc-count { transition: color 0.3s; }

    /* ══ 5. تأثير ضغط الأزرار ══ */
    .btn, button.btn-primary, button.btn-ghost,
    button.btn-danger, button.btn-success,
    .action-btn, .nav-btn {
      transition: transform 0.12s cubic-bezier(0.22, 1, 0.36, 1),
                  box-shadow 0.15s,
                  background 0.15s,
                  opacity 0.15s !important;
    }
    .btn:active, button.btn-primary:active,
    button.btn-ghost:active, button.btn-danger:active,
    .action-btn:active {
      transform: scale(0.95) !important;
    }

    /* ══ 6. Nav items — تأثير الانتقال ══ */
    .nav-item {
      transition: color 0.18s, background 0.18s,
                  border-color 0.18s, transform 0.15s !important;
    }
    .nav-item:active { transform: scale(0.97); }

    /* ══ 7. Badge نبض للإشعارات ══ */
    @keyframes mcBadgePulse {
      0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(204,34,41,0.5); }
      50%       { transform: scale(1.15); box-shadow: 0 0 0 4px rgba(204,34,41,0); }
    }
    #badge-incoming-batches:not([style*="display: none"]),
    #badge-incoming-batches:not([style*="display:none"]) {
      animation: mcBadgePulse 2s ease-in-out infinite;
    }
    .nav-badge.red { animation: mcBadgePulse 2s ease-in-out infinite; }

    /* ══ 8. Loader (Spinner) — أنيق ══ */
    .loader {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 200px;
    }
    .spinner {
      width: 36px; height: 36px;
      border: 3px solid rgba(28,75,142,0.15);
      border-top-color: #1C4B8E;
      border-radius: 50%;
      animation: mcSpin 0.7s linear infinite;
    }
    @keyframes mcSpin { to { transform: rotate(360deg); } }

    /* ══ 9. Sidebar Logo ══ */
    .sidebar-logo .logo-icon {
      transition: transform 0.25s cubic-bezier(0.22,1,0.36,1),
                  box-shadow 0.25s !important;
    }
    .sidebar-logo:hover .logo-icon {
      transform: rotate(-8deg) scale(1.1);
      box-shadow: 0 4px 16px rgba(212,178,102,0.35);
    }

    /* ══ 10. Toast — تحسين ظهور ══ */
    @keyframes mcToastIn {
      from { opacity: 0; transform: translateY(16px) scale(0.95); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes mcToastOut {
      from { opacity: 1; transform: scale(1); }
      to   { opacity: 0; transform: scale(0.9) translateY(8px); }
    }
    .toast {
      animation: mcToastIn 0.25s cubic-bezier(0.22, 1, 0.36, 1) both !important;
    }

    /* ══ 11. Modal — ظهور ══ */
    @keyframes mcModalIn {
      from { opacity: 0; transform: translateY(20px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .modal-overlay:not(.hidden) #modal-box {
      animation: mcModalIn 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    /* ══ 12. Section Switcher ══ */
    .section-btn {
      transition: background 0.2s, color 0.2s, transform 0.15s !important;
    }
    .section-btn:active { transform: scale(0.95); }

    /* ══ 13. Stat Card — hover lift ══ */
    .stat-card {
      transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1),
                  box-shadow 0.2s !important;
      cursor: default;
    }
    .stat-card:hover {
      transform: translateY(-3px) !important;
      box-shadow: 0 8px 24px rgba(28,75,142,0.12) !important;
    }

    /* ══ 14. User Avatar hover ══ */
    #user-avatar-wrap {
      transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1) !important;
    }
    #user-avatar-wrap:hover {
      transform: scale(1.08) !important;
    }

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
     انتقالات الصفحات — نعترض window.navigate
  ══════════════════════════════════════════════════════ */
  function patchNavigate() {
    /* ننتظر حتى تُعرَّف navigate في window */
    function tryPatch() {
      if (typeof window.navigate !== 'function') return false;
      if (window.navigate._mcPatched) return true; /* تم من قبل */

      const original = window.navigate;

      window.navigate = function (page, params = {}) {
        const container = document.getElementById('page-container');

        if (!container || !container.children.length) {
          /* لا يوجد محتوى سابق — تشغيل مباشر */
          original.call(this, page, params);
          requestAnimationFrame(() => animatePageEnter(container));
          return;
        }

        /* 1. خروج المحتوى القديم */
        container.classList.add('mc-page-exit');

        setTimeout(() => {
          container.classList.remove('mc-page-exit');
          /* 2. تشغيل الصفحة الجديدة */
          original.call(this, page, params);
          /* 3. دخول المحتوى الجديد */
          requestAnimationFrame(() => animatePageEnter(container));
        }, 160); /* مدة mc-page-exit */
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
     تحريك دخول الصفحة + stagger للكروت والصفوف
  ══════════════════════════════════════════════════════ */
  function animatePageEnter(container) {
    if (!container) return;
    container.classList.add('mc-page-enter');
    container.addEventListener('animationend', () => {
      container.classList.remove('mc-page-enter');
    }, { once: true });

    /* stagger للكروت بعد قليل */
    setTimeout(() => {
      animateCards(container);
      animateRows(container);
      animateNumbers(container);
    }, 50);
  }

  /* ══════════════════════════════════════════════════════
     Stagger للكروت
  ══════════════════════════════════════════════════════ */
  function animateCards(root) {
    const CARD_SEL = [
      '.stats-row > *',
      '.stat-card',
      '.kpi-card',
      '.info-card',
      '.shipment-card',
      '.batch-card',
      '.dashboard-card',
    ].join(', ');

    const cards = root.querySelectorAll(CARD_SEL);
    cards.forEach((card, i) => {
      if (card.dataset.mcAnim) return; /* منع التكرار */
      card.dataset.mcAnim = '1';
      card.style.opacity = '0';
      setTimeout(() => {
        card.style.opacity = '';
        card.classList.add('mc-card-anim');
        card.addEventListener('animationend', () => {
          card.classList.remove('mc-card-anim');
          card.style.opacity = '';
        }, { once: true });
      }, i * 60);
    });
  }

  /* ══════════════════════════════════════════════════════
     Stagger لصفوف الجداول والقوائم
  ══════════════════════════════════════════════════════ */
  function animateRows(root) {
    const ROW_SEL = 'tbody tr, .shipment-list > *, .batch-list > *';
    const rows = root.querySelectorAll(ROW_SEL);

    /* فقط إذا كان عدد الصفوف معقولاً */
    if (rows.length > 40) return;

    rows.forEach((row, i) => {
      if (row.dataset.mcAnim) return;
      row.dataset.mcAnim = '1';
      row.style.opacity = '0';
      setTimeout(() => {
        row.style.opacity = '';
        row.classList.add('mc-row-anim');
        row.addEventListener('animationend', () => {
          row.classList.remove('mc-row-anim');
        }, { once: true });
      }, Math.min(i * 40, 600)); /* حد أقصى 600ms */
    });
  }

  /* ══════════════════════════════════════════════════════
     عداد الأرقام (Count-Up) للإحصائيات
  ══════════════════════════════════════════════════════ */
  function animateNumbers(root) {
    const NUM_SEL = [
      '.stat-value', '.kpi-value', '.count-value',
      '.stat-card .value', '.stat-card [class*="value"]',
      '.stat-card [class*="number"]', '.stat-card strong',
      /* أرقام الـ dashboard */
      '.dashboard-num', '.big-number',
    ].join(', ');

    root.querySelectorAll(NUM_SEL).forEach(el => {
      if (el.dataset.mcCount) return;
      const text = el.textContent.trim();
      const num  = parseFloat(text.replace(/[,٬،]/g, ''));
      if (isNaN(num) || num === 0 || num > 999999) return;

      el.dataset.mcCount = '1';
      countUp(el, num, text);
    });
  }

  function countUp(el, target, originalText) {
    const duration = Math.min(800, 200 + target * 0.5);
    const start    = performance.now();
    const isFloat  = !Number.isInteger(target);

    /* استخرج prefix/suffix من النص الأصلي */
    const prefix = originalText.replace(/[\d,٬،.]+/, '').split(
      /[\d,٬،.]/)[0] || '';
    const suffix = originalText.slice(
      originalText.search(/[\d,٬،.]/) + String(target).length) || '';

    function step(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      /* easeOutExpo */
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(eased * target * (isFloat ? 10 : 1)) / (isFloat ? 10 : 1);
      el.textContent = prefix + current.toLocaleString('ar-SA') + suffix;
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = originalText; /* استعادة النص الأصلي بدقة */
    }
    requestAnimationFrame(step);
  }

  /* ══════════════════════════════════════════════════════
     مراقبة #page-container لتحريك المحتوى الجديد
     (يعمل كـ fallback إذا لم يُعترض navigate)
  ══════════════════════════════════════════════════════ */
  function watchPageContainer() {
    const container = document.getElementById('page-container');
    if (!container) return;

    new MutationObserver(mutations => {
      for (const m of mutations) {
        if (m.addedNodes.length) {
          /* تأخير قصير لإتاحة render */
          setTimeout(() => {
            animateCards(container);
            animateRows(container);
            animateNumbers(container);
          }, 80);
          break;
        }
      }
    }).observe(container, { childList: true });
  }

  /* ══════════════════════════════════════════════════════
     انتظار جاهزية التطبيق
  ══════════════════════════════════════════════════════ */
  function init() {
    injectCSS();
    patchNavigate();

    /* انتظر وجود page-container */
    function tryWatch() {
      if (document.getElementById('page-container')) {
        watchPageContainer();
        /* حرّك المحتوى الحالي إذا كان موجوداً */
        const c = document.getElementById('page-container');
        if (c.children.length) {
          animateCards(c);
          animateRows(c);
          animateNumbers(c);
        }
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
