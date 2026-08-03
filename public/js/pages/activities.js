import { getCurrentProfile } from '../app.js';
import { getUserStats, getLeaderboard } from '../../../src/firebase/activitiesDb.js';

let _stats = null;
let _leaderboard = [];

export async function renderActivities(container) {
  const profile = getCurrentProfile();
  if (!profile) {
    container.innerHTML = `<div class="page-body" style="padding:40px;text-align:center;">
      <div style="font-size:14px;color:#697386;">يجب تسجيل الدخول أولاً</div>
    </div>`;
    return;
  }

  container.innerHTML = `
    <div class="page-body" style="padding:20px 24px;background:#F5F3EC;">
      <div class="modern-page">

        <!-- Header -->
        <div class="modern-header">
          <div class="modern-header-brand">
            <div class="modern-header-badges">
              <div class="modern-header-dots">
                <span class="modern-header-dot" style="background:#CC2229;"></span>
                <span class="modern-header-dot" style="background:#1C4B8E;"></span>
                <span class="modern-header-dot" style="background:#2E8B57;"></span>
              </div>
              <span class="modern-header-code">SDS/ACTIVITIES/2026</span>
            </div>
            <div class="modern-header-title">🎮 الفعاليات</div>
            <div class="modern-header-sub">EMPLOYEE GAMES · LEADERBOARDS · v1.0</div>
          </div>
          <div style="text-align:left;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">YOUR POINTS</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:28px;color:#1C4B8E;font-weight:800;letter-spacing:-1px;margin-top:2px;" id="hdr-points">0</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#2E8B57;font-weight:700;" id="hdr-level">▲ LEVEL 01</div>
          </div>
        </div>

        <!-- Stats -->
        <div class="modern-stats modern-stats-4">
          <div class="modern-stat">
            <div class="modern-stat-lbl">01 · RANK</div>
            <div class="modern-stat-val" id="stat-rank">—</div>
            <div class="modern-stat-hint">ترتيبك بين الموظفين</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">02 · GAMES</div>
            <div class="modern-stat-val blue" id="stat-games">00</div>
            <div class="modern-stat-hint">إجمالي جلسات اللعب</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">03 · WINS</div>
            <div class="modern-stat-val green" id="stat-wins">00</div>
            <div class="modern-stat-hint">عدد الفوز</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">04 · STREAK 🔥</div>
            <div class="modern-stat-val amber" id="stat-streak">00</div>
            <div class="modern-stat-hint">أيام متتالية</div>
          </div>
        </div>

        <!-- Available games -->
        <div class="modern-section">
          <div class="modern-section-title">
            → AVAILABLE GAMES / الألعاب المتاحة
            <div class="divider"></div>
            <span class="count">04 games</span>
          </div>
        </div>

        <div style="padding:0 24px;display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:24px;">

          <!-- Snake -->
          <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:18px;position:relative;overflow:hidden;">
            <div style="position:absolute;top:0;right:0;width:6px;height:100%;background:#2E8B57;"></div>
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
              <div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:2px;font-weight:700;">GAME · 001</div>
                <div style="font-size:18px;color:#0E1A2E;font-weight:800;margin-top:4px;">🐍 لعبة الثعبان</div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#6B6659;margin-top:2px;">SNAKE · SINGLE PLAYER</div>
              </div>
              <span class="modern-badge green">READY</span>
            </div>
            <div style="background:#FAFAF7;border:1px solid #F0EDE4;border-radius:4px;padding:10px;margin-bottom:12px;display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
              <div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#8A8578;letter-spacing:1px;font-weight:700;text-transform:uppercase;">YOUR BEST</div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:16px;color:#0E1A2E;font-weight:800;" id="snake-best">00</div>
              </div>
              <div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#8A8578;letter-spacing:1px;font-weight:700;text-transform:uppercase;">GAMES</div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:16px;color:#0E1A2E;font-weight:800;" id="snake-games">00</div>
              </div>
            </div>
            <button onclick="navigate('game-snake')" style="background:#0E1A2E;color:white;border:none;border-radius:6px;padding:10px 16px;font-family:Tajawal,sans-serif;font-size:12px;cursor:pointer;font-weight:700;letter-spacing:.3px;width:100%;">
              ▶ ابدأ اللعب
            </button>
          </div>

          <!-- Tic-Tac-Toe -->
          <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:18px;position:relative;overflow:hidden;">
            <div style="position:absolute;top:0;right:0;width:6px;height:100%;background:#1C4B8E;"></div>
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
              <div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:2px;font-weight:700;">GAME · 002</div>
                <div style="font-size:18px;color:#0E1A2E;font-weight:800;margin-top:4px;">⭕ إكس أو</div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#6B6659;margin-top:2px;">TIC-TAC-TOE · MULTIPLAYER</div>
              </div>
              <span class="modern-badge blue">LIVE</span>
            </div>
            <div style="background:#FAFAF7;border:1px solid #F0EDE4;border-radius:4px;padding:10px;margin-bottom:12px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
              <div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#8A8578;letter-spacing:1px;font-weight:700;text-transform:uppercase;">WINS</div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:16px;color:#2E8B57;font-weight:800;" id="xo-wins">00</div>
              </div>
              <div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#8A8578;letter-spacing:1px;font-weight:700;text-transform:uppercase;">LOSSES</div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:16px;color:#CC2229;font-weight:800;" id="xo-losses">00</div>
              </div>
              <div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#8A8578;letter-spacing:1px;font-weight:700;text-transform:uppercase;">DRAWS</div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:16px;color:#6B6659;font-weight:800;" id="xo-draws">00</div>
              </div>
            </div>
            <button onclick="navigate('game-xo')" style="background:#1C4B8E;color:white;border:none;border-radius:6px;padding:10px 16px;font-family:Tajawal,sans-serif;font-size:12px;cursor:pointer;font-weight:700;letter-spacing:.3px;width:100%;">
              ⚔ تحدى موظف
            </button>
          </div>

          <!-- Quiz - coming soon -->
          <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:18px;position:relative;overflow:hidden;opacity:0.6;">
            <div style="position:absolute;top:0;right:0;width:6px;height:100%;background:#C2410C;"></div>
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
              <div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:2px;font-weight:700;">GAME · 003</div>
                <div style="font-size:18px;color:#0E1A2E;font-weight:800;margin-top:4px;">🧩 ألغاز جمركية</div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#6B6659;margin-top:2px;">CUSTOMS QUIZ · TRIVIA</div>
              </div>
              <span class="modern-badge amber">SOON</span>
            </div>
            <div style="background:#FAFAF7;border:1px solid #F0EDE4;border-radius:4px;padding:14px;margin-bottom:12px;text-align:center;">
              <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#8A8578;letter-spacing:1px;">50 QUESTIONS · CUSTOMS & LOGISTICS</div>
            </div>
            <button disabled style="background:#F5F3EC;color:#8A8578;border:1px solid #E8E5DC;border-radius:6px;padding:10px 16px;font-family:Tajawal,sans-serif;font-size:12px;cursor:not-allowed;font-weight:700;letter-spacing:.3px;width:100%;">
              🔒 قريباً
            </button>
          </div>

          <!-- Memory - coming soon -->
          <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:18px;position:relative;overflow:hidden;opacity:0.6;">
            <div style="position:absolute;top:0;right:0;width:6px;height:100%;background:#CC2229;"></div>
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
              <div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:2px;font-weight:700;">GAME · 004</div>
                <div style="font-size:18px;color:#0E1A2E;font-weight:800;margin-top:4px;">🎴 ذاكرة البطاقات</div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#6B6659;margin-top:2px;">MEMORY CARDS · MATCH PAIRS</div>
              </div>
              <span class="modern-badge amber">SOON</span>
            </div>
            <div style="background:#FAFAF7;border:1px solid #F0EDE4;border-radius:4px;padding:14px;margin-bottom:12px;text-align:center;">
              <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#8A8578;letter-spacing:1px;">4 DIFFICULTY LEVELS</div>
            </div>
            <button disabled style="background:#F5F3EC;color:#8A8578;border:1px solid #E8E5DC;border-radius:6px;padding:10px 16px;font-family:Tajawal,sans-serif;font-size:12px;cursor:not-allowed;font-weight:700;letter-spacing:.3px;width:100%;">
              🔒 قريباً
            </button>
          </div>

        </div>

        <!-- Leaderboard -->
        <div class="modern-section">
          <div class="modern-section-title">
            → LEADERBOARD / لوحة المتصدرين
            <div class="divider"></div>
            <span class="count" id="lb-count">TOP 10</span>
          </div>
        </div>

        <div class="modern-list">
          <div id="leaderboard-body">
            <div class="loader"><div class="spinner"></div></div>
          </div>
        </div>

      </div>
    </div>`;

  await loadData(profile);
}

