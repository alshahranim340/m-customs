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
            <div class="modern-header-sub">EMPLOYEE GAMES · LEADERBOARDS · v3.0</div>
          </div>
          <div style="text-align:left;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">YOUR POINTS</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:28px;color:#1C4B8E;font-weight:800;letter-spacing:-1px;margin-top:2px;" id="hdr-points">0</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#2E8B57;font-weight:700;" id="hdr-level">▲ LEVEL 01</div>
          </div>
        </div>

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

        <!-- Multiplayer games section -->
        <div class="modern-section">
          <div class="modern-section-title">
            → MULTIPLAYER / ألعاب جماعية
            <div class="divider"></div>
            <span class="count">04 games</span>
          </div>
        </div>

        <div style="padding:0 24px 8px;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;margin-bottom:16px;">
          ${gameCard('001','⭕ إكس أو','TIC-TAC-TOE · MULTIPLAYER','#1C4B8E','LIVE','blue',[
            {lbl:'WINS',id:'xo-wins'},{lbl:'LOSSES',id:'xo-losses'},{lbl:'DRAWS',id:'xo-draws'}
          ],'⚔ تحدى موظف','game-xo','#1C4B8E')}

          ${gameCard('002','🔴 الأربعة في صف','CONNECT FOUR · MULTIPLAYER','#CC2229','LIVE','blue',[
            {lbl:'WINS',id:'c4-wins'},{lbl:'LOSSES',id:'c4-losses'},{lbl:'DRAWS',id:'c4-draws'}
          ],'⚔ تحدى موظف','game-c4','#CC2229')}

          ${gameCard('003','♟️ الشطرنج','CHESS · STRATEGIC MULTIPLAYER','#0E1A2E','LIVE','blue',[
            {lbl:'WINS',id:'chess-wins'},{lbl:'LOSSES',id:'chess-losses'},{lbl:'DRAWS',id:'chess-draws'}
          ],'♟️ تحدى موظف','game-chess','#0E1A2E')}

          ${gameCard('004','🏓 Ping Pong','TABLE TENNIS · REALTIME MULTIPLAYER','#2E8B57','LIVE','blue',[
            {lbl:'WINS',id:'pingpong-wins'},{lbl:'LOSSES',id:'pingpong-losses'}
          ],'🏓 تحدى موظف','game-pingpong','#2E8B57')}
        </div>

        <!-- Skill games section -->
        <div class="modern-section">
          <div class="modern-section-title">
            → SKILL & REFLEX / مهارة وردود فعل
            <div class="divider"></div>
            <span class="count">02 games</span>
          </div>
        </div>

        <div style="padding:0 24px 8px;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;margin-bottom:16px;">
          ${gameCard('003','🎯 Aim Trainer','TARGET PRACTICE · 30 SEC','#2E8B57','READY','green',[
            {lbl:'YOUR BEST',id:'aim-best'},{lbl:'GAMES',id:'aim-games'}
          ],'▶ ابدأ التدريب','game-aim','#2E8B57')}

          ${gameCard('004','⚡ Reaction Test','REACTION SPEED · 5 ROUNDS','#EDC22E','READY','green',[
            {lbl:'BEST MS',id:'reaction-best'},{lbl:'GAMES',id:'reaction-games'}
          ],'▶ اختبر ردة فعلك','game-reaction','#C2410C')}
        </div>

        <!-- Classic games section -->
        <div class="modern-section">
          <div class="modern-section-title">
            → CLASSIC / كلاسيكية
            <div class="divider"></div>
            <span class="count">04 games</span>
          </div>
        </div>

        <div style="padding:0 24px 8px;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;margin-bottom:16px;">
          ${gameCard('005','🐍 لعبة الثعبان','SNAKE · SINGLE PLAYER','#2E8B57','READY','green',[
            {lbl:'YOUR BEST',id:'snake-best'},{lbl:'GAMES',id:'snake-games'}
          ],'▶ ابدأ اللعب','game-snake','#0E1A2E')}

          ${gameCard('006','🎯 لعبة 2048','2048 · MERGE TILES','#EDC22E','READY','green',[
            {lbl:'YOUR BEST',id:'g2048-best'},{lbl:'GAMES',id:'g2048-games'}
          ],'▶ ابدأ اللعب','game-2048','#0E1A2E')}

          ${gameCard('007','🎴 ذاكرة البطاقات','MEMORY · MATCH PAIRS','#CC2229','READY','green',[
            {lbl:'BEST MOVES',id:'memory-best'},{lbl:'GAMES',id:'memory-games'}
          ],'▶ ابدأ اللعب','game-memory','#CC2229')}

          ${gameCard('008','🐸 لعبة الضفدع','FROGGER · CROSS THE ROAD','#2E8B57','READY','green',[
            {lbl:'YOUR BEST',id:'frogger-best'},{lbl:'GAMES',id:'frogger-games'}
          ],'▶ ابدأ اللعب','game-frogger','#2E8B57')}
        </div>

        <!-- Knowledge games section -->
        <div class="modern-section">
          <div class="modern-section-title">
            → KNOWLEDGE & WORDS / معرفة وكلمات
            <div class="divider"></div>
            <span class="count">04 games</span>
          </div>
        </div>

        <div style="padding:0 24px;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;margin-bottom:24px;">
          ${gameCard('009','🧩 ألغاز جمركية','CUSTOMS QUIZ · 10 QUESTIONS','#C2410C','READY','green',[
            {lbl:'YOUR BEST',id:'quiz-best'},{lbl:'GAMES',id:'quiz-games'}
          ],'▶ ابدأ الاختبار','game-quiz','#C2410C')}

          ${gameCard('010','🎪 لعبة الحروف','HANGMAN · GUESS WORDS','#1C4B8E','READY','green',[
            {lbl:'BEST WINS',id:'hangman-best'},{lbl:'GAMES',id:'hangman-games'}
          ],'▶ ابدأ اللعب','game-hangman','#1C4B8E')}

          ${gameCard('011','🌍 مسابقة المعرفة','TRIVIA · 4 CATEGORIES','#2E8B57','READY','green',[
            {lbl:'YOUR BEST',id:'trivia-best'},{lbl:'GAMES',id:'trivia-games'}
          ],'▶ اختر فئة','game-trivia','#2E8B57')}

          ${gameCard('012','💼 مسابقة التخصص','WORK QUIZ · 4 CATEGORIES','#CC2229','READY','green',[
            {lbl:'YOUR BEST',id:'work-best'},{lbl:'GAMES',id:'work-games'}
          ],'▶ اختر فئة','game-work','#CC2229')}
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
          <div id="leaderboard-body"><div class="loader"><div class="spinner"></div></div></div>
        </div>

      </div>
    </div>`;

  await loadData(profile);
}

function gameCard(num, title, sub, stripeColor, badge, badgeClass, stats, btnLabel, page, btnColor) {
  return `
    <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:18px;position:relative;overflow:hidden;">
      <div style="position:absolute;top:0;right:0;width:6px;height:100%;background:${stripeColor};"></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:2px;font-weight:700;">GAME · ${num}</div>
          <div style="font-size:16px;color:#0E1A2E;font-weight:800;margin-top:4px;">${title}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B6659;margin-top:2px;">${sub}</div>
        </div>
        <span class="modern-badge ${badgeClass}">${badge}</span>
      </div>
      <div style="background:#FAFAF7;border:1px solid #F0EDE4;border-radius:4px;padding:10px;margin-bottom:12px;display:grid;grid-template-columns:repeat(${stats.length},1fr);gap:8px;">
        ${stats.map(s => `
          <div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#8A8578;letter-spacing:1px;font-weight:700;text-transform:uppercase;">${s.lbl}</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:14px;color:#0E1A2E;font-weight:800;" id="${s.id}">00</div>
          </div>
        `).join('')}
      </div>
      <button onclick="navigate('${page}')" style="background:${btnColor};color:white;border:none;border-radius:6px;padding:10px 16px;font-family:Tajawal,sans-serif;font-size:12px;cursor:pointer;font-weight:700;letter-spacing:.3px;width:100%;">
        ${btnLabel}
      </button>
    </div>`;
}

async function loadData(profile) {
  try {
    const uid = profile.id || profile.uid;
    const [stats, leaderboard] = await Promise.all([
      getUserStats(uid),
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

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function renderStats(profile) {
  const uid = profile.id || profile.uid;
  const myIdx = _leaderboard.findIndex(u => u.id === uid);
  const rank = myIdx >= 0 ? `#${pad(myIdx + 1)}` : '—';

  setText('hdr-points', (_stats.total_points || 0).toLocaleString('en-US'));
  setText('hdr-level', `▲ LEVEL ${pad(_stats.level || 1)}`);
  setText('stat-rank', rank);
  setText('stat-games', pad(_stats.games_played || 0));
  setText('stat-wins', pad(_stats.wins || 0));
  setText('stat-streak', pad(_stats.streak_days || 0));

  // Multiplayer
  setText('xo-wins', pad(_stats.xo_wins || 0));
  setText('xo-losses', pad(_stats.xo_losses || 0));
  setText('xo-draws', pad(_stats.xo_draws || 0));
  setText('c4-wins', pad(_stats.c4_wins || 0));
  setText('c4-losses', pad(_stats.c4_losses || 0));
  setText('c4-draws', pad(_stats.c4_draws || 0));
  setText('chess-wins', pad(_stats.chess_wins || 0));
  setText('chess-losses', pad(_stats.chess_losses || 0));
  setText('chess-draws', pad(_stats.chess_draws || 0));
  setText('pingpong-wins', pad(_stats.pingpong_wins || 0));
  setText('pingpong-losses', pad(_stats.pingpong_losses || 0));

  // Skill
  setText('aim-best', pad(_stats.aim_best || 0));
  setText('aim-games', pad(_stats.aim_games || 0));
  setText('reaction-best', _stats.reaction_best && _stats.reaction_best !== 999 ? _stats.reaction_best + 'ms' : '—');
  setText('reaction-games', pad(_stats.reaction_games || 0));

  // Classic
  setText('snake-best', pad(_stats.snake_best || 0));
  setText('snake-games', pad(_stats.snake_games || 0));
  setText('g2048-best', pad(_stats.g2048_best || 0));
  setText('g2048-games', pad(_stats.g2048_games || 0));
  setText('memory-best', _stats.memory_best ? pad(_stats.memory_best) : '—');
  setText('memory-games', pad(_stats.memory_games || 0));
  setText('frogger-best', pad(_stats.frogger_best || 0));
  setText('frogger-games', pad(_stats.frogger_games || 0));

  // Knowledge
  setText('quiz-best', pad(_stats.quiz_best || 0));
  setText('quiz-games', pad(_stats.quiz_games || 0));
  setText('hangman-best', pad(_stats.hangman_best || 0));
  setText('hangman-games', pad(_stats.hangman_games || 0));
  setText('trivia-best', pad(_stats.trivia_best || 0));
  setText('trivia-games', pad(_stats.trivia_games || 0));
  setText('work-best', pad(_stats.work_best || 0));
  setText('work-games', pad(_stats.work_games || 0));
}

function renderLeaderboard(profile) {
  const uid = profile.id || profile.uid;
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
