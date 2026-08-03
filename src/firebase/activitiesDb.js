import {
  collection, doc, setDoc, getDoc, getDocs, updateDoc,
  query, orderBy, limit, where, serverTimestamp, onSnapshot,
  addDoc, deleteDoc, increment
} from 'firebase/firestore';
import { db } from './config.js';

// ═════════════════════════════════════════════
// USER STATS
// ═════════════════════════════════════════════
export async function getUserStats(userId) {
  const snap = await getDoc(doc(db, 'activity_stats', userId));
  if (!snap.exists()) return defaultStats();
  return { id: snap.id, ...snap.data() };
}

function defaultStats() {
  return {
    total_points: 0, level: 1, games_played: 0,
    wins: 0, losses: 0, streak_days: 0, last_played: null,
    snake_best: 0, snake_games: 0,
    xo_wins: 0, xo_losses: 0, xo_draws: 0,
    quiz_best: 0, quiz_games: 0,
    memory_best: 0, memory_games: 0,
    c4_wins: 0, c4_losses: 0, c4_draws: 0,
    g2048_best: 0, g2048_games: 0,
    chess_wins: 0, chess_losses: 0, chess_draws: 0,
    aim_best: 0, aim_games: 0,
    reaction_best: 999, reaction_games: 0,
    hangman_best: 0, hangman_games: 0,
    trivia_best: 0, trivia_games: 0,
    work_best: 0, work_games: 0,
    pingpong_wins: 0, pingpong_losses: 0,
    frogger_best: 0, frogger_games: 0,
  };
}

async function ensureStats(userId, userName) {
  const ref = doc(db, 'activity_stats', userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      user_id: userId, user_name: userName,
      ...defaultStats(),
      created_at: serverTimestamp(),
    });
  }
}

export async function addPoints(userId, userName, points, game) {
  await ensureStats(userId, userName);
  const ref = doc(db, 'activity_stats', userId);
  const snap = await getDoc(ref);
  const data = snap.data();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const newPoints = (data.total_points || 0) + points;
  const newLevel = Math.floor(newPoints / 500) + 1;
  const lastPlayed = data.last_played;
  let streak = data.streak_days || 0;
  if (lastPlayed !== today) {
    const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
    streak = lastPlayed === yesterday ? streak + 1 : 1;
  }
  await updateDoc(ref, {
    user_name: userName, total_points: newPoints, level: newLevel,
    games_played: increment(1), streak_days: streak, last_played: today,
  });
}

// ═════════════════════════════════════════════
// SNAKE / XO / QUIZ / MEMORY / 2048 / C4 (existing)
// ═════════════════════════════════════════════
export async function updateSnakeScore(userId, userName, score) {
  await ensureStats(userId, userName);
  const ref = doc(db, 'activity_stats', userId);
  const snap = await getDoc(ref);
  const currentBest = snap.data().snake_best || 0;
  const updates = { snake_games: increment(1) };
  if (score > currentBest) updates.snake_best = score;
  await updateDoc(ref, updates);
  await addPoints(userId, userName, score, 'snake');
  await addDoc(collection(db, 'activity_games'), {
    user_id: userId, user_name: userName, game: 'snake', score,
    created_at: serverTimestamp(),
  });
}

export async function recordXOResult(userId, userName, result) {
  await ensureStats(userId, userName);
  const points = result === 'win' ? 50 : result === 'draw' ? 15 : 5;
  const updates = { user_name: userName };
  if (result === 'win') { updates.xo_wins = increment(1); updates.wins = increment(1); }
  else if (result === 'loss') { updates.xo_losses = increment(1); updates.losses = increment(1); }
  else { updates.xo_draws = increment(1); }
  await updateDoc(doc(db, 'activity_stats', userId), updates);
  await addPoints(userId, userName, points, 'xo');
}

