import { getCurrentProfile } from '../app.js';
import { update2048Score, getUserStats } from '../../../src/firebase/activitiesDb.js';

let _profile, _board, _score, _best, _gameOver, _keyHandler;

export async function render2048(container) {
  _profile = getCurrentProfile();
  if (!_profile) {
    container.innerHTML = `<div style="padding:40px;text-align:center;">يجب تسجيل الدخول</div>`;
    return;
  }

  const stats = await getUserStats(_profile.id || _profile.uid);
  _best = stats.g2048_best || 0;

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
              <span class="modern-header-code">SDS/GAME/2048</span>
            </div>
            <div class="modern-header-title">🎯 لعبة 2048</div>
            <div class="modern-header-sub">2048 · MERGE TILES · USE ARROWS</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" onclick="navigate('game-2048')">
              <i class="ti ti-refresh"></i> لعبة جديدة
            </button>
            <button class="modern-btn" onclick="navigate('activities')">
              <i class="ti ti-arrow-right"></i> رجوع
            </button>
          </div>
        </div>

        <div class="modern-stats modern-stats-3">
          <div class="modern-stat">
            <div class="modern-stat-lbl">01 · SCORE</div>
            <div class="modern-stat-val" id="g2048-score">00</div>
            <div class="modern-stat-hint">النقاط الحالية</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">02 · BEST</div>
            <div class="modern-stat-val blue" id="g2048-best">${String(_best).padStart(2,'0')}</div>
            <div class="modern-stat-hint">أفضل نتيجة لك</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">03 · HIGH TILE</div>
            <div class="modern-stat-val green" id="g2048-tile">02</div>
            <div class="modern-stat-hint">أعلى بلاطة</div>
          </div>
        </div>

        <div style="padding:24px;display:flex;justify-content:center;">
          <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:12px;">
            <div id="g2048-board" style="display:grid;grid-template-columns:repeat(4,90px);grid-template-rows:repeat(4,90px);gap:8px;background:#F0EDE4;padding:8px;border-radius:6px;"></div>
            <div style="text-align:center;margin-top:12px;font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;letter-spacing:1px;">
              ↑ ↓ ← → OR SWIPE
            </div>
          </div>
        </div>

        <div id="g2048-over" style="display:none;padding:0 24px 24px;">
          <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:24px;text-align:center;">
            <div style="font-size:48px;">💀</div>
            <div style="font-size:22px;color:#0E1A2E;font-weight:800;margin-top:8px;">GAME OVER</div>
            <div id="g2048-over-msg" style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#6B6659;margin-top:8px;letter-spacing:.5px;"></div>
            <div style="margin-top:16px;display:flex;gap:8px;justify-content:center;">
              <button class="modern-btn modern-btn-primary" onclick="navigate('game-2048')">🔄 لعبة جديدة</button>
              <button class="modern-btn" onclick="navigate('activities')">رجوع</button>
            </div>
          </div>
        </div>

      </div>
    </div>`;

  render();

  _keyHandler = handleKey;
  window.addEventListener('keydown', _keyHandler);

  // touch swipe
  let sx = 0, sy = 0;
  const boardEl = document.getElementById('g2048-board');
  boardEl.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  boardEl.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > Math.abs(dy)) {
      move(dx > 0 ? 'right' : 'left');
    } else {
      move(dy > 0 ? 'down' : 'up');
    }
  }, { passive: true });

  // cleanup on navigate
  const obs = new MutationObserver(() => {
    if (!document.getElementById('g2048-board')) {
      if (_keyHandler) window.removeEventListener('keydown', _keyHandler);
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

function initGame() {
  _board = Array(16).fill(0);
  _score = 0;
  _gameOver = false;
  addRandomTile();
  addRandomTile();
}

function addRandomTile() {
  const empty = [];
  for (let i = 0; i < 16; i++) if (_board[i] === 0) empty.push(i);
  if (empty.length === 0) return;
  const idx = empty[Math.floor(Math.random() * empty.length)];
  _board[idx] = Math.random() < 0.9 ? 2 : 4;
}

const TILE_COLORS = {
  2: { bg: '#EEE4DA', fg: '#0E1A2E' },
  4: { bg: '#EDE0C8', fg: '#0E1A2E' },
  8: { bg: '#F2B179', fg: 'white' },
  16: { bg: '#F59563', fg: 'white' },
  32: { bg: '#F67C5F', fg: 'white' },
  64: { bg: '#F65E3B', fg: 'white' },
  128: { bg: '#EDCF72', fg: 'white' },
  256: { bg: '#EDCC61', fg: 'white' },
  512: { bg: '#EDC850', fg: 'white' },
  1024: { bg: '#EDC53F', fg: 'white' },
  2048: { bg: '#EDC22E', fg: 'white' },
};

function render() {
  const board = document.getElementById('g2048-board');
  if (!board) return;
  board.innerHTML = _board.map(v => {
    const c = TILE_COLORS[v] || { bg: '#3C3A32', fg: 'white' };
    const size = v >= 1024 ? '20px' : v >= 128 ? '26px' : '30px';
    return `<div style="background:${v === 0 ? '#D6CDBF' : c.bg};color:${c.fg};border-radius:4px;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-weight:800;font-size:${size};">${v || ''}</div>`;
  }).join('');

  document.getElementById('g2048-score').textContent = String(_score).padStart(2, '0');
  const high = Math.max(..._board);
  document.getElementById('g2048-tile').textContent = String(high).padStart(2, '0');
}

function handleKey(e) {
  const k = e.key;
  if (k === 'ArrowUp' || k === 'w') { move('up'); e.preventDefault(); }
  else if (k === 'ArrowDown' || k === 's') { move('down'); e.preventDefault(); }
  else if (k === 'ArrowLeft' || k === 'a') { move('left'); e.preventDefault(); }
  else if (k === 'ArrowRight' || k === 'd') { move('right'); e.preventDefault(); }
}

function move(dir) {
  if (_gameOver) return;
  const prev = JSON.stringify(_board);
  const rows = [[0,1,2,3],[4,5,6,7],[8,9,10,11],[12,13,14,15]];

  const getLine = (i, d) => {
    if (d === 'left') return rows[i];
    if (d === 'right') return [...rows[i]].reverse();
    if (d === 'up') return [i, i+4, i+8, i+12];
    if (d === 'down') return [i+12, i+8, i+4, i];
  };

  const range = (dir === 'up' || dir === 'down') ? [0,1,2,3] : [0,1,2,3];
  for (const i of range) {
    const idxs = getLine(i, dir);
    const line = idxs.map(idx => _board[idx]).filter(v => v);
    for (let j = 0; j < line.length - 1; j++) {
      if (line[j] === line[j+1]) {
        line[j] *= 2;
        _score += line[j];
        line.splice(j+1, 1);
      }
    }
    while (line.length < 4) line.push(0);
    idxs.forEach((idx, k) => { _board[idx] = line[k]; });
  }

  if (JSON.stringify(_board) !== prev) {
    addRandomTile();
    render();
    if (!canMove()) endGame();
  }
}

function canMove() {
  for (let i = 0; i < 16; i++) if (_board[i] === 0) return true;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const v = _board[r*4+c];
    if (c < 3 && _board[r*4+c+1] === v) return true;
    if (r < 3 && _board[(r+1)*4+c] === v) return true;
  }
  return false;
}

async function endGame() {
  _gameOver = true;
  const high = Math.max(..._board);
  document.getElementById('g2048-over').style.display = 'block';
  document.getElementById('g2048-over-msg').textContent =
    `SCORE: ${_score} · HIGH TILE: ${high} · +${Math.floor(_score/10)} POINTS`;

  if (_score > 0) {
    try {
      await update2048Score(
        _profile.id || _profile.uid,
        _profile.name || _profile.email || 'موظف',
        _score, high
      );
    } catch (e) { console.error('save 2048 error:', e); }
  }
}
