// ══════════════════════════════════════════════════════════════
// ENHANCEMENTS — Dark mode, avatar, splash, sound, confetti
// ══════════════════════════════════════════════════════════════

const SDS_LOGO = 'data:image/jpeg;base64,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gfdYfq6x6VMxmAf+ylm2DP7OpsFe4z6zrPu9pme23X2qP9HI1yzg0QqyGHtC1DsSBZALWV2cg6hCQZwNw2JLNaqaBTukrmAtBIKauHXgKL1gNdw6p+imF6pT2jWB6qErZdNYVxAbMB3QE7eku7OYuoJQescKn76NksLowh4GMf6ORBZcFCb3zGofkdIcuOhGHhMs5US2dGbHcKUwEPHWG58V6IjGJxMEeuVqnC0pSlKUrRleAoFfFgIAAMhtaSzcN90b1sINle43jHZZjTnZJZ1lm2nANLGQg0wsQ03LJZ1lnUlnWWbGGOU8ZZ1PWEx6xvHYu+nIrloTXWWgFavDvMsIWSrNyMrwf2hjy1LTFmUCW9kv6QsSfuSQsQJXUmYAJ8fqUXThDPwuzwlDvXNEw2ozYhNJc4Lrv3TMJ3R1TPt2uIQOcqxhWX9eXVl75v5OLcQC89hlSYGac5iN+aR34aUbTuLPEHG+0EomkGMZSIJPvOsRhkeL6yjrwj+zI34UpbMDF/ZLImvvB24nMqmKxLedgONe1gIhbrQxO/DoPAN9LgrhkmQTPnNBM12UXFKyWdGkKOlwELtzKkvw7hXh2JjdEyMIMABUYTLw1OtR2YVgxIQ4Q9XWksgUEzhikKh8nlrAQ/8AQjWH0htYtxCi4CoRVZxicnjUIV7imUesA0Izs6jpwDgJewrhdhs7Cdh6TsIAZBsUzD5QDIDYtmPSAGQEQcydh6QAyIg5kAMiUdCUdCUdCIcwgeQ9OTolZWVlZWVlZWVlZWVlZWVlZXe/X/1r/wD/APw7EzFU2n//2gAMAwEAAgADAAAAEAggggQfPLM/ffffffffffffffQggggknfPPENfffffffffffffQgggggkcYEgsh8woj3fffffffQggggggQYAjGjvcAINvffffffQggggggwwWg5Vwvv603PfffffQggggggQRgkXPvvvvrvffffffaggggggQVARMNvvvvvnfffffffggggggAQYzUn/vvvvo/ffffffqgggggSQQZiLsPvvvqsdfffffvgggggSQQQQRBsvvvqvMxdfffvrggggUSQQQVeDUvfovPFnffffvrgggm+QQQQQcaHvl/PP8AX3333760JHk0ckEEEEtXXPzzxb33333725mb01+8sMsAT0fzzwv3333377768QgEEU4AJp/7zzyn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';

// ═════════════════════════════════════════════
// 1. DARK MODE — Auto after Maghrib prayer
// ═════════════════════════════════════════════

let _darkModeManual = null; // null = auto, true/false = manual override

export function initDarkMode() {
  injectDarkModeStyles();
  addDarkModeToggle();
  applyDarkModeIfNeeded();
  // Re-check every 5 minutes
  setInterval(applyDarkModeIfNeeded, 5 * 60 * 1000);
}