async function loadData(profile) {
  try {
    const [stats, leaderboard] = await Promise.all([
      getUserStats(profile.uid || profile.id),
      getLeaderboard(10),
    ]);
    _stats = stats;
    _leaderboard = leaderboard;
    renderStats(profile);
    renderLeaderboard(profile);
  } catch (e) {
    console.error('Error loading activities:', e);
  }
}

function pad(n) { return String(n || 0).padStart(2, '0'); }

function renderStats(profile) {
  const uid = profile.uid || profile.id;
  const myIdx = _leaderboard.findIndex(u => u.id === uid);
  const rank = myIdx >= 0 ? `#${pad(myIdx + 1)}` : '—';

  document.getElementById('hdr-points').textContent = (_stats.total_points || 0).toLocaleString('en-US');
  document.getElementById('hdr-level').textContent = `▲ LEVEL ${pad(_stats.level || 1)}`;
  document.getElementById('stat-rank').textContent = rank;
  document.getElementById('stat-games').textContent = pad(_stats.games_played || 0);
  document.getElementById('stat-wins').textContent = pad(_stats.wins || 0);
  document.getElementById('stat-streak').textContent = pad(_stats.streak_days || 0);
  document.getElementById('snake-best').textContent = pad(_stats.snake_best || 0);
  document.getElementById('snake-games').textContent = pad(_stats.snake_games || 0);
  document.getElementById('xo-wins').textContent = pad(_stats.xo_wins || 0);
  document.getElementById('xo-losses').textContent = pad(_stats.xo_losses || 0);
  document.getElementById('xo-draws').textContent = pad(_stats.xo_draws || 0);
}

