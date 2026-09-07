/**
 * feature-charts.js — M-Customs
 * ميزة: Charts تفاعلية في Dashboard
 * المسار: public/js/feature-charts.js
 *
 * يُحقن بعد #dash-stats ويقرأ البيانات من DOM + Firebase
 * يستخدم Chart.js من CDN (يُحمَّل تلقائياً)
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════
     ألوان النظام
  ══════════════════════════════════════════════════════ */
  const CLR = {
    navy   : '#0E1A2E',
    blue   : '#1C4B8E',
    green  : '#2E8B57',
    red    : '#CC2229',
    gold   : '#D4B266',
    bg     : '#F5F3EC',
    border : '#E8E5DC',
    muted  : '#8A8578',
  };

  /* ══════════════════════════════════════════════════════
     CSS
  ══════════════════════════════════════════════════════ */
  const CSS = `
    #dash-charts {
      margin-top: 20px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      font-family: 'Tajawal', sans-serif;
    }

    #dash-charts .chart-card {
      background: white;
      border-radius: 12px;
      border: 1px solid ${CLR.border};
      padding: 18px;
      position: relative;
      overflow: hidden;
    }

    #dash-charts .chart-card::before {
      content: '';
      position: absolute;
      top: 0; right: 0; left: 0;
      height: 3px;
      border-radius: 12px 12px 0 0;
    }
    #dash-charts .chart-card.c-blue::before  { background: ${CLR.blue};  }
    #dash-charts .chart-card.c-green::before { background: ${CLR.green}; }
    #dash-charts .chart-card.c-gold::before  { background: ${CLR.gold};  }

    #dash-charts .chart-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    #dash-charts .chart-title {
      font-size: 13px; font-weight: 800;
      color: ${CLR.navy};
    }
    #dash-charts .chart-sub {
      font-size: 10px; color: ${CLR.muted};
      margin-top: 2px; letter-spacing: .5px;
    }
    #dash-charts .chart-kpi {
      font-family: 'JetBrains Mono', monospace;
      font-size: 22px; font-weight: 900;
      color: ${CLR.navy}; line-height: 1;
    }
    #dash-charts .chart-kpi-label {
      font-size: 10px; color: ${CLR.muted}; margin-top: 3px;
    }
    #dash-charts .chart-canvas-wrap {
      position: relative;
      height: 160px;
    }

    /* بطاقة عريضة تأخذ عمودين */
    #dash-charts .chart-card.wide {
      grid-column: 1 / -1;
    }
    #dash-charts .chart-card.wide .chart-canvas-wrap {
      height: 180px;
    }

    /* Skeleton تحميل */
    #dash-charts .chart-skel {
      height: 160px;
      background: linear-gradient(90deg, #F0EDE4 0%, #F8F6F0 50%, #F0EDE4 100%);
      background-size: 200% 100%;
      animation: mcSkelShimmer 1.5s ease-in-out infinite;
      border-radius: 8px;
    }
    @keyframes mcSkelShimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Responsive */
    @media (max-width: 768px) {
      #dash-charts {
        grid-template-columns: 1fr;
      }
      #dash-charts .chart-card.wide {
        grid-column: 1;
      }
    }
  `;

  /* ══════════════════════════════════════════════════════
     تحميل Chart.js من CDN
  ══════════════════════════════════════════════════════ */
  function loadChartJS(callback) {
    if (window.Chart) { callback(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js';
    s.onload  = callback;
    s.onerror = () => console.warn('[Charts] Chart.js CDN failed');
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════════════════
     قراءة البيانات من DOM (stat-number[data-target])
  ══════════════════════════════════════════════════════ */
  function readStats() {
    const nums = document.querySelectorAll('.stat-number[data-target]');
    const values = Array.from(nums).map(el => parseInt(el.dataset.target) || 0);
    return {
      total     : values[0] || 0,   // إجمالي الشحنات
      inProgress: values[1] || 0,   // قيد المعالجة
      drafts    : values[2] || 0,   // مسودّات النقل
      thisMonth : values[3] || 0,   // هذا الشهر
    };
  }

  /* ══════════════════════════════════════════════════════
     توليد بيانات آخر 6 أشهر
  ══════════════════════════════════════════════════════ */
  /* ══════════════════════════════════════════════════════
     بيانات شهرية حقيقية من window._mcMonthlyData
     (يُحسب في dashboard.js من الشحنات الفعلية)
  ══════════════════════════════════════════════════════ */
  function genMonthlyData(total, thisMonth) {
    const arabicMonths = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                          'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    const now = new Date();

    // استخدم البيانات الحقيقية إذا متوفرة
    if (window._mcMonthlyData && window._mcMonthlyData.length > 0) {
      return window._mcMonthlyData;
    }

    // Fallback: آخر 6 أشهر بالعدد الحقيقي للشهر الحالي فقط
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: arabicMonths[d.getMonth()], value: i === 0 ? thisMonth : 0 });
    }
    return months;
  }

  /* ══════════════════════════════════════════════════════
     Gradient helper
  ══════════════════════════════════════════════════════ */
  function makeGradient(ctx, color, alpha = 0.18) {
    const g = ctx.createLinearGradient(0, 0, 0, 200);
    g.addColorStop(0,   color.replace(')', `, ${alpha})`).replace('rgb', 'rgba'));
    g.addColorStop(1,   color.replace(')', ', 0)').replace('rgb', 'rgba'));
    return g;
  }

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function hexAlpha(hex, a) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  /* ══════════════════════════════════════════════════════
     إعدادات Chart.js المشتركة (RTL + Arabic font)
  ══════════════════════════════════════════════════════ */
  function baseOptions() {
    return {
      responsive  : true,
      maintainAspectRatio: false,
      animation   : { duration: 900, easing: 'easeOutQuart' },
      plugins: {
        legend: {
          labels: {
            font  : { family: "'Tajawal', sans-serif", size: 11 },
            color : CLR.navy,
            boxWidth: 10, padding: 12,
          },
        },
        tooltip: {
          backgroundColor: CLR.navy,
          titleFont  : { family: "'Tajawal', sans-serif", size: 11 },
          bodyFont   : { family: "'Tajawal', sans-serif", size: 12 },
          padding    : 10,
          cornerRadius: 8,
          displayColors: false,
        },
      },
      scales: {
        x: {
          ticks: { font: { family: "'Tajawal', sans-serif", size: 10 }, color: CLR.muted },
          grid : { color: hexAlpha(CLR.border, 0.6) },
        },
        y: {
          ticks: { font: { family: "'Tajawal', sans-serif", size: 10 }, color: CLR.muted },
          grid : { color: hexAlpha(CLR.border, 0.6) },
          beginAtZero: true,
        },
      },
    };
  }

  /* ══════════════════════════════════════════════════════
     Chart 1 — الشحنات الشهرية (Bar)
  ══════════════════════════════════════════════════════ */
  function renderMonthlyChart(stats) {
    const canvas = document.getElementById('mc-chart-monthly');
    if (!canvas || canvas.dataset.rendered) return;
    canvas.dataset.rendered = '1';

    const ctx  = canvas.getContext('2d');
    const data = genMonthlyData(stats.total, stats.thisMonth);

    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, hexAlpha(CLR.blue, 0.85));
    gradient.addColorStop(1, hexAlpha(CLR.blue, 0.35));

    new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels  : data.map(d => d.label),
        datasets : [{
          label           : 'الشحنات',
          data            : data.map(d => d.value),
          backgroundColor : data.map((_, i) =>
            i === data.length - 1 ? hexAlpha(CLR.gold, 0.85) : gradient
          ),
          borderColor: data.map((_, i) =>
            i === data.length - 1 ? CLR.gold : CLR.blue
          ),
          borderWidth    : 1.5,
          borderRadius   : 6,
          borderSkipped  : false,
        }],
      },
      options: {
        ...baseOptions(),
        plugins: {
          ...baseOptions().plugins,
          legend: { display: false },
          tooltip: {
            ...baseOptions().plugins.tooltip,
            callbacks: {
              label: ctx => ` ${ctx.parsed.y} شحنة`,
            },
          },
        },
      },
    });
  }

  /* ══════════════════════════════════════════════════════
     Chart 2 — توزيع الحالات (Doughnut)
  ══════════════════════════════════════════════════════ */
  function renderStatusChart(stats) {
    const canvas = document.getElementById('mc-chart-status');
    if (!canvas || canvas.dataset.rendered) return;
    canvas.dataset.rendered = '1';

    const ctx = canvas.getContext('2d');

    const completed = Math.max(stats.total - stats.inProgress - stats.drafts, 0);
    const inProg    = stats.inProgress;
    const urgent    = stats.drafts;

    new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels  : ['منجزة', 'جارية', 'مسودّات النقل'],
        datasets : [{
          data           : [completed, inProg, urgent],
          backgroundColor: [
            hexAlpha(CLR.green, 0.85),
            hexAlpha(CLR.blue,  0.85),
            hexAlpha(CLR.red,   0.85),
          ],
          borderColor: [CLR.green, CLR.blue, CLR.red],
          borderWidth : 2,
          hoverOffset : 6,
        }],
      },
      options: {
        ...baseOptions(),
        cutout : '68%',
        scales : {},       /* لا محاور للـ Doughnut */
        plugins: {
          ...baseOptions().plugins,
          legend: {
            position: 'bottom',
            labels: {
              font    : { family: "'Tajawal', sans-serif", size: 11 },
              color   : CLR.navy,
              boxWidth: 10,
              padding : 10,
            },
          },
          tooltip: {
            ...baseOptions().plugins.tooltip,
            callbacks: {
              label: ctx =>
                ` ${ctx.label}: ${ctx.parsed} (${Math.round(ctx.parsed / stats.total * 100)}٪)`,
            },
          },
        },
      },
    });
  }

  /* ══════════════════════════════════════════════════════
     Chart 3 — الأداء السنوي (Line — يأخذ العرض الكامل)
  ══════════════════════════════════════════════════════ */
  function renderTrendChart(stats) {
    const canvas = document.getElementById('mc-chart-trend');
    if (!canvas || canvas.dataset.rendered) return;
    canvas.dataset.rendered = '1';

    const ctx     = canvas.getContext('2d');
    const monthly = genMonthlyData(stats.total, stats.thisMonth);

    /* بيانات الوارد الحقيقية من window._mcImportMonthlyData */
    const importData = window._mcImportMonthlyData && window._mcImportMonthlyData.length > 0
      ? window._mcImportMonthlyData.map(d => d.value)
      : monthly.map(() => 0);

    const gradExport = ctx.createLinearGradient(0, 0, 0, 200);
    gradExport.addColorStop(0, hexAlpha(CLR.blue, 0.25));
    gradExport.addColorStop(1, hexAlpha(CLR.blue, 0));

    const gradImport = ctx.createLinearGradient(0, 0, 0, 200);
    gradImport.addColorStop(0, hexAlpha(CLR.green, 0.22));
    gradImport.addColorStop(1, hexAlpha(CLR.green, 0));

    new window.Chart(ctx, {
      type: 'line',
      data: {
        labels  : monthly.map(d => d.label),
        datasets : [
          {
            label          : 'الصادر',
            data           : monthly.map(d => d.value),
            borderColor    : CLR.blue,
            backgroundColor: gradExport,
            borderWidth    : 2.5,
            pointRadius    : 4,
            pointBackgroundColor: CLR.blue,
            pointBorderColor    : 'white',
            pointBorderWidth    : 2,
            tension        : 0.4,
            fill           : true,
          },
          {
            label          : 'الوارد',
            data           : importData,
            borderColor    : CLR.green,
            backgroundColor: gradImport,
            borderWidth    : 2,
            pointRadius    : 3,
            pointBackgroundColor: CLR.green,
            pointBorderColor    : 'white',
            pointBorderWidth    : 2,
            tension        : 0.4,
            fill           : true,
          },
        ],
      },
      options: {
        ...baseOptions(),
        plugins: {
          ...baseOptions().plugins,
          tooltip: {
            ...baseOptions().plugins.tooltip,
            mode     : 'index',
            intersect: false,
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} شحنة`,
            },
          },
        },
        interaction: { mode: 'index', intersect: false },
      },
    });
  }

  /* ══════════════════════════════════════════════════════
     حقن HTML قسم الـ Charts
  ══════════════════════════════════════════════════════ */
  function injectChartsSection(stats) {
    /* منع التكرار */
    if (document.getElementById('dash-charts')) {
      renderAllCharts(stats);
      return;
    }

    const totalFormatted = stats.total.toLocaleString('en-US');

    const html = `
      <div id="dash-charts">

        <!-- Bar: الشحنات الشهرية -->
        <div class="chart-card c-blue">
          <div class="chart-head">
            <div>
              <div class="chart-title">الشحنات الشهرية</div>
              <div class="chart-sub">آخر 6 أشهر · صادر</div>
            </div>
            <div style="text-align:left;">
              <div class="chart-kpi">${totalFormatted}</div>
              <div class="chart-kpi-label">إجمالي الشحنات</div>
            </div>
          </div>
          <div class="chart-canvas-wrap">
            <canvas id="mc-chart-monthly"></canvas>
          </div>
        </div>

        <!-- Doughnut: توزيع الحالات -->
        <div class="chart-card c-green">
          <div class="chart-head">
            <div>
              <div class="chart-title">توزيع الحالات</div>
              <div class="chart-sub">الشحنات الكلية</div>
            </div>
            <div style="text-align:left;">
              <div class="chart-kpi" style="color:#2E8B57;">${stats.inProgress}</div>
              <div class="chart-kpi-label">جارية الآن</div>
            </div>
          </div>
          <div class="chart-canvas-wrap">
            <canvas id="mc-chart-status"></canvas>
          </div>
        </div>

        <!-- Line: مقارنة الصادر والوارد (كامل العرض) -->
        <div class="chart-card c-gold wide">
          <div class="chart-head">
            <div>
              <div class="chart-title">مقارنة الصادر والوارد</div>
              <div class="chart-sub">اتجاه آخر 6 أشهر</div>
            </div>
            <div style="text-align:left;">
              <div class="chart-kpi" style="color:#D4B266;">${stats.thisMonth}</div>
              <div class="chart-kpi-label">هذا الشهر</div>
            </div>
          </div>
          <div class="chart-canvas-wrap">
            <canvas id="mc-chart-trend"></canvas>
          </div>
        </div>

      </div>
    `;

    /* أدرج بعد #dash-stats */
    const dashStats = document.getElementById('dash-stats');
    if (dashStats) {
      dashStats.insertAdjacentHTML('afterend', html);
    } else {
      const pageContainer = document.getElementById('page-container');
      if (pageContainer) pageContainer.insertAdjacentHTML('beforeend', html);
    }

    renderAllCharts(stats);
  }

  function renderAllCharts(stats) {
    loadChartJS(() => {
      setTimeout(() => {
        renderMonthlyChart(stats);
        renderStatusChart(stats);
        renderTrendChart(stats);
      }, 100);
    });
  }

  /* ══════════════════════════════════════════════════════
     مراقبة #dash-stats لاكتشاف الداشبورد وقراءة البيانات
  ══════════════════════════════════════════════════════ */
  function watchForDashboard() {
    function tryInit() {
      const dashStats = document.getElementById('dash-stats');
      if (!dashStats) return false;

      /* انتظر حتى تُحمَّل الإحصائيات الحقيقية */
      const obs = new MutationObserver(() => {
        const statNums = dashStats.querySelectorAll('.stat-number[data-target]');
        if (statNums.length < 4) return; /* لم تكتمل بعد */

        /* أعطِ animateCounters وقتاً للعمل */
        setTimeout(() => {
          const stats = readStats();
          if (stats.total === 0) return;

          obs.disconnect();
          injectChartsSection(stats);
        }, 800);
      });

      obs.observe(dashStats, { childList: true, subtree: true });

      /* تحقق من وجود بيانات حالية */
      const current = dashStats.querySelectorAll('.stat-number[data-target]');
      if (current.length >= 4) {
        setTimeout(() => {
          const stats = readStats();
          if (stats.total > 0) {
            obs.disconnect();
            injectChartsSection(stats);
          }
        }, 800);
      }

      return true;
    }

    /* مراقبة #page-container لاكتشاف الداشبورد */
    const pageContainer = document.getElementById('page-container');
    if (!pageContainer) return;

    if (!tryInit()) {
      const pageObs = new MutationObserver(() => {
        if (tryInit()) pageObs.disconnect();
      });
      pageObs.observe(pageContainer, { childList: true, subtree: true });
    }
  }

  /* ══════════════════════════════════════════════════════
     حقن CSS
  ══════════════════════════════════════════════════════ */
  function injectCSS() {
    if (document.getElementById('mcc-style')) return;
    const s = document.createElement('style');
    s.id = 'mcc-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════════════════
     التهيئة
  ══════════════════════════════════════════════════════ */
  function init() {
    injectCSS();

    function tryStart() {
      if (document.getElementById('page-container')) {
        watchForDashboard();
        return true;
      }
      return false;
    }

    if (!tryStart()) {
      const obs = new MutationObserver(() => {
        if (tryStart()) obs.disconnect();
      });
      obs.observe(document.getElementById('root') || document.body, {
        childList: true, subtree: true
      });
    }

    console.log('[M-Customs Charts] ✔ Loaded');
  }

  /* ══════════════════════════════════════════════════════
     تشغيل
  ══════════════════════════════════════════════════════ */
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else
    init();

})();
