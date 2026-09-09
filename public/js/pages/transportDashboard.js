// ══════════════════════════════════════════════════════════════
// TRANSPORT DASHBOARD — Overview for قسم النقل
// Read-only stats (no navigation on card click by design).
// ══════════════════════════════════════════════════════════════

import { getAllDrivers } from '../../../src/firebase/db.js';
import { getTransportRequests } from '../../../src/firebase/transportDb.js';
import { getCurrentUser, getUserProfile } from '../../../src/firebase/auth.js';

let _profile = null;

const QUOTES = [
  { text: 'كل شحنة رحلة، وكل رحلة قصة نجاح', author: 'حكمة لوجستية' },
  { text: 'الإتقان في التفاصيل، والريادة في السرعة', author: '' },
  { text: 'من رابغ إلى دبي، الجودة لا تعرف حدوداً', author: '' },
  { text: 'اليوم فرصة جديدة لتقديم الأفضل', author: '' },
  { text: 'خلف كل شحنة سائق، وخلف كل سائق عائلة', author: '' },
  { text: 'الاحترافية عادة يومية، مو موقف عابر', author: '' },
  { text: 'ما يُقاس يمكن تحسينه', author: 'بيتر دراكر' },
  { text: 'أفضل وقت لزراعة شجرة كان قبل ٢٠ سنة. ثاني أفضل وقت: الآن', author: 'مثل صيني' },
];
function todaysQuote() {
  const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return QUOTES[day % QUOTES.length];
}

const DEST_LABELS = {
  uae:     { ar: 'الإمارات', en: 'UAE', color: '#1C4B8E', flag: '🇦🇪' },
  bahrain: { ar: 'البحرين',  en: 'BH',  color: '#CC2229', flag: '🇧🇭' },
  oman:    { ar: 'عُمان',     en: 'OM',  color: '#2E8B57', flag: '🇴🇲' },
};

export async function renderTransportDashboard(profile) {
  _profile = profile;

  if (!_profile || !_profile.name) {
    try {
      const user = getCurrentUser();
      if (user) {
        const p = await getUserProfile(user.uid);
        if (p) _profile = { ...(_profile || {}), ...p };
      }
    } catch (e) { console.warn('profile fetch failed:', e); }
  }

  const container = document.getElementById('page-container');
  if (!container) return;

  container.innerHTML = `
    <div style="padding:24px;font-family:Tajawal,sans-serif;background:#F5F3EC;min-height:100vh;">
      ${renderGreeting()}
      <div id="td-stats" style="margin-top:20px;">${renderStatsSkeleton()}</div>
      <div id="td-status-breakdown" style="margin-top:20px;"></div>
      <div style="margin-top:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;">
        <div id="td-top-customers"></div>
        <div id="td-destinations"></div>
      </div>
      <div id="td-loading-locations" style="margin-top:20px;"></div>
      <div id="td-news" style="margin-top:20px;">${renderNewsSkeleton()}</div>
    </div>
  `;

  await Promise.all([loadWeather(), loadStats(), loadNews()]);
}

