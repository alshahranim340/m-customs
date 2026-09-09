// ══════════════════════════════════════════════════════════════
// DASHBOARD — Live morning brief with stats, alerts, news
// ══════════════════════════════════════════════════════════════

import { getShipments, getAllDrivers, getImportShipments } from '../../../src/firebase/db.js';
import { toHijri, hijriToGregorian } from '../../../src/utils/hijriDate.js';
import { getTransportRequests } from '../../../src/firebase/transportDb.js';
import { getCurrentUser, getUserProfile } from '../../../src/firebase/auth.js';

let _profile = null;
let _newsCache = null;
let _newsCacheTime = 0;
const NEWS_CACHE_MS = 30 * 60 * 1000; // 30 min


/* ══════════════════════════════════════════════
   حساب التوزيع الشهري الحقيقي
   يُحوّل التواريخ الهجرية → ميلادية ويعدّ شهرياً
══════════════════════════════════════════════ */
function _buildMonthlyBreakdown(shipments, dateField = 'date') {
  const arabicMonths = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                        'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const now  = new Date();
  const keys = [];
  const data = {};

  for (let i = 5; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    keys.push(key);
    data[key] = { label: arabicMonths[d.getMonth()], value: 0 };
  }

  shipments.forEach(s => {
    if (!s[dateField]) return;
    let greg;
    try {
      const dateStr = s[dateField];
      const yr = parseInt(dateStr.split('-')[0]);
      if (yr >= 1300 && yr <= 1600) {
        // هجري — استخدم toHijri العكسي (تقريبي)
        greg = hijriToGregorian(dateStr);
      } else {
        greg = new Date(dateStr);
      }
    } catch(_) { return; }

    if (!greg || isNaN(greg.getTime())) return;
    const key = `${greg.getFullYear()}-${String(greg.getMonth()+1).padStart(2,'0')}`;
    if (data[key]) data[key].value++;
  });

  return keys.map(k => data[k]);
}

export async function renderDashboard(profile) {
  _profile = profile;

  // Fallback: fetch profile if not passed
  if (!_profile || !_profile.name) {
    try {
      const user = getCurrentUser();
      if (user) {
        const p = await getUserProfile(user.uid);
        if (p) _profile = { ...(_profile || {}), ...p };
      }
    } catch (e) {
      console.warn('Could not fetch profile:', e);
    }
  }

  const container = document.getElementById('page-container');
  if (!container) return;

  // Initial skeleton
  container.innerHTML = `
    <div style="padding:24px;font-family:Tajawal,sans-serif;background:#F5F3EC;min-height:100vh;">
      ${renderGreeting()}
      <div id="dash-stats" style="margin-top:20px;">${renderStatsSkeleton()}</div>
      <div id="dash-prayer" style="margin-top:20px;"></div>
      <!-- زر اختبار الإيميل -->
      <div style="display:flex;justify-content:flex-end;margin-top:20px;margin-bottom:6px;">
        <button id="btn-test-email" onclick="window._dashTestEmail()"
          style="background:#1C4B8E;color:white;border:none;padding:9px 18px;
          border-radius:9px;font-family:Tajawal,sans-serif;font-size:12px;
          font-weight:700;cursor:pointer;gap:7px;">
          🧪 اختبار إيميل التنبيه
        </button>
      </div>
      <div id="dash-alerts" style="margin-top:4px;"></div>
      <div id="dash-news" style="margin-top:20px;">${renderNewsSkeleton()}</div>
    </div>
  `;

  // Load in parallel
  await Promise.all([
    loadStats(),
    loadAlerts(),
    loadNews(),
    loadWeather(),
    loadPrayerTimes(),
  ]);
}

// ─────────────────────────────────────────────────
// MOTIVATIONAL QUOTES (Arabic, business/logistics themed)
// ─────────────────────────────────────────────────
const QUOTES = [
  { text: 'كل شحنة رحلة، وكل رحلة قصة نجاح', author: 'حكمة لوجستية' },
  { text: 'الإتقان في التفاصيل، والريادة في السرعة', author: '' },
  { text: 'من رابغ إلى دبي، الجودة لا تعرف حدوداً', author: '' },
  { text: 'اليوم فرصة جديدة لتقديم الأفضل', author: '' },
  { text: 'العمل الجيد يُبنى بالثقة، والاستمرار', author: '' },
  { text: 'كل بيان جمركي يحمل مسؤولية عميل', author: '' },
  { text: 'خلف كل شحنة سائق، وخلف كل سائق عائلة', author: '' },
  { text: 'الاحترافية عادة يومية، مو موقف عابر', author: '' },
  { text: 'ما يُقاس يمكن تحسينه', author: 'بيتر دراكر' },
  { text: 'الرؤية بلا تنفيذ حلم، والتنفيذ بلا رؤية عبث', author: 'ابن خلدون' },
  { text: 'تريد إنجاز شي؟ اطلبه من مشغول', author: 'حكمة إدارية' },
  { text: 'أفضل وقت لزراعة شجرة كان قبل ٢٠ سنة. ثاني أفضل وقت: الآن', author: 'مثل صيني' },
];

function todaysQuote() {
  const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return QUOTES[day % QUOTES.length];
}

