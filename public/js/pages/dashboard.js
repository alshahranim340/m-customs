// ══════════════════════════════════════════════════════════════
// DASHBOARD — Live morning brief with stats, alerts, news
// ══════════════════════════════════════════════════════════════

import { getShipments, getAllDrivers } from '../../../src/firebase/db.js';
import { getTransportRequests } from '../../../src/firebase/transportDb.js';
import { getCurrentUser, getUserProfile } from '../../../src/firebase/auth.js';

let _profile = null;
let _newsCache = null;
let _newsCacheTime = 0;
const NEWS_CACHE_MS = 30 * 60 * 1000; // 30 min

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
      <div id="dash-alerts" style="margin-top:20px;"></div>
      <div id="dash-news" style="margin-top:20px;">${renderNewsSkeleton()}</div>
    </div>
  `;

  // Load in parallel
  await Promise.all([
    loadStats(),
    loadAlerts(),
    loadNews(),
    loadWeather(),
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

    const shipsThisMonth = shipments.filter(s => {
      const d = s.created_at?.toDate ? s.created_at.toDate() : (s.created_at ? new Date(s.created_at) : null);
      return d && d >= monthStart;
    }).length;

    const draftRequests = requests.filter(r => r.status === 'draft').length;
    const inProgress = shipments.filter(s => s.status === 'draft' || s.status === 'sent_broker' || !s.status).length;
    const totalShipments = shipments.length;

    document.getElementById('dash-stats').innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;">
        ${statCard('ti-file-invoice', 'إجمالي الشحنات', totalShipments, '#0E1A2E', '#F5F3EC')}
        ${statCard('ti-clock-play', 'قيد المعالجة', inProgress, '#1C4B8E', '#EEF2FF')}
        ${statCard('ti-file-pencil', 'مسودّات النقل', draftRequests, '#CC2229', '#FEEBEB', draftRequests > 0 ? 'transport-requests' : null)}
        ${statCard('ti-calendar-stats', 'شحنات هذا الشهر', shipsThisMonth, '#2E8B57', '#E7F5EE')}
      </div>
    `;
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
      <div style="font-size:32px;font-weight:900;color:${accentColor};margin-top:6px;font-family:'JetBrains Mono',monospace;">${String(value).padStart(2, '0')}</div>
      <div style="font-size:12px;color:#6B6659;margin-top:4px;">${label}</div>
    </div>
  `;
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

    const drafts = requests.filter(r => r.status === 'draft');
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
// RESOURCES PORTAL — Reliable curated links (no CORS issues)
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
  return renderResourcesPortal();
}

function renderResourcesPortal() {
  return `
    <div style="background:white;border-radius:10px;border:1px solid #E8E5DC;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#0E1A2E 0%,#1C2B48 100%);color:white;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;color:#D4B266;font-weight:800;">
            🌐 RESOURCES & NEWS PORTAL
          </div>
          <div style="font-size:14px;font-weight:800;margin-top:2px;">بوابة الروابط والأخبار</div>
        </div>
        <div style="font-size:10px;color:#8A8578;font-family:'JetBrains Mono',monospace;">
          ${RESOURCES.reduce((s, c) => s + c.links.length, 0)} ROABIT
        </div>
      </div>

      <!-- Live news area (loads if possible) -->
      <div id="dash-live-news" style="border-bottom:1px solid #F5F3EC;"></div>

      <!-- Categorized resources -->
      <div style="padding:8px;">
        ${RESOURCES.map(cat => `
          <div style="margin-bottom:6px;">
            <div style="padding:10px 12px 6px;display:flex;align-items:center;gap:10px;">
              <div style="width:28px;height:28px;background:${cat.bg};color:${cat.color};border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;">
                <i class="ti ${cat.icon}"></i>
              </div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;color:#0E1A2E;font-weight:800;">
                ${cat.category.toUpperCase()} · ${cat.links.length}
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:6px;padding:0 6px;">
              ${cat.links.map(link => `
                <a href="${link.url}" target="_blank" rel="noopener"
                   style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#FAFAF7;border:1px solid transparent;border-radius:6px;text-decoration:none;color:inherit;transition:all 0.12s;"
                   onmouseover="this.style.background='#F5F3EC';this.style.borderColor='#D4B266';"
                   onmouseout="this.style.background='#FAFAF7';this.style.borderColor='transparent';">
                  <div style="flex:1;min-width:0;">
                    <div style="font-size:12px;font-weight:700;color:#0E1A2E;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${link.name}</div>
                    <div style="font-size:10px;color:#8A8578;margin-top:1px;font-family:'JetBrains Mono',monospace;">${link.desc}</div>
                  </div>
                  <i class="ti ti-external-link" style="color:#D4B266;font-size:14px;"></i>
                </a>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Try to load live news into the top strip (optional, silent fail)
async function loadNews() {
  const container = document.getElementById('dash-live-news');
  if (!container) return;

  try {
    const items = await tryFetchNews();
    if (items.length === 0) return;

    // Render top 3 live headlines
    container.innerHTML = `
      <div style="padding:12px 16px;background:linear-gradient(90deg,#FEF6E7 0%,white 100%);">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:2px;color:#8B6914;font-weight:800;margin-bottom:8px;">
          🔴 LIVE · آخر الأخبار
        </div>
        ${items.slice(0, 3).map(item => `
          <a href="${item.link}" target="_blank" rel="noopener"
             style="display:flex;gap:10px;padding:8px 0;text-decoration:none;color:inherit;align-items:center;">
            <span style="color:#D4B266;font-size:8px;">●</span>
            <div style="flex:1;font-size:12px;color:#0E1A2E;font-weight:600;line-height:1.4;">${cleanTitle(item.title)}</div>
            <span style="font-size:10px;color:#8A8578;font-family:'JetBrains Mono',monospace;white-space:nowrap;">${timeAgo(item.pubDate)}</span>
          </a>
        `).join('')}
      </div>
    `;
  } catch (e) {
    // Silent fail - resources portal already shown
    console.warn('Live news unavailable:', e.message);
  }
}

async function tryFetchNews() {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent('الجمارك السعودية OR الموانئ السعودية')}&hl=ar&gl=SA&ceid=SA:ar`;

  // Try rss2json first (proven reliable)
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&count=5`, { signal: ctrl.signal });
    if (r.ok) {
      const data = await r.json();
      if (data.status === 'ok' && data.items?.length) {
        return data.items.map(i => ({ title: i.title, link: i.link, pubDate: i.pubDate }));
      }
    }
  } catch(e) {}

  // Try corsproxy.io
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(rssUrl)}`, { signal: ctrl.signal });
    if (r.ok) return parseRSS(await r.text()).slice(0, 5);
  } catch(e) {}

  return [];
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
  return then.toLocaleDateString('ar-SA', { calendar: 'gregory' });
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
