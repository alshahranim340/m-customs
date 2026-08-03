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
  if (!snap.exists()) {
    return {
      total_points: 0, level: 1, games_played: 0,
      wins: 0, losses: 0, streak_days: 0, last_played: null,
      snake_best: 0, snake_games: 0,
      xo_wins: 0, xo_losses: 0, xo_draws: 0,
      quiz_best: 0, quiz_games: 0,
      memory_best: 0, memory_games: 0,
      c4_wins: 0, c4_losses: 0, c4_draws: 0,
      g2048_best: 0, g2048_games: 0,
    };
  }
  return { id: snap.id, ...snap.data() };
}

export async function addPoints(userId, userName, points, game) {
  const ref = doc(db, 'activity_stats', userId);
  const snap = await getDoc(ref);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (!snap.exists()) {
    await setDoc(ref, {
      user_id: userId, user_name: userName,
      total_points: points, level: 1, games_played: 1,
      wins: 0, losses: 0, streak_days: 1, last_played: today,
      snake_best: 0, snake_games: 0,
      xo_wins: 0, xo_losses: 0, xo_draws: 0,
      quiz_best: 0, quiz_games: 0,
      memory_best: 0, memory_games: 0,
      c4_wins: 0, c4_losses: 0, c4_draws: 0,
      g2048_best: 0, g2048_games: 0,
      created_at: serverTimestamp(),
    });
  } else {
    const data = snap.data();
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
}

async function ensureStats(userId, userName) {
  const ref = doc(db, 'activity_stats', userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      user_id: userId, user_name: userName,
      total_points: 0, level: 1, games_played: 0,
      wins: 0, losses: 0, streak_days: 0, last_played: null,
      snake_best: 0, snake_games: 0,
      xo_wins: 0, xo_losses: 0, xo_draws: 0,
      quiz_best: 0, quiz_games: 0,
      memory_best: 0, memory_games: 0,
      c4_wins: 0, c4_losses: 0, c4_draws: 0,
      g2048_best: 0, g2048_games: 0,
      created_at: serverTimestamp(),
    });
  }
}

// ═════════════════════════════════════════════
// SNAKE
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
    user_id: userId, user_name: userName, game: 'snake',
    score, created_at: serverTimestamp(),
  });
}

// ═════════════════════════════════════════════
// XO
// ═════════════════════════════════════════════
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

// ═════════════════════════════════════════════
// QUIZ
// ═════════════════════════════════════════════
export async function updateQuizScore(userId, userName, score, totalQuestions) {
  await ensureStats(userId, userName);
  const ref = doc(db, 'activity_stats', userId);
  const snap = await getDoc(ref);
  const currentBest = snap.data().quiz_best || 0;
  const updates = { quiz_games: increment(1) };
  if (score > currentBest) updates.quiz_best = score;
  await updateDoc(ref, updates);
  const points = score * 10;
  await addPoints(userId, userName, points, 'quiz');
  await addDoc(collection(db, 'activity_games'), {
    user_id: userId, user_name: userName, game: 'quiz',
    score, total: totalQuestions, created_at: serverTimestamp(),
  });
}

// ═════════════════════════════════════════════
// MEMORY
// ═════════════════════════════════════════════
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

// ═════════════════════════════════════════════
// 2048
// ═════════════════════════════════════════════
export async function update2048Score(userId, userName, score, highTile) {
  await ensureStats(userId, userName);
  const ref = doc(db, 'activity_stats', userId);
  const snap = await getDoc(ref);
  const currentBest = snap.data().g2048_best || 0;
  const updates = { g2048_games: increment(1) };
  if (score > currentBest) updates.g2048_best = score;
  await updateDoc(ref, updates);
  const points = Math.floor(score / 10);
  await addPoints(userId, userName, points, '2048');
  await addDoc(collection(db, 'activity_games'), {
    user_id: userId, user_name: userName, game: '2048',
    score, high_tile: highTile, created_at: serverTimestamp(),
  });
}

// ═════════════════════════════════════════════
// CONNECT 4 (Multiplayer)
// ═════════════════════════════════════════════
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

export async function createC4Room(userId, userName) {
  const roomId = 'c4_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  await setDoc(doc(db, 'c4_rooms', roomId), {
    id: roomId,
    player_red: { id: userId, name: userName },
    player_yellow: null,
    board: Array(42).fill(''), // 6 rows x 7 cols
    turn: 'red',
    status: 'waiting',
    winner: null,
    winning_cells: null,
    created_at: serverTimestamp(),
  });
  return roomId;
}

export async function joinC4Room(roomId, userId, userName) {
  const ref = doc(db, 'c4_rooms', roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('الغرفة غير موجودة');
  const data = snap.data();
  if (data.status !== 'waiting') throw new Error('الغرفة ممتلئة أو انتهت');
  if (data.player_red?.id === userId) throw new Error('أنت بالفعل في هذه الغرفة');
  await updateDoc(ref, {
    player_yellow: { id: userId, name: userName },
    status: 'playing',
  });
}

export async function makeC4Move(roomId, column, color) {
  const ref = doc(db, 'c4_rooms', roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  if (data.status !== 'playing' || data.turn !== color) return;

  const board = [...data.board];
  // find lowest empty in column (6 rows, 7 cols)
  let placedRow = -1;
  for (let row = 5; row >= 0; row--) {
    const idx = row * 7 + column;
    if (!board[idx]) { board[idx] = color; placedRow = row; break; }
  }
  if (placedRow === -1) return; // column full

  const winCells = checkC4Winner(board, placedRow, column, color);
  const isDraw = !winCells && board.every(c => c);

  const updates = { board, turn: color === 'red' ? 'yellow' : 'red' };
  if (winCells) {
    updates.status = 'finished';
    updates.winner = color;
    updates.winning_cells = winCells;
  } else if (isDraw) {
    updates.status = 'finished';
    updates.winner = 'draw';
  }
  await updateDoc(ref, updates);
}

function checkC4Winner(board, row, col, color) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr, dc] of dirs) {
    const cells = [row * 7 + col];
    // forward
    for (let step = 1; step < 4; step++) {
      const r = row + dr * step, c = col + dc * step;
      if (r < 0 || r >= 6 || c < 0 || c >= 7) break;
      if (board[r * 7 + c] !== color) break;
      cells.push(r * 7 + c);
    }
    // backward
    for (let step = 1; step < 4; step++) {
      const r = row - dr * step, c = col - dc * step;
      if (r < 0 || r >= 6 || c < 0 || c >= 7) break;
      if (board[r * 7 + c] !== color) break;
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
  const q = query(
    collection(db, 'c4_rooms'),
    where('status', '==', 'waiting'),
    orderBy('created_at', 'desc'),
    limit(10)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteC4Room(roomId) {
  await deleteDoc(doc(db, 'c4_rooms', roomId));
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
// XO (multiplayer)
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
  if (data.status !== 'waiting') throw new Error('الغرفة ممتلئة أو انتهت');
  if (data.player_x?.id === userId) throw new Error('أنت بالفعل في هذه الغرفة');
  await updateDoc(ref, {
    player_o: { id: userId, name: userName },
    status: 'playing',
  });
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
  const q = query(
    collection(db, 'xo_rooms'),
    where('status', '==', 'waiting'),
    orderBy('created_at', 'desc'),
    limit(10)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteXoRoom(roomId) {
  await deleteDoc(doc(db, 'xo_rooms', roomId));
}

function checkXoWinner(board) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6],
  ];
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}