export async function updateQuizScore(userId, userName, score, totalQuestions) {
  await ensureStats(userId, userName);
  const ref = doc(db, 'activity_stats', userId);
  const snap = await getDoc(ref);
  const currentBest = snap.data().quiz_best || 0;
  const updates = { quiz_games: increment(1) };
  if (score > currentBest) updates.quiz_best = score;
  await updateDoc(ref, updates);
  await addPoints(userId, userName, score * 10, 'quiz');
  await addDoc(collection(db, 'activity_games'), {
    user_id: userId, user_name: userName, game: 'quiz',
    score, total: totalQuestions, created_at: serverTimestamp(),
  });
}

export async function updateMemoryScore(userId, userName, moves, timeSec) {
  await ensureStats(userId, userName);
  const ref = doc(db, 'activity_stats', userId);
  const snap = await getDoc(ref);
  const currentBest = snap.data().memory_best || 999;
  const updates = { memory_games: increment(1) };
  if (currentBest === 0 || moves < currentBest) updates.memory_best = moves;
  await updateDoc(ref, updates);
  const points = Math.max(10, 200 - moves * 2);
  await addPoints(userId, userName, points, 'memory');
  await addDoc(collection(db, 'activity_games'), {
    user_id: userId, user_name: userName, game: 'memory',
    moves, time_sec: timeSec, created_at: serverTimestamp(),
  });
}

export async function update2048Score(userId, userName, score, highTile) {
  await ensureStats(userId, userName);
  const ref = doc(db, 'activity_stats', userId);
  const snap = await getDoc(ref);
  const currentBest = snap.data().g2048_best || 0;
  const updates = { g2048_games: increment(1) };
  if (score > currentBest) updates.g2048_best = score;
  await updateDoc(ref, updates);
  await addPoints(userId, userName, Math.floor(score / 10), '2048');
  await addDoc(collection(db, 'activity_games'), {
    user_id: userId, user_name: userName, game: '2048',
    score, high_tile: highTile, created_at: serverTimestamp(),
  });
}

export async function recordC4Result(userId, userName, result) {
  await ensureStats(userId, userName);
  const points = result === 'win' ? 75 : result === 'draw' ? 20 : 5;
  const updates = { user_name: userName };
  if (result === 'win') { updates.c4_wins = increment(1); updates.wins = increment(1); }
  else if (result === 'loss') { updates.c4_losses = increment(1); updates.losses = increment(1); }
  else { updates.c4_draws = increment(1); }
  await updateDoc(doc(db, 'activity_stats', userId), updates);
  await addPoints(userId, userName, points, 'c4');
}

// ═════════════════════════════════════════════
// NEW: CHESS (multiplayer)
// ═════════════════════════════════════════════
export async function recordChessResult(userId, userName, result) {
  await ensureStats(userId, userName);
  const points = result === 'win' ? 150 : result === 'draw' ? 40 : 10;
  const updates = { user_name: userName };
  if (result === 'win') { updates.chess_wins = increment(1); updates.wins = increment(1); }
  else if (result === 'loss') { updates.chess_losses = increment(1); updates.losses = increment(1); }
  else { updates.chess_draws = increment(1); }
  await updateDoc(doc(db, 'activity_stats', userId), updates);
  await addPoints(userId, userName, points, 'chess');
}

export async function createChessRoom(userId, userName) {
  const roomId = 'chess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  await setDoc(doc(db, 'chess_rooms', roomId), {
    id: roomId,
    player_white: { id: userId, name: userName },
    player_black: null,
    fen: startFen,
    moves: [],
    turn: 'w',
    status: 'waiting',
    winner: null,
    created_at: serverTimestamp(),
  });
  return roomId;
}

export async function joinChessRoom(roomId, userId, userName) {
  const ref = doc(db, 'chess_rooms', roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('الغرفة غير موجودة');
  const data = snap.data();
  if (data.status !== 'waiting') throw new Error('الغرفة ممتلئة');
  if (data.player_white?.id === userId) throw new Error('أنت في هذه الغرفة');
  await updateDoc(ref, {
    player_black: { id: userId, name: userName },
    status: 'playing',
  });
}

export async function updateChessRoom(roomId, updates) {
  await updateDoc(doc(db, 'chess_rooms', roomId), updates);
}

export function subscribeChessRoom(roomId, callback) {
  return onSnapshot(doc(db, 'chess_rooms', roomId), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });
}

