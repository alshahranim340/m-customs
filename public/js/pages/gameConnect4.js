import { getCurrentProfile, toast } from '../app.js';
import {
  createC4Room, joinC4Room, makeC4Move, subscribeC4Room,
  getOpenC4Rooms, deleteC4Room, recordC4Result
} from '../../../src/firebase/activitiesDb.js';

let _profile;
let _roomId = null;
let _myColor = null;
let _unsub = null;
let _resultRecorded = false;

export async function renderConnect4(container) {
  _profile = getCurrentProfile();
  if (!_profile) {
    container.innerHTML = `<div style="padding:40px;text-align:center;">يجب تسجيل الدخول</div>`;
    return;
  }

  _roomId = null; _myColor = null; _resultRecorded = false;
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
              <span class="modern-header-code">SDS/GAME/C4</span>
            </div>
            <div class="modern-header-title">🔴 الأربعة في صف</div>
            <div class="modern-header-sub">CONNECT FOUR · MULTIPLAYER · 6x7 GRID</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" onclick="navigate('activities')">
              <i class="ti ti-arrow-right"></i> رجوع
            </button>
          </div>
        </div>

        <div style="padding:20px 24px;display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:22px;position:relative;overflow:hidden;">
            <div style="position:absolute;top:0;right:0;width:6px;height:100%;background:#CC2229;"></div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:2px;font-weight:700;">OPTION · 001</div>
            <div style="font-size:18px;color:#0E1A2E;font-weight:800;margin-top:4px;">🎯 إنشاء غرفة</div>
            <p style="font-size:13px;color:#6B6659;margin:16px 0;">
              أنشئ غرفة وانتظر خصماً. ستكون 🔴 (أحمر) وتبدأ أولاً.
            </p>
            <button class="modern-btn modern-btn-primary" id="btn-create-c4" style="width:100%;">
              + إنشاء غرفة
            </button>
          </div>
          <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:22px;position:relative;overflow:hidden;">
            <div style="position:absolute;top:0;right:0;width:6px;height:100%;background:#EDC22E;"></div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:2px;font-weight:700;">OPTION · 002</div>
            <div style="font-size:18px;color:#0E1A2E;font-weight:800;margin-top:4px;">⚔ انضم لغرفة</div>
            <p style="font-size:13px;color:#6B6659;margin:16px 0;">
              انضم لغرفة مفتوحة. ستكون 🟡 (أصفر).
            </p>
            <button class="modern-btn" id="btn-refresh-c4" style="width:100%;">
              <i class="ti ti-refresh"></i> تحديث القائمة
            </button>
          </div>
        </div>

        <div class="modern-section">
          <div class="modern-section-title">
            → OPEN ROOMS / الغرف المتاحة
            <div class="divider"></div>
            <span class="count" id="c4-rooms-count">--</span>
          </div>
        </div>

        <div class="modern-list">
          <div id="c4-rooms-list"><div class="loader"><div class="spinner"></div></div></div>
        </div>
      </div>
    </div>`;

  document.getElementById('btn-create-c4').onclick = handleCreate;
  document.getElementById('btn-refresh-c4').onclick = loadRooms;
  await loadRooms();
}

async function loadRooms() {
  const el = document.getElementById('c4-rooms-list');
  if (!el) return;
  el.innerHTML = `<div class="loader"><div class="spinner"></div></div>`;

  try {
    const rooms = await getOpenC4Rooms();
    const myUid = _profile.id || _profile.uid;
    const others = rooms.filter(r => r.player_red?.id !== myUid);

    const cnt = document.getElementById('c4-rooms-count');
    if (cnt) cnt.textContent = String(others.length).padStart(2, '0') + ' rooms';

    if (others.length === 0) {
      el.innerHTML = `<div class="modern-empty">
        <div class="modern-empty-icon">🎮</div>
        <div class="modern-empty-title">لا توجد غرف مفتوحة</div>
        <div class="modern-empty-sub">CREATE A NEW ROOM</div>
      </div>`;
      return;
    }

    el.innerHTML = `<div class="modern-list-box">${others.map((r, idx) => `
      <div class="modern-row" style="grid-template-columns:auto 70px 1fr auto auto;">
        <div class="modern-row-stripe red"></div>
        <div class="modern-row-code">${String(idx + 1).padStart(2, '0')}</div>
        <div class="modern-row-body">
          <div class="modern-row-title">${r.player_red?.name || 'موظف'} <span class="modern-row-plate">🔴</span></div>
          <div class="modern-row-sub">→ WAITING FOR OPPONENT</div>
        </div>
        <span class="modern-badge amber">WAITING</span>
        <button class="modern-btn modern-btn-primary" onclick="joinC4Game('${r.id}')" style="padding:6px 14px;font-size:11px;">
          ⚔ انضم
        </button>
      </div>`).join('')}</div>`;
  } catch (e) {
    el.innerHTML = `<div class="modern-empty"><div class="modern-empty-title">خطأ في التحميل</div></div>`;
  }

  window.joinC4Game = handleJoin;
}

async function handleCreate() {
  const btn = document.getElementById('btn-create-c4');
  btn.disabled = true;
  btn.textContent = '⏳ جاري الإنشاء...';
  try {
    _roomId = await createC4Room(
      _profile.id || _profile.uid,
      _profile.name || _profile.email || 'موظف'
    );
    _myColor = 'red';
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
    await joinC4Room(roomId, _profile.id || _profile.uid, _profile.name || _profile.email || 'موظف');
    _roomId = roomId;
    _myColor = 'yellow';
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
              <span class="modern-header-code">SDS/GAME/C4 · ROOM ${(_roomId||'').slice(-6).toUpperCase()}</span>
            </div>
            <div class="modern-header-title">🔴 الأربعة في صف</div>
            <div class="modern-header-sub" id="c4-status">CONNECTING...</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" id="btn-quit-c4">
              <i class="ti ti-x"></i> خروج
            </button>
          </div>
        </div>

        <div style="padding:20px 24px;display:grid;grid-template-columns:1fr auto 1fr;gap:14px;align-items:center;">
          <div id="c4-red-card" style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:14px 18px;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:2px;font-weight:700;">PLAYER · 🔴 RED</div>
            <div style="font-size:15px;font-weight:700;color:#0E1A2E;margin-top:4px;" id="c4-red-name">—</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#6B6659;margin-top:2px;" id="c4-red-turn">HOST</div>
          </div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:14px;color:#0E1A2E;font-weight:800;letter-spacing:2px;">VS</div>
          <div id="c4-yellow-card" style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:14px 18px;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:2px;font-weight:700;">PLAYER · 🟡 YELLOW</div>
            <div style="font-size:15px;font-weight:700;color:#0E1A2E;margin-top:4px;" id="c4-yellow-name">— WAITING —</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#6B6659;margin-top:2px;" id="c4-yellow-turn">EMPTY</div>
          </div>
        </div>

        <div style="padding:0 24px 20px;display:flex;justify-content:center;">
          <div style="background:#1C4B8E;padding:14px;border-radius:8px;">
            <div id="c4-board" style="display:grid;grid-template-columns:repeat(7,54px);grid-template-rows:repeat(6,54px);gap:6px;"></div>
          </div>
        </div>

        <div id="c4-result" style="display:none;padding:0 24px 24px;">
          <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:24px;text-align:center;">
            <div id="c4-result-icon" style="font-size:48px;margin-bottom:8px;">🎉</div>
            <div id="c4-result-title" style="font-size:20px;font-weight:800;color:#0E1A2E;">فوز!</div>
            <div id="c4-result-sub" style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#6B6659;margin-top:6px;letter-spacing:.5px;"></div>
            <div style="display:flex;gap:8px;justify-content:center;margin-top:16px;">
              <button class="modern-btn modern-btn-primary" onclick="navigate('game-c4')">🔄 لعبة جديدة</button>
              <button class="modern-btn" onclick="navigate('activities')">رجوع</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('btn-quit-c4').onclick = handleQuit;

  const boardEl = document.getElementById('c4-board');
  for (let i = 0; i < 42; i++) {
    const cell = document.createElement('button');
    cell.dataset.idx = i;
    cell.dataset.col = i % 7;
    cell.style.cssText = 'background:white;border:none;border-radius:50%;width:54px;height:54px;cursor:pointer;transition:all 0.15s;';
    cell.onclick = () => handleColumnClick(parseInt(cell.dataset.col));
    boardEl.appendChild(cell);
  }

  _unsub = subscribeC4Room(_roomId, onRoomUpdate);
}

function onRoomUpdate(room) {
  document.getElementById('c4-red-name').textContent = room.player_red?.name || '—';
  document.getElementById('c4-yellow-name').textContent = room.player_yellow?.name || '— WAITING —';

  const myUid = _profile.id || _profile.uid;
  if (room.player_red?.id === myUid) document.getElementById('c4-red-card').style.borderColor = '#1C4B8E';
  if (room.player_yellow?.id === myUid) document.getElementById('c4-yellow-card').style.borderColor = '#1C4B8E';

  const cells = document.querySelectorAll('#c4-board button');
  cells.forEach((c, i) => {
    const val = room.board[i];
    if (val === 'red') c.style.background = '#CC2229';
    else if (val === 'yellow') c.style.background = '#EDC22E';
    else c.style.background = 'white';

    if (room.winning_cells && room.winning_cells.includes(i)) {
      c.style.boxShadow = '0 0 0 4px #2E8B57';
    }
  });

  const statusEl = document.getElementById('c4-status');
  const rt = document.getElementById('c4-red-turn');
  const yt = document.getElementById('c4-yellow-turn');

  if (room.status === 'waiting') {
    statusEl.textContent = 'WAITING FOR OPPONENT...';
    rt.textContent = 'HOST'; yt.textContent = 'EMPTY';
  } else if (room.status === 'playing') {
    const isMyTurn = room.turn === _myColor;
    statusEl.textContent = isMyTurn ? '→ دورك الآن' : `→ دور ${room.turn === 'red' ? room.player_red.name : room.player_yellow.name}`;
    rt.textContent = room.turn === 'red' ? '● YOUR TURN' : '';
    yt.textContent = room.turn === 'yellow' ? '● YOUR TURN' : '';
    rt.style.color = room.turn === 'red' ? '#CC2229' : '#6B6659';
    yt.style.color = room.turn === 'yellow' ? '#EDC22E' : '#6B6659';
  } else if (room.status === 'finished') {
    handleFinished(room);
  }
}

async function handleFinished(room) {
  if (_resultRecorded) return;
  _resultRecorded = true;
  document.getElementById('c4-status').textContent = 'GAME FINISHED';
  document.getElementById('c4-result').style.display = 'block';

  const myUid = _profile.id || _profile.uid;
  const myName = _profile.name || _profile.email || 'موظف';
  let result, icon, title, sub;

  if (room.winner === 'draw') {
    result = 'draw'; icon = '🤝'; title = 'تعادل!'; sub = '+20 POINTS';
  } else if (room.winner === _myColor) {
    result = 'win'; icon = '🎉'; title = 'فوز!'; sub = '+75 POINTS';
  } else {
    result = 'loss'; icon = '😔'; title = 'خسارة'; sub = '+5 POINTS';
  }

  document.getElementById('c4-result-icon').textContent = icon;
  document.getElementById('c4-result-title').textContent = title;
  document.getElementById('c4-result-sub').textContent = sub;

  try { await recordC4Result(myUid, myName, result); } catch (e) { console.error(e); }

  setTimeout(async () => {
    if (room.player_red?.id === myUid) {
      try { await deleteC4Room(room.id); } catch (e) {}
    }
  }, 30000);
}

async function handleColumnClick(col) {
  if (!_roomId || !_myColor) return;
  try {
    await makeC4Move(_roomId, col, _myColor);
  } catch (e) { console.error(e); }
}

async function handleQuit() {
  if (_unsub) { _unsub(); _unsub = null; }
  if (_roomId && _myColor === 'red' && !_resultRecorded) {
    try { await deleteC4Room(_roomId); } catch (e) {}
  }
  _roomId = null; _myColor = null;
  if (window.navigate) window.navigate('activities');
}
