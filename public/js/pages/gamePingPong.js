import { getCurrentProfile, toast } from '../app.js';
import {
  createPingPongRoom, joinPingPongRoom, updatePingPongRoom, subscribePingPongRoom,
  getOpenPingPongRooms, deletePingPongRoom, recordPingPongResult
} from '../../../src/firebase/activitiesDb.js';

let _profile;
let _roomId = null;
let _mySide = null; // 'left' or 'right'
let _unsub = null;
let _resultRecorded = false;
let _isHost = false;
let _canvas, _ctx;
let _gameLoop = null;
let _myPaddleY = 0.5;
let _remoteState = null;
let _lastSync = 0;
const SYNC_INTERVAL = 100; // ms
const WIN_SCORE = 5;

export async function renderPingPong(container) {
  _profile = getCurrentProfile();
  if (!_profile) {
    container.innerHTML = `<div style="padding:40px;text-align:center;">يجب تسجيل الدخول</div>`;
    return;
  }

  _roomId = null; _mySide = null; _resultRecorded = false; _isHost = false;
  if (_unsub) { _unsub(); _unsub = null; }
  if (_gameLoop) { cancelAnimationFrame(_gameLoop); _gameLoop = null; }

  renderLobby(container);
}

async function renderLobby(container) {
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
              <span class="modern-header-code">SDS/GAME/PINGPONG</span>
            </div>
            <div class="modern-header-title">🏓 Ping Pong</div>
            <div class="modern-header-sub">TABLE TENNIS · MULTIPLAYER · FIRST TO ${WIN_SCORE}</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" onclick="navigate('activities')">
              <i class="ti ti-arrow-right"></i> رجوع
            </button>
          </div>
        </div>

        <div style="padding:20px 24px;display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:22px;position:relative;overflow:hidden;">
            <div style="position:absolute;top:0;right:0;width:6px;height:100%;background:#2E8B57;"></div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:2px;font-weight:700;">OPTION · 001</div>
            <div style="font-size:18px;color:#0E1A2E;font-weight:800;margin-top:4px;">🎯 إنشاء غرفة</div>
            <p style="font-size:13px;color:#6B6659;margin:16px 0;">
              أنشئ غرفة (ستكون على اليسار). استخدم الفأرة أو الأسهم لتحريك المضرب.
            </p>
            <button class="modern-btn modern-btn-primary" id="btn-create-pp" style="width:100%;">
              + إنشاء غرفة
            </button>
          </div>
          <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:22px;position:relative;overflow:hidden;">
            <div style="position:absolute;top:0;right:0;width:6px;height:100%;background:#1C4B8E;"></div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:2px;font-weight:700;">OPTION · 002</div>
            <div style="font-size:18px;color:#0E1A2E;font-weight:800;margin-top:4px;">⚔ انضم لغرفة</div>
            <p style="font-size:13px;color:#6B6659;margin:16px 0;">
              انضم لغرفة مفتوحة (ستكون على اليمين).
            </p>
            <button class="modern-btn" id="btn-refresh-pp" style="width:100%;">
              <i class="ti ti-refresh"></i> تحديث القائمة
            </button>
          </div>
        </div>

        <div class="modern-section">
          <div class="modern-section-title">
            → OPEN ROOMS / الغرف المتاحة
            <div class="divider"></div>
            <span class="count" id="pp-rooms-count">--</span>
          </div>
        </div>

        <div class="modern-list">
          <div id="pp-rooms-list"><div class="loader"><div class="spinner"></div></div></div>
        </div>
      </div>
    </div>`;

  document.getElementById('btn-create-pp').onclick = handleCreate;
  document.getElementById('btn-refresh-pp').onclick = loadRooms;
  await loadRooms();
}

async function loadRooms() {
  const el = document.getElementById('pp-rooms-list');
  if (!el) return;
  el.innerHTML = `<div class="loader"><div class="spinner"></div></div>`;

  try {
    const rooms = await getOpenPingPongRooms();
    const myUid = _profile.id || _profile.uid;
    const others = rooms.filter(r => r.player_left?.id !== myUid);

    const cnt = document.getElementById('pp-rooms-count');
    if (cnt) cnt.textContent = String(others.length).padStart(2, '0') + ' rooms';

    if (others.length === 0) {
      el.innerHTML = `<div class="modern-empty">
        <div class="modern-empty-icon">🏓</div>
        <div class="modern-empty-title">لا توجد غرف مفتوحة</div>
        <div class="modern-empty-sub">CREATE A NEW ROOM</div>
      </div>`;
      return;
    }

    el.innerHTML = `<div class="modern-list-box">${others.map((r, idx) => `
      <div class="modern-row" style="grid-template-columns:auto 70px 1fr auto auto;">
        <div class="modern-row-stripe green"></div>
        <div class="modern-row-code">${String(idx + 1).padStart(2, '0')}</div>
        <div class="modern-row-body">
          <div class="modern-row-title">${r.player_left?.name || 'موظف'} <span class="modern-row-plate">◀</span></div>
          <div class="modern-row-sub">→ WAITING FOR OPPONENT</div>
        </div>
        <span class="modern-badge amber">WAITING</span>
        <button class="modern-btn modern-btn-primary" onclick="joinPPGame('${r.id}')" style="padding:6px 14px;font-size:11px;">
          ⚔ انضم
        </button>
      </div>`).join('')}</div>`;
  } catch (e) {
    el.innerHTML = `<div class="modern-empty"><div class="modern-empty-title">خطأ في التحميل</div></div>`;
  }

  window.joinPPGame = handleJoin;
}

async function handleCreate() {
  const btn = document.getElementById('btn-create-pp');
  btn.disabled = true;
  btn.textContent = '⏳ جاري الإنشاء...';
  try {
    _roomId = await createPingPongRoom(
      _profile.id || _profile.uid,
      _profile.name || _profile.email || 'موظف'
    );
    _mySide = 'left';
    _isHost = true;
    _resultRecorded = false;
    renderGame(document.getElementById('page-container'));
  } catch (e) {
    console.error(e);
    toast('خطأ في الإنشاء', 'error');
    btn.disabled = false;
    btn.textContent = '+ إنشاء غرفة';
  }
}

async function handleJoin(roomId) {
  try {
    await joinPingPongRoom(roomId, _profile.id || _profile.uid, _profile.name || _profile.email || 'موظف');
    _roomId = roomId;
    _mySide = 'right';
    _isHost = false;
    _resultRecorded = false;
    renderGame(document.getElementById('page-container'));
  } catch (e) {
    toast(e.message || 'خطأ في الانضمام', 'error');
  }
}

function renderGame(container) {
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
              <span class="modern-header-code">SDS/PINGPONG · ROOM ${(_roomId||'').slice(-6).toUpperCase()}</span>
            </div>
            <div class="modern-header-title">🏓 Ping Pong</div>
            <div class="modern-header-sub" id="pp-status">CONNECTING...</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" id="btn-quit-pp">
              <i class="ti ti-x"></i> خروج
            </button>
          </div>
        </div>

        <div style="padding:20px 24px;display:grid;grid-template-columns:1fr auto 1fr;gap:14px;align-items:center;">
          <div id="pp-left-card" style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:14px 18px;text-align:center;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:2px;font-weight:700;">◀ LEFT</div>
            <div style="font-size:15px;font-weight:700;color:#0E1A2E;margin-top:4px;" id="pp-left-name">—</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:32px;font-weight:800;color:#2E8B57;margin-top:6px;" id="pp-left-score">00</div>
          </div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:14px;color:#0E1A2E;font-weight:800;letter-spacing:2px;">VS</div>
          <div id="pp-right-card" style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:14px 18px;text-align:center;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:2px;font-weight:700;">RIGHT ▶</div>
            <div style="font-size:15px;font-weight:700;color:#0E1A2E;margin-top:4px;" id="pp-right-name">— WAITING —</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:32px;font-weight:800;color:#1C4B8E;margin-top:6px;" id="pp-right-score">00</div>
          </div>
        </div>

        <div style="padding:0 24px 20px;display:flex;justify-content:center;">
          <canvas id="pp-canvas" width="700" height="400" style="background:#0E1A2E;border:2px solid #6B6659;border-radius:6px;cursor:none;"></canvas>
        </div>

        <div style="text-align:center;padding-bottom:16px;font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;letter-spacing:1px;">
          MOVE MOUSE OR ↑ ↓ · FIRST TO ${WIN_SCORE} WINS
        </div>

        <div id="pp-result" style="display:none;padding:0 24px 24px;">
          <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:24px;text-align:center;">
            <div id="pp-result-icon" style="font-size:48px;margin-bottom:8px;">🎉</div>
            <div id="pp-result-title" style="font-size:20px;font-weight:800;color:#0E1A2E;">فوز!</div>
            <div id="pp-result-sub" style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#6B6659;margin-top:6px;letter-spacing:.5px;"></div>
            <div style="display:flex;gap:8px;justify-content:center;margin-top:16px;">
              <button class="modern-btn modern-btn-primary" onclick="navigate('game-pingpong')">🔄 لعبة جديدة</button>
              <button class="modern-btn" onclick="navigate('activities')">رجوع</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('btn-quit-pp').onclick = handleQuit;

  _canvas = document.getElementById('pp-canvas');
  _ctx = _canvas.getContext('2d');

  // Mouse control
  _canvas.addEventListener('mousemove', (e) => {
    const rect = _canvas.getBoundingClientRect();
    const y = (e.clientY - rect.top) / rect.height;
    _myPaddleY = Math.max(0.1, Math.min(0.9, y));
  });

  // Keyboard control
  window._ppKeyHandler = (e) => {
    if (e.key === 'ArrowUp' || e.key === 'w') { _myPaddleY = Math.max(0.1, _myPaddleY - 0.05); e.preventDefault(); }
    else if (e.key === 'ArrowDown' || e.key === 's') { _myPaddleY = Math.min(0.9, _myPaddleY + 0.05); e.preventDefault(); }
  };
  window.addEventListener('keydown', window._ppKeyHandler);

  _unsub = subscribePingPongRoom(_roomId, onRoomUpdate);
}

function onRoomUpdate(room) {
  _remoteState = room;
  document.getElementById('pp-left-name').textContent = room.player_left?.name || '—';
  document.getElementById('pp-right-name').textContent = room.player_right?.name || '— WAITING —';
  document.getElementById('pp-left-score').textContent = String(room.score_left || 0).padStart(2, '0');
  document.getElementById('pp-right-score').textContent = String(room.score_right || 0).padStart(2, '0');

  const myUid = _profile.id || _profile.uid;
  if (room.player_left?.id === myUid) document.getElementById('pp-left-card').style.borderColor = '#1C4B8E';
  if (room.player_right?.id === myUid) document.getElementById('pp-right-card').style.borderColor = '#1C4B8E';

  const statusEl = document.getElementById('pp-status');
  if (room.status === 'waiting') {
    statusEl.textContent = 'WAITING FOR OPPONENT...';
  } else if (room.status === 'playing') {
    statusEl.textContent = '→ اللعب جارٍ · حرّك الماوس';
    if (!_gameLoop) startGameLoop();
  } else if (room.status === 'finished') {
    if (_gameLoop) { cancelAnimationFrame(_gameLoop); _gameLoop = null; }
    handleFinished(room);
  }

  draw();
}

function startGameLoop() {
  const loop = () => {
    tick();
    draw();
    _gameLoop = requestAnimationFrame(loop);
  };
  loop();
}

function tick() {
  if (!_remoteState || _remoteState.status !== 'playing') return;
  const now = Date.now();

  // Update my paddle position remotely (throttled)
  if (now - _lastSync > SYNC_INTERVAL) {
    _lastSync = now;
    const updates = {};
    if (_mySide === 'left') updates.paddle_left = _myPaddleY;
    else updates.paddle_right = _myPaddleY;

    // Host also updates ball physics
    if (_isHost) {
      const state = simulateBall(_remoteState);
      Object.assign(updates, state);
    }
    updatePingPongRoom(_roomId, updates).catch(e => console.error(e));
  }
}

function simulateBall(state) {
  const dt = SYNC_INTERVAL / 1000; // convert to seconds
  let bx = state.ball_x + state.ball_vx * (SYNC_INTERVAL / 16);
  let by = state.ball_y + state.ball_vy * (SYNC_INTERVAL / 16);
  let vx = state.ball_vx;
  let vy = state.ball_vy;
  let sl = state.score_left || 0;
  let sr = state.score_right || 0;

  // Wall collision (top/bottom)
  if (by < 0.02) { by = 0.02; vy = Math.abs(vy); }
  if (by > 0.98) { by = 0.98; vy = -Math.abs(vy); }

  // Paddle collision
  const paddleHeight = 0.2;
  const paddleWidth = 0.02;
  const leftPY = state.paddle_left || 0.5;
  const rightPY = state.paddle_right || 0.5;

  // Left paddle (x ~ 0.03)
  if (bx <= 0.05 && bx >= 0.02 && vx < 0) {
    if (by >= leftPY - paddleHeight/2 && by <= leftPY + paddleHeight/2) {
      vx = Math.abs(vx) * 1.05; // speed up slightly
      // add angle based on hit position
      const offset = (by - leftPY) / (paddleHeight / 2);
      vy += offset * 0.003;
    }
  }
  // Right paddle (x ~ 0.97)
  if (bx >= 0.95 && bx <= 0.98 && vx > 0) {
    if (by >= rightPY - paddleHeight/2 && by <= rightPY + paddleHeight/2) {
      vx = -Math.abs(vx) * 1.05;
      const offset = (by - rightPY) / (paddleHeight / 2);
      vy += offset * 0.003;
    }
  }

  // Cap ball speed
  const maxSpeed = 0.025;
  if (Math.abs(vx) > maxSpeed) vx = Math.sign(vx) * maxSpeed;
  if (Math.abs(vy) > maxSpeed) vy = Math.sign(vy) * maxSpeed;

  // Score
  let scored = false;
  if (bx < 0) {
    sr++;
    bx = 0.5; by = 0.5;
    vx = 0.007 * (Math.random() > 0.5 ? 1 : -1);
    vy = (Math.random() - 0.5) * 0.008;
    scored = true;
  } else if (bx > 1) {
    sl++;
    bx = 0.5; by = 0.5;
    vx = 0.007 * (Math.random() > 0.5 ? 1 : -1);
    vy = (Math.random() - 0.5) * 0.008;
    scored = true;
  }

  const updates = {
    ball_x: bx, ball_y: by,
    ball_vx: vx, ball_vy: vy,
  };
  if (scored) {
    updates.score_left = sl;
    updates.score_right = sr;
    if (sl >= WIN_SCORE) {
      updates.status = 'finished';
      updates.winner = 'left';
    } else if (sr >= WIN_SCORE) {
      updates.status = 'finished';
      updates.winner = 'right';
    }
  }
  return updates;
}

function draw() {
  if (!_ctx || !_remoteState) return;
  const W = _canvas.width, H = _canvas.height;
  _ctx.fillStyle = '#0E1A2E';
  _ctx.fillRect(0, 0, W, H);

  // Center line
  _ctx.setLineDash([8, 8]);
  _ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  _ctx.lineWidth = 2;
  _ctx.beginPath();
  _ctx.moveTo(W/2, 0);
  _ctx.lineTo(W/2, H);
  _ctx.stroke();
  _ctx.setLineDash([]);

  // Paddles
  const paddleH = H * 0.2;
  const paddleW = 10;
  const leftY = (_mySide === 'left' ? _myPaddleY : _remoteState.paddle_left || 0.5) * H - paddleH/2;
  const rightY = (_mySide === 'right' ? _myPaddleY : _remoteState.paddle_right || 0.5) * H - paddleH/2;

  _ctx.fillStyle = '#2E8B57';
  _ctx.fillRect(15, leftY, paddleW, paddleH);
  _ctx.fillStyle = '#1C4B8E';
  _ctx.fillRect(W - 25, rightY, paddleW, paddleH);

  // Ball
  if (_remoteState.status === 'playing') {
    _ctx.fillStyle = '#FAFAF7';
    _ctx.beginPath();
    _ctx.arc(_remoteState.ball_x * W, _remoteState.ball_y * H, 8, 0, Math.PI * 2);
    _ctx.fill();
  }
}

async function handleFinished(room) {
  if (_resultRecorded) return;
  _resultRecorded = true;
  document.getElementById('pp-status').textContent = 'GAME FINISHED';
  document.getElementById('pp-result').style.display = 'block';

  const myUid = _profile.id || _profile.uid;
  const myName = _profile.name || _profile.email || 'موظف';
  let result, icon, title, sub;

  const iWon = (room.winner === 'left' && _mySide === 'left') || (room.winner === 'right' && _mySide === 'right');

  if (iWon) {
    result = 'win'; icon = '🎉'; title = 'فوز!'; sub = '+60 POINTS';
  } else {
    result = 'loss'; icon = '😔'; title = 'خسارة'; sub = '+10 POINTS';
  }

  document.getElementById('pp-result-icon').textContent = icon;
  document.getElementById('pp-result-title').textContent = title;
  document.getElementById('pp-result-sub').textContent = sub;

  try { await recordPingPongResult(myUid, myName, result); } catch (e) { console.error(e); }

  setTimeout(async () => {
    if (room.player_left?.id === myUid) {
      try { await deletePingPongRoom(room.id); } catch (e) {}
    }
  }, 30000);
}

async function handleQuit() {
  if (_gameLoop) { cancelAnimationFrame(_gameLoop); _gameLoop = null; }
  if (window._ppKeyHandler) { window.removeEventListener('keydown', window._ppKeyHandler); window._ppKeyHandler = null; }
  if (_unsub) { _unsub(); _unsub = null; }
  if (_roomId && _isHost && !_resultRecorded) {
    try { await deletePingPongRoom(_roomId); } catch (e) {}
  }
  _roomId = null; _mySide = null;
  if (window.navigate) window.navigate('activities');
}