function injectDarkModeStyles() {
  if (document.getElementById('dark-mode-styles')) return;
  const style = document.createElement('style');
  style.id = 'dark-mode-styles';
  style.textContent = `
    /* ═══ DARK MODE OVERRIDES ═══ */
    body.dark-mode {
      background: #0A0F1C !important;
      color: #E8E5DC;
    }
    body.dark-mode .login-page,
    body.dark-mode #root > div,
    body.dark-mode [style*="background:#F5F3EC"],
    body.dark-mode [style*="background: #F5F3EC"] {
      background: #0A0F1C !important;
    }
    /* Cards, panels */
    body.dark-mode [style*="background:white"],
    body.dark-mode [style*="background: white"],
    body.dark-mode [style*="background:#FEFCF3"],
    body.dark-mode [style*="background: #FEFCF3"],
    body.dark-mode [style*="background:#FAFAF7"],
    body.dark-mode [style*="background: #FAFAF7"] {
      background: #14203A !important;
      color: #E8E5DC;
    }
    /* Table rows, subtle bg */
    body.dark-mode [style*="background:#F5F3EC"] { background: #1a2438 !important; }
    /* Borders */
    body.dark-mode [style*="border:1px solid #E8E5DC"],
    body.dark-mode [style*="border: 1px solid #E8E5DC"],
    body.dark-mode [style*="border:1px solid #F0EDE4"],
    body.dark-mode [style*="border: 1px solid #F0EDE4"] {
      border-color: #2A3B5C !important;
    }
    /* Dark text (make light) */
    body.dark-mode [style*="color:#0E1A2E"],
    body.dark-mode [style*="color: #0E1A2E"] { color: #F5F0E4 !important; }
    body.dark-mode [style*="color:#6B6659"],
    body.dark-mode [style*="color: #6B6659"] { color: #B8B0A0 !important; }
    body.dark-mode [style*="color:#8A8578"],
    body.dark-mode [style*="color: #8A8578"] { color: #8A8578 !important; }
    /* Gold shine brighter in dark */
    body.dark-mode [style*="color:#D4B266"],
    body.dark-mode [style*="color: #D4B266"] { color: #F0C878 !important; text-shadow: 0 0 8px rgba(240,200,120,0.35); }
    body.dark-mode [style*="color:#8B6914"],
    body.dark-mode [style*="color: #8B6914"] { color: #E8B850 !important; }
    /* Green fluorescent */
    body.dark-mode [style*="color:#2E8B57"],
    body.dark-mode [style*="color: #2E8B57"] { color: #4ADC8A !important; text-shadow: 0 0 6px rgba(74,220,138,0.3); }
    body.dark-mode [style*="color:#0F6338"],
    body.dark-mode [style*="color: #0F6338"] { color: #4ADC8A !important; }
    /* Red */
    body.dark-mode [style*="color:#CC2229"],
    body.dark-mode [style*="color: #CC2229"] { color: #FF5A63 !important; }
    /* Blue */
    body.dark-mode [style*="color:#1C4B8E"],
    body.dark-mode [style*="color: #1C4B8E"] { color: #7BA9E6 !important; }
    /* Inputs */
    body.dark-mode input, body.dark-mode select, body.dark-mode textarea {
      background: #1a2438 !important;
      color: #E8E5DC !important;
      border-color: #2A3B5C !important;
    }
    body.dark-mode input::placeholder { color: #6A7590 !important; }
    /* Sidebar */
    body.dark-mode nav, body.dark-mode aside { background: #0A0F1C !important; }
    /* Hover states */
    body.dark-mode [style*="background:#FAFAF7"]:hover { background: #1F2E4E !important; }

    /* Dark mode toggle button — top-left of content area */
    #dark-mode-toggle {
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 9997;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 1.5px solid #D4B266;
      background: #0E1A2E;
      color: #D4B266;
      cursor: pointer;
      font-size: 16px;
      box-shadow: 0 4px 16px rgba(14,26,46,0.25);
      transition: transform 0.15s, box-shadow 0.15s, background 0.2s, color 0.2s;
    }
    #dark-mode-toggle:hover {
      transform: scale(1.08) rotate(15deg);
      box-shadow: 0 6px 24px rgba(212,178,102,0.4);
    }
    body.dark-mode #dark-mode-toggle {
      background: #F0C878;
      color: #0A0F1C;
      border-color: #F0C878;
      box-shadow: 0 4px 20px rgba(240,200,120,0.4);
    }
  `;
  document.head.appendChild(style);
}

function addDarkModeToggle() {
  if (document.getElementById('dark-mode-toggle')) return;
  const btn = document.createElement('button');
  btn.id = 'dark-mode-toggle';
  btn.title = 'وضع ليلي/نهاري';
  btn.innerHTML = '<i class="ti ti-moon"></i>';
  btn.onclick = () => {
    _darkModeManual = !document.body.classList.contains('dark-mode');
    updateDarkModeUI(_darkModeManual);
  };
  document.body.appendChild(btn);
}

function isNightTime() {
  const h = new Date().getHours();
  // Night: 6 PM to 6 AM (rough approximation; adjusts by season)
  return h >= 18 || h < 6;
}

function applyDarkModeIfNeeded() {
  const shouldBeDark = _darkModeManual !== null ? _darkModeManual : isNightTime();
  updateDarkModeUI(shouldBeDark);
}

function updateDarkModeUI(dark) {
  document.body.classList.toggle('dark-mode', dark);
  const btn = document.getElementById('dark-mode-toggle');
  if (btn) {
    btn.innerHTML = dark ? '<i class="ti ti-sun"></i>' : '<i class="ti ti-moon"></i>';
  }
}