function renderLeaderboard(profile) {
  const uid = profile.uid || profile.id;
  const el = document.getElementById('leaderboard-body');

  if (_leaderboard.length === 0) {
    el.innerHTML = `<div class="modern-empty">
      <div class="modern-empty-icon">🎮</div>
      <div class="modern-empty-title">لا يوجد لاعبون بعد</div>
      <div class="modern-empty-sub">BE THE FIRST</div>
    </div>`;
    return;
  }

  document.getElementById('lb-count').textContent = `TOP ${pad(_leaderboard.length)}`;

  el.innerHTML = `<div class="modern-list-box">${_leaderboard.map((u, idx) => {
    const isMe = u.id === uid;
    const rank = idx + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
    const rankColor = rank === 1 ? '#C2410C' : rank === 2 ? '#6B6659' : rank === 3 ? '#C2410C' : '#8A8578';
    const bgGradient = rank === 1 ? 'linear-gradient(90deg,#FFF7ED 0%,transparent 30%)'
      : rank === 2 ? 'linear-gradient(90deg,#F1F5F9 0%,transparent 30%)'
      : rank === 3 ? 'linear-gradient(90deg,#FEF3EC 0%,transparent 30%)'
      : isMe ? 'linear-gradient(90deg,#EFF4FB 0%,transparent 40%)' : '';
    const initial = (u.user_name || '?').charAt(0);
    const wins = u.wins || 0;
    const losses = u.losses || 0;
    const wl = wins - losses;
    const wlColor = wl > 0 ? 'green' : wl < 0 ? 'red' : 'gray';

    return `
      <div style="padding:14px 18px;border-bottom:1px solid #F0EDE4;display:grid;grid-template-columns:auto auto 1fr auto auto;gap:14px;align-items:center;background:${bgGradient};${isMe ? 'border-right:3px solid #1C4B8E;' : ''}">
        <div style="font-family:'JetBrains Mono',monospace;font-size:14px;color:${rankColor};font-weight:800;white-space:nowrap;">${medal} #${pad(rank)}</div>
        <div style="width:36px;height:36px;background:${isMe ? '#1C4B8E' : '#0E1A2E'};color:white;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;">${initial}</div>
        <div>
          <div style="font-size:13px;font-weight:700;color:#0E1A2E;">${u.user_name || 'موظف'} ${isMe ? '<span style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:#1C4B8E;font-weight:700;">· YOU</span>' : ''}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#6B6659;margin-top:2px;letter-spacing:.3px;">→ LEVEL ${pad(u.level || 1)} · ${pad(u.games_played || 0)} GAMES</div>
        </div>
        <span class="modern-badge ${wlColor}">${pad(wins)}W - ${pad(losses)}L</span>
        <div style="font-family:'JetBrains Mono',monospace;font-size:16px;color:${isMe ? '#1C4B8E' : '#0E1A2E'};font-weight:800;">${(u.total_points || 0).toLocaleString('en-US')}</div>
      </div>`;
  }).join('')}</div>`;
}
