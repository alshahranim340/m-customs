import { getCurrentProfile } from '../app.js';
import { updateFroggerScore, getUserStats } from '../../../src/firebase/activitiesDb.js';

const COLS = 13;
const ROWS = 13;
const CELL = 40;
const GAME_W = COLS * CELL;
const GAME_H = ROWS * CELL;

// Lanes (row -> lane config)
// row 0 = goal (top)
// rows 1-6 = river/log section
// row 7 = median
// rows 8-12 = road
const LANES = {
  1: { type: 'log', speed: 1.5, dir: 1, size: 3, gap: 3 },
  2: { type: 'log', speed: -2, dir: -1, size: 2, gap: 3 },
  3: { type: 'log', speed: 1, dir: 1, size: 4, gap: 4 },
  4: { type: 'log', speed: -1.5, dir: -1, size: 2, gap: 3 },
  5: { type: 'log', speed: 2, dir: 1, size: 3, gap: 3 },
  6: { type: 'water', speed: 0, dir: 0 },
  8: { type: 'car', speed: -2, dir: -1, size: 1, gap: 4, color: '#CC2229' },
  9: { type: 'car', speed: 1.5, dir: 1, size: 2, gap: 5, color: '#1C4B8E' },
 10: { type: 'car', speed: -2.5, dir: -1, size: 1, gap: 3, color: '#C2410C' },
 11: { type: 'car', speed: 1, dir: 1, size: 1, gap: 4, color: '#2E8B57' },
 12: { type: 'car', speed: -1.5, dir: -1, size: 2, gap: 4, color: '#8A7A6B' },
};

let _profile, _canvas, _ctx, _frogX, _frogY, _score, _lives, _running, _loopId, _entities, _startTime, _onLog, _best;

