import { getCurrentProfile } from '../app.js';
import { updateAimScore, getUserStats } from '../../../src/firebase/activitiesDb.js';

const DURATION = 30; // seconds
let _profile, _hits, _misses, _timer, _timeLeft, _running, _best;

export async function renderAim(container) {
  _profile = getCurrentProfile();
  if (!_profile) {
    container.innerHTML = `<div style="padding:40px;text-align:center;">يجب تسجيل الدخول</div>`;
    return;
  }

  const stats = await getUserStats(_profile.id || _profile.uid);
  _best = stats.aim_best || 0;
  _hits = 0; _misses = 0; _timeLeft = DURATION; _running = false;

  container.innerHTML = `
    <div class="page-body" style="padding:20px 24px;background:#F5F3EC;">
      <div class="modern-page">
        <div class="modern-header">
          <div class="modern-header-brand">
            <div class="modern-header-badges">
              <div class="modern-header-dots">
                <span class="modern-header-dot" style="background:#CC2229;"></span>
                <span class="modern-header-dot" style="background:#1C4B8E;"></span>
                <span class="modern-header-dot" style="background:#2E8B57;"></span>
              </div>
              <span class="modern-header-code">SDS/GAME/AIM</span>
            </div>
            <div class="modern-header-title">🎯 Aim Trainer</div>
            <div class="modern-header-sub">CLICK TARGETS · 30 SECONDS · SPEED & PRECISION</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" onclick="navigate('activities')">
              <i class="ti ti-arrow-right"></i> رجوع
            </button>
          </div>
        </div>

        <div class="modern-stats modern-stats-4">
          <div class="modern-stat">
            <div class="modern-stat-lbl">01 · HITS</div>
            <div class="modern-stat-val green" id="aim-hits">00</div>
            <div class="modern-stat-hint">إصابات</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">02 · MISSES</div>
            <div class="modern-stat-val danger" id="aim-misses">00</div>
            <div class="modern-stat-hint">إخفاقات</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">03 · TIME</div>
            <div class="modern-stat-val amber" id="aim-time">${String(DURATION).padStart(2,'0')}</div>
            <div class="modern-stat-hint">الوقت المتبقي</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">04 · BEST</div>
            <div class="modern-stat-val blue" id="aim-best">${String(_best).padStart(2,'0')}</div>
            <div class="modern-stat-hint">أفضل نتيجة</div>
          </div>
        </div>

        <div style="padding:24px;display:flex;justify-content:center;">
          <div style="position:relative;width:600px;height:400px;background:white;border:2px solid #E8E5DC;border-radius:6px;overflow:hidden;" id="aim-area">
            <div id="aim-start" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;">
              <div style="font-size:20px;font-weight:800;color:#0E1A2E;">اضغط "ابدأ" للعب</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#6B6659;letter-spacing:1px;">CLICK THE TARGETS AS FAST AS YOU CAN</div>
              <button class="modern-btn modern-btn-primary" onclick="startAim()">▶ ابدأ</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  window.startAim = startGame;
}

function startGame() {
  _hits = 0; _misses = 0; _timeLeft = DURATION; _running = true;
  document.getElementById('aim-start').style.display = 'none';
  const area = document.getElementById('aim-area');

  // Click miss detection
  area.onclick = (e) => {
    if (!_running) return;
    if (e.target === area) {
      _misses++;
      document.getElementById('aim-misses').textContent = String(_misses).padStart(2, '0');
    }
  };

  spawnTarget();

  _timer = setInterval(() => {
    _timeLeft--;
    document.getElementById('aim-time').textContent = String(_timeLeft).padStart(2, '0');
    if (_timeLeft <= 0) endGame();
  }, 1000);
}

function spawnTarget() {
  if (!_running) return;
  const area = document.getElementById('aim-area');
  if (!area) return;
  const w = area.clientWidth - 60;
  const h = area.clientHeight - 60;
  const x = Math.random() * w;
  const y = Math.random() * h;

  const target = document.createElement('button');
  target.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:44px;height:44px;background:radial-gradient(circle,#CC2229 30%,#0E1A2E 30%,#0E1A2E 60%,white 60%);border:none;border-radius:50%;cursor:crosshair;transition:transform 0.05s;`;
  target.onclick = (e) => {
    e.stopPropagation();
    _hits++;
    document.getElementById('aim-hits').textContent = String(_hits).padStart(2, '0');
    target.remove();
    spawnTarget();
  };
  area.appendChild(target);
}

async function endGame() {
  _running = false;
  clearInterval(_timer);
  const area = document.getElementById('aim-area');
  area.innerHTML = `
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:white;">
      <div style="font-size:56px;">🎯</div>
      <div style="font-size:22px;font-weight:800;color:#0E1A2E;">انتهت اللعبة!</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:14px;color:#6B6659;">HITS: ${_hits} · MISSES: ${_misses}</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#2E8B57;font-weight:700;">+${_hits * 2} POINTS</div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button class="modern-btn modern-btn-primary" onclick="navigate('game-aim')">🔄 إعادة</button>
        <button class="modern-btn" onclick="navigate('activities')">رجوع</button>
      </div>
    </div>`;

  if (_hits > 0) {
    try {
      await updateAimScore(_profile.id || _profile.uid, _profile.name || _profile.email || 'موظف', _hits);
    } catch (e) { console.error('aim save error:', e); }
  }
}