// ─────────────────────────────────────────────────
// GREETING (same style as clearance dashboard)
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
            SDS · TRANSPORT · DASHBOARD
          </div>
          <div style="font-size:22px;font-weight:900;margin-top:6px;line-height:1.2;">
            ${icon} ${salute}<span style="color:#D4B266;"> ${name}</span>
          </div>
          <div style="display:flex;gap:10px;align-items:center;margin-top:6px;flex-wrap:wrap;">
            <span style="font-size:11px;color:#B8B0A0;font-family:'JetBrains Mono',monospace;">${dateStr}</span>
            <span style="color:#3A4A62;">·</span>
            <span id="td-weather-strip" style="font-size:11px;color:#F5F0E4;display:inline-flex;align-items:center;gap:5px;">
              <span style="opacity:0.5;">...</span>
            </span>
            <span style="color:#3A4A62;">·</span>
            <span style="font-size:14px;letter-spacing:4px;">🚛📦</span>
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
// WEATHER (Jeddah, Open-Meteo)
// ─────────────────────────────────────────────────
async function loadWeather() {
  const strip = document.getElementById('td-weather-strip');
  if (!strip) return;
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=21.5&longitude=39.2&current=temperature_2m,weather_code&timezone=Asia/Riyadh';
    const res = await fetch(url);
    if (!res.ok) throw new Error('weather fetch failed');
    const data = await res.json();
    const c = data.current;
    const emoji = weatherEmoji(c.weather_code);
    const label = weatherLabel(c.weather_code);
    const temp = Math.round(c.temperature_2m);
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
// STATS — main 4 counters + status breakdown + top customers + destinations + locations
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
    const [requests, drivers] = await Promise.all([
      getTransportRequests(500).catch(() => []),
      getAllDrivers().catch(() => []),
    ]);

    // Filter soft-deleted requests
    const activeReqs = requests.filter(r => !r.deleted);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const parseDate = (r) => {
      if (r.created_at?.toDate) return r.created_at.toDate();
      if (r.created_at) return new Date(r.created_at);
      return null;
    };

    // Batch counts (group by batch_id)
    const batchIds = new Set();
    activeReqs.forEach(r => {
      if (r.batch_id) batchIds.add(r.batch_id);
      else batchIds.add(`legacy-${r.customer || ''}-${(parseDate(r) || new Date()).toISOString().slice(0,10)}`);
    });

    const monthReqs = activeReqs.filter(r => {
      const d = parseDate(r);
      return d && d >= monthStart;
    });
    const monthBatchIds = new Set();
    monthReqs.forEach(r => {
      if (r.batch_id) monthBatchIds.add(r.batch_id);
      else monthBatchIds.add(`legacy-${r.customer || ''}-${(parseDate(r) || new Date()).toISOString().slice(0,10)}`);
    });

    const todayTrucks = activeReqs.filter(r => {
      const d = parseDate(r);
      return d && d >= todayStart;
    }).length;
    const weekTrucks = activeReqs.filter(r => {
      const d = parseDate(r);
      return d && d >= weekStart;
    }).length;
    const totalQty = activeReqs.reduce((s, r) => s + (parseFloat(r.quantity) || 0), 0);
    const monthQty = monthReqs.reduce((s, r) => s + (parseFloat(r.quantity) || 0), 0);
    const totalDrivers = drivers.length;

    // Main 4 stat cards
    document.getElementById('td-stats').innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;">
        ${statCard('ti-package', 'الدفعات', batchIds.size, '#0E1A2E', '#F5F3EC', `${monthBatchIds.size} هذا الشهر`)}
        ${statCard('ti-truck', 'الشاحنات (الشهر)', monthReqs.length, '#1C4B8E', '#EEF2FF', `${weekTrucks} هذا الأسبوع · ${todayTrucks} اليوم`)}
        ${statCard('ti-weight', 'إجمالي الكميات (طن)', Math.round(totalQty), '#2E8B57', '#E7F5EE', `${Math.round(monthQty)} طن هذا الشهر`)}
        ${statCard('ti-user', 'قاعدة السائقين', totalDrivers, '#8B6914', '#FEF6E7', 'إجمالي السائقين المسجّلين')}
      </div>
    `;
    animateCounters();

    // Status breakdown bar
    renderStatusBreakdown(activeReqs);

    // Top customers
    renderTopCustomers(activeReqs);

    // Destinations
    renderDestinations(activeReqs);

    // Loading locations
    renderLoadingLocations(activeReqs);

  } catch (e) {
    console.error('Stats load failed', e);
    document.getElementById('td-stats').innerHTML = `<div style="color:#8A8578;font-size:12px;">تعذّر تحميل الإحصائيات</div>`;
  }
}

function statCard(icon, label, value, accentColor, bgColor, subtitle = '') {
  return `
    <div style="background:white;padding:20px;border-radius:10px;border:1px solid #E8E5DC;position:relative;overflow:hidden;">
      <div style="position:absolute;top:16px;left:16px;width:36px;height:36px;background:${bgColor};color:${accentColor};border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;">
        <i class="ti ${icon}"></i>
      </div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;letter-spacing:1.5px;font-weight:700;">${label.toUpperCase()}</div>
      <div class="td-stat-number" data-target="${value}" style="font-size:32px;font-weight:900;color:${accentColor};margin-top:6px;font-family:'JetBrains Mono',monospace;">00</div>
      <div style="font-size:11px;color:#6B6659;margin-top:4px;">${subtitle || label}</div>
    </div>
  `;
}

function animateCounters() {
  document.querySelectorAll('.td-stat-number').forEach(el => {
    const target = parseInt(el.dataset.target) || 0;
    const duration = 1000;
    const startTime = performance.now();
    const format = (n) => {
      const v = Math.floor(n);
      return v < 100 ? String(v).padStart(2, '0') : String(v);
    };
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
// STATUS BREAKDOWN — stacked horizontal bar
// ─────────────────────────────────────────────────
function renderStatusBreakdown(requests) {
  const counts = { draft: 0, sent: 0, converted: 0, done: 0 };
  requests.forEach(r => {
    if (counts[r.status] !== undefined) counts[r.status]++;
    else counts.draft++;
  });
  const total = counts.draft + counts.sent + counts.converted + counts.done;
  if (total === 0) {
    document.getElementById('td-status-breakdown').innerHTML = '';
    return;
  }

  const pct = (n) => (n / total * 100).toFixed(1);
  const statusMap = [
    { key: 'draft',     label: 'مسودة',  en: 'DRAFT',     color: '#6B6659',  bg: '#F0EDE4' },
    { key: 'sent',      label: 'مرسل',   en: 'SENT',      color: '#1C4B8E',  bg: '#EEF2FF' },
    { key: 'converted', label: 'محوّل',  en: 'CONVERTED', color: '#8B6914',  bg: '#FEF6E7' },
    { key: 'done',      label: 'مكتمل',  en: 'DONE',      color: '#2E8B57',  bg: '#E7F5EE' },
  ];

  document.getElementById('td-status-breakdown').innerHTML = `
    <div style="background:white;padding:20px;border-radius:10px;border:1px solid #E8E5DC;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.5px;color:#0E1A2E;font-weight:800;">STATUS BREAKDOWN</div>
          <div style="font-size:12px;color:#6B6659;margin-top:2px;">توزيع طلبات النقل حسب الحالة</div>
        </div>
        <div style="font-size:11px;color:#8A8578;font-family:'JetBrains Mono',monospace;">TOTAL · ${total}</div>
      </div>
      <div style="display:flex;height:12px;border-radius:6px;overflow:hidden;background:#F5F3EC;">
        ${statusMap.map(s => counts[s.key] > 0 ? `<div style="width:${pct(counts[s.key])}%;background:${s.color};" title="${s.label} · ${counts[s.key]}"></div>` : '').join('')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-top:14px;">
        ${statusMap.map(s => `
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:10px;height:10px;background:${s.color};border-radius:3px;flex-shrink:0;"></div>
            <div style="min-width:0;">
              <div style="font-size:11px;color:#6B6659;font-family:'JetBrains Mono',monospace;letter-spacing:0.5px;">${s.en}</div>
              <div style="font-size:15px;font-weight:800;color:${s.color};font-family:'JetBrains Mono',monospace;">${counts[s.key]} <span style="color:#8A8578;font-size:11px;font-weight:600;">(${pct(counts[s.key])}%)</span></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────
// TOP CUSTOMERS — top 5 by truck count
// ─────────────────────────────────────────────────
function renderTopCustomers(requests) {
  const counts = {};
  requests.forEach(r => {
    const c = r.customer || 'بلا عميل';
    counts[c] = (counts[c] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (sorted.length === 0) {
    document.getElementById('td-top-customers').innerHTML = '';
    return;
  }
  const max = sorted[0][1];

  document.getElementById('td-top-customers').innerHTML = `
    <div style="background:white;padding:20px;border-radius:10px;border:1px solid #E8E5DC;height:100%;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.5px;color:#0E1A2E;font-weight:800;">TOP CUSTOMERS</div>
          <div style="font-size:12px;color:#6B6659;margin-top:2px;">أعلى 5 عملاء حسب عدد الشاحنات</div>
        </div>
        <i class="ti ti-award" style="color:#D4B266;font-size:20px;"></i>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${sorted.map(([name, count], i) => {
          const rank = i + 1;
          const rankColors = ['#D4B266', '#B8B0A0', '#C89959', '#6B6659', '#6B6659'];
          return `
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:22px;height:22px;background:${rankColors[i]};color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:800;flex-shrink:0;">${rank}</div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                  <div style="font-size:13px;font-weight:700;color:#0E1A2E;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</div>
                  <div style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:800;color:#0E1A2E;margin-right:10px;">${count}</div>
                </div>
                <div style="height:6px;background:#F5F3EC;border-radius:3px;overflow:hidden;">
                  <div style="width:${(count/max*100).toFixed(1)}%;height:100%;background:linear-gradient(90deg,#0E1A2E,#1C2B48);"></div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────
// DESTINATIONS
// ─────────────────────────────────────────────────
function renderDestinations(requests) {
  const counts = {};
  requests.forEach(r => {
    const d = r.destination || 'uae';
    counts[d] = (counts[d] || 0) + 1;
  });
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  if (total === 0) {
    document.getElementById('td-destinations').innerHTML = '';
    return;
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  document.getElementById('td-destinations').innerHTML = `
    <div style="background:white;padding:20px;border-radius:10px;border:1px solid #E8E5DC;height:100%;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.5px;color:#0E1A2E;font-weight:800;">DESTINATIONS</div>
          <div style="font-size:12px;color:#6B6659;margin-top:2px;">توزيع الوجهات</div>
        </div>
        <i class="ti ti-map-pin" style="color:#1C4B8E;font-size:20px;"></i>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${entries.map(([key, count]) => {
          const info = DEST_LABELS[key] || { ar: key, en: key.toUpperCase(), color: '#6B6659', flag: '🌍' };
          const pct = (count / total * 100).toFixed(1);
          return `
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:18px;">${info.flag}</span>
                  <span style="font-size:14px;font-weight:800;color:#0E1A2E;">${info.ar}</span>
                  <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;letter-spacing:1px;">${info.en}</span>
                </div>
                <div>
                  <span style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:800;color:${info.color};">${count}</span>
                  <span style="font-size:11px;color:#8A8578;margin-right:6px;">${pct}%</span>
                </div>
              </div>
              <div style="height:8px;background:#F5F3EC;border-radius:4px;overflow:hidden;">
                <div style="width:${pct}%;height:100%;background:${info.color};transition:width 0.6s ease;"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────
// LOADING LOCATIONS — top 8 by truck count
// ─────────────────────────────────────────────────
function renderLoadingLocations(requests) {
  const counts = {};
  requests.forEach(r => {
    const loc = (r.loading_location || '').toUpperCase().trim() || '—';
    counts[loc] = (counts[loc] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (sorted.length === 0) {
    document.getElementById('td-loading-locations').innerHTML = '';
    return;
  }
  const max = sorted[0][1];

  document.getElementById('td-loading-locations').innerHTML = `
    <div style="background:white;padding:20px;border-radius:10px;border:1px solid #E8E5DC;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.5px;color:#0E1A2E;font-weight:800;">LOADING LOCATIONS</div>
          <div style="font-size:12px;color:#6B6659;margin-top:2px;">أعلى 8 مناطق تحميل</div>
        </div>
        <i class="ti ti-map-2" style="color:#2E8B57;font-size:20px;"></i>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;">
        ${sorted.map(([loc, count]) => `
          <div style="background:#FAFAF7;border:1px solid #F0EDE4;border-radius:6px;padding:10px 12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <div style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:800;color:#0E1A2E;">${loc}</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:800;color:#2E8B57;">${count}</div>
            </div>
            <div style="height:5px;background:white;border-radius:2px;overflow:hidden;">
              <div style="width:${(count/max*100).toFixed(1)}%;height:100%;background:linear-gradient(90deg,#2E8B57,#4ADE80);"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════
// NEWS + RESOURCES (same as clearance dashboard)
// ═══════════════════════════════════════════════════════════════════

let _newsCache = null;
let _newsCacheTime = 0;
const NEWS_CACHE_MS = 30 * 60 * 1000;
let _carouselInterval = null;
let _currentSlide = 0;

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

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #0E1A2E 0%, #D4B266 100%)',
  'linear-gradient(135deg, #1C4B8E 0%, #0E1A2E 100%)',
  'linear-gradient(135deg, #2E8B57 0%, #0E1A2E 100%)',
  'linear-gradient(135deg, #8B6914 0%, #0E1A2E 100%)',
  'linear-gradient(135deg, #C41818 0%, #0E1A2E 100%)',
];

function renderNewsSkeleton() {
  return `
    <style>
      @keyframes tdSpin { to { transform: rotate(360deg); } }
      @keyframes tdPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.4); } }
      @keyframes tdSlideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      .td-spinner { animation: tdSpin 0.8s linear infinite; }
      .td-pulse-dot { animation: tdPulse 1.5s ease-in-out infinite; }
      .td-news-enter { animation: tdSlideIn 0.4s ease-out; }
      .td-acc-content { overflow:hidden; transition: max-height 0.3s ease; }
      .td-acc-header { cursor:pointer; transition: background 0.15s; }
      .td-acc-header:hover { background:#F0EDE4 !important; }
      .td-acc-chevron { transition: transform 0.25s; }
      .td-acc-chevron.td-rotated { transform: rotate(-90deg); }
    </style>
    <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:20px;">
      <div id="td-news-carousel">${renderCarouselSkeleton()}</div>
      <div>${renderResourcesAccordion()}</div>
    </div>
  `;
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
          <div class="td-spinner" style="width:32px;height:32px;border:3px solid rgba(212,178,102,0.2);border-top-color:#D4B266;border-radius:50%;margin:0 auto;"></div>
          <div style="font-size:12px;color:#8A8578;margin-top:14px;">جارٍ جلب الأخبار...</div>
        </div>
      </div>
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
            <div class="td-acc-header" data-td-acc-idx="${idx}" style="padding:12px 14px;background:#FAFAF7;display:flex;align-items:center;gap:12px;">
              <div style="width:32px;height:32px;background:${cat.bg};color:${cat.color};border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">
                <i class="ti ${cat.icon}"></i>
              </div>
              <div style="flex:1;">
                <div style="font-size:13px;font-weight:800;color:#0E1A2E;">${cat.category}</div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.5px;color:#8A8578;font-weight:700;margin-top:1px;">${cat.links.length} ROABIT</div>
              </div>
              <i class="ti ti-chevron-down td-acc-chevron" data-td-chevron="${idx}" style="color:#8A8578;font-size:18px;"></i>
            </div>
            <div class="td-acc-content" data-td-acc-content="${idx}" style="max-height:0;">
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

function wireAccordion() {
  document.querySelectorAll('.td-acc-header').forEach(header => {
    header.onclick = () => {
      const idx = header.dataset.tdAccIdx;
      const content = document.querySelector(`[data-td-acc-content="${idx}"]`);
      const chevron = document.querySelector(`[data-td-chevron="${idx}"]`);
      const isOpen = content.style.maxHeight && content.style.maxHeight !== '0px';
      if (isOpen) {
        content.style.maxHeight = '0';
        chevron.classList.remove('td-rotated');
      } else {
        content.style.maxHeight = content.scrollHeight + 'px';
        chevron.classList.add('td-rotated');
      }
    };
  });
}

async function loadNews() {
  const container = document.getElementById('td-news-carousel');
  if (!container) return;
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

  // كل استراتيجية دالة (مو Promise جاهز) عشان ما نبدأ الطلب إلا لو احتجناه فعلاً
  const strategies = [
    () => fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&count=10`)
      .then(r => r.ok ? r.json() : Promise.reject('rss2json bad'))
      .then(d => {
        if (d.status !== 'ok') return Promise.reject('rss2json ' + d.message);
        return (d.items || []).map(i => ({ title: i.title, link: i.link, pubDate: i.pubDate, source: extractSource(i.title), image: extractImage(i.description || i.content || '') || i.thumbnail || i.enclosure?.link || '' }));
      }),
    () => fetch(`https://corsproxy.io/?${encodeURIComponent(rssUrl)}`)
      .then(r => r.ok ? r.text() : Promise.reject('corsproxy bad'))
      .then(t => parseRSS(t).map(i => ({ ...i, source: extractSource(i.title), image: extractImage(i.description) || '' }))),
    () => fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`)
      .then(r => r.ok ? r.text() : Promise.reject('allorigins bad'))
      .then(t => parseRSS(t).map(i => ({ ...i, source: extractSource(i.title), image: extractImage(i.description) || '' }))),
    () => fetch('https://feeds.bbci.co.uk/arabic/business/rss.xml')
      .then(r => r.ok ? r.text() : Promise.reject('bbc bad'))
      .then(t => parseRSS(t).map(i => ({ ...i, source: 'BBC عربي', image: extractImage(i.description) || '' }))),
  ];

  // نجرب الاستراتيجيات بالتتابع (مو كلها مرة وحدة بالتوازي) ونوقف عند أول نجاح.
  // نفس إصلاح dashboard.js — يمنع أخطاء CORS/403 المتوقعة من باقي البروكسيات
  // من الظهور بالكونسول كل مرة بدون داعٍ.
  let firstError = null;
  for (let idx = 0; idx < strategies.length; idx++) {
    try {
      const items = await Promise.race([
        strategies[idx](),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
      ]);
      if (items && items.length > 0) return items.slice(0, 10);
    } catch (err) {
      if (!firstError) firstError = err;
    }
  }
  throw firstError || new Error('empty');
}

function extractImage(html) {
  if (!html) return '';
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : '';
}

function renderCarousel(items) {
  const container = document.getElementById('td-news-carousel');
  if (!container) return;

  container.innerHTML = `
    <div style="background:linear-gradient(135deg,#0E1A2E 0%,#1C2B48 100%);color:white;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;height:100%;min-height:340px;">
      <div style="padding:14px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.08);">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;color:#D4B266;font-weight:800;display:flex;align-items:center;gap:8px;">
            <span class="td-pulse-dot" style="width:8px;height:8px;background:#D4B266;border-radius:50%;display:inline-block;"></span>
            LIVE NEWS · ${items.length}
          </div>
          <div style="font-size:14px;font-weight:800;margin-top:2px;">أخبار مباشرة</div>
        </div>
        <div style="display:flex;gap:6px;">
          <button id="td-news-prev" title="السابق" style="background:rgba(212,178,102,0.1);color:#D4B266;border:1px solid rgba(212,178,102,0.3);border-radius:5px;width:28px;height:28px;font-size:12px;cursor:pointer;">
            <i class="ti ti-chevron-right"></i>
          </button>
          <button id="td-news-pause" title="إيقاف/تشغيل" style="background:rgba(212,178,102,0.1);color:#D4B266;border:1px solid rgba(212,178,102,0.3);border-radius:5px;width:28px;height:28px;font-size:12px;cursor:pointer;">
            <i class="ti ti-player-pause" id="td-pause-icon"></i>
          </button>
          <button id="td-news-next" title="التالي" style="background:rgba(212,178,102,0.1);color:#D4B266;border:1px solid rgba(212,178,102,0.3);border-radius:5px;width:28px;height:28px;font-size:12px;cursor:pointer;">
            <i class="ti ti-chevron-left"></i>
          </button>
        </div>
      </div>
      <div id="td-news-slide" style="flex:1;padding:20px 22px;min-height:200px;"></div>
      <div id="td-news-dots" style="padding:8px 20px;display:flex;gap:5px;justify-content:center;align-items:center;flex-wrap:wrap;"></div>
      <div style="height:3px;background:rgba(212,178,102,0.15);position:relative;">
        <div id="td-news-progress" style="height:100%;background:#D4B266;width:0%;transition:width 0.1s linear;"></div>
      </div>
    </div>
  `;

  _currentSlide = 0;
  showSlide(items, 0);
  renderDots(items);

  document.getElementById('td-news-prev').onclick = () => { stopCarousel(); _currentSlide = (_currentSlide - 1 + items.length) % items.length; showSlide(items, _currentSlide); renderDots(items); };
  document.getElementById('td-news-next').onclick = () => { stopCarousel(); _currentSlide = (_currentSlide + 1) % items.length; showSlide(items, _currentSlide); renderDots(items); };
  document.getElementById('td-news-pause').onclick = () => {
    if (_carouselInterval) {
      stopCarousel();
      document.getElementById('td-pause-icon').className = 'ti ti-player-play';
    } else {
      startCarousel(items);
      document.getElementById('td-pause-icon').className = 'ti ti-player-pause';
    }
  };

  startCarousel(items);
}

function showSlide(items, idx) {
  const container = document.getElementById('td-news-slide');
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
      <a href="${item.link}" target="_blank" rel="noopener" class="td-news-enter" style="display:block;text-decoration:none;color:inherit;">
        <div style="width:100%;height:150px;overflow:hidden;border-radius:8px;position:relative;background:${gradient};">
          ${heroContent}
          <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(14,26,46,0.9) 100%);"></div>
          ${item.source ? `<div style="position:absolute;top:10px;right:10px;background:#D4B266;color:#0E1A2E;padding:3px 10px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:900;letter-spacing:0.5px;">${item.source.toUpperCase()}</div>` : ''}
          <div style="position:absolute;bottom:8px;left:12px;font-family:'JetBrains Mono',monospace;font-size:9px;color:#D4B266;font-weight:700;">
            ${timeAgo(item.pubDate)}
          </div>
        </div>
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
  const dots = document.getElementById('td-news-dots');
  if (!dots) return;
  dots.innerHTML = items.map((_, i) => `
    <span data-td-idx="${i}" style="width:${i === _currentSlide ? '18px' : '5px'};height:5px;background:${i === _currentSlide ? '#D4B266' : 'rgba(212,178,102,0.3)'};border-radius:3px;cursor:pointer;transition:all 0.25s;"></span>
  `).join('');
  dots.querySelectorAll('span').forEach(span => {
    span.onclick = () => { stopCarousel(); _currentSlide = parseInt(span.dataset.tdIdx); showSlide(items, _currentSlide); renderDots(items); };
  });
}

function startCarousel(items) {
  stopCarousel();
  const SLIDE_MS = 6000;
  const progress = document.getElementById('td-news-progress');
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
  const progress = document.getElementById('td-news-progress');
  if (progress) progress.style.width = '0%';
}

function renderNewsFallback() {
  const container = document.getElementById('td-news-carousel');
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