export async function renderFrogger(container) {
  _profile = getCurrentProfile();
  if (!_profile) {
    container.innerHTML = `<div style="padding:40px;text-align:center;">يجب تسجيل الدخول</div>`;
    return;
  }

  const stats = await getUserStats(_profile.id || _profile.uid);
  _best = stats.frogger_best || 0;
  initGame();

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
              <span class="modern-header-code">SDS/GAME/FROGGER</span>
            </div>
            <div class="modern-header-title">🐸 لعبة الضفدع</div>
            <div class="modern-header-sub">FROGGER · CROSS THE ROAD & RIVER</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" onclick="navigate('game-frogger')">
              <i class="ti ti-refresh"></i> إعادة
            </button>
            <button class="modern-btn" onclick="navigate('activities')">
              <i class="ti ti-arrow-right"></i> رجوع
            </button>
          </div>
        </div>

        <div class="modern-stats modern-stats-4">
          <div class="modern-stat">
            <div class="modern-stat-lbl">01 · SCORE</div>
            <div class="modern-stat-val" id="fr-score">00</div>
            <div class="modern-stat-hint">النقاط الحالية</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">02 · LIVES</div>
            <div class="modern-stat-val danger" id="fr-lives">03</div>
            <div class="modern-stat-hint">أرواح متبقية</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">03 · BEST</div>
            <div class="modern-stat-val blue" id="fr-best">${String(_best).padStart(2,'0')}</div>
            <div class="modern-stat-hint">أفضل نتيجة</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">04 · STATUS</div>
            <div class="modern-stat-val amber" id="fr-status" style="font-size:18px;">READY</div>
            <div class="modern-stat-hint">اضغط SPACE للبدء</div>
          </div>
        </div>

        <div style="padding:20px 24px;display:flex;justify-content:center;">
          <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:16px;">
            <canvas id="fr-canvas" width="${GAME_W}" height="${GAME_H}" style="background:#0E1A2E;border-radius:4px;display:block;"></canvas>
            <div style="text-align:center;margin-top:12px;font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;letter-spacing:1px;">
              ↑ ↓ ← → OR WASD · SPACE = START · REACH THE TOP 🏁
            </div>
          </div>
        </div>

        <div id="fr-over" style="display:none;padding:0 24px 24px;">
          <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:24px;text-align:center;">
            <div style="font-size:48px;">🐸</div>
            <div style="font-size:22px;color:#0E1A2E;font-weight:800;margin-top:8px;">GAME OVER</div>
            <div id="fr-over-msg" style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#6B6659;margin-top:8px;letter-spacing:.5px;"></div>
            <div style="margin-top:16px;display:flex;gap:8px;justify-content:center;">
              <button class="modern-btn modern-btn-primary" onclick="navigate('game-frogger')">🔄 لعبة جديدة</button>
              <button class="modern-btn" onclick="navigate('activities')">رجوع</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  _canvas = document.getElementById('fr-canvas');
  _ctx = _canvas.getContext('2d');
  draw();

  window._frKeyHandler = handleKey;
  window.addEventListener('keydown', window._frKeyHandler);

  // Cleanup on navigate
  const obs = new MutationObserver(() => {
    if (!document.getElementById('fr-canvas')) {
      cleanup();
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

function cleanup() {
  if (_loopId) { clearInterval(_loopId); _loopId = null; }
  if (window._frKeyHandler) {
    window.removeEventListener('keydown', window._frKeyHandler);
    window._frKeyHandler = null;
  }
}

function initGame() {
  _frogX = Math.floor(COLS / 2);
  _frogY = ROWS - 1;
  _score = 0;
  _lives = 3;
  _running = false;
  _onLog = null;
  _entities = [];

  // Spawn initial entities per lane
  for (const [row, config] of Object.entries(LANES)) {
    if (config.type === 'water') continue;
    const r = parseInt(row);
    const spacing = config.size + config.gap;
    let x = 0;
    while (x < COLS + 3) {
      _entities.push({ row: r, x: x, size: config.size, dir: config.dir, speed: config.speed, type: config.type, color: config.color });
      x += spacing;
    }
  }
}

function handleKey(e) {
  const k = e.key.toLowerCase();
  if (k === ' ' || k === 'spacebar') {
    e.preventDefault();
    if (!_running) startGame();
    return;
  }
  if (!_running) return;

  if (k === 'arrowup' || k === 'w') { moveFrog(0, -1); e.preventDefault(); }
  else if (k === 'arrowdown' || k === 's') { moveFrog(0, 1); e.preventDefault(); }
  else if (k === 'arrowleft' || k === 'a') { moveFrog(-1, 0); e.preventDefault(); }
  else if (k === 'arrowright' || k === 'd') { moveFrog(1, 0); e.preventDefault(); }
}

function moveFrog(dx, dy) {
  const newX = _frogX + dx;
  const newY = _frogY + dy;
  if (newX < 0 || newX >= COLS) return;
  if (newY < 0 || newY >= ROWS) return;
  _frogX = newX;
  _frogY = newY;
  _onLog = null; // will re-check

  if (dy < 0) {
    _score += 1;
    updateStats();
  }

  // Reached top - win
  if (_frogY === 0) {
    _score += 20;
    updateStats();
    document.getElementById('fr-status').textContent = 'GOAL! 🏁';
    setTimeout(() => {
      _frogX = Math.floor(COLS / 2);
      _frogY = ROWS - 1;
      _onLog = null;
    }, 500);
  }
}

function startGame() {
  if (_running) return;
  _running = true;
  document.getElementById('fr-status').textContent = 'LIVE';
  document.getElementById('fr-status').style.color = '#2E8B57';
  _startTime = Date.now();
  _loopId = setInterval(tick, 50);
}

function tick() {
  // Move entities
  _entities.forEach(e => {
    e.x += e.dir * 0.05 * Math.abs(e.speed);
    // wrap
    if (e.dir > 0 && e.x > COLS + 1) e.x = -e.size - 1;
    if (e.dir < 0 && e.x < -e.size - 1) e.x = COLS + 1;
  });

  // Check frog
  const frogRow = _frogY;
  const laneConfig = LANES[frogRow];

  if (laneConfig) {
    if (laneConfig.type === 'log' || laneConfig.type === 'water') {
      // Must be on a log
      let onLog = null;
      _entities.forEach(e => {
        if (e.row === frogRow && e.type === 'log') {
          if (_frogX >= e.x && _frogX < e.x + e.size) {
            onLog = e;
          }
        }
      });
      if (!onLog && laneConfig.type !== 'water') {
        // No log = drown
        die('🌊 غرقت!');
        return;
      } else if (!onLog && laneConfig.type === 'water') {
        die('🌊 غرقت!');
        return;
      } else {
        _onLog = onLog;
        // move frog with log
        _frogX += onLog.dir * 0.05 * Math.abs(onLog.speed);
        if (_frogX < 0 || _frogX >= COLS) {
          die('🌊 سقطت خارج الشاشة!');
          return;
        }
      }
    } else if (laneConfig.type === 'car') {
      // Check car collision
      let hit = false;
      _entities.forEach(e => {
        if (e.row === frogRow && e.type === 'car') {
          if (_frogX >= e.x - 0.3 && _frogX < e.x + e.size + 0.3) {
            hit = true;
          }
        }
      });
      if (hit) {
        die('🚗 صدمتك سيارة!');
        return;
      }
    }
  }

  draw();
}

function die(reason) {
  _lives--;
  updateStats();
  document.getElementById('fr-status').textContent = reason;
  document.getElementById('fr-status').style.color = '#CC2229';
  if (_lives <= 0) {
    endGame();
  } else {
    _frogX = Math.floor(COLS / 2);
    _frogY = ROWS - 1;
    _onLog = null;
    setTimeout(() => {
      if (_running) {
        document.getElementById('fr-status').textContent = 'LIVE';
        document.getElementById('fr-status').style.color = '#2E8B57';
      }
    }, 1000);
  }
}

async function endGame() {
  _running = false;
  clearInterval(_loopId);
  _loopId = null;
  document.getElementById('fr-status').textContent = 'GAME OVER';
  document.getElementById('fr-over').style.display = 'block';
  document.getElementById('fr-over-msg').textContent = `SCORE: ${_score} · +${_score * 5} POINTS`;

  if (_score > 0) {
    try {
      await updateFroggerScore(_profile.id || _profile.uid, _profile.name || _profile.email || 'موظف', _score);
    } catch (e) { console.error('frogger save error:', e); }
  }
}

function updateStats() {
  document.getElementById('fr-score').textContent = String(_score).padStart(2, '0');
  document.getElementById('fr-lives').textContent = String(_lives).padStart(2, '0');
}

function draw() {
  if (!_ctx) return;
  _ctx.fillStyle = '#0E1A2E';
  _ctx.fillRect(0, 0, GAME_W, GAME_H);

  // Draw lanes background
  for (let r = 0; r < ROWS; r++) {
    const config = LANES[r];
    let bg = '#0E1A2E';
    if (r === 0) bg = '#2E8B57'; // goal
    else if (r === 7) bg = '#C2410C'; // median
    else if (config?.type === 'log' || config?.type === 'water') bg = '#1C4B8E'; // river
    else if (config?.type === 'car') bg = '#3C3A32'; // road
    _ctx.fillStyle = bg;
    _ctx.fillRect(0, r * CELL, GAME_W, CELL);
  }

  // Draw entities
  _entities.forEach(e => {
    const px = e.x * CELL;
    const py = e.row * CELL;
    if (e.type === 'log') {
      _ctx.fillStyle = '#8A7A6B';
      _ctx.fillRect(px + 2, py + 6, e.size * CELL - 4, CELL - 12);
      // wood texture
      _ctx.strokeStyle = '#6B5A4B';
      _ctx.lineWidth = 2;
      for (let i = 0; i < e.size; i++) {
        _ctx.beginPath();
        _ctx.moveTo(px + i * CELL, py + 6);
        _ctx.lineTo(px + i * CELL, py + CELL - 6);
        _ctx.stroke();
      }
    } else if (e.type === 'car') {
      _ctx.fillStyle = e.color || '#CC2229';
      _ctx.fillRect(px + 4, py + 6, e.size * CELL - 8, CELL - 12);
      // wheels
      _ctx.fillStyle = '#000';
      _ctx.fillRect(px + 6, py + 4, 6, 4);
      _ctx.fillRect(px + e.size * CELL - 12, py + 4, 6, 4);
      _ctx.fillRect(px + 6, py + CELL - 8, 6, 4);
      _ctx.fillRect(px + e.size * CELL - 12, py + CELL - 8, 6, 4);
    }
  });

  // Draw frog
  const fx = _frogX * CELL + CELL / 2;
  const fy = _frogY * CELL + CELL / 2;
  _ctx.font = '32px sans-serif';
  _ctx.textAlign = 'center';
  _ctx.textBaseline = 'middle';
  _ctx.fillText('🐸', fx, fy);
}
