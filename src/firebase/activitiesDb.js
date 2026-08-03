import {
  collection, doc, setDoc, getDoc, getDocs, updateDoc,
  query, orderBy, limit, where, serverTimestamp, onSnapshot,
  addDoc, deleteDoc, increment
} from 'firebase/firestore';
import { db } from './config.js';

// ─────────────────────────────────────────────
// USER STATS — نقاط ومستويات الموظف
// ─────────────────────────────────────────────
export async function getUserStats(userId) {
  const snap = await getDoc(doc(db, 'activity_stats', userId));
  if (!snap.exists()) {
    return {
      total_points: 0,
      level: 1,
      games_played: 0,
      wins: 0,
      losses: 0,
      streak_days: 0,
      last_played: null,
      snake_best: 0,
      snake_games: 0,
      xo_wins: 0,
      xo_losses: 0,
      xo_draws: 0,
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
      user_id: userId,
      user_name: userName,
      total_points: points,
      level: 1,
      games_played: 1,
      wins: 0,
      losses: 0,
      streak_days: 1,
      last_played: today,
      snake_best: 0,
      snake_games: 0,
      xo_wins: 0,
      xo_losses: 0,
      xo_draws: 0,
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
      user_name: userName,
      total_points: newPoints,
      level: newLevel,
      games_played: increment(1),
      streak_days: streak,
      last_played: today,
    });
  }
}

export async function updateSnakeScore(userId, userName, score) {
  const ref = doc(db, 'activity_stats', userId);
  const snap = await getDoc(ref);
  const currentBest = snap.exists() ? (snap.data().snake_best || 0) : 0;
  if (score > currentBest) {
    await updateDoc(ref, { snake_best: score });
  }
  // Points: 1 per apple eaten
  await addPoints(userId, userName, score, 'snake');
  await addDoc(collection(db, 'activity_games'), {
    user_id: userId,
    user_name: userName,
    game: 'snake',
    score,
    created_at: serverTimestamp(),
  });
}

export async function recordXOResult(userId, userName, result) {
  const ref = doc(db, 'activity_stats', userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      user_id: userId, user_name: userName,
      total_points: 0, level: 1, games_played: 0,
      wins: 0, losses: 0, streak_days: 0, last_played: null,
      snake_best: 0, snake_games: 0,
      xo_wins: 0, xo_losses: 0, xo_draws: 0,
      created_at: serverTimestamp(),
    });
  }
  const points = result === 'win' ? 50 : result === 'draw' ? 15 : 5;
  const updates = { user_name: userName };
  if (result === 'win') { updates.xo_wins = increment(1); updates.wins = increment(1); }
  else if (result === 'loss') { updates.xo_losses = increment(1); updates.losses = increment(1); }
  else { updates.xo_draws = increment(1); }
  await updateDoc(ref, updates);
  await addPoints(userId, userName, points, 'xo');
}

// ─────────────────────────────────────────────
// LEADERBOARD
// ─────────────────────────────────────────────
export async function getLeaderboard(topN = 10) {
  const q = query(
    collection(db, 'activity_stats'),
    orderBy('total_points', 'desc'),
    limit(topN)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─────────────────────────────────────────────
// XO MATCHMAKING — رومات متعددة اللاعبين
// ─────────────────────────────────────────────
export async function createXoRoom(userId, userName) {
  const roomId = 'xo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  await setDoc(doc(db, 'xo_rooms', roomId), {
    id: roomId,
    player_x: { id: userId, name: userName },
    player_o: null,
    board: ['', '', '', '', '', '', '', '', ''],
    turn: 'x',
    status: 'waiting',
    winner: null,
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
  if (data.status !== 'playing') return;
  if (data.turn !== mark) return;
  if (data.board[index]) return;

  const board = [...data.board];
  board[index] = mark;

  const winner = checkXoWinner(board);
  const isDraw = !winner && board.every(c => c);

  const updates = {
    board,
    turn: mark === 'x' ? 'o' : 'x',
  };
  if (winner) {
    updates.status = 'finished';
    updates.winner = winner;
  } else if (isDraw) {
    updates.status = 'finished';
    updates.winner = 'draw';
  }
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
