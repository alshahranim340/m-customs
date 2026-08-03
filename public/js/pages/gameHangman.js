import { getCurrentProfile } from '../app.js';
import { updateHangmanScore, getUserStats } from '../../../src/firebase/activitiesDb.js';

const WORDS = [
  { word: 'شحنة', hint: 'ما يُنقل بحراً أو براً' },
  { word: 'جمرك', hint: 'مكان تفتيش البضائع' },
  { word: 'ميناء', hint: 'مكان رسو السفن' },
  { word: 'بوليصة', hint: 'مستند شحن رسمي' },
  { word: 'فاتورة', hint: 'ورقة الشراء' },
  { word: 'استيراد', hint: 'إدخال بضاعة من الخارج' },
  { word: 'تصدير', hint: 'إرسال بضاعة للخارج' },
  { word: 'حاوية', hint: 'صندوق كبير للنقل' },
  { word: 'سائق', hint: 'من يقود المركبة' },
  { word: 'شاحنة', hint: 'مركبة نقل كبيرة' },
  { word: 'رياض', hint: 'عاصمة السعودية' },
  { word: 'جدة', hint: 'عروس البحر الأحمر' },
  { word: 'دمام', hint: 'مدينة على الخليج' },
  { word: 'مكة', hint: 'أطهر بقاع الأرض' },
  { word: 'قهوة', hint: 'مشروب صباحي' },
  { word: 'تمر', hint: 'ثمر النخيل' },
  { word: 'كتاب', hint: 'يُقرأ للفائدة' },
  { word: 'مدرسة', hint: 'مكان التعلم' },
  { word: 'مستشفى', hint: 'مكان علاج المرضى' },
  { word: 'طائرة', hint: 'تطير في السماء' },
];

const MAX_WRONG = 6;
let _profile, _wins, _current, _guessed, _wrong, _word, _hint, _revealed, _gameOver;

