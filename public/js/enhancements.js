// ══════════════════════════════════════════════════════════════
// ENHANCEMENTS — Dark mode, avatar, splash, sound, confetti
// ══════════════════════════════════════════════════════════════

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
  // Always show on login/refresh — no localStorage check
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  // Try to fetch shipment stats if fetcher provided
  let stats = null;
  if (statsFetcher) {
    try {
      stats = await Promise.race([
        statsFetcher(),
        new Promise((_, r) => setTimeout(() => r(new Error('stats timeout')), 3000)),
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
