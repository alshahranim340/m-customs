import { getCurrentProfile } from '../app.js';
import { updateSnakeScore, getUserStats } from '../../../src/firebase/activitiesDb.js';

const GRID = 20;
const CELL = 20;
const SPEED_MS = 120;

let _canvas, _ctx, _snake, _dir, _nextDir, _food, _score, _running, _loopId, _best;
let _profile;

export async function renderSnake(container) {
  _profile = getCurrentProfile();
  if (!_profile) {
    container.innerHTML = `<div style="padding:40px;text-align:center;">يجب تسجيل الدخول</div>`;
    return;
  }

  const stats = await getUserStats(_profile.uid || _profile.id);
  _best = stats.snake_best || 0;

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
              <span class="modern-header-code">SDS/GAME/SNAKE</span>
            </div>
            <div class="modern-header-title">🐍 لعبة الثعبان</div>
            <div class="modern-header-sub">SNAKE · SINGLE PLAYER · USE ARROW KEYS</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" onclick="navigate('activities')">
              <i class="ti ti-arrow-right"></i> رجوع
            </button>
          </div>
        </div>

        <div class="modern-stats modern-stats-3">
          <div class="modern-stat">
            <div class="modern-stat-lbl">01 · SCORE</div>
            <div class="modern-stat-val" id="snake-score">00</div>
            <div class="modern-stat-hint">النقاط الحالية</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">02 · BEST</div>
            <div class="modern-stat-val blue" id="snake-best-val">${String(_best).padStart(2,'0')}</div>
            <div class="modern-stat-hint">أفضل نتيجة لك</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">03 · STATUS</div>
            <div class="modern-stat-val amber" id="snake-status" style="font-size:22px;">READY</div>
            <div class="modern-stat-hint">اضغط SPACE للبدء</div>
          </div>
        </div>

        <div style="padding:20px 24px;display:flex;justify-content:center;">
          <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:20px;">
            <canvas id="snake-canvas" width="${GRID * CELL}" height="${GRID * CELL}"
              style="background:#FAFAF7;border:1px solid #E8E5DC;border-radius:4px;display:block;"></canvas>
            <div style="display:flex;justify-content:center;gap:8px;margin-top:14px;">
              <button class="modern-btn modern-btn-primary" id="btn-start-snake">
                ▶ ابدأ
              </button>
              <button class="modern-btn" id="btn-pause-snake" style="display:none;">
                ⏸ إيقاف مؤقت
              </button>
            </div>
            <div style="text-align:center;margin-top:12px;font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;letter-spacing:1px;">
              ↑ ↓ ← → OR WASD · SPACE = START/PAUSE
            </div>
          </div>
        </div>

      </div>
    </div>`;

  _canvas = document.getElementById('snake-canvas');
  _ctx = _canvas.getContext('2d');
  resetGame();
  drawFrame();

  document.getElementById('btn-start-snake').onclick = () => startGame();
  document.getElementById('btn-pause-snake').onclick = () => togglePause();

  window._snakeKeyHandler = handleKey;
  window.addEventListener('keydown', handleKey);

  // Cleanup when navigating away
  const observer = new MutationObserver(() => {
    if (!document.getElementById('snake-canvas')) {
      cleanup();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function cleanup() {
  if (_loopId) { clearInterval(_loopId); _loopId = null; }
  if (window._snakeKeyHandler) {
    window.removeEventListener('keydown', window._snakeKeyHandler);
    window._snakeKeyHandler = null;
  }
}

function resetGame() {
  const mid = Math.floor(GRID / 2);
  _snake = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }];
  _dir = { x: 1, y: 0 };
  _nextDir = { x: 1, y: 0 };
  _score = 0;
  _running = false;
  spawnFood();
  updateScore();
}

function spawnFood() {
  while (true) {
    const x = Math.floor(Math.random() * GRID);
    const y = Math.floor(Math.random() * GRID);
    if (!_snake.some(s => s.x === x && s.y === y)) {
      _food = { x, y };
      return;
    }
  }
}

function startGame() {
  if (_running) return;
  if (!_snake) resetGame();
  _running = true;
  document.getElementById('btn-start-snake').style.display = 'none';
  document.getElementById('btn-pause-snake').style.display = 'inline-flex';
  document.getElementById('snake-status').textContent = 'LIVE';
  document.getElementById('snake-status').style.color = '#2E8B57';
  _loopId = setInterval(tick, SPEED_MS);
}

function togglePause() {
  if (_running) {
    clearInterval(_loopId);
    _running = false;
    document.getElementById('snake-status').textContent = 'PAUSED';
    document.getElementById('snake-status').style.color = '#C2410C';
    document.getElementById('btn-pause-snake').textContent = '▶ استكمال';
  } else {
    _running = true;
    _loopId = setInterval(tick, SPEED_MS);
    document.getElementById('snake-status').textContent = 'LIVE';
    document.getElementById('snake-status').style.color = '#2E8B57';
    document.getElementById('btn-pause-snake').textContent = '⏸ إيقاف مؤقت';
  }
}

async function gameOver() {
  clearInterval(_loopId);
  _running = false;
  document.getElementById('snake-status').textContent = 'GAME OVER';
  document.getElementById('snake-status').style.color = '#CC2229';
  document.getElementById('btn-pause-snake').style.display = 'none';
  document.getElementById('btn-start-snake').style.display = 'inline-flex';
  document.getElementById('btn-start-snake').textContent = '🔄 لعبة جديدة';

  if (_score > 0) {
    try {
      await updateSnakeScore(
        _profile.uid || _profile.id,
        _profile.name || _profile.email || 'موظف',
        _score
      );
      if (_score > _best) {
        _best = _score;
        document.getElementById('snake-best-val').textContent = String(_best).padStart(2, '0');
      }
    } catch (e) { console.error('save score error:', e); }
  }

  setTimeout(() => {
    resetGame();
    drawFrame();
  }, 1500);
}

function tick() {
  _dir = _nextDir;
  const head = { x: _snake[0].x + _dir.x, y: _snake[0].y + _dir.y };

  // wall collision
  if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
    gameOver();
    drawFrame();
    return;
  }
  // self collision
  if (_snake.some(s => s.x === head.x && s.y === head.y)) {
    gameOver();
    drawFrame();
    return;
  }

  _snake.unshift(head);

  if (head.x === _food.x && head.y === _food.y) {
    _score++;
    updateScore();
    spawnFood();
  } else {
    _snake.pop();
  }

  drawFrame();
}

function updateScore() {
  document.getElementById('snake-score').textContent = String(_score).padStart(2, '0');
}

function drawFrame() {
  if (!_ctx) return;
  _ctx.fillStyle = '#FAFAF7';
  _ctx.fillRect(0, 0, GRID * CELL, GRID * CELL);

  // grid pattern
  _ctx.strokeStyle = '#F0EDE4';
  _ctx.lineWidth = 1;
  for (let i = 1; i < GRID; i++) {
    _ctx.beginPath();
    _ctx.moveTo(i * CELL, 0);
    _ctx.lineTo(i * CELL, GRID * CELL);
    _ctx.stroke();
    _ctx.beginPath();
    _ctx.moveTo(0, i * CELL);
    _ctx.lineTo(GRID * CELL, i * CELL);
    _ctx.stroke();
  }

  // snake
  _snake.forEach((s, i) => {
    _ctx.fillStyle = i === 0 ? '#0E1A2E' : '#1C4B8E';
    _ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
  });

  // food
  _ctx.fillStyle = '#CC2229';
  _ctx.beginPath();
  _ctx.arc(_food.x * CELL + CELL / 2, _food.y * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2);
  _ctx.fill();
}

function handleKey(e) {
  const key = e.key.toLowerCase();
  if (key === ' ' || key === 'spacebar') {
    e.preventDefault();
    if (!_running) startGame();
    else togglePause();
    return;
  }

  let nd = null;
  if (key === 'arrowup' || key === 'w') nd = { x: 0, y: -1 };
  else if (key === 'arrowdown' || key === 's') nd = { x: 0, y: 1 };
  else if (key === 'arrowleft' || key === 'a') nd = { x: -1, y: 0 };
  else if (key === 'arrowright' || key === 'd') nd = { x: 1, y: 0 };

  if (nd && (nd.x !== -_dir.x || nd.y !== -_dir.y)) {
    _nextDir = nd;
    e.preventDefault();
  }
}