export async function renderHangman(container) {
  _profile = getCurrentProfile();
  if (!_profile) {
    container.innerHTML = `<div style="padding:40px;text-align:center;">يجب تسجيل الدخول</div>`;
    return;
  }

  const stats = await getUserStats(_profile.id || _profile.uid);
  const best = stats.hangman_best || 0;
  _wins = 0;
  newRound();

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
              <span class="modern-header-code">SDS/GAME/HANGMAN</span>
            </div>
            <div class="modern-header-title">🎪 لعبة الحروف</div>
            <div class="modern-header-sub">HANGMAN · GUESS THE WORD · ${MAX_WRONG} TRIES</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" onclick="navigate('activities')">
              <i class="ti ti-arrow-right"></i> رجوع
            </button>
          </div>
        </div>

        <div class="modern-stats modern-stats-3">
          <div class="modern-stat">
            <div class="modern-stat-lbl">01 · WINS</div>
            <div class="modern-stat-val green" id="hm-wins">00</div>
            <div class="modern-stat-hint">فوز في هذه الجلسة</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">02 · WRONG</div>
            <div class="modern-stat-val danger" id="hm-wrong">00 / 06</div>
            <div class="modern-stat-hint">محاولات خاطئة</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">03 · BEST</div>
            <div class="modern-stat-val blue">${String(best).padStart(2,'0')}</div>
            <div class="modern-stat-hint">أفضل نتيجة</div>
          </div>
        </div>

        <div style="padding:24px;">
          <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:32px;max-width:600px;margin:0 auto;">
            <div style="text-align:center;font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;letter-spacing:2px;font-weight:700;">HINT</div>
            <div id="hm-hint" style="text-align:center;font-size:14px;color:#6B6659;margin-top:6px;font-style:italic;"></div>

            <div id="hm-word" style="text-align:center;font-size:38px;font-weight:800;color:#0E1A2E;margin:24px 0;letter-spacing:12px;direction:rtl;"></div>

            <div id="hm-figure" style="text-align:center;font-size:56px;margin:16px 0;"></div>

            <div id="hm-keyboard" style="display:grid;grid-template-columns:repeat(10,1fr);gap:4px;margin-top:20px;"></div>

            <div id="hm-result" style="display:none;text-align:center;margin-top:20px;padding:16px;border-radius:6px;"></div>
          </div>
        </div>
      </div>
    </div>`;

  render();
}

function newRound() {
  const item = WORDS[Math.floor(Math.random() * WORDS.length)];
  _word = item.word;
  _hint = item.hint;
  _guessed = new Set();
  _wrong = 0;
  _revealed = _word.split('').map(() => false);
  _gameOver = false;
}

function render() {
  document.getElementById('hm-wins').textContent = String(_wins).padStart(2, '0');
  document.getElementById('hm-wrong').textContent = `${String(_wrong).padStart(2,'0')} / ${MAX_WRONG.toString().padStart(2,'0')}`;
  document.getElementById('hm-hint').textContent = _hint;

  // word display
  const chars = _word.split('').map((ch, i) => {
    if (_revealed[i]) return `<span>${ch}</span>`;
    return `<span style="color:#E8E5DC;border-bottom:3px solid #0E1A2E;padding:0 4px;">_</span>`;
  }).join(' ');
  document.getElementById('hm-word').innerHTML = chars;

  // hangman figure
  const figures = ['😊','🙂','😐','😟','😰','😱','💀'];
  document.getElementById('hm-figure').textContent = figures[Math.min(_wrong, 6)];

  // keyboard
  const arabic = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي';
  const kb = document.getElementById('hm-keyboard');
  kb.innerHTML = arabic.split('').map(letter => {
    const isGuessed = _guessed.has(letter);
    const isInWord = _word.includes(letter);
    let bg = 'white', color = '#0E1A2E', border = '#E8E5DC';
    if (isGuessed) {
      if (isInWord) { bg = '#E7F5EE'; color = '#2E8B57'; border = '#2E8B57'; }
      else { bg = '#FEF2F2'; color = '#CC2229'; border = '#CC2229'; }
    }
    return `<button class="hm-key" data-letter="${letter}" ${isGuessed || _gameOver ? 'disabled' : ''}
      style="background:${bg};color:${color};border:1.5px solid ${border};border-radius:4px;padding:10px 4px;font-family:'Tajawal',sans-serif;font-size:16px;font-weight:700;cursor:${isGuessed || _gameOver ? 'default' : 'pointer'};transition:all 0.15s;">
      ${letter}
    </button>`;
  }).join('');

  document.querySelectorAll('.hm-key').forEach(btn => {
    btn.onclick = () => guessLetter(btn.dataset.letter);
  });
}

function guessLetter(letter) {
  if (_gameOver || _guessed.has(letter)) return;
  _guessed.add(letter);

  if (_word.includes(letter)) {
    _word.split('').forEach((ch, i) => {
      if (ch === letter) _revealed[i] = true;
    });
    if (_revealed.every(r => r)) win();
  } else {
    _wrong++;
    if (_wrong >= MAX_WRONG) lose();
  }
  render();
}

async function win() {
  _wins++;
  _gameOver = true;
  render();
  const res = document.getElementById('hm-result');
  res.style.display = 'block';
  res.style.background = '#E7F5EE';
  res.style.color = '#2E8B57';
  res.innerHTML = `
    <div style="font-size:32px;">🎉</div>
    <div style="font-size:18px;font-weight:800;margin-top:6px;">أحسنت! فزت</div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:11px;margin-top:6px;letter-spacing:.5px;">+15 POINTS</div>
    <div style="display:flex;gap:8px;justify-content:center;margin-top:12px;">
      <button class="modern-btn modern-btn-primary" onclick="hmNextRound()">▶ كلمة جديدة</button>
      <button class="modern-btn" onclick="hmFinish()">إنهاء</button>
    </div>`;
  window.hmNextRound = () => { newRound(); document.getElementById('hm-result').style.display = 'none'; render(); };
  window.hmFinish = finish;
}

function lose() {
  _gameOver = true;
  _revealed = _revealed.map(() => true);
  render();
  const res = document.getElementById('hm-result');
  res.style.display = 'block';
  res.style.background = '#FEF2F2';
  res.style.color = '#CC2229';
  res.innerHTML = `
    <div style="font-size:32px;">💀</div>
    <div style="font-size:18px;font-weight:800;margin-top:6px;">خسرت! الكلمة: ${_word}</div>
    <div style="display:flex;gap:8px;justify-content:center;margin-top:12px;">
      <button class="modern-btn modern-btn-primary" onclick="hmNextRound()">▶ كلمة جديدة</button>
      <button class="modern-btn" onclick="hmFinish()">إنهاء</button>
    </div>`;
  window.hmNextRound = () => { newRound(); document.getElementById('hm-result').style.display = 'none'; render(); };
  window.hmFinish = finish;
}

async function finish() {
  if (_wins > 0) {
    try {
      await updateHangmanScore(_profile.id || _profile.uid, _profile.name || _profile.email || 'موظف', _wins);
    } catch (e) { console.error('hangman save error:', e); }
  }
  if (window.navigate) window.navigate('activities');
}
