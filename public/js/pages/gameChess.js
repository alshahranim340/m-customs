import { getCurrentProfile, toast } from '../app.js';
import {
  createChessRoom, joinChessRoom, updateChessRoom, subscribeChessRoom,
  getOpenChessRooms, deleteChessRoom, recordChessResult
} from '../../../src/firebase/activitiesDb.js';

let _profile;
let _roomId = null;
let _myColor = null;
let _unsub = null;
let _resultRecorded = false;
let _chess = null;
let _selectedSquare = null;
let _chessLibLoaded = false;

// Unicode chess pieces
const PIECES = {
  wK:'♔', wQ:'♕', wR:'♖', wB:'♗', wN:'♘', wP:'♙',
  bK:'♚', bQ:'♛', bR:'♜', bB:'♝', bN:'♞', bP:'♟',
};

async function loadChessLib() {
  if (_chessLibLoaded && window.Chess) return;
  return new Promise((resolve, reject) => {
    if (window.Chess) { _chessLibLoaded = true; resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js';
    script.onload = () => { _chessLibLoaded = true; resolve(); };
    script.onerror = () => reject(new Error('فشل تحميل مكتبة الشطرنج'));
    document.head.appendChild(script);
  });
}

export async function renderChess(container) {
  _profile = getCurrentProfile();
  if (!_profile) {
    container.innerHTML = `<div style="padding:40px;text-align:center;">يجب تسجيل الدخول</div>`;
    return;
  }

  _roomId = null; _myColor = null; _resultRecorded = false;
  if (_unsub) { _unsub(); _unsub = null; }

  try {
    await loadChessLib();
  } catch (e) {
    container.innerHTML = `<div style="padding:40px;text-align:center;color:#CC2229;">${e.message}</div>`;
    return;
  }

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
              <span class="modern-header-code">SDS/GAME/CHESS</span>
            </div>
            <div class="modern-header-title">♟️ الشطرنج</div>
            <div class="modern-header-sub">CHESS · MULTIPLAYER · 8x8 STRATEGY</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" onclick="navigate('activities')">
              <i class="ti ti-arrow-right"></i> رجوع
            </button>
          </div>
        </div>

        <div style="padding:20px 24px;display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:22px;position:relative;overflow:hidden;">
            <div style="position:absolute;top:0;right:0;width:6px;height:100%;background:#0E1A2E;"></div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:2px;font-weight:700;">OPTION · 001</div>
            <div style="font-size:18px;color:#0E1A2E;font-weight:800;margin-top:4px;">🎯 إنشاء غرفة</div>
            <p style="font-size:13px;color:#6B6659;margin:16px 0;">
              أنشئ غرفة وانتظر خصماً. ستكون ♔ (أبيض) وتبدأ أولاً.
            </p>
            <button class="modern-btn modern-btn-primary" id="btn-create-chess" style="width:100%;">
              + إنشاء غرفة
            </button>
          </div>
          <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:22px;position:relative;overflow:hidden;">
            <div style="position:absolute;top:0;right:0;width:6px;height:100%;background:#6B6659;"></div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:2px;font-weight:700;">OPTION · 002</div>
            <div style="font-size:18px;color:#0E1A2E;font-weight:800;margin-top:4px;">⚔ انضم لغرفة</div>
            <p style="font-size:13px;color:#6B6659;margin:16px 0;">
              انضم لغرفة مفتوحة. ستكون ♚ (أسود).
            </p>
            <button class="modern-btn" id="btn-refresh-chess" style="width:100%;">
              <i class="ti ti-refresh"></i> تحديث القائمة
            </button>
          </div>
        </div>

        <div class="modern-section">
          <div class="modern-section-title">
            → OPEN ROOMS / الغرف المتاحة
            <div class="divider"></div>
            <span class="count" id="chess-rooms-count">--</span>
          </div>
        </div>

        <div class="modern-list">
          <div id="chess-rooms-list"><div class="loader"><div class="spinner"></div></div></div>
        </div>
      </div>
    </div>`;

  document.getElementById('btn-create-chess').onclick = handleCreate;
  document.getElementById('btn-refresh-chess').onclick = loadRooms;
  await loadRooms();
}

async function loadRooms() {
  const el = document.getElementById('chess-rooms-list');
  if (!el) return;
  el.innerHTML = `<div class="loader"><div class="spinner"></div></div>`;

  try {
    const rooms = await getOpenChessRooms();
    const myUid = _profile.id || _profile.uid;
    const others = rooms.filter(r => r.player_white?.id !== myUid);

    const cnt = document.getElementById('chess-rooms-count');
    if (cnt) cnt.textContent = String(others.length).padStart(2, '0') + ' rooms';

    if (others.length === 0) {
      el.innerHTML = `<div class="modern-empty">
        <div class="modern-empty-icon">♟️</div>
        <div class="modern-empty-title">لا توجد غرف مفتوحة</div>
        <div class="modern-empty-sub">CREATE A NEW ROOM</div>
      </div>`;
      return;
    }

    el.innerHTML = `<div class="modern-list-box">${others.map((r, idx) => `
      <div class="modern-row" style="grid-template-columns:auto 70px 1fr auto auto;">
        <div class="modern-row-stripe" style="background:#0E1A2E;"></div>
        <div class="modern-row-code">${String(idx + 1).padStart(2, '0')}</div>
        <div class="modern-row-body">
          <div class="modern-row-title">${r.player_white?.name || 'موظف'} <span class="modern-row-plate">♔</span></div>
          <div class="modern-row-sub">→ WAITING FOR OPPONENT</div>
        </div>
        <span class="modern-badge amber">WAITING</span>
        <button class="modern-btn modern-btn-primary" onclick="joinChessGame('${r.id}')" style="padding:6px 14px;font-size:11px;">
          ⚔ انضم
        </button>
      </div>`).join('')}</div>`;
  } catch (e) {
    el.innerHTML = `<div class="modern-empty"><div class="modern-empty-title">خطأ في التحميل</div></div>`;
  }

  window.joinChessGame = handleJoin;
}

async function handleCreate() {
  const btn = document.getElementById('btn-create-chess');
  btn.disabled = true;
  btn.textContent = '⏳ جاري الإنشاء...';
  try {
    _roomId = await createChessRoom(
      _profile.id || _profile.uid,
      _profile.name || _profile.email || 'موظف'
    );
    _myColor = 'w';
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
    await joinChessRoom(roomId, _profile.id || _profile.uid, _profile.name || _profile.email || 'موظف');
    _roomId = roomId;
    _myColor = 'b';
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
              <span class="modern-header-code">SDS/CHESS · ROOM ${(_roomId||'').slice(-6).toUpperCase()}</span>
            </div>
            <div class="modern-header-title">♟️ الشطرنج</div>
            <div class="modern-header-sub" id="chess-status">CONNECTING...</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" id="btn-resign-chess">
              <i class="ti ti-flag"></i> استسلام
            </button>
            <button class="modern-btn" id="btn-quit-chess">
              <i class="ti ti-x"></i> خروج
            </button>
          </div>
        </div>

        <div style="padding:20px 24px;display:grid;grid-template-columns:1fr auto 1fr;gap:14px;align-items:center;">
          <div id="chess-white-card" style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:14px 18px;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:2px;font-weight:700;">PLAYER · ♔ WHITE</div>
            <div style="font-size:15px;font-weight:700;color:#0E1A2E;margin-top:4px;" id="chess-white-name">—</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#6B6659;margin-top:2px;" id="chess-white-turn">HOST</div>
          </div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:14px;color:#0E1A2E;font-weight:800;letter-spacing:2px;">VS</div>
          <div id="chess-black-card" style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:14px 18px;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:2px;font-weight:700;">PLAYER · ♚ BLACK</div>
            <div style="font-size:15px;font-weight:700;color:#0E1A2E;margin-top:4px;" id="chess-black-name">— WAITING —</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#6B6659;margin-top:2px;" id="chess-black-turn">EMPTY</div>
          </div>
        </div>

        <div style="padding:0 24px 20px;display:flex;justify-content:center;">
          <div style="background:#0E1A2E;padding:12px;border-radius:6px;">
            <div id="chess-board" style="display:grid;grid-template-columns:repeat(8,54px);grid-template-rows:repeat(8,54px);gap:0;border:2px solid #6B6659;"></div>
          </div>
        </div>

        <div id="chess-result" style="display:none;padding:0 24px 24px;">
          <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:24px;text-align:center;">
            <div id="chess-result-icon" style="font-size:48px;margin-bottom:8px;">🎉</div>
            <div id="chess-result-title" style="font-size:20px;font-weight:800;color:#0E1A2E;">فوز!</div>
            <div id="chess-result-sub" style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#6B6659;margin-top:6px;letter-spacing:.5px;"></div>
            <div style="display:flex;gap:8px;justify-content:center;margin-top:16px;">
              <button class="modern-btn modern-btn-primary" onclick="navigate('game-chess')">🔄 لعبة جديدة</button>
              <button class="modern-btn" onclick="navigate('activities')">رجوع</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('btn-quit-chess').onclick = handleQuit;
  document.getElementById('btn-resign-chess').onclick = handleResign;

  _chess = new Chess();
  buildBoard();
  _unsub = subscribeChessRoom(_roomId, onRoomUpdate);
}

function buildBoard() {
  const boardEl = document.getElementById('chess-board');
  boardEl.innerHTML = '';
  // if I'm black, flip
  const flip = _myColor === 'b';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const row = flip ? r : 7 - r;
      const col = flip ? 7 - c : c;
      const square = String.fromCharCode(97 + col) + (row + 1); // a1..h8
      const isLight = (row + col) % 2 === 1;
      const cell = document.createElement('button');
      cell.dataset.sq = square;
      cell.style.cssText = `background:${isLight ? '#F0EDE4' : '#8A7A6B'};border:none;font-size:36px;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;justify-content:center;padding:0;line-height:1;`;
      cell.onclick = () => handleSquareClick(square);
      boardEl.appendChild(cell);
    }
  }
}

function onRoomUpdate(room) {
  document.getElementById('chess-white-name').textContent = room.player_white?.name || '—';
  document.getElementById('chess-black-name').textContent = room.player_black?.name || '— WAITING —';

  const myUid = _profile.id || _profile.uid;
  if (room.player_white?.id === myUid) document.getElementById('chess-white-card').style.borderColor = '#1C4B8E';
  if (room.player_black?.id === myUid) document.getElementById('chess-black-card').style.borderColor = '#1C4B8E';

  // Load FEN into chess engine
  if (room.fen) {
    try { _chess.load(room.fen); } catch (e) { console.error('bad fen', e); }
  }

  drawPieces();

  const statusEl = document.getElementById('chess-status');
  const wt = document.getElementById('chess-white-turn');
  const bt = document.getElementById('chess-black-turn');

  if (room.status === 'waiting') {
    statusEl.textContent = 'WAITING FOR OPPONENT...';
    wt.textContent = 'HOST'; bt.textContent = 'EMPTY';
  } else if (room.status === 'playing') {
    const turn = _chess.turn(); // 'w' or 'b'
    const isMyTurn = turn === _myColor;
    const inCheck = _chess.in_check();
    let statusText = isMyTurn ? '→ دورك الآن' : `→ دور الخصم`;
    if (inCheck) statusText += ' · CHECK ⚠';
    statusEl.textContent = statusText;
    wt.textContent = turn === 'w' ? '● YOUR TURN' : '';
    bt.textContent = turn === 'b' ? '● YOUR TURN' : '';
    wt.style.color = turn === 'w' ? '#2E8B57' : '#6B6659';
    bt.style.color = turn === 'b' ? '#2E8B57' : '#6B6659';
  } else if (room.status === 'finished') {
    handleFinished(room);
  }
}

function drawPieces() {
  const squares = document.querySelectorAll('#chess-board button');
  squares.forEach(cell => {
    const sq = cell.dataset.sq;
    const piece = _chess.get(sq);
    if (piece) {
      const key = piece.color + piece.type.toUpperCase();
      cell.textContent = PIECES[key] || '';
      cell.style.color = piece.color === 'w' ? '#FAFAF7' : '#0E1A2E';
      cell.style.textShadow = piece.color === 'w' ? '0 1px 2px rgba(0,0,0,0.5)' : 'none';
    } else {
      cell.textContent = '';
    }
    // reset highlight
    const isLight = ((sq.charCodeAt(0) - 97) + (parseInt(sq[1]) - 1)) % 2 === 1;
    cell.style.background = isLight ? '#F0EDE4' : '#8A7A6B';
    cell.style.boxShadow = '';
  });

  // highlight selected + legal moves
  if (_selectedSquare) {
    const selCell = document.querySelector(`[data-sq="${_selectedSquare}"]`);
    if (selCell) selCell.style.background = '#7FB77E';

    const moves = _chess.moves({ square: _selectedSquare, verbose: true });
    moves.forEach(m => {
      const cell = document.querySelector(`[data-sq="${m.to}"]`);
      if (cell) {
        cell.style.boxShadow = 'inset 0 0 0 4px rgba(46,139,87,0.5)';
      }
    });
  }
}

async function handleSquareClick(square) {
  const room = { fen: _chess.fen() }; // current state
  if (_chess.game_over()) return;
  if (_chess.turn() !== _myColor) return;

  const piece = _chess.get(square);

  if (_selectedSquare) {
    // Try to move
    const move = { from: _selectedSquare, to: square, promotion: 'q' };
    const result = _chess.move(move);
    if (result) {
      // Push to firestore
      const updates = {
        fen: _chess.fen(),
        moves: [..._chess.history()],
        turn: _chess.turn(),
      };
      // Check end conditions
      if (_chess.in_checkmate()) {
        updates.status = 'finished';
        updates.winner = _myColor; // I just moved, so I won
      } else if (_chess.in_stalemate() || _chess.in_draw() || _chess.insufficient_material() || _chess.in_threefold_repetition()) {
        updates.status = 'finished';
        updates.winner = 'draw';
      }
      try { await updateChessRoom(_roomId, updates); } catch (e) { console.error(e); }
      _selectedSquare = null;
      drawPieces();
      return;
    } else {
      // Invalid move - if clicked own piece, select it
      _selectedSquare = null;
      if (piece && piece.color === _myColor) {
        _selectedSquare = square;
      }
      drawPieces();
      return;
    }
  }

  // No selection - select if own piece
  if (piece && piece.color === _myColor) {
    _selectedSquare = square;
    drawPieces();
  }
}

async function handleFinished(room) {
  if (_resultRecorded) return;
  _resultRecorded = true;
  document.getElementById('chess-status').textContent = 'GAME FINISHED';
  document.getElementById('chess-result').style.display = 'block';

  const myUid = _profile.id || _profile.uid;
  const myName = _profile.name || _profile.email || 'موظف';
  let result, icon, title, sub;

  if (room.winner === 'draw') {
    result = 'draw'; icon = '🤝'; title = 'تعادل!'; sub = '+40 POINTS';
  } else if (room.winner === _myColor) {
    result = 'win'; icon = '🎉'; title = 'كش ملك! فوز'; sub = '+150 POINTS';
  } else {
    result = 'loss'; icon = '😔'; title = 'خسارة'; sub = '+10 POINTS';
  }

  document.getElementById('chess-result-icon').textContent = icon;
  document.getElementById('chess-result-title').textContent = title;
  document.getElementById('chess-result-sub').textContent = sub;

  try { await recordChessResult(myUid, myName, result); } catch (e) { console.error(e); }

  setTimeout(async () => {
    if (room.player_white?.id === myUid) {
      try { await deleteChessRoom(room.id); } catch (e) {}
    }
  }, 30000);
}

async function handleResign() {
  if (!confirm('هل تريد الاستسلام؟')) return;
  const opponentColor = _myColor === 'w' ? 'b' : 'w';
  try {
    await updateChessRoom(_roomId, {
      status: 'finished',
      winner: opponentColor,
    });
  } catch (e) { console.error(e); }
}

async function handleQuit() {
  if (_unsub) { _unsub(); _unsub = null; }
  if (_roomId && _myColor === 'w' && !_resultRecorded) {
    try { await deleteChessRoom(_roomId); } catch (e) {}
  }
  _roomId = null; _myColor = null;
  if (window.navigate) window.navigate('activities');
}
