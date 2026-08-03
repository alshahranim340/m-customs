import { getCurrentProfile } from '../app.js';
import { updateReactionScore, getUserStats } from '../../../src/firebase/activitiesDb.js';

const ROUNDS = 5;
let _profile, _times, _current, _state, _startTime, _timeoutId, _best;

export async function renderReaction(container) {
  _profile = getCurrentProfile();
  if (!_profile) {
    container.innerHTML = `<div style="padding:40px;text-align:center;">يجب تسجيل الدخول</div>`;
    return;
  }

  const stats = await getUserStats(_profile.id || _profile.uid);
  _best = stats.reaction_best === 999 ? 0 : (stats.reaction_best || 0);
  _times = []; _current = 0; _state = 'idle';

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
              <span class="modern-header-code">SDS/GAME/REACTION</span>
            </div>
            <div class="modern-header-title">⚡ Reaction Test</div>
            <div class="modern-header-sub">CLICK WHEN GREEN · 5 ROUNDS · MEASURE MS</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" onclick="navigate('activities')">
              <i class="ti ti-arrow-right"></i> رجوع
            </button>
          </div>
        </div>

        <div class="modern-stats modern-stats-3">
          <div class="modern-stat">
            <div class="modern-stat-lbl">01 · ROUND</div>
            <div class="modern-stat-val" id="rx-round">00/05</div>
            <div class="modern-stat-hint">الجولة الحالية</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">02 · AVG (MS)</div>
            <div class="modern-stat-val amber" id="rx-avg">—</div>
            <div class="modern-stat-hint">متوسط ملي ثانية</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">03 · BEST</div>
            <div class="modern-stat-val blue" id="rx-best">${_best ? _best + 'ms' : '—'}</div>
            <div class="modern-stat-hint">أفضل نتيجة</div>
          </div>
        </div>

        <div style="padding:24px;display:flex;justify-content:center;">
          <div id="rx-box" style="width:600px;height:340px;background:#CC2229;color:white;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;user-select:none;transition:background 0.05s;">
            <div style="font-size:26px;font-weight:800;" id="rx-msg">اضغط للبدء</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:12px;margin-top:10px;letter-spacing:1px;opacity:0.8;" id="rx-hint">WAIT FOR GREEN · CLICK FAST</div>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('rx-box').onclick = handleClick;
}

function handleClick() {
  const box = document.getElementById('rx-box');
  const msg = document.getElementById('rx-msg');
  const hint = document.getElementById('rx-hint');

  if (_state === 'idle' || _state === 'result') {
    // Start new round
    _current++;
    if (_current > ROUNDS) {
      finish();
      return;
    }
    _state = 'waiting';
    box.style.background = '#C2410C';
    msg.textContent = 'انتظر...';
    hint.textContent = 'DO NOT CLICK YET';
    document.getElementById('rx-round').textContent = `${String(_current).padStart(2,'0')}/05`;

    const delay = 1500 + Math.random() * 3000;
    _timeoutId = setTimeout(() => {
      _state = 'go';
      box.style.background = '#2E8B57';
      msg.textContent = 'اضغط الآن!';
      hint.textContent = 'CLICK NOW';
      _startTime = Date.now();
    }, delay);

  } else if (_state === 'waiting') {
    // Too early
    clearTimeout(_timeoutId);
    _state = 'idle';
    _current--;
    box.style.background = '#CC2229';
    msg.textContent = 'مبكر جداً! اضغط لإعادة';
    hint.textContent = 'TOO EARLY · TRY AGAIN';

  } else if (_state === 'go') {
    // Success
    const time = Date.now() - _startTime;
    _times.push(time);
    _state = 'result';
    box.style.background = '#1C4B8E';
    msg.textContent = `${time} ms`;
    hint.textContent = _current < ROUNDS ? 'CLICK FOR NEXT ROUND' : 'CLICK TO FINISH';

    const avg = Math.round(_times.reduce((a, b) => a + b, 0) / _times.length);
    document.getElementById('rx-avg').textContent = avg;
  }
}

async function finish() {
  const avg = Math.round(_times.reduce((a, b) => a + b, 0) / _times.length);
  const box = document.getElementById('rx-box');
  box.style.background = '#0E1A2E';
  box.style.cursor = 'default';
  box.onclick = null;
  box.innerHTML = `
    <div style="font-size:48px;margin-bottom:8px;">⚡</div>
    <div style="font-size:22px;font-weight:800;">${avg} ms</div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:12px;margin-top:6px;opacity:0.7;">${_times.join(' · ')} MS</div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:12px;margin-top:8px;color:#2E8B57;">+${Math.max(10, 500 - Math.floor(avg / 2))} POINTS</div>
    <div style="display:flex;gap:8px;margin-top:16px;">
      <button class="modern-btn modern-btn-primary" onclick="navigate('game-reaction')">🔄 إعادة</button>
      <button class="modern-btn" onclick="navigate('activities')">رجوع</button>
    </div>`;

  try {
    await updateReactionScore(_profile.id || _profile.uid, _profile.name || _profile.email || 'موظف', avg);
  } catch (e) { console.error('reaction save error:', e); }
}