// ─────────────────────────────────────────────────
// GREETING
// ─────────────────────────────────────────────────
function renderGreeting() {
  const h = new Date().getHours();
  let salute = 'مرحباً';
  let icon = '👋';
  if (h < 5)       { salute = 'أهلاً بك';   icon = '🌙'; }
  else if (h < 12) { salute = 'صباح الخير'; icon = '☀️'; }
  else if (h < 17) { salute = 'مساء الخير'; icon = '🌤️'; }
  else if (h < 21) { salute = 'مساء الخير'; icon = '🌆'; }
  else             { salute = 'مساء الخير'; icon = '🌙'; }

  const days = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const now = new Date();
  const dateStr = `${days[now.getDay()]} · ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

  let name = _profile?.name || _profile?.displayName || '';
  if (!name && _profile?.email) name = _profile.email.split('@')[0];
  if (!name) name = 'أهلاً';

  const q = todaysQuote();

  return `
    <div style="background:linear-gradient(135deg,#0E1A2E 0%,#1C2B48 60%,#0E1A2E 100%);color:white;padding:20px 26px;border-radius:12px;position:relative;overflow:hidden;">
      <div style="position:absolute;top:-40px;left:-40px;width:200px;height:200px;background:radial-gradient(circle,rgba(212,178,102,0.15) 0%,transparent 70%);pointer-events:none;"></div>

      <div style="display:flex;justify-content:space-between;align-items:center;gap:20px;position:relative;z-index:1;flex-wrap:wrap;">
        <div style="flex:1;min-width:240px;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:2px;color:#D4B266;font-weight:700;">
            SDS · MORNING BRIEF
          </div>
          <div style="font-size:22px;font-weight:900;margin-top:6px;line-height:1.2;">
            ${icon} ${salute}<span style="color:#D4B266;"> ${name}</span>
          </div>
          <div style="display:flex;gap:10px;align-items:center;margin-top:6px;flex-wrap:wrap;">
            <span style="font-size:11px;color:#B8B0A0;font-family:'JetBrains Mono',monospace;">${dateStr}</span>
            <span style="color:#3A4A62;">·</span>
            <span id="weather-strip" style="font-size:11px;color:#F5F0E4;display:inline-flex;align-items:center;gap:5px;">
              <span style="opacity:0.5;">...</span>
            </span>
            <span style="color:#3A4A62;">·</span>
            <span style="font-size:14px;letter-spacing:4px;">🚛✈️🚢</span>
          </div>
        </div>

        <div style="max-width:300px;background:rgba(212,178,102,0.08);border:1px solid rgba(212,178,102,0.25);border-radius:8px;padding:10px 14px;position:relative;">
          <div style="position:absolute;top:-7px;right:12px;background:#0E1A2E;padding:0 6px;font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:2px;color:#D4B266;font-weight:800;">
            💡 THOUGHT
          </div>
          <div style="font-size:12px;font-weight:600;line-height:1.5;color:#F5F0E4;font-family:'Cairo',sans-serif;">
            "${q.text}"
          </div>
          ${q.author ? `<div style="font-size:10px;color:#8A8578;margin-top:4px;font-style:italic;">— ${q.author}</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────
// WEATHER — Jeddah live weather via Open-Meteo (free, CORS-enabled)
// ─────────────────────────────────────────────────
async function loadWeather() {
  const strip = document.getElementById('weather-strip');
  if (!strip) return;
  try {
    // Jeddah coordinates
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=21.5&longitude=39.2&current=temperature_2m,weather_code,wind_speed_10m&timezone=Asia/Riyadh';
    const res = await fetch(url);
    if (!res.ok) throw new Error('weather fetch failed');
    const data = await res.json();
    const c = data.current;
    const emoji = weatherEmoji(c.weather_code);
    const label = weatherLabel(c.weather_code);
    const temp = Math.round(c.temperature_2m);
    const wind = Math.round(c.wind_speed_10m);

    strip.innerHTML = `
      <span>${emoji}</span>
      <span style="font-weight:700;color:#D4B266;font-family:'JetBrains Mono',monospace;">${temp}°</span>
      <span>${label}</span>
      <span style="opacity:0.6;">جدة</span>
    `;
  } catch (e) {
    strip.style.display = 'none';
  }
}

function weatherEmoji(code) {
  if (code === 0) return '☀️';
  if (code <= 3) return '🌤️';
  if (code <= 48) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  if (code >= 95) return '⛈️';
  return '🌤️';
}

function weatherLabel(code) {
  if (code === 0) return 'صافي';
  if (code <= 3) return 'غائم جزئياً';
  if (code <= 48) return 'ضباب';
  if (code <= 67) return 'ممطر';
  if (code <= 77) return 'ثلج';
  if (code <= 82) return 'زخات مطر';
  if (code >= 95) return 'عاصفة';
  return 'معتدل';
}

// ─────────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────────
function renderStatsSkeleton() {
  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;">
      ${[1,2,3,4].map(() => `
        <div style="background:white;padding:20px;border-radius:10px;border:1px solid #E8E5DC;">
          <div style="height:12px;background:#F0EDE4;border-radius:3px;width:60%;"></div>
          <div style="height:28px;background:#F0EDE4;border-radius:3px;margin-top:10px;width:40%;"></div>
        </div>
      `).join('')}
    </div>
  `;
}

async function loadStats() {
  try {
    const [shipments, requests] = await Promise.all([
      getShipments(500).catch(() => []),
      getTransportRequests(500).catch(() => []),
    ]);

    // Compute stats
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // شحنات هذا الشهر — مقارنة بالشهر الهجري (لأن s.date مخزن هجري)
    const nowHijri      = toHijri(now);              // e.g. "1448-03-02"
    const hijriPrefix   = nowHijri.slice(0, 7);      // e.g. "1448-03"
    const shipsThisMonth = shipments.filter(s => {
      if (!s.date) return false;
      // إذا كان التاريخ هجري (1300-1600)
      const yr = parseInt(s.date.split('-')[0]);
      if (yr >= 1300 && yr <= 1600) {
        return s.date.startsWith(hijriPrefix);
      }
      // إذا كان ميلادي — استخدم created_at
      const d = s.created_at?.toDate ? s.created_at.toDate() : null;
      return d && d >= monthStart;
    }).length;

    const draftRequests = requests.filter(r => r.status === 'draft').length;
    // قيد المعالجة = كل الشحنات غير المكتملة (كل الحالات ما عدا done)
    const NON_DONE = new Set(['draft','sent','sent_broker','broker_replied','sent_driver','waiting_broker','appointment']);
    const inProgress = shipments.filter(s => NON_DONE.has(s.status) || !s.status).length;
    const totalShipments = shipments.length;

    document.getElementById('dash-stats').innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;">
        ${statCard('ti-file-invoice', 'إجمالي الشحنات', totalShipments, '#0E1A2E', '#F5F3EC')}
        ${statCard('ti-clock-play', 'قيد المعالجة', inProgress, '#1C4B8E', '#EEF2FF')}
        ${statCard('ti-file-pencil', 'مسودّات النقل', draftRequests, '#CC2229', '#FEEBEB', draftRequests > 0 ? 'transport-requests' : null)}
        ${statCard('ti-calendar-stats', 'شحنات هذا الشهر', shipsThisMonth, '#2E8B57', '#E7F5EE')}
      </div>
    `;
    animateCounters();

    // Check for milestone celebrations
    if (window._checkMilestone) {
      window._checkMilestone('total_shipments', totalShipments, 'شحنة');
      window._checkMilestone('month_shipments', shipsThisMonth, 'شحنة هذا الشهر');

    /* ── حساب البيانات الشهرية الحقيقية للـ Charts ── */
    window._mcMonthlyData = _buildMonthlyBreakdown(shipments);

    // جلب بيانات الوارد من db.js
    try {
      const importShips = await getImportShipments();
      window._mcImportMonthlyData = _buildMonthlyBreakdown(importShips, 'eta');
    } catch(e) {
      console.warn('[Dashboard] Import monthly data failed:', e.message);
      window._mcImportMonthlyData = [];
    }
    }
  } catch (e) {
    console.error('Stats load failed', e);
    document.getElementById('dash-stats').innerHTML = `<div style="color:#8A8578;font-size:12px;">تعذّر تحميل الإحصائيات</div>`;
  }
}

function statCard(icon, label, value, accentColor, bgColor, clickTarget = null) {
  const clickable = clickTarget ? `onclick="navigate('${clickTarget}')" style="cursor:pointer;"` : '';
  const hoverStyle = clickTarget ? 'transition:transform 0.15s;' : '';
  return `
    <div ${clickable} class="dash-stat-card" style="background:white;padding:20px;border-radius:10px;border:1px solid #E8E5DC;position:relative;overflow:hidden;${hoverStyle}">
      <div style="position:absolute;top:16px;left:16px;width:36px;height:36px;background:${bgColor};color:${accentColor};border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;">
        <i class="ti ${icon}"></i>
      </div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;letter-spacing:1.5px;font-weight:700;">${label.toUpperCase()}</div>
      <div class="stat-number" data-target="${value}" style="font-size:32px;font-weight:900;color:${accentColor};margin-top:6px;font-family:'JetBrains Mono',monospace;">00</div>
      <div style="font-size:12px;color:#6B6659;margin-top:4px;">${label}</div>
    </div>
  `;
}

function animateCounters() {
  document.querySelectorAll('.stat-number').forEach(el => {
    const target = parseInt(el.dataset.target) || 0;
    const duration = 1200;
    const startTime = performance.now();
    const format = n => String(Math.floor(n)).padStart(2, '0');
    function tick(now) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format(target * eased);
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = format(target);
    }
    requestAnimationFrame(tick);
  });
}

// ─────────────────────────────────────────────────
// ALERTS — things needing attention
// ─────────────────────────────────────────────────
async function loadAlerts() {
  try {
    const [requests, drivers] = await Promise.all([
      getTransportRequests(200).catch(() => []),
      getAllDrivers().catch(() => []),
    ]);

    const alerts = [];

    // استبعاد الطلبات المحذوفة (Soft Delete) — نفس منطق صفحة طلبات النقل
    const activeRequests = requests.filter(r => !r.deleted);
    const drafts = activeRequests.filter(r => r.status === 'draft');
    if (drafts.length > 0) {
      alerts.push({
        icon: 'ti-file-pencil',
        color: '#CC2229',
        bg: '#FEEBEB',
        title: `${drafts.length} طلب نقل مسودّة`,
        detail: 'لسه ما اترسل لقسم التخليص',
        action: () => window.navigate('transport-requests'),
      });
    }

    // Drivers missing arabic name
    const missingAr = drivers.filter(d => {
      const nameAr = d.name_ar || '';
      const nameEn = d.name_en || '';
      const nameLegacy = d.name || '';
      const hasArabic = /[\u0600-\u06FF]/;
      return !hasArabic.test(nameAr) && !hasArabic.test(nameEn) && !hasArabic.test(nameLegacy);
    });
    if (missingAr.length > 0) {
      alerts.push({
        icon: 'ti-language',
        color: '#8B6914',
        bg: '#FEF6E7',
        title: `${missingAr.length} سائق بدون اسم عربي`,
        detail: 'يحتاج ترجمة لاكتمال الملف',
        action: () => window.navigate('drivers'),
      });
    }

    if (alerts.length === 0) {
      document.getElementById('dash-alerts').innerHTML = `
        <div style="background:#E7F5EE;padding:16px 20px;border-radius:10px;border:1px solid #B8E0C8;display:flex;align-items:center;gap:12px;">
          <div style="width:36px;height:36px;background:#2E8B57;color:white;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;">
            <i class="ti ti-check"></i>
          </div>
          <div>
            <div style="font-size:14px;font-weight:800;color:#0F6338;">كل شي تحت السيطرة ✓</div>
            <div style="font-size:12px;color:#2E8B57;margin-top:2px;">ما فيه طلبات معلّقة أو تنبيهات</div>
          </div>
        </div>
      `;
      return;
    }

    document.getElementById('dash-alerts').innerHTML = `
      <div style="background:white;border-radius:10px;border:1px solid #E8E5DC;overflow:hidden;">
        <div style="background:#F5F3EC;padding:12px 20px;border-bottom:1px solid #E8E5DC;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;color:#0E1A2E;font-weight:800;">
          ⚠ NEEDS ATTENTION · ${alerts.length}
        </div>
        ${alerts.map(a => `
          <div onclick="(${a.action.toString()})()" style="padding:14px 20px;display:flex;align-items:center;gap:14px;cursor:pointer;border-bottom:1px solid #F5F3EC;transition:background 0.1s;" onmouseover="this.style.background='#FAFAF7'" onmouseout="this.style.background='white'">
            <div style="width:36px;height:36px;background:${a.bg};color:${a.color};border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">
              <i class="ti ${a.icon}"></i>
            </div>
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:800;color:#0E1A2E;">${a.title}</div>
              <div style="font-size:12px;color:#6B6659;margin-top:2px;">${a.detail}</div>
            </div>
            <div style="color:#8A8578;font-size:18px;"><i class="ti ti-chevron-left"></i></div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {
    console.error('Alerts load failed', e);
  }
}

// ─────────────────────────────────────────────────
// NEWS FEED — Customs, ports, logistics (Saudi Arabia)
// Source: Google News RSS via rss2json service
// ─────────────────────────────────────────────────
// ─────────────────────────────────────────────────
// NEWS + RESOURCES — Side-by-side layout
// ─────────────────────────────────────────────────
const RESOURCES = [
  {
    category: 'الجهات الحكومية',
    icon: 'ti-building-bank',
    color: '#0E1A2E',
    bg: '#F5F3EC',
    links: [
      { name: 'هيئة الزكاة والضريبة والجمارك', url: 'https://zatca.gov.sa/', desc: 'ZATCA · بيانات جمركية' },
      { name: 'موانئ (الهيئة العامة للموانئ)', url: 'https://mawani.gov.sa/', desc: 'MAWANI · الموانئ السعودية' },
      { name: 'نظام فسح', url: 'https://fasah.sa/', desc: 'Fasah · التجارة الخارجية' },
      { name: 'الهيئة العامة للنقل', url: 'https://tga.gov.sa/', desc: 'TGA · تصاريح النقل' },
    ],
  },
  {
    category: 'الأخبار والتحديثات',
    icon: 'ti-news',
    color: '#1C4B8E',
    bg: '#EEF2FF',
    links: [
      { name: 'أخبار الجمارك السعودية', url: 'https://news.google.com/search?q=%D8%A7%D9%84%D8%AC%D9%85%D8%A7%D8%B1%D9%83%20%D8%A7%D9%84%D8%B3%D8%B9%D9%88%D8%AF%D9%8A%D8%A9&hl=ar&gl=SA', desc: 'Google News · مباشر' },
      { name: 'أخبار الموانئ', url: 'https://news.google.com/search?q=%D9%85%D9%88%D8%A7%D9%86%D8%A6%20%D8%B3%D8%B9%D9%88%D8%AF%D9%8A%D8%A9&hl=ar&gl=SA', desc: 'Google News · موانئ' },
      { name: 'الاقتصادية', url: 'https://www.aleqt.com/', desc: 'Aleqt · اقتصاد ولوجستيات' },
      { name: 'أرقام', url: 'https://www.argaam.com/', desc: 'Argaam · أعمال' },
    ],
  },
  {
    category: 'أدوات مفيدة',
    icon: 'ti-tools',
    color: '#2E8B57',
    bg: '#E7F5EE',
    links: [
      { name: 'تحويل التاريخ الهجري/الميلادي', url: 'https://www.al-islam.com/hijri', desc: 'محوّل تواريخ' },
      { name: 'أسعار العملات', url: 'https://www.google.com/finance/', desc: 'Google Finance' },
      { name: 'خرائط الموانئ العالمية', url: 'https://www.marinetraffic.com/', desc: 'MarineTraffic · تتبّع السفن' },
      { name: 'أسعار الشحن', url: 'https://www.freightos.com/freight-index/', desc: 'Freightos Index' },
    ],
  },
];

function renderNewsSkeleton() {
  return `
    <style>
      @keyframes cSpin { to { transform: rotate(360deg); } }
      @keyframes cPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.4); } }
      @keyframes cSlideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes cAccExpand { from { max-height:0; opacity:0; } to { max-height:500px; opacity:1; } }
      .dash-spinner { animation: cSpin 0.8s linear infinite; }
      .dash-pulse-dot { animation: cPulse 1.5s ease-in-out infinite; }
      .news-slide-enter { animation: cSlideIn 0.4s ease-out; }
      .acc-content { overflow:hidden; transition: max-height 0.3s ease; }
      .acc-content.acc-open { animation: cAccExpand 0.3s ease-out; }
      .acc-header { cursor:pointer; transition: background 0.15s; }
      .acc-header:hover { background:#F0EDE4 !important; }
      .acc-chevron { transition: transform 0.25s; }
      .acc-chevron.acc-rotated { transform: rotate(-90deg); }
    </style>
    <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:20px;">
      <div id="news-carousel-container">${renderCarouselSkeleton()}</div>
      <div>${renderResourcesAccordion()}</div>
    </div>
  `;
}

function renderResourcesAccordion() {
  return `
    <div style="background:white;border-radius:10px;border:1px solid #E8E5DC;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#0E1A2E 0%,#1C2B48 100%);color:white;padding:14px 20px;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;color:#D4B266;font-weight:800;">
          🌐 RESOURCES PORTAL
        </div>
        <div style="font-size:14px;font-weight:800;margin-top:2px;">بوابة الروابط</div>
      </div>
      <div style="padding:6px;">
        ${RESOURCES.map((cat, idx) => `
          <div style="margin-bottom:4px;border-radius:6px;overflow:hidden;">
            <div class="acc-header" data-acc-idx="${idx}" style="padding:12px 14px;background:#FAFAF7;display:flex;align-items:center;gap:12px;">
              <div style="width:32px;height:32px;background:${cat.bg};color:${cat.color};border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">
                <i class="ti ${cat.icon}"></i>
              </div>
              <div style="flex:1;">
                <div style="font-size:13px;font-weight:800;color:#0E1A2E;">${cat.category}</div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.5px;color:#8A8578;font-weight:700;margin-top:1px;">${cat.links.length} ROABIT</div>
              </div>
              <i class="ti ti-chevron-down acc-chevron" data-chevron="${idx}" style="color:#8A8578;font-size:18px;"></i>
            </div>
            <div class="acc-content" data-acc-content="${idx}" style="max-height:0;">
              <div style="padding:4px 6px 8px;display:grid;gap:3px;">
                ${cat.links.map(link => `
                  <a href="${link.url}" target="_blank" rel="noopener"
                     style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:transparent;border-radius:5px;text-decoration:none;color:inherit;transition:all 0.12s;"
                     onmouseover="this.style.background='#F5F3EC';"
                     onmouseout="this.style.background='transparent';">
                    <div style="width:5px;height:5px;background:${cat.color};border-radius:50%;flex-shrink:0;"></div>
                    <div style="flex:1;min-width:0;">
                      <div style="font-size:12px;font-weight:700;color:#0E1A2E;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${link.name}</div>
                      <div style="font-size:10px;color:#8A8578;margin-top:1px;font-family:'JetBrains Mono',monospace;">${link.desc}</div>
                    </div>
                    <i class="ti ti-external-link" style="color:#D4B266;font-size:13px;"></i>
                  </a>
                `).join('')}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Wire accordion after render
function wireAccordion() {
  document.querySelectorAll('.acc-header').forEach(header => {
    header.onclick = () => {
      const idx = header.dataset.accIdx;
      const content = document.querySelector(`[data-acc-content="${idx}"]`);
      const chevron = document.querySelector(`[data-chevron="${idx}"]`);
      const isOpen = content.style.maxHeight && content.style.maxHeight !== '0px';
      if (isOpen) {
        content.style.maxHeight = '0';
        chevron.classList.remove('acc-rotated');
      } else {
        content.style.maxHeight = content.scrollHeight + 'px';
        chevron.classList.add('acc-rotated');
      }
    };
  });
}

function renderCarouselSkeleton() {
  return `
    <div style="background:linear-gradient(135deg,#0E1A2E 0%,#1C2B48 100%);color:white;border-radius:10px;overflow:hidden;height:100%;display:flex;flex-direction:column;">
      <div style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.08);">
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;color:#D4B266;font-weight:800;">
          📰 LIVE NEWS
        </div>
        <div style="font-size:14px;font-weight:800;margin-top:2px;">أخبار مباشرة</div>
      </div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:40px 20px;">
        <div style="text-align:center;">
          <div class="dash-spinner" style="width:32px;height:32px;border:3px solid rgba(212,178,102,0.2);border-top-color:#D4B266;border-radius:50%;margin:0 auto;"></div>
          <div style="font-size:12px;color:#8A8578;margin-top:14px;">جارٍ جلب الأخبار...</div>
        </div>
      </div>
    </div>
  `;
}

let _carouselInterval = null;
let _currentSlide = 0;

async function loadNews() {
  const container = document.getElementById('news-carousel-container');
  if (!container) return;

  // Wire accordion (portal already rendered)
  setTimeout(wireAccordion, 100);

  if (_newsCache && (Date.now() - _newsCacheTime) < NEWS_CACHE_MS) {
    renderCarousel(_newsCache);
    return;
  }

  try {
    const items = await fetchNewsParallel();
    if (items.length === 0) throw new Error('لا نتائج');
    _newsCache = items;
    _newsCacheTime = Date.now();
    renderCarousel(items);
  } catch (e) {
    console.error('News failed:', e);
    renderNewsFallback();
  }
}

async function fetchNewsParallel() {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent('الجمارك السعودية OR موانئ')}&hl=ar&gl=SA&ceid=SA:ar`;

  const strategies = [
    fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&count=10`)
      .then(r => r.ok ? r.json() : Promise.reject('rss2json bad'))
      .then(d => {
        if (d.status !== 'ok') return Promise.reject('rss2json ' + d.message);
        return (d.items || []).map(i => ({ title: i.title, link: i.link, pubDate: i.pubDate, source: extractSource(i.title), image: extractImage(i.description || i.content || '') || i.thumbnail || i.enclosure?.link || '' }));
      }),
    fetch(`https://corsproxy.io/?${encodeURIComponent(rssUrl)}`)
      .then(r => r.ok ? r.text() : Promise.reject('corsproxy bad'))
      .then(t => parseRSS(t).map(i => ({ ...i, source: extractSource(i.title), image: extractImage(i.description) || '' }))),
    fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`)
      .then(r => r.ok ? r.text() : Promise.reject('allorigins bad'))
      .then(t => parseRSS(t).map(i => ({ ...i, source: extractSource(i.title), image: extractImage(i.description) || '' }))),
    fetch('https://feeds.bbci.co.uk/arabic/business/rss.xml')
      .then(r => r.ok ? r.text() : Promise.reject('bbc bad'))
      .then(t => parseRSS(t).map(i => ({ ...i, source: 'BBC عربي', image: extractImage(i.description) || '' }))),
  ];

  return new Promise((resolve, reject) => {
    let pending = strategies.length;
    let firstError = null;

    strategies.forEach((p, idx) => {
      p.then(items => {
        if (items && items.length > 0) {
          console.log(`✓ News strategy ${idx + 1}: ${items.length} items`);
          resolve(items.slice(0, 10));
        } else if (--pending === 0) reject(firstError || new Error('empty'));
      }).catch(err => {
        console.warn(`✗ Strategy ${idx + 1}:`, err.message || err);
        if (!firstError) firstError = err;
        if (--pending === 0) reject(firstError);
      });
    });

    setTimeout(() => reject(new Error('timeout')), 25000);
  });
}

// Extract first image URL from HTML description
function extractImage(html) {
  if (!html) return '';
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : '';
}

// Themed gradient covers as fallback when no image available
const COVER_GRADIENTS = [
  'linear-gradient(135deg, #0E1A2E 0%, #D4B266 100%)',
  'linear-gradient(135deg, #1C4B8E 0%, #0E1A2E 100%)',
  'linear-gradient(135deg, #2E8B57 0%, #0E1A2E 100%)',
  'linear-gradient(135deg, #8B6914 0%, #0E1A2E 100%)',
  'linear-gradient(135deg, #C41818 0%, #0E1A2E 100%)',
];

function renderCarousel(items) {
  const container = document.getElementById('news-carousel-container');
  if (!container) return;

  container.innerHTML = `
    <div style="background:linear-gradient(135deg,#0E1A2E 0%,#1C2B48 100%);color:white;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;height:100%;min-height:340px;">
      <div style="padding:14px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.08);">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;color:#D4B266;font-weight:800;display:flex;align-items:center;gap:8px;">
            <span class="dash-pulse-dot" style="width:8px;height:8px;background:#D4B266;border-radius:50%;display:inline-block;"></span>
            LIVE NEWS · ${items.length}
          </div>
          <div style="font-size:14px;font-weight:800;margin-top:2px;">أخبار مباشرة</div>
        </div>
        <div style="display:flex;gap:6px;">
          <button id="news-prev" title="السابق" style="background:rgba(212,178,102,0.1);color:#D4B266;border:1px solid rgba(212,178,102,0.3);border-radius:5px;width:28px;height:28px;font-size:12px;cursor:pointer;">
            <i class="ti ti-chevron-right"></i>
          </button>
          <button id="news-pause" title="إيقاف/تشغيل" style="background:rgba(212,178,102,0.1);color:#D4B266;border:1px solid rgba(212,178,102,0.3);border-radius:5px;width:28px;height:28px;font-size:12px;cursor:pointer;">
            <i class="ti ti-player-pause" id="pause-icon"></i>
          </button>
          <button id="news-next" title="التالي" style="background:rgba(212,178,102,0.1);color:#D4B266;border:1px solid rgba(212,178,102,0.3);border-radius:5px;width:28px;height:28px;font-size:12px;cursor:pointer;">
            <i class="ti ti-chevron-left"></i>
          </button>
        </div>
      </div>

      <div id="news-slide-container" style="flex:1;padding:20px 22px;min-height:200px;"></div>

      <div id="news-dots" style="padding:8px 20px;display:flex;gap:5px;justify-content:center;align-items:center;flex-wrap:wrap;"></div>

      <div style="height:3px;background:rgba(212,178,102,0.15);position:relative;">
        <div id="news-progress" style="height:100%;background:#D4B266;width:0%;transition:width 0.1s linear;"></div>
      </div>
    </div>
  `;

  _currentSlide = 0;
  showSlide(items, 0);
  renderDots(items);

  document.getElementById('news-prev').onclick = () => { stopCarousel(); _currentSlide = (_currentSlide - 1 + items.length) % items.length; showSlide(items, _currentSlide); renderDots(items); };
  document.getElementById('news-next').onclick = () => { stopCarousel(); _currentSlide = (_currentSlide + 1) % items.length; showSlide(items, _currentSlide); renderDots(items); };
  document.getElementById('news-pause').onclick = () => {
    if (_carouselInterval) {
      stopCarousel();
      document.getElementById('pause-icon').className = 'ti ti-player-play';
    } else {
      startCarousel(items);
      document.getElementById('pause-icon').className = 'ti ti-player-pause';
    }
  };

  startCarousel(items);
}

function showSlide(items, idx) {
  const container = document.getElementById('news-slide-container');
  if (!container) return;
  const item = items[idx];
  const gradient = COVER_GRADIENTS[idx % COVER_GRADIENTS.length];

  container.style.opacity = '0';
  setTimeout(() => {
    const heroContent = item.image ? `
      <img src="${item.image}" alt=""
        onerror="this.parentElement.innerHTML='<div style=\\'width:100%;height:100%;background:${gradient};display:flex;align-items:center;justify-content:center;\\'>&lt;i class=\\&quot;ti ti-news\\&quot; style=\\&quot;font-size:48px;color:#D4B266;opacity:0.7;\\&quot;&gt;&lt;/i&gt;</div>'"
        style="width:100%;height:100%;object-fit:cover;display:block;">
    ` : `
      <div style="width:100%;height:100%;background:${gradient};display:flex;align-items:center;justify-content:center;">
        <i class="ti ti-news" style="font-size:48px;color:#D4B266;opacity:0.7;"></i>
      </div>
    `;

    container.innerHTML = `
      <a href="${item.link}" target="_blank" rel="noopener" class="news-slide-enter" style="display:block;text-decoration:none;color:inherit;">
        <!-- Hero image -->
        <div style="width:100%;height:150px;overflow:hidden;border-radius:8px;position:relative;background:${gradient};">
          ${heroContent}
          <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(14,26,46,0.9) 100%);"></div>
          ${item.source ? `<div style="position:absolute;top:10px;right:10px;background:#D4B266;color:#0E1A2E;padding:3px 10px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:900;letter-spacing:0.5px;">${item.source.toUpperCase()}</div>` : ''}
          <div style="position:absolute;bottom:8px;left:12px;font-family:'JetBrains Mono',monospace;font-size:9px;color:#D4B266;font-weight:700;">
            ${timeAgo(item.pubDate)}
          </div>
        </div>

        <!-- Title -->
        <div style="padding:14px 4px 8px;font-size:15px;font-weight:700;color:white;line-height:1.6;font-family:'Cairo',sans-serif;min-height:60px;">
          ${cleanTitle(item.title)}
        </div>
        <div style="font-size:11px;color:#D4B266;padding:0 4px;">
          <i class="ti ti-external-link"></i> اقرأ المقال كاملاً
        </div>
      </a>
    `;
    container.style.transition = 'opacity 0.35s ease';
    container.style.opacity = '1';
  }, 150);
}

function renderDots(items) {
  const dots = document.getElementById('news-dots');
  if (!dots) return;
  dots.innerHTML = items.map((_, i) => `
    <span data-idx="${i}" style="width:${i === _currentSlide ? '18px' : '5px'};height:5px;background:${i === _currentSlide ? '#D4B266' : 'rgba(212,178,102,0.3)'};border-radius:3px;cursor:pointer;transition:all 0.25s;"></span>
  `).join('');
  dots.querySelectorAll('span').forEach(span => {
    span.onclick = () => { stopCarousel(); _currentSlide = parseInt(span.dataset.idx); showSlide(items, _currentSlide); renderDots(items); };
  });
}

function startCarousel(items) {
  stopCarousel();
  const SLIDE_MS = 6000;
  const progress = document.getElementById('news-progress');
  let elapsed = 0;
  _carouselInterval = setInterval(() => {
    elapsed += 100;
    if (progress) progress.style.width = `${(elapsed / SLIDE_MS) * 100}%`;
    if (elapsed >= SLIDE_MS) {
      elapsed = 0;
      _currentSlide = (_currentSlide + 1) % items.length;
      showSlide(items, _currentSlide);
      renderDots(items);
      if (progress) progress.style.width = '0%';
    }
  }, 100);
}

function stopCarousel() {
  if (_carouselInterval) { clearInterval(_carouselInterval); _carouselInterval = null; }
  const progress = document.getElementById('news-progress');
  if (progress) progress.style.width = '0%';
}

function renderNewsFallback() {
  const container = document.getElementById('news-carousel-container');
  if (!container) return;
  container.innerHTML = `
    <div style="background:linear-gradient(135deg,#0E1A2E 0%,#1C2B48 100%);color:white;border-radius:10px;padding:30px 22px;text-align:center;height:100%;display:flex;flex-direction:column;justify-content:center;min-height:340px;">
      <i class="ti ti-wifi-off" style="font-size:32px;color:#D4B266;"></i>
      <div style="font-size:14px;font-weight:700;color:white;margin-top:10px;">تعذّر تحميل الأخبار</div>
      <div style="font-size:11px;color:#8A8578;margin-top:4px;">استخدم روابط Google News في البوابة</div>
      <button onclick="location.reload()" style="margin-top:14px;background:#D4B266;color:#0E1A2E;border:none;border-radius:5px;padding:7px 16px;font-family:Tajawal,sans-serif;font-size:12px;font-weight:800;cursor:pointer;align-self:center;">
        <i class="ti ti-refresh"></i> حاول مجدداً
      </button>
    </div>
  `;
}

function parseRSS(xmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) throw new Error('XML parse error');
  const items = Array.from(doc.querySelectorAll('item'));
  return items.map(item => ({
    title: item.querySelector('title')?.textContent || '',
    link: item.querySelector('link')?.textContent || '',
    pubDate: item.querySelector('pubDate')?.textContent || '',
    description: item.querySelector('description')?.textContent || '',
  }));
}

function timeAgo(dateStr) {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `قبل ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `قبل ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `قبل ${days} يوم`;
  return then.toLocaleDateString('en-GB', { calendar: 'gregory' });
}

function extractSource(title) {
  const parts = title.split(' - ');
  if (parts.length > 1) return parts[parts.length - 1];
  return '';
}

function cleanTitle(title) {
  const parts = title.split(' - ');
  if (parts.length > 1) return parts.slice(0, -1).join(' - ');
  return title;
}

// ─────────────────────────────────────────────────
// PRAYER TIMES — Jeddah, via Aladhan API (free, CORS-enabled)
// ─────────────────────────────────────────────────
const PRAYER_LABELS = {
  Fajr:    { ar: 'الفجر',   icon: '🌌' },
  Sunrise: { ar: 'الشروق',  icon: '🌅' },
  Dhuhr:   { ar: 'الظهر',   icon: '☀️' },
  Asr:     { ar: 'العصر',   icon: '🌤️' },
  Maghrib: { ar: 'المغرب',  icon: '🌆' },
  Isha:    { ar: 'العشاء',  icon: '🌙' },
};
const PRAYER_ORDER = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

async function loadPrayerTimes() {
  const container = document.getElementById('dash-prayer');
  if (!container) return;

  try {
    const today = new Date();
    const dateStr = `${today.getDate()}-${today.getMonth()+1}-${today.getFullYear()}`;
    const url = `https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=Jeddah&country=SA&method=4`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('prayer fetch failed');
    const data = await res.json();
    const timings = data.data.timings;

    // Find next prayer
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    let nextPrayer = null;
    let nextMinutes = Infinity;
    PRAYER_ORDER.forEach(name => {
      const t = timings[name];
      if (!t) return;
      const [h, m] = t.split(':').map(Number);
      const totalMin = h * 60 + m;
      if (totalMin > nowMinutes && totalMin < nextMinutes) {
        nextMinutes = totalMin;
        nextPrayer = name;
      }
    });

    const minutesUntil = nextMinutes === Infinity ? null : nextMinutes - nowMinutes;
    const hoursUntil = minutesUntil ? Math.floor(minutesUntil / 60) : 0;
    const minsUntil = minutesUntil ? minutesUntil % 60 : 0;
    const untilStr = minutesUntil ? (hoursUntil > 0 ? `${hoursUntil} س ${minsUntil} د` : `${minsUntil} دقيقة`) : '';

    container.innerHTML = `
      <div style="background:white;border-radius:10px;border:1px solid #E8E5DC;overflow:hidden;">
        <div style="background:linear-gradient(90deg,#0E1A2E 0%,#1C2B48 100%);color:white;padding:10px 20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:2px;color:#D4B266;font-weight:800;">
              🕌 PRAYER TIMES · JEDDAH
            </div>
            <div style="font-size:12px;font-weight:700;margin-top:2px;">أوقات الصلاة</div>
          </div>
          ${nextPrayer ? `
            <div style="background:rgba(212,178,102,0.15);border:1px solid rgba(212,178,102,0.35);border-radius:6px;padding:6px 12px;font-size:11px;">
              <span style="color:#8A8578;">التالية:</span>
              <span style="font-weight:800;color:#D4B266;margin:0 4px;">${PRAYER_LABELS[nextPrayer].ar}</span>
              <span style="opacity:0.7;">بعد ${untilStr}</span>
            </div>
          ` : ''}
        </div>
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:1px;background:#E8E5DC;">
          ${PRAYER_ORDER.map(name => {
            const isNext = name === nextPrayer;
            return `
              <div style="background:${isNext ? '#FEF6E7' : 'white'};padding:10px 6px;text-align:center;${isNext ? 'border-bottom:2px solid #D4B266;' : ''}">
                <div style="font-size:16px;">${PRAYER_LABELS[name].icon}</div>
                <div style="font-size:10px;color:#6B6659;font-weight:700;margin-top:3px;">${PRAYER_LABELS[name].ar}</div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:13px;color:${isNext ? '#8B6914' : '#0E1A2E'};font-weight:${isNext ? '900' : '700'};margin-top:2px;direction:ltr;">
                  ${(timings[name] || '--:--').substring(0, 5)}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  } catch (e) {
    console.warn('Prayer times unavailable:', e);
    container.style.display = 'none';
  }
}