// ═════════════════════════════════════════════
// 2. AVATAR — Colored initials avatar
// ═════════════════════════════════════════════
const AVATAR_PALETTES = [
  ['#0E1A2E', '#D4B266'],
  ['#1C4B8E', '#7BA9E6'],
  ['#2E8B57', '#4ADC8A'],
  ['#8B6914', '#F0C878'],
  ['#7B2CBF', '#C8A8E9'],
  ['#C41818', '#FF8B95'],
  ['#0F766E', '#5EEAD4'],
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getInitials(name) {
  if (!name) return '?';
  const trimmed = String(name).trim();
  // Split by space and take first char of first 2 words
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].charAt(0);
  return words[0].charAt(0) + words[1].charAt(0);
}

export function renderAvatar(name, size = 40) {
  const initials = getInitials(name);
  const palette = AVATAR_PALETTES[hashString(name || 'user') % AVATAR_PALETTES.length];
  const [bg, fg] = palette;
  const fontSize = Math.floor(size * 0.42);

  return `
    <div style="
      width:${size}px; height:${size}px; border-radius:50%;
      background:linear-gradient(135deg, ${bg} 0%, ${bg}dd 100%);
      color:${fg};
      display:inline-flex; align-items:center; justify-content:center;
      font-family:Cairo,Tajawal,sans-serif; font-weight:900; font-size:${fontSize}px;
      box-shadow: inset 0 -2px 4px rgba(0,0,0,0.15), 0 2px 6px rgba(14,26,46,0.15);
      user-select:none; flex-shrink:0;
      position:relative; overflow:hidden;
    ">
      <div style="position:absolute; inset:0; background:radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15), transparent 60%);"></div>
      <span style="position:relative; z-index:1;">${initials}</span>
    </div>
  `;
}

// Auto-replace existing "م" avatar in sidebar
export function replaceProfileAvatar(profile) {
  const name = profile?.name || profile?.email?.split('@')[0] || '';
  // Find existing avatar containers by common patterns
  document.querySelectorAll('[data-avatar-name]').forEach(el => {
    el.innerHTML = renderAvatar(name, parseInt(el.dataset.avatarSize) || 40);
  });
}

// ═════════════════════════════════════════════
// 3. SPLASH SCREEN — On first login of the day
// ═════════════════════════════════════════════
const QUOTES = [
  'كل شحنة رحلة، وكل رحلة قصة نجاح',
  'الإتقان في التفاصيل، والريادة في السرعة',
  'اليوم فرصة جديدة لتقديم الأفضل',
  'من رابغ إلى دبي، الجودة لا تعرف حدوداً',
  'العمل الجيد يُبنى بالثقة، والاستمرار',
];

