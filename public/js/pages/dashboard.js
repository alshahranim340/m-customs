// ══════════════════════════════════════════════════════════════
// DASHBOARD — Live morning brief with stats, alerts, news
// ══════════════════════════════════════════════════════════════

import { getShipments, getAllDrivers } from '../../../src/firebase/db.js';
import { getTransportRequests } from '../../../src/firebase/transportDb.js';

let _profile = null;
let _newsCache = null;
let _newsCacheTime = 0;
const NEWS_CACHE_MS = 30 * 60 * 1000; // 30 min

export async function renderDashboard(profile) {
  _profile = profile;

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
  ]);
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
  const name = _profile?.name || _profile?.email?.split('@')[0] || '';

  return `
    <div style="background:linear-gradient(135deg,#0E1A2E 0%,#1C2B48 100%);color:white;padding:28px 32px;border-radius:12px;position:relative;overflow:hidden;">
      <div style="position:absolute;top:-40px;right:-40px;width:200px;height:200px;background:radial-gradient(circle,rgba(212,178,102,0.15) 0%,transparent 70%);"></div>
      <div style="position:relative;z-index:1;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;color:#D4B266;font-weight:700;">
          SDS · MORNING BRIEF
        </div>
        <div style="font-size:26px;font-weight:900;margin-top:8px;">
          ${icon} ${salute} ${name}
        </div>
        <div style="font-size:13px;color:#B8B0A0;margin-top:4px;font-family:'JetBrains Mono',monospace;">
          ${dateStr}
        </div>
      </div>
    </div>
  `;
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
function renderNewsSkeleton() {
  return `
    <div style="background:white;border-radius:10px;border:1px solid #E8E5DC;overflow:hidden;">
      <div style="background:#F5F3EC;padding:12px 20px;border-bottom:1px solid #E8E5DC;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;color:#0E1A2E;font-weight:800;">
        📰 CUSTOMS & PORTS NEWS · LOADING…
      </div>
      <div style="padding:14px 20px;">
        ${[1,2,3].map(() => `
          <div style="padding:10px 0;border-bottom:1px solid #F5F3EC;">
            <div style="height:14px;background:#F0EDE4;border-radius:3px;width:80%;"></div>
            <div style="height:10px;background:#F0EDE4;border-radius:3px;width:40%;margin-top:6px;"></div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

async function loadNews() {
  const container = document.getElementById('dash-news');

  // Cache check
  if (_newsCache && (Date.now() - _newsCacheTime) < NEWS_CACHE_MS) {
    renderNews(_newsCache);
    return;
  }

  try {
    // Fetch multiple queries in parallel and merge
    const queries = [
      'الجمارك السعودية',
      'الموانئ السعودية',
      'شحن ولوجستيات السعودية',
    ];

    const feeds = await Promise.all(queries.map(fetchGoogleNews));
    const items = mergeAndDedupe(feeds);

    _newsCache = items;
    _newsCacheTime = Date.now();

    renderNews(items);
  } catch (e) {
    console.error('News load failed', e);
    container.innerHTML = `
      <div style="background:white;border-radius:10px;border:1px solid #E8E5DC;padding:20px;text-align:center;color:#8A8578;">
        <i class="ti ti-wifi-off" style="font-size:24px;"></i>
        <div style="font-size:13px;margin-top:8px;">تعذّر تحميل الأخبار</div>
        <button onclick="location.reload()" style="margin-top:10px;background:#0E1A2E;color:white;border:none;border-radius:5px;padding:6px 14px;font-family:Tajawal,sans-serif;font-size:12px;cursor:pointer;">حاول مجدداً</button>
      </div>
    `;
  }
}

async function fetchGoogleNews(query) {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ar&gl=SA&ceid=SA:ar`;
  // Use allorigins as CORS proxy — returns raw XML
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error('proxy failed: ' + res.status);
  const data = await res.json();
  const xml = data.contents;
  return parseRSS(xml).slice(0, 8);
}

function parseRSS(xmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');
  const items = Array.from(doc.querySelectorAll('item'));
  return items.map(item => ({
    title: item.querySelector('title')?.textContent || '',
    link: item.querySelector('link')?.textContent || '',
    pubDate: item.querySelector('pubDate')?.textContent || '',
    description: item.querySelector('description')?.textContent || '',
  }));
}

function mergeAndDedupe(feeds) {
  const seen = new Set();
  const merged = [];
  for (const feed of feeds) {
    for (const item of feed) {
      const key = item.title;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }
  // Sort by pubDate desc
  merged.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  return merged.slice(0, 12);
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
  // Google News wraps titles like "Title - Source"
  const parts = title.split(' - ');
  if (parts.length > 1) return parts[parts.length - 1];
  return '';
}

function cleanTitle(title) {
  const parts = title.split(' - ');
  if (parts.length > 1) return parts.slice(0, -1).join(' - ');
  return title;
}

function renderNews(items) {
  const container = document.getElementById('dash-news');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `
      <div style="background:white;border-radius:10px;border:1px solid #E8E5DC;padding:20px;text-align:center;color:#8A8578;">
        <div style="font-size:24px;">📭</div>
        <div style="font-size:13px;margin-top:8px;">لا توجد أخبار</div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="background:white;border-radius:10px;border:1px solid #E8E5DC;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#0E1A2E 0%,#1C2B48 100%);color:white;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;color:#D4B266;font-weight:800;">
            📰 CUSTOMS & LOGISTICS NEWS
          </div>
          <div style="font-size:14px;font-weight:800;margin-top:2px;">أخبار الجمارك والموانئ</div>
        </div>
        <button onclick="location.reload()" style="background:rgba(255,255,255,0.1);color:#D4B266;border:1px solid rgba(212,178,102,0.3);border-radius:5px;padding:5px 10px;font-family:Tajawal,sans-serif;font-size:11px;cursor:pointer;">
          <i class="ti ti-refresh"></i> تحديث
        </button>
      </div>
      <div style="max-height:500px;overflow-y:auto;">
        ${items.map(item => {
          const source = extractSource(item.title);
          const title = cleanTitle(item.title);
          return `
            <a href="${item.link}" target="_blank" rel="noopener" style="display:flex;gap:14px;padding:14px 20px;border-bottom:1px solid #F5F3EC;text-decoration:none;color:inherit;transition:background 0.1s;" onmouseover="this.style.background='#FAFAF7'" onmouseout="this.style.background='transparent'">
              <div style="width:40px;height:40px;background:#F5F3EC;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#0E1A2E;font-size:18px;flex-shrink:0;">
                <i class="ti ti-news"></i>
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:700;color:#0E1A2E;line-height:1.5;">
                  ${title}
                </div>
                <div style="font-size:11px;color:#8A8578;margin-top:4px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                  ${source ? `<span style="background:#F0EDE4;padding:2px 6px;border-radius:3px;font-weight:700;color:#0E1A2E;">${source}</span>` : ''}
                  <span>${timeAgo(item.pubDate)}</span>
                </div>
              </div>
              <div style="color:#D4B266;font-size:16px;flex-shrink:0;align-self:center;">
                <i class="ti ti-external-link"></i>
              </div>
            </a>
          `;
        }).join('')}
      </div>
    </div>
  `;
}