export async function getOpenChessRooms() {
  const q = query(
    collection(db, 'chess_rooms'),
    where('status', '==', 'waiting'),
    orderBy('created_at', 'desc'),
    limit(10)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteChessRoom(roomId) {
  await deleteDoc(doc(db, 'chess_rooms', roomId));
}

// ═════════════════════════════════════════════
// NEW: PING PONG (multiplayer, realtime)
// ═════════════════════════════════════════════
export async function recordPingPongResult(userId, userName, result) {
  await ensureStats(userId, userName);
  const points = result === 'win' ? 60 : 10;
  const updates = { user_name: userName };
  if (result === 'win') { updates.pingpong_wins = increment(1); updates.wins = increment(1); }
  else { updates.pingpong_losses = increment(1); updates.losses = increment(1); }
  await updateDoc(doc(db, 'activity_stats', userId), updates);
  await addPoints(userId, userName, points, 'pingpong');
}

export async function createPingPongRoom(userId, userName) {
  const roomId = 'pp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  await setDoc(doc(db, 'pingpong_rooms', roomId), {
    id: roomId,
    player_left: { id: userId, name: userName },
    player_right: null,
    // ball state
    ball_x: 0.5, ball_y: 0.5,
    ball_vx: 0.007, ball_vy: 0.005,
    // paddles (y positions 0-1)
    paddle_left: 0.5, paddle_right: 0.5,
    // scores
    score_left: 0, score_right: 0,
    status: 'waiting',
    winner: null,
    last_update: Date.now(),
    host_id: userId,
    created_at: serverTimestamp(),
  });
  return roomId;
}

export async function joinPingPongRoom(roomId, userId, userName) {
  const ref = doc(db, 'pingpong_rooms', roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('الغرفة غير موجودة');
  const data = snap.data();
  if (data.status !== 'waiting') throw new Error('الغرفة ممتلئة');
  if (data.player_left?.id === userId) throw new Error('أنت في هذه الغرفة');
  await updateDoc(ref, {
    player_right: { id: userId, name: userName },
    status: 'playing',
    last_update: Date.now(),
  });
}

export async function updatePingPongRoom(roomId, updates) {
  await updateDoc(doc(db, 'pingpong_rooms', roomId), updates);
}

export function subscribePingPongRoom(roomId, callback) {
  return onSnapshot(doc(db, 'pingpong_rooms', roomId), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });
}

