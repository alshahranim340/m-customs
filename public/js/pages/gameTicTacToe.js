import { getCurrentProfile, toast } from '../app.js';
import {
  createXoRoom, joinXoRoom, makeXoMove, subscribeXoRoom,
  getOpenXoRooms, deleteXoRoom, recordXOResult
} from '../../../src/firebase/activitiesDb.js';

let _profile;
let _roomId = null;
let _myMark = null;
let _unsub = null;
let _resultRecorded = false;

export async function renderTicTacToe(container) {
  _profile = getCurrentProfile();
  if (!_profile) {
    container.innerHTML = `<div style="padding:40px;text-align:center;">يجب تسجيل الدخول</div>`;
    return;
  }

  _roomId = null; _myMark = null; _resultRecorded = false;
  if (_unsub) { _unsub(); _unsub = null; }

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
              <span class="modern-header-code">SDS/GAME/XO</span>
            </div>
            <div class="modern-header-title">⭕ إكس أو - متعدد اللاعبين</div>
            <div class="modern-header-sub">TIC-TAC-TOE · REALTIME MULTIPLAYER</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" onclick="navigate('activities')">
              <i class="ti ti-arrow-right"></i> رجوع
            </button>
          </div>
        </div>

        <div style="padding:20px 24px;display:grid;grid-template-columns:1fr 1fr;gap:14px;">

          <!-- Create room -->
          <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:22px;position:relative;overflow:hidden;">
            <div style="position:absolute;top:0;right:0;width:6px;height:100%;background:#2E8B57;"></div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:2px;font-weight:700;">OPTION · 001</div>
            <div style="font-size:18px;color:#0E1A2E;font-weight:800;margin-top:4px;">🎯 إنشاء غرفة جديدة</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#6B6659;margin-top:6px;letter-spacing:.3px;">HOST A NEW GAME · WAIT FOR OPPONENT</div>
            <p style="font-size:13px;color:#6B6659;margin:16px 0;">
              أنشئ غرفة وانتظر أحد الموظفين ينضم إليك. ستكون X (تبدأ أولاً).
            </p>
            <button class="modern-btn modern-btn-primary" id="btn-create-room" style="width:100%;">
              + إنشاء غرفة
            </button>
          </div>

          <!-- Join room -->
          <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:22px;position:relative;overflow:hidden;">
            <div style="position:absolute;top:0;right:0;width:6px;height:100%;background:#1C4B8E;"></div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:2px;font-weight:700;">OPTION · 002</div>
            <div style="font-size:18px;color:#0E1A2E;font-weight:800;margin-top:4px;">⚔ انضم إلى غرفة</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#6B6659;margin-top:6px;letter-spacing:.3px;">JOIN OPEN ROOM · PLAY AS O</div>
            <p style="font-size:13px;color:#6B6659;margin:16px 0;">
              انضم إلى غرفة موظف آخر ينتظر خصماً. ستكون O.
            </p>
            <button class="modern-btn" id="btn-refresh-rooms" style="width:100%;">
              <i class="ti ti-refresh"></i> تحديث القائمة
            </button>
          </div>

        </div>

        <!-- Open rooms list -->
        <div class="modern-section">
          <div class="modern-section-title">
            → OPEN ROOMS / الغرف المتاحة
            <div class="divider"></div>
            <span class="count" id="rooms-count">--</span>
          </div>
        </div>

        <div class="modern-list">
          <div id="rooms-list">
            <div class="loader"><div class="spinner"></div></div>
          </div>
        </div>

      </div>
    </div>`;

  document.getElementById('btn-create-room').onclick = handleCreateRoom;
  document.getElementById('btn-refresh-rooms').onclick = () => loadRooms();

  await loadRooms();
}

async function loadRooms() {
  const el = document.getElementById('rooms-list');
  if (!el) return;
  el.innerHTML = `<div class="loader"><div class="spinner"></div></div>`;

  try {
    const rooms = await getOpenXoRooms();
    const myUid = _profile.uid || _profile.id;
    const otherRooms = rooms.filter(r => r.player_x?.id !== myUid);

    const cnt = document.getElementById('rooms-count');
    if (cnt) cnt.textContent = String(otherRooms.length).padStart(2, '0') + ' rooms';

    if (otherRooms.length === 0) {
      el.innerHTML = `<div class="modern-empty">
        <div class="modern-empty-icon">🎮</div>
        <div class="modern-empty-title">لا توجد غرف مفتوحة</div>
        <div class="modern-empty-sub">CREATE A NEW ROOM TO START</div>
      </div>`;
      return;
    }

    el.innerHTML = `<div class="modern-list-box">${otherRooms.map((r, idx) => `
      <div class="modern-row" style="grid-template-columns:auto 70px 1fr auto auto;">
        <div class="modern-row-stripe blue"></div>
        <div class="modern-row-code">${String(idx + 1).padStart(2, '0')}</div>
        <div class="modern-row-body">
          <div class="modern-row-title">${r.player_x?.name || 'موظف'} <span class="modern-row-plate">X</span></div>
          <div class="modern-row-sub">→ WAITING FOR OPPONENT</div>
        </div>
        <span class="modern-badge amber">WAITING</span>
        <button class="modern-btn modern-btn-primary" onclick="joinXoGameRoom('${r.id}')" style="padding:6px 14px;font-size:11px;">
          ⚔ انضم
        </button>
      </div>`).join('')}</div>`;
  } catch (e) {
    el.innerHTML = `<div class="modern-empty">
      <div class="modern-empty-icon">⚠</div>
      <div class="modern-empty-title">خطأ في التحميل</div>
      <div class="modern-empty-sub">TRY AGAIN</div>
    </div>`;
  }

  window.joinXoGameRoom = handleJoinRoom;
}

async function handleCreateRoom() {
  const btn = document.getElementById('btn-create-room');
  btn.disabled = true;
  btn.textContent = '⏳ جاري الإنشاء...';
  try {
    const roomId = await createXoRoom(
      _profile.uid || _profile.id,
      _profile.name || _profile.email || 'موظف'
    );
    _roomId = roomId;
    _myMark = 'x';
    _resultRecorded = false;
    renderGame(document.getElementById('page-container'));
  } catch (e) {
    console.error(e);
    toast('خطأ في إنشاء الغرفة', 'error');
    btn.disabled = false;
    btn.textContent = '+ إنشاء غرفة';
  }
}

async function handleJoinRoom(roomId) {
  try {
    await joinXoRoom(
      roomId,
      _profile.uid || _profile.id,
      _profile.name || _profile.email || 'موظف'
    );
    _roomId = roomId;
    _myMark = 'o';
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
              <span class="modern-header-code">SDS/GAME/XO · ROOM ${(_roomId||'').slice(-6).toUpperCase()}</span>
            </div>
            <div class="modern-header-title">⭕ إكس أو</div>
            <div class="modern-header-sub" id="xo-status">CONNECTING...</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" id="btn-quit-xo">
              <i class="ti ti-x"></i> خروج
            </button>
          </div>
        </div>

        <!-- Players bar -->
        <div style="padding:20px 24px;display:grid;grid-template-columns:1fr auto 1fr;gap:14px;align-items:center;">
          <div id="player-x-card" style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:14px 18px;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:2px;font-weight:700;">PLAYER · X</div>
            <div style="font-size:15px;font-weight:700;color:#0E1A2E;margin-top:4px;" id="player-x-name">—</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#6B6659;margin-top:2px;" id="player-x-turn">WAITING</div>
          </div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:14px;color:#0E1A2E;font-weight:800;letter-spacing:2px;">VS</div>
          <div id="player-o-card" style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:14px 18px;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:2px;font-weight:700;">PLAYER · O</div>
            <div style="font-size:15px;font-weight:700;color:#0E1A2E;margin-top:4px;" id="player-o-name">— WAITING —</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#6B6659;margin-top:2px;" id="player-o-turn">EMPTY</div>
          </div>
        </div>

        <!-- Board -->
        <div style="padding:0 24px 20px;display:flex;justify-content:center;">
          <div id="xo-board" style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:16px;display:grid;grid-template-columns:repeat(3,90px);grid-template-rows:repeat(3,90px);gap:8px;">
          </div>
        </div>

        <!-- Result overlay -->
        <div id="xo-result" style="display:none;padding:0 24px 24px;">
          <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:24px;text-align:center;">
            <div id="xo-result-icon" style="font-size:48px;margin-bottom:8px;">🎉</div>
            <div id="xo-result-title" style="font-size:20px;font-weight:800;color:#0E1A2E;">فوز!</div>
            <div id="xo-result-sub" style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#6B6659;margin-top:6px;letter-spacing:.5px;">+50 POINTS</div>
            <div style="display:flex;gap:8px;justify-content:center;margin-top:16px;">
              <button class="modern-btn modern-btn-primary" onclick="navigate('game-xo')">
                🔄 لعبة جديدة
              </button>
              <button class="modern-btn" onclick="navigate('activities')">
                رجوع للفعاليات
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>`;

  document.getElementById('btn-quit-xo').onclick = handleQuit;

  // Empty board
  const boardEl = document.getElementById('xo-board');
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('button');
    cell.dataset.idx = i;
    cell.style.cssText = 'background:#FAFAF7;border:1px solid #E8E5DC;border-radius:4px;font-family:"JetBrains Mono",monospace;font-size:44px;font-weight:800;color:#0E1A2E;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;justify-content:center;';
    cell.onmouseover = () => { if (!cell.disabled) cell.style.background = '#F0EDE4'; };
    cell.onmouseout = () => { cell.style.background = '#FAFAF7'; };
    cell.onclick = () => handleCellClick(i);
    boardEl.appendChild(cell);
  }

  // Subscribe
  _unsub = subscribeXoRoom(_roomId, onRoomUpdate);
}

