/**
 * feature-empty-states.js — M-Customs
 * Empty States احترافية لكل صفحات النظام
 * المسار: public/js/feature-empty-states.js
 *
 * ملف مكتفٍ بنفسه — يحقن CSS ويراقب الصفحات تلقائياً
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════
     CSS
  ══════════════════════════════════════════════════════ */
  const CSS = `
    /* ── Base empty state ── */
    .mc-es {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 32px;
      text-align: center;
      font-family: 'Tajawal', sans-serif;
    }

    .mc-es-icon-wrap {
      width: 88px;
      height: 88px;
      border-radius: 22px;
      background: linear-gradient(135deg, #F0EDE4 0%, #E8E5DC 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 38px;
      margin-bottom: 22px;
      box-shadow: 0 4px 20px rgba(0,0,0,.07);
      transition: transform .25s cubic-bezier(.22,1,.36,1);
    }
    .mc-es:hover .mc-es-icon-wrap {
      transform: translateY(-4px) scale(1.04);
    }

    .mc-es-title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      font-weight: 900;
      color: #0E1A2E;
      letter-spacing: 1.5px;
      margin-bottom: 3px;
    }

    .mc-es-sub {
      font-size: 15px;
      font-weight: 700;
      color: #4A4540;
      margin-bottom: 10px;
    }

    .mc-es-desc {
      font-size: 12px;
      color: #8A8578;
      max-width: 300px;
      line-height: 1.7;
      margin-bottom: 26px;
    }

    .mc-es-action {
      padding: 11px 26px;
      border-radius: 10px;
      border: none;
      font-family: 'Tajawal', sans-serif;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all .18s;
      display: inline-flex;
      align-items: center;
      gap: 7px;
    }
    .mc-es-action.primary {
      background: #1C4B8E;
      color: white;
    }
    .mc-es-action.primary:hover {
      background: #163B6E;
      transform: translateY(-2px);
      box-shadow: 0 4px 14px rgba(28,75,142,.25);
    }
    .mc-es-action.ghost {
      background: white;
      color: #1C4B8E;
      border: 1.5px solid #C7D2FE;
    }
    .mc-es-action.ghost:hover {
      background: #EEF2FF;
      transform: translateY(-1px);
    }

    .mc-es-hint {
      margin-top: 14px;
      font-size: 11px;
      color: #C4B9A8;
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: .5px;
    }

    /* ── Status-specific icons ── */
    .mc-es-icon-wrap.blue   { background: linear-gradient(135deg,#EEF2FF,#C7D2FE); }
    .mc-es-icon-wrap.green  { background: linear-gradient(135deg,#E7F5EE,#BBF7D0); }
    .mc-es-icon-wrap.amber  { background: linear-gradient(135deg,#FEF3E2,#FDE68A); }
    .mc-es-icon-wrap.red    { background: linear-gradient(135deg,#FEEBEB,#FCA5A5); }
    .mc-es-icon-wrap.purple { background: linear-gradient(135deg,#EDE8F5,#DDD6FE); }
  `;

  /* ══════════════════════════════════════════════════════
     Empty State Definitions — per section
  ══════════════════════════════════════════════════════ */
  const STATES = {

    // ── Shipments (Export) ──
    shipments: {
      all: {
        icon:'📦', iconColor:'blue',
        title:'NO SHIPMENTS',
        sub:'لا توجد شحنات',
        desc:'No shipments have been created yet. Start by adding your first export shipment.',
        action:{ label:'+ New Shipment / شحنة جديدة', fn:"document.querySelector('.modern-btn-primary')?.click()", style:'primary' }
      },
      waiting: {
        icon:'🕐', iconColor:'amber',
        title:'NOTHING WAITING',
        sub:'لا شيء قيد الانتظار',
        desc:'All shipments are moving. No shipments currently waiting.',
        hint:'TRY SWITCHING FILTER TO "ALL"'
      },
      delivered: {
        icon:'✅', iconColor:'green',
        title:'NO DELIVERIES YET',
        sub:'لا توجد شحنات مسلَّمة',
        desc:'No shipments have been delivered yet.',
        hint:'DELIVERED SHIPMENTS WILL APPEAR HERE'
      },
      search: {
        icon:'🔍', iconColor:'',
        title:'NO RESULTS',
        sub:'لا توجد نتائج',
        desc:'No shipments match your search. Try a different BL number, driver name, or exporter.',
        hint:'SEARCH BY BL · DRIVER · EXPORTER · PLATE'
      }
    },

    // ── Import Shipments ──
    import_shipments: {
      all: {
        icon:'🚢', iconColor:'blue',
        title:'NO IMPORT SHIPMENTS',
        sub:'لا توجد شحنات وارد',
        desc:'No import shipments found. Add your first import to start tracking.',
        action:{ label:'+ New Shipment / شحنة جديدة', fn:"openImportModal && openImportModal()", style:'primary' }
      },
      waiting: {
        icon:'🕐', iconColor:'amber',
        title:'NONE WAITING',
        sub:'لا شحنات قيد الانتظار',
        desc:'All import shipments are processed or delivered.',
        hint:'FILTER: WAITING'
      },
      clearance: {
        icon:'📋', iconColor:'blue',
        title:'NONE IN CLEARANCE',
        sub:'لا شحنات قيد التخليص',
        desc:'No shipments are currently undergoing customs clearance.',
        hint:'FILTER: CLEARANCE'
      },
      delivered: {
        icon:'✅', iconColor:'green',
        title:'NO DELIVERIES YET',
        sub:'لا شحنات مسلَّمة بعد',
        desc:'Delivered import shipments will appear here.',
        hint:'FILTER: DELIVERED'
      }
    },

    // ── Expenses / Invoices ──
    expenses: {
      all: {
        icon:'💰', iconColor:'amber',
        title:'NO INVOICES',
        sub:'لا توجد فواتير',
        desc:'No invoices have been created yet. Create your first invoice to start tracking expenses.',
        action:{ label:'+ New Invoice / فاتورة جديدة', fn:"document.querySelector('.modern-btn-primary')?.click()", style:'primary' }
      },
      unpaid: {
        icon:'✅', iconColor:'green',
        title:'ALL PAID',
        sub:'جميع الفواتير مدفوعة',
        desc:'Great news — no outstanding invoices.',
        hint:'FILTER: UNPAID'
      }
    },

    // ── Customers ──
    customers: {
      all: {
        icon:'👥', iconColor:'blue',
        title:'NO CUSTOMERS',
        sub:'لا يوجد عملاء',
        desc:'Your customer database is empty. Add your first customer to get started.',
        action:{ label:'+ New Customer / عميل جديد', fn:"openCustomerModal && openCustomerModal()", style:'primary' }
      },
      search: {
        icon:'🔍', iconColor:'',
        title:'NO MATCH',
        sub:'لا توجد نتائج',
        desc:'No customers match your search. Try company name, CR number, or VAT number.',
        hint:'SEARCH BY COMPANY · CR · VAT'
      }
    },

    // ── Agents ──
    agents: {
      all: {
        icon:'🤝', iconColor:'blue',
        title:'NO AGENTS',
        sub:'لا يوجد وكلاء',
        desc:'No shipping agents have been added. Add your first agent to start sending email alerts.',
        action:{ label:'+ New Agent / وكيل جديد', fn:"document.getElementById('btn-new-agent')?.click()", style:'primary' }
      }
    },

    // ── Quotations ──
    quotations: {
      all: {
        icon:'📝', iconColor:'purple',
        title:'NO QUOTATIONS',
        sub:'لا توجد عروض أسعار',
        desc:'No quotations have been created. Create your first price quotation.',
        action:{ label:'+ New Quotation / عرض جديد', fn:"document.querySelector('.modern-btn-primary')?.click()", style:'primary' }
      },
      pending: {
        icon:'⏳', iconColor:'amber',
        title:'NO PENDING',
        sub:'لا عروض معلقة',
        desc:'No quotations are waiting for approval.',
        hint:'FILTER: PENDING'
      },
      approved: {
        icon:'✅', iconColor:'green',
        title:'NONE APPROVED YET',
        sub:'لا عروض موافق عليها',
        desc:'Approved quotations will appear here.',
        hint:'FILTER: APPROVED'
      }
    },

    // ── Calendar / Alerts ──
    calendar: {
      alerts: {
        icon:'🔔', iconColor:'green',
        title:'ALL CLEAR',
        sub:'لا تنبيهات',
        desc:'No shipments require alerts in the next 5 days.',
        hint:'ETA ALERTS APPEAR 5 DAYS BEFORE ARRIVAL'
      },
      overdue: {
        icon:'✅', iconColor:'green',
        title:'NOTHING OVERDUE',
        sub:'لا شحنات متأخرة',
        desc:'All shipments are on schedule.',
        hint:'OVERDUE = PAST ETA & NOT DELIVERED'
      }
    },

    // ── Activity Log ──
    activity: {
      all: {
        icon:'📋', iconColor:'blue',
        title:'NO ACTIVITY YET',
        sub:'لا توجد نشاطات بعد',
        desc:'All system actions will be recorded here automatically. Save a shipment or change a status to create your first log.',
        hint:'ACTIONS ARE LOGGED AUTOMATICALLY'
      },
      export: {
        icon:'📦', iconColor:'blue',
        title:'NO EXPORT ACTIVITY',
        sub:'لا نشاطات في قسم الصادر',
        desc:'No actions have been recorded for the export section.',
        hint:'FILTER: EXPORT'
      },
      import: {
        icon:'🚢', iconColor:'blue',
        title:'NO IMPORT ACTIVITY',
        sub:'لا نشاطات في قسم الوارد',
        desc:'No actions have been recorded for the import section.',
        hint:'FILTER: IMPORT'
      }
    },

    // ── Generic fallback ──
    generic: {
      icon:'📂', iconColor:'',
      title:'NOTHING HERE',
      sub:'لا يوجد شيء هنا',
      desc:'This section is empty.',
      hint:'ADD ITEMS TO SEE THEM HERE'
    }
  };

  /* ══════════════════════════════════════════════════════
     Build enhanced empty state HTML
  ══════════════════════════════════════════════════════ */
  function buildEmptyState(cfg) {
    const actionHTML = cfg.action ? `
      <button class="mc-es-action ${cfg.action.style || 'primary'}"
        onclick="${cfg.action.fn}">
        ${cfg.action.label}
      </button>` : '';

    const hintHTML = cfg.hint ? `
      <div class="mc-es-hint">${cfg.hint}</div>` : '';

    return `
      <div class="mc-es">
        <div class="mc-es-icon-wrap ${cfg.iconColor || ''}">
          ${cfg.icon}
        </div>
        <div class="mc-es-title">${cfg.title}</div>
        <div class="mc-es-sub">${cfg.sub}</div>
        <div class="mc-es-desc">${cfg.desc}</div>
        ${actionHTML}
        ${hintHTML}
      </div>`;
  }

  /* ══════════════════════════════════════════════════════
     Detect which section/state we're in
  ══════════════════════════════════════════════════════ */
  function detectContext(el) {
    // Walk up the DOM to find context clues
    const page = document.getElementById('page-container');
    if (!page) return STATES.generic;

    const pageText = page.textContent || '';
    const header   = page.querySelector('.modern-header-title, h1, .page-title');
    const headerTxt = header?.textContent?.trim() || '';

    // Check active nav
    const nav = document.querySelector('.nav-item.active, .mc-log-nav-item.active');
    const navTxt = nav?.textContent?.trim() || '';

    // ── Activity Log ──
    if (headerTxt.includes('Activity Log') || headerTxt.includes('سجل')) {
      const filter = document.querySelector('.mc-log-filter-btn.active')?.textContent?.trim() || '';
      if (filter.includes('صادر') || filter.includes('export')) return STATES.activity.export;
      if (filter.includes('وارد') || filter.includes('import')) return STATES.activity.import;
      return STATES.activity.all;
    }

    // ── Expenses ──
    if (headerTxt.includes('مصار') || navTxt.includes('مصار') || pageText.includes('INVOICES')) {
      return STATES.expenses.all;
    }

    // ── Customers ──
    if (headerTxt.includes('عميل') || navTxt.includes('عميل') || headerTxt.includes('Customer')) {
      return STATES.customers.all;
    }

    // ── Agents ──
    if (headerTxt.includes('وكيل') || navTxt.includes('وكيل') || headerTxt.includes('Agent')) {
      return STATES.agents.all;
    }

    // ── Quotations ──
    if (headerTxt.includes('عرض') || navTxt.includes('عرض') || pageText.includes('QUOTATION')) {
      return STATES.quotations.all;
    }

    // ── Calendar ──
    if (headerTxt.includes('تقويم') || navTxt.includes('تقويم') || headerTxt.includes('Calendar')) {
      return STATES.calendar.alerts;
    }

    // ── Import Shipments ──
    if (headerTxt.includes('وارد') || navTxt.includes('وارد') || pageText.includes('IMPORT')) {
      const filter = document.querySelector('[data-filter].active, .imp-filter.active')?.dataset?.filter || 'all';
      return STATES.import_shipments[filter] || STATES.import_shipments.all;
    }

    // ── Export Shipments ──
    if (headerTxt.includes('شحن') || navTxt.includes('شحن') || pageText.includes('SHIPMENT')) {
      const searchVal = (document.getElementById('imp-search') || document.querySelector('.modern-search-input'))?.value?.trim();
      if (searchVal) return STATES.shipments.search;
      const activeFilter = document.querySelector('[data-filter].active')?.dataset?.filter || 'all';
      return STATES.shipments[activeFilter] || STATES.shipments.all;
    }

    return STATES.generic;
  }

  /* ══════════════════════════════════════════════════════
     Local context — reads nearest section title
  ══════════════════════════════════════════════════════ */
  function getLocalContext(el) {
    // Walk up to find the nearest section container
    let node = el.parentElement;
    for (let i = 0; i < 6 && node; i++) {
      const titleEl = node.querySelector('.modern-section-title, [class*="section-title"]');
      if (titleEl) {
        const t = titleEl.textContent.toUpperCase();
        if (t.includes('OVERDUE'))     return STATES.calendar.overdue;
        if (t.includes('THIS WEEK'))   return {
          icon:'📅', iconColor:'blue',
          title:'CLEAR THIS WEEK',
          sub:'لا وصولات هذا الأسبوع',
          desc:'No shipments arriving in the next 7 days.',
          hint:'ETA ALERTS WILL APPEAR HERE'
        };
        if (t.includes('RECENT'))      return null; // skip — has real data
        if (t.includes('ALERT'))       return STATES.calendar.alerts;
        if (t.includes('5-DAY'))       return STATES.calendar.alerts;
      }
      node = node.parentElement;
    }
    return undefined; // no local context found → use page context
  }

  /* ══════════════════════════════════════════════════════
     Enhance existing empty state elements
  ══════════════════════════════════════════════════════ */
  function enhanceEmptyStates(root) {
    const selectors = [
      '.modern-empty',
      '.mc-log-empty',
      '.modern-empty-state',
      '[class*="empty-state"]',
    ];

    selectors.forEach(sel => {
      root.querySelectorAll(sel).forEach(el => {
        if (el.dataset.mcEs) return; // already enhanced
        el.dataset.mcEs = '1';

        // 1. Check local section context first
        const localCtx = getLocalContext(el);
        if (localCtx === null) return; // explicitly skip (e.g. RECENT section)

        // 2. Fall back to page-level context
        const cfg = localCtx || detectContext(el);
        if (!cfg) return;

        el.innerHTML     = buildEmptyState(cfg);
        el.className     = '';
        el.classList.add('mc-es-wrapper');
        el.style.cssText = '';
      });
    });
  }

  /* ══════════════════════════════════════════════════════
     Watch for page changes and apply
  ══════════════════════════════════════════════════════ */
  function startWatching() {
    const container = document.getElementById('page-container');
    if (!container) return;

    // Initial run
    enhanceEmptyStates(container);

    // Watch for new content
    new MutationObserver(() => {
      setTimeout(() => enhanceEmptyStates(container), 80);
    }).observe(container, { childList: true, subtree: true });
  }

  /* ══════════════════════════════════════════════════════
     CSS injection
  ══════════════════════════════════════════════════════ */
  function injectCSS() {
    if (document.getElementById('mces-style')) return;
    const s = document.createElement('style');
    s.id = 'mces-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════════════════
     Init
  ══════════════════════════════════════════════════════ */
  function init() {
    injectCSS();

    function tryStart() {
      if (document.getElementById('page-container')) {
        startWatching();
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

    console.log('[M-Customs] ✔ Empty States loaded');
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else
    init();

})();
