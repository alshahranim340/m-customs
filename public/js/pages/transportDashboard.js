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
    </div>
  `;

  await Promise.all([loadWeather(), loadStats()]);
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