function onRoomUpdate(room) {
  // Update player names
  document.getElementById('player-x-name').textContent = room.player_x?.name || '—';
  document.getElementById('player-o-name').textContent = room.player_o?.name || '— WAITING —';

  // Highlight my card
  const myUid = _profile.uid || _profile.id;
  const xCard = document.getElementById('player-x-card');
  const oCard = document.getElementById('player-o-card');
  if (room.player_x?.id === myUid) xCard.style.borderColor = '#1C4B8E';
  if (room.player_o?.id === myUid) oCard.style.borderColor = '#1C4B8E';

  // Update board
  const cells = document.querySelectorAll('#xo-board button');
  cells.forEach((c, i) => {
    const val = room.board[i];
    c.textContent = val ? val.toUpperCase() : '';
    c.style.color = val === 'x' ? '#0E1A2E' : val === 'o' ? '#1C4B8E' : '#0E1A2E';
    // Disable if filled, not my turn, or game finished
    const canClick = !val && room.status === 'playing' && room.turn === _myMark;
    c.disabled = !canClick;
    c.style.cursor = canClick ? 'pointer' : 'default';
    c.style.opacity = room.status === 'finished' && !val ? '0.5' : '1';
  });

  // Status
  const statusEl = document.getElementById('xo-status');
  const xTurn = document.getElementById('player-x-turn');
  const oTurn = document.getElementById('player-o-turn');

  if (room.status === 'waiting') {
    statusEl.textContent = 'WAITING FOR OPPONENT...';
    xTurn.textContent = 'HOST';
    oTurn.textContent = 'EMPTY';
  } else if (room.status === 'playing') {
    const isMyTurn = room.turn === _myMark;
    statusEl.textContent = isMyTurn ? '→ دورك الآن' : `→ دور ${room.turn === 'x' ? room.player_x.name : room.player_o.name}`;
    xTurn.textContent = room.turn === 'x' ? '● YOUR TURN' : '';
    oTurn.textContent = room.turn === 'o' ? '● YOUR TURN' : '';
    xTurn.style.color = room.turn === 'x' ? '#2E8B57' : '#6B6659';
    oTurn.style.color = room.turn === 'o' ? '#2E8B57' : '#6B6659';
  } else if (room.status === 'finished') {
    handleFinished(room);
  }
}