export async function getOpenPingPongRooms() {
  const q = query(
    collection(db, 'pingpong_rooms'),
    where('status', '==', 'waiting'),
    orderBy('created_at', 'desc'),
    limit(10)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deletePingPongRoom(roomId) {
  await deleteDoc(doc(db, 'pingpong_rooms', roomId));
}

// ═════════════════════════════════════════════
// NEW: AIM TRAINER
// ═════════════════════════════════════════════
export async function updateAimScore(userId, userName, targetsHit) {
  await ensureStats(userId, userName);
  const ref = doc(db, 'activity_stats', userId);
  const snap = await getDoc(ref);
  const currentBest = snap.data().aim_best || 0;
  const updates = { aim_games: increment(1) };
  if (targetsHit > currentBest) updates.aim_best = targetsHit;
  await updateDoc(ref, updates);
  await addPoints(userId, userName, targetsHit * 2, 'aim');
  await addDoc(collection(db, 'activity_games'), {
    user_id: userId, user_name: userName, game: 'aim',
    score: targetsHit, created_at: serverTimestamp(),
  });
}

// ═════════════════════════════════════════════
// NEW: REACTION TEST
// ═════════════════════════════════════════════
export async function updateReactionScore(userId, userName, avgMs) {
  await ensureStats(userId, userName);
  const ref = doc(db, 'activity_stats', userId);
  const snap = await getDoc(ref);
  const currentBest = snap.data().reaction_best || 999;
  const updates = { reaction_games: increment(1) };
  if (avgMs < currentBest) updates.reaction_best = avgMs;
  await updateDoc(ref, updates);
  // Reward faster reactions
  const points = Math.max(10, Math.floor(500 - avgMs / 2));
  await addPoints(userId, userName, points, 'reaction');
  await addDoc(collection(db, 'activity_games'), {
    user_id: userId, user_name: userName, game: 'reaction',
    avg_ms: avgMs, created_at: serverTimestamp(),
  });
}

// ═════════════════════════════════════════════
// NEW: HANGMAN
// ═════════════════════════════════════════════
export async function updateHangmanScore(userId, userName, wins) {
  await ensureStats(userId, userName);
  const ref = doc(db, 'activity_stats', userId);
  const snap = await getDoc(ref);
  const currentBest = snap.data().hangman_best || 0;
  const updates = { hangman_games: increment(1) };
  if (wins > currentBest) updates.hangman_best = wins;
  await updateDoc(ref, updates);
  await addPoints(userId, userName, wins * 15, 'hangman');
  await addDoc(collection(db, 'activity_games'), {
    user_id: userId, user_name: userName, game: 'hangman',
    wins, created_at: serverTimestamp(),
  });
}

// ═════════════════════════════════════════════
// NEW: TRIVIA (general knowledge)
// ═════════════════════════════════════════════
export async function updateTriviaScore(userId, userName, score, category) {
  await ensureStats(userId, userName);
  const ref = doc(db, 'activity_stats', userId);
  const snap = await getDoc(ref);
  const currentBest = snap.data().trivia_best || 0;
  const updates = { trivia_games: increment(1) };
  if (score > currentBest) updates.trivia_best = score;
  await updateDoc(ref, updates);
  await addPoints(userId, userName, score * 10, 'trivia');
  await addDoc(collection(db, 'activity_games'), {
    user_id: userId, user_name: userName, game: 'trivia',
    score, category, created_at: serverTimestamp(),
  });
}

// ═════════════════════════════════════════════
// NEW: WORK/SPECIALIZATION
// ═════════════════════════════════════════════
export async function updateWorkScore(userId, userName, score, category) {
  await ensureStats(userId, userName);
  const ref = doc(db, 'activity_stats', userId);
  const snap = await getDoc(ref);
  const currentBest = snap.data().work_best || 0;
  const updates = { work_games: increment(1) };
  if (score > currentBest) updates.work_best = score;
  await updateDoc(ref, updates);
  await addPoints(userId, userName, score * 15, 'work');
  await addDoc(collection(db, 'activity_games'), {
    user_id: userId, user_name: userName, game: 'work',
    score, category, created_at: serverTimestamp(),
  });
}

// ═════════════════════════════════════════════
// NEW: FROGGER
// ═════════════════════════════════════════════
export async function updateFroggerScore(userId, userName, score) {
  await ensureStats(userId, userName);
  const ref = doc(db, 'activity_stats', userId);
  const snap = await getDoc(ref);
  const currentBest = snap.data().frogger_best || 0;
  const updates = { frogger_games: increment(1) };
  if (score > currentBest) updates.frogger_best = score;
  await updateDoc(ref, updates);
  await addPoints(userId, userName, score * 5, 'frogger');
  await addDoc(collection(db, 'activity_games'), {
    user_id: userId, user_name: userName, game: 'frogger',
    score, created_at: serverTimestamp(),
  });
}

// ═════════════════════════════════════════════
// LEADERBOARD
// ═════════════════════════════════════════════
export async function getLeaderboard(topN = 10) {
  const q = query(
    collection(db, 'activity_stats'),
    orderBy('total_points', 'desc'),
    limit(topN)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ═════════════════════════════════════════════
// XO / C4 (existing)
// ═════════════════════════════════════════════
export async function createXoRoom(userId, userName) {
  const roomId = 'xo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  await setDoc(doc(db, 'xo_rooms', roomId), {
    id: roomId,
    player_x: { id: userId, name: userName },
    player_o: null,
    board: ['', '', '', '', '', '', '', '', ''],
    turn: 'x', status: 'waiting', winner: null,
    created_at: serverTimestamp(),
  });
  return roomId;
}

export async function joinXoRoom(roomId, userId, userName) {
  const ref = doc(db, 'xo_rooms', roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('الغرفة غير موجودة');
  const data = snap.data();
  if (data.status !== 'waiting') throw new Error('الغرفة ممتلئة');
  if (data.player_x?.id === userId) throw new Error('أنت في هذه الغرفة');
  await updateDoc(ref, { player_o: { id: userId, name: userName }, status: 'playing' });
}

export async function makeXoMove(roomId, index, mark) {
  const ref = doc(db, 'xo_rooms', roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  if (data.status !== 'playing' || data.turn !== mark || data.board[index]) return;
  const board = [...data.board];
  board[index] = mark;
  const winner = checkXoWinner(board);
  const isDraw = !winner && board.every(c => c);
  const updates = { board, turn: mark === 'x' ? 'o' : 'x' };
  if (winner) { updates.status = 'finished'; updates.winner = winner; }
  else if (isDraw) { updates.status = 'finished'; updates.winner = 'draw'; }
  await updateDoc(ref, updates);
}

export function subscribeXoRoom(roomId, callback) {
  return onSnapshot(doc(db, 'xo_rooms', roomId), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });
}

export async function getOpenXoRooms() {
  const q = query(collection(db, 'xo_rooms'), where('status', '==', 'waiting'), orderBy('created_at', 'desc'), limit(10));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteXoRoom(roomId) { await deleteDoc(doc(db, 'xo_rooms', roomId)); }

function checkXoWinner(board) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

export async function createC4Room(userId, userName) {
  const roomId = 'c4_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  await setDoc(doc(db, 'c4_rooms', roomId), {
    id: roomId,
    player_red: { id: userId, name: userName },
    player_yellow: null,
    board: Array(42).fill(''),
    turn: 'red', status: 'waiting', winner: null, winning_cells: null,
    created_at: serverTimestamp(),
  });
  return roomId;
}

export async function joinC4Room(roomId, userId, userName) {
  const ref = doc(db, 'c4_rooms', roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('الغرفة غير موجودة');
  const data = snap.data();
  if (data.status !== 'waiting') throw new Error('الغرفة ممتلئة');
  if (data.player_red?.id === userId) throw new Error('أنت في هذه الغرفة');
  await updateDoc(ref, { player_yellow: { id: userId, name: userName }, status: 'playing' });
}

export async function makeC4Move(roomId, column, color) {
  const ref = doc(db, 'c4_rooms', roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  if (data.status !== 'playing' || data.turn !== color) return;
  const board = [...data.board];
  let placedRow = -1;
  for (let row = 5; row >= 0; row--) {
    const idx = row * 7 + column;
    if (!board[idx]) { board[idx] = color; placedRow = row; break; }
  }
  if (placedRow === -1) return;
  const winCells = checkC4Winner(board, placedRow, column, color);
  const isDraw = !winCells && board.every(c => c);
  const updates = { board, turn: color === 'red' ? 'yellow' : 'red' };
  if (winCells) { updates.status = 'finished'; updates.winner = color; updates.winning_cells = winCells; }
  else if (isDraw) { updates.status = 'finished'; updates.winner = 'draw'; }
  await updateDoc(ref, updates);
}

function checkC4Winner(board, row, col, color) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr, dc] of dirs) {
    const cells = [row * 7 + col];
    for (let step = 1; step < 4; step++) {
      const r = row + dr * step, c = col + dc * step;
      if (r < 0 || r >= 6 || c < 0 || c >= 7 || board[r * 7 + c] !== color) break;
      cells.push(r * 7 + c);
    }
    for (let step = 1; step < 4; step++) {
      const r = row - dr * step, c = col - dc * step;
      if (r < 0 || r >= 6 || c < 0 || c >= 7 || board[r * 7 + c] !== color) break;
      cells.unshift(r * 7 + c);
    }
    if (cells.length >= 4) return cells.slice(0, 4);
  }
  return null;
}

export function subscribeC4Room(roomId, callback) {
  return onSnapshot(doc(db, 'c4_rooms', roomId), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });
}

export async function getOpenC4Rooms() {
  const q = query(collection(db, 'c4_rooms'), where('status', '==', 'waiting'), orderBy('created_at', 'desc'), limit(10));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteC4Room(roomId) { await deleteDoc(doc(db, 'c4_rooms', roomId)); }