export async function showSplashScreen(logoDataUri, statsFetcher) {
  // Fallback to embedded logo
  if (!logoDataUri) logoDataUri = SDS_LOGO;
  // Always show on login/refresh — no localStorage check
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  // Try to fetch shipment stats if fetcher provided
  let stats = null;
  if (statsFetcher) {
    try {
      stats = await Promise.race([
        statsFetcher(),
        new Promise((_, r) => setTimeout(() => r(new Error('stats timeout')), 6000)),
      ]);
    } catch (e) {
      console.warn('splash stats failed', e);
    }
  }

  const splash = document.createElement('div');
  splash.id = 'sds-splash';
  splash.style.cssText = `
    position:fixed; inset:0; z-index:100000;
    background:linear-gradient(135deg, #0E1A2E 0%, #1C2B48 50%, #0E1A2E 100%);
    display:flex; align-items:center; justify-content:center;
    animation: splashFadeIn 0.4s ease-out;
    font-family: Tajawal, sans-serif;
  `;

  const monthName = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][new Date().getMonth()];

  splash.innerHTML = `
    <style>
      @keyframes splashFadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes splashFadeOut { from { opacity: 1; } to { opacity: 0; } }
      @keyframes splashLogoIn { from { transform: scale(0.7) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
      @keyframes splashTextIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      @keyframes goldGlow { 0%, 100% { box-shadow: 0 0 60px rgba(212,178,102,0.3); } 50% { box-shadow: 0 0 120px rgba(212,178,102,0.6); } }
      @keyframes numberCount { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      @keyframes progressBar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      #sds-splash .logo-wrap { animation: splashLogoIn 0.6s ease-out, goldGlow 2s ease-in-out infinite; }
      #sds-splash .text-a { animation: splashTextIn 0.6s ease-out 0.2s both; }
      #sds-splash .text-b { animation: splashTextIn 0.6s ease-out 0.35s both; }
      #sds-splash .text-c { animation: splashTextIn 0.6s ease-out 0.5s both; }
      #sds-splash .stats-grid { animation: splashTextIn 0.6s ease-out 0.7s both; }
      #sds-splash .stat-number { animation: numberCount 0.6s ease-out 0.9s both; display:inline-block; }
      #sds-splash .progress-bar { animation: progressBar 4.5s linear 0.3s forwards; transform-origin: right; }
    </style>
    <div style="text-align:center; padding: 20px; max-width: 620px;">
      <div class="logo-wrap" style="width:130px; height:130px; margin:0 auto; background:#F5F3EC; border-radius:20px; display:flex; align-items:center; justify-content:center; padding:12px; box-sizing:border-box;">
        ${logoDataUri ? `<img src="${logoDataUri}" alt="SDS" style="width:100%; height:100%; object-fit:contain;">` : `<div style="font-size:64px; color:#D4B266; font-weight:900;">S</div>`}
      </div>
      <div class="text-a" style="font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:3px; color:#D4B266; font-weight:800; margin-top:32px;">
        AL SUDAIS LOGISTICS
      </div>
      <div class="text-b" style="font-size:32px; font-weight:900; color:white; margin-top:8px;">
        السديس اللوجستية
      </div>

      ${stats ? `
        <div class="stats-grid" style="display:grid; grid-template-columns: repeat(3, 1fr); gap:16px; margin-top:32px; padding:16px 20px; background:rgba(212,178,102,0.08); border:1px solid rgba(212,178,102,0.25); border-radius:12px;">
          <div style="text-align:center;">
            <div style="font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:1.5px; color:#D4B266; font-weight:800;">${monthName.toUpperCase()}</div>
            <div class="stat-number" style="font-size:32px; font-weight:900; color:white; font-family:'JetBrains Mono',monospace; margin-top:4px;">${String(stats.thisMonth || 0).padStart(2,'0')}</div>
            <div style="font-size:11px; color:#B8B0A0; margin-top:2px;">شحنة هذا الشهر</div>
          </div>
          <div style="text-align:center; border-inline:1px solid rgba(212,178,102,0.15); padding-inline:12px;">
            <div style="font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:1.5px; color:#D4B266; font-weight:800;">IN PROGRESS</div>
            <div class="stat-number" style="font-size:32px; font-weight:900; color:#7BA9E6; font-family:'JetBrains Mono',monospace; margin-top:4px;">${String(stats.inProgress || 0).padStart(2,'0')}</div>
            <div style="font-size:11px; color:#B8B0A0; margin-top:2px;">قيد المعالجة</div>
          </div>
          <div style="text-align:center;">
            <div style="font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:1.5px; color:#D4B266; font-weight:800;">TOTAL</div>
            <div class="stat-number" style="font-size:32px; font-weight:900; color:#4ADC8A; font-family:'JetBrains Mono',monospace; margin-top:4px;">${String(stats.total || 0).padStart(2,'0')}</div>
            <div style="font-size:11px; color:#B8B0A0; margin-top:2px;">إجمالي الشحنات</div>
          </div>
        </div>
      ` : ''}

      <div class="text-c" style="max-width:500px; margin:${stats ? '24px' : '32px'} auto 0; padding:16px 24px; border-top:1px solid rgba(212,178,102,0.3); border-bottom:1px solid rgba(212,178,102,0.3); color:#F5F0E4; font-size:15px; line-height:1.7; font-family:'Cairo',sans-serif;">
        "${quote}"
      </div>

      <div style="width:200px; height:2px; background:rgba(212,178,102,0.15); margin:32px auto 0; border-radius:2px; overflow:hidden;">
        <div class="progress-bar" style="height:100%; background:#D4B266; width:100%;"></div>
      </div>
      <div style="font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:2px; color:#8A8578; margin-top:8px;">
        LOADING · جاهز خلال لحظات
      </div>
    </div>
  `;

  document.body.appendChild(splash);

  setTimeout(() => {
    splash.style.animation = 'splashFadeOut 0.5s ease-in';
    setTimeout(() => splash.remove(), 500);
  }, 5000);
}

// ═════════════════════════════════════════════
// 4. SOUND — Subtle audio feedback via Web Audio API
// ═════════════════════════════════════════════
let _audioCtx = null;
let _soundEnabled = localStorage.getItem('sound_enabled') !== 'false';