async function handleFinished(room) {
  if (_resultRecorded) return;
  _resultRecorded = true;

  document.getElementById('xo-status').textContent = 'GAME FINISHED';
  document.getElementById('xo-result').style.display = 'block';

  const myUid = _profile.uid || _profile.id;
  const myName = _profile.name || _profile.email || 'موظف';
  let result;
  let icon, title, sub;

  if (room.winner === 'draw') {
    result = 'draw';
    icon = '🤝'; title = 'تعادل!'; sub = '+15 POINTS';
  } else if (room.winner === _myMark) {
    result = 'win';
    icon = '🎉'; title = 'فوز!'; sub = '+50 POINTS';
  } else {
    result = 'loss';
    icon = '😔'; title = 'خسارة'; sub = '+5 POINTS · حاول مرة أخرى';
  }

  document.getElementById('xo-result-icon').textContent = icon;
  document.getElementById('xo-result-title').textContent = title;
  document.getElementById('xo-result-sub').textContent = sub;

  try {
    await recordXOResult(myUid, myName, result);
  } catch (e) { console.error('save xo result error:', e); }

  // Clean up room after 30s
  setTimeout(async () => {
    if (room.player_x?.id === myUid) {
      try { await deleteXoRoom(room.id); } catch (e) {}
    }
  }, 30000);
}

async function handleCellClick(idx) {
  if (!_roomId || !_myMark) return;
  try {
    await makeXoMove(_roomId, idx, _myMark);
  } catch (e) { console.error('move error:', e); }
}

async function handleQuit() {
  if (_unsub) { _unsub(); _unsub = null; }
  if (_roomId && _myMark === 'x' && !_resultRecorded) {
    try { await deleteXoRoom(_roomId); } catch (e) {}
  }
  _roomId = null; _myMark = null;
  // Navigate back
  if (window.navigate) window.navigate('activities');
}
