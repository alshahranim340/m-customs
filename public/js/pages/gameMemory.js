import { getCurrentProfile } from '../app.js';
import { updateMemoryScore } from '../../../src/firebase/activitiesDb.js';

const EMOJIS = ['🚛','📦','✈️','🚢','🏢','🧾','💰','📋','⚓','🌍','📊','🔑'];

let _profile, _cards, _flipped, _matched, _moves, _startTime, _timerId, _busy;

export async function renderMemory(container) {
  _profile = getCurrentProfile();
  if (!_profile) {
    container.innerHTML = `<div style="padding:40px;text-align:center;">يجب تسجيل الدخول</div>`;
    return;
  }

  initGame(8); // 8 pairs = 16 cards

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
              <span class="modern-header-code">SDS/GAME/MEMORY</span>
            </div>
            <div class="modern-header-title">🎴 ذاكرة البطاقات</div>
            <div class="modern-header-sub">MEMORY · MATCH THE PAIRS · 8 PAIRS</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" onclick="navigate('game-memory')">
              <i class="ti ti-refresh"></i> لعبة جديدة
            </button>
            <button class="modern-btn" onclick="navigate('activities')">
              <i class="ti ti-arrow-right"></i> رجوع
            </button>
          </div>
        </div>

        <div class="modern-stats modern-stats-3">
          <div class="modern-stat">
            <div class="modern-stat-lbl">01 · MOVES</div>
            <div class="modern-stat-val" id="mem-moves">00</div>
            <div class="modern-stat-hint">عدد المحاولات</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">02 · MATCHED</div>
            <div class="modern-stat-val green" id="mem-matched">00 / 08</div>
            <div class="modern-stat-hint">أزواج متطابقة</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">03 · TIME</div>
            <div class="modern-stat-val blue" id="mem-time">00:00</div>
            <div class="modern-stat-hint">الوقت</div>
          </div>
        </div>

        <div style="padding:24px;display:flex;justify-content:center;">
          <div id="mem-board" style="display:grid;grid-template-columns:repeat(4,80px);grid-template-rows:repeat(4,80px);gap:10px;"></div>
        </div>
      </div>
    </div>`;

  renderBoard();
  startTimer();
}

function initGame(pairs) {
  const chosen = EMOJIS.slice(0, pairs);
  _cards = [...chosen, ...chosen]
    .map((emoji, i) => ({ id: i, emoji, matched: false, flipped: false }))
    .sort(() => Math.random() - 0.5);
  _flipped = [];
  _matched = 0;
  _moves = 0;
  _startTime = Date.now();
  _busy = false;
}

function renderBoard() {
  const board = document.getElementById('mem-board');
  if (!board) return;
  board.innerHTML = _cards.map(c => `
    <button data-id="${c.id}" class="mem-card" style="background:${c.flipped || c.matched ? 'white' : '#0E1A2E'};border:2px solid ${c.matched ? '#2E8B57' : c.flipped ? '#1C4B8E' : '#0E1A2E'};border-radius:6px;font-size:32px;cursor:${c.matched ? 'default' : 'pointer'};transition:all 0.2s;color:#0E1A2E;">
      ${c.flipped || c.matched ? c.emoji : ''}
    </button>
  `).join('');

  document.querySelectorAll('.mem-card').forEach(btn => {
    btn.onclick = () => handleClick(parseInt(btn.dataset.id));
  });

  document.getElementById('mem-moves').textContent = String(_moves).padStart(2, '0');
  document.getElementById('mem-matched').textContent = `${String(_matched).padStart(2, '0')} / 08`;
}

function handleClick(id) {
  if (_busy) return;
  const card = _cards.find(c => c.id === id);
  if (!card || card.matched || card.flipped) return;

  card.flipped = true;
  _flipped.push(card);
  renderBoard();

  if (_flipped.length === 2) {
    _moves++;
    _busy = true;
    const [a, b] = _flipped;
    if (a.emoji === b.emoji) {
      a.matched = true; b.matched = true;
      _matched++;
      _flipped = [];
      _busy = false;
      renderBoard();
      if (_matched === _cards.length / 2) setTimeout(finish, 400);
    } else {
      setTimeout(() => {
        a.flipped = false; b.flipped = false;
        _flipped = [];
        _busy = false;
        renderBoard();
      }, 900);
    }
  }
}

function startTimer() {
  if (_timerId) clearInterval(_timerId);
  _timerId = setInterval(() => {
    const el = document.getElementById('mem-time');
    if (!el) { clearInterval(_timerId); return; }
    const sec = Math.floor((Date.now() - _startTime) / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, 500);
}

async function finish() {
  if (_timerId) { clearInterval(_timerId); _timerId = null; }
  const timeSec = Math.floor((Date.now() - _startTime) / 1000);
  const points = Math.max(10, 200 - _moves * 2);

  const board = document.getElementById('mem-board');
  board.innerHTML = `
    <div style="grid-column:1/-1;background:white;border:1px solid #E8E5DC;border-radius:6px;padding:32px;text-align:center;">
      <div style="font-size:56px;">🏆</div>
      <div style="font-size:22px;color:#0E1A2E;font-weight:800;margin-top:8px;">أحسنت!</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#6B6659;margin-top:8px;letter-spacing:.5px;">
        ${_moves} MOVES · ${Math.floor(timeSec/60)}:${String(timeSec%60).padStart(2,'0')} · +${points} POINTS
      </div>
      <div style="margin-top:16px;display:flex;gap:8px;justify-content:center;">
        <button class="modern-btn modern-btn-primary" onclick="navigate('game-memory')">🔄 لعبة جديدة</button>
        <button class="modern-btn" onclick="navigate('activities')">رجوع</button>
      </div>
    </div>`;

  try {
    await updateMemoryScore(
      _profile.id || _profile.uid,
      _profile.name || _profile.email || 'موظف',
      _moves, timeSec
    );
  } catch (e) { console.error('save memory error:', e); }
}