function getAudioCtx() {
  if (!_audioCtx) {
    try {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return null; }
  }
  return _audioCtx;
}

function playTone(frequency, duration = 0.15, type = 'sine', volume = 0.1) {
  if (!_soundEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

export function playSound(type) {
  if (!_soundEnabled) return;
  switch (type) {
    case 'success':
      // Pleasant ascending — C6 → E6
      playTone(1046.5, 0.08, 'sine', 0.08);
      setTimeout(() => playTone(1318.5, 0.14, 'sine', 0.09), 60);
      break;
    case 'error':
      // Low descending — A3 → E3
      playTone(220, 0.12, 'sine', 0.09);
      setTimeout(() => playTone(164.8, 0.18, 'sine', 0.09), 100);
      break;
    case 'notification':
      // Single soft ping — G5
      playTone(783.99, 0.2, 'sine', 0.08);
      break;
    case 'click':
      playTone(500, 0.03, 'sine', 0.05);
      break;
    case 'celebration':
      // Ascending arpeggio
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        setTimeout(() => playTone(f, 0.12, 'triangle', 0.1), i * 90);
      });
      break;
  }
}

export function toggleSound() {
  _soundEnabled = !_soundEnabled;
  localStorage.setItem('sound_enabled', _soundEnabled);
  return _soundEnabled;
}

// Auto-hook: play success sound when toast type is success
export function hookToastSounds(originalToast) {
  return function(msg, type = 'success', opts = {}) {
    // Play sound based on type
    if (type === 'success') playSound('success');
    else if (type === 'error') playSound('error');
    return originalToast(msg, type, opts);
  };
}

// ═════════════════════════════════════════════
// 5. CONFETTI & MILESTONES
// ═════════════════════════════════════════════
const MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

export function celebrate(reason = '') {
  playSound('celebration');
  fireConfetti();
  if (reason) {
    setTimeout(() => {
      const box = document.createElement('div');
      box.style.cssText = `
        position:fixed; top:80px; left:50%; transform:translateX(-50%);
        background:linear-gradient(135deg,#0E1A2E 0%,#1C2B48 100%);
        color:white; padding:20px 32px; border-radius:12px;
        z-index:99998; font-family:Tajawal,sans-serif;
        box-shadow: 0 12px 40px rgba(14,26,46,0.4);
        border: 2px solid #D4B266;
        animation: celebrateIn 0.5s cubic-bezier(0.17, 0.89, 0.32, 1.28);
        text-align:center;
      `;
      box.innerHTML = `
        <style>
          @keyframes celebrateIn { from { transform: translateX(-50%) translateY(-40px) scale(0.9); opacity: 0; } to { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; } }
          @keyframes celebrateOut { to { transform: translateX(-50%) translateY(-40px); opacity: 0; } }
        </style>
        <div style="font-size:36px; margin-bottom:8px;">🎉</div>
        <div style="font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:2px; color:#D4B266; font-weight:800;">MILESTONE UNLOCKED</div>
        <div style="font-size:18px; font-weight:900; margin-top:6px;">${reason}</div>
      `;
      document.body.appendChild(box);
      setTimeout(() => {
        box.style.animation = 'celebrateOut 0.4s ease-in forwards';
        setTimeout(() => box.remove(), 400);
      }, 4000);
    }, 200);
  }
}

function fireConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed; inset:0; pointer-events:none; z-index:99999;';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const colors = ['#D4B266', '#F0C878', '#0E1A2E', '#2E8B57', '#4ADC8A', '#E8B850'];
  const particles = [];
  const N = 120;

  for (let i = 0; i < N; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12 - 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 4 + Math.random() * 6,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      life: 1.0,
    });
  }

  const gravity = 0.25;
  const drag = 0.995;

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;
    particles.forEach(p => {
      if (p.life <= 0) return;
      alive++;
      p.vx *= drag;
      p.vy = p.vy * drag + gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.life -= 0.008;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    });
    if (alive > 0) requestAnimationFrame(animate);
    else canvas.remove();
  }
  animate();
}

// Check if a new milestone was crossed
export function checkMilestone(counterKey, currentCount, label = 'شحنة') {
  const lastMilestone = parseInt(localStorage.getItem(`milestone_${counterKey}`) || '0');
  const newMilestone = MILESTONES.find(m => m > lastMilestone && m <= currentCount);
  if (newMilestone) {
    localStorage.setItem(`milestone_${counterKey}`, String(newMilestone));
    celebrate(`أحسنت! ${newMilestone} ${label} 🎯`);
    return newMilestone;
  }
  return null;
}
