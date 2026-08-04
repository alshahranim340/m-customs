import { getCurrentProfile } from '../app.js';
import { updateTriviaScore } from '../../../src/firebase/activitiesDb.js';

const CATEGORIES = {
  saudi: {
    name: '🌍 اعرف السعودية',
    code: 'SAUDI',
    questions: [
      { q: 'ما عاصمة المملكة العربية السعودية؟', a: ['جدة','الرياض','الدمام','مكة'], correct: 1 },
      { q: 'في أي عام تأسست المملكة العربية السعودية؟', a: ['1902م','1932م','1945م','1953م'], correct: 1 },
      { q: 'ما هي أكبر مدينة في السعودية من حيث المساحة؟', a: ['الرياض','جدة','الطائف','أبها'], correct: 0 },
      { q: 'أي مدينة تحتضن الكعبة المشرفة؟', a: ['المدينة','مكة','الطائف','جدة'], correct: 1 },
      { q: 'ما اسم أعلى قمة في السعودية؟', a: ['جبل سودة','جبل النور','جبل الرحمة','جبل ثور'], correct: 0 },
      { q: 'كم عدد مناطق السعودية الإدارية؟', a: ['10','12','13','15'], correct: 2 },
      { q: 'ما اسم عملة السعودية؟', a: ['الدينار','الريال','الدرهم','الجنيه'], correct: 1 },
      { q: 'ما اسم اليوم الوطني للسعودية؟', a: ['1 يناير','23 سبتمبر','15 مايو','12 يونيو'], correct: 1 },
      { q: 'ما هو أكبر منتج نفطي في السعودية؟', a: ['أرامكو','سابك','معادن','ستارك'], correct: 0 },
      { q: 'أي مدينة معروفة بـ"عروس البحر الأحمر"؟', a: ['ينبع','جدة','ضباء','رابغ'], correct: 1 },
      { q: 'ما اسم مشروع نيوم؟', a: ['مدينة صحراوية','مدينة ذكية','قرية سياحية','ميناء بحري'], correct: 1 },
      { q: 'أين تقع مدينة أبها؟', a: ['نجران','عسير','الباحة','جازان'], correct: 1 },
      { q: 'ما اسم أطول جسر يربط السعودية بالبحرين؟', a: ['جسر الملك سلمان','جسر الملك فهد','جسر الملك عبدالله','جسر الملك خالد'], correct: 1 },
      { q: 'ما اسم شركة الطيران الوطنية السعودية؟', a: ['طيران ناس','السعودية','فلاي دبي','طيران أديل'], correct: 1 },
      { q: 'كم عدد سكان السعودية تقريباً (2024)؟', a: ['20 مليون','30 مليون','35 مليون','50 مليون'], correct: 2 },
    ]
  },
  general: {
    name: '📚 معلومات عامة',
    code: 'GENERAL',
    questions: [
      { q: 'ما أكبر محيط في العالم؟', a: ['الأطلسي','الهادي','الهندي','المتجمد'], correct: 1 },
      { q: 'كم عدد كواكب المجموعة الشمسية؟', a: ['7','8','9','10'], correct: 1 },
      { q: 'ما أطول نهر في العالم؟', a: ['النيل','الأمازون','ميسيسيبي','اليانغتسي'], correct: 0 },
      { q: 'أين تقع أطول شلالات في العالم؟', a: ['كندا','فنزويلا','البرازيل','النرويج'], correct: 1 },
      { q: 'من مخترع الهاتف؟', a: ['أديسون','بيل','فراداي','تسلا'], correct: 1 },
      { q: 'كم قلب لدى الأخطبوط؟', a: ['1','2','3','4'], correct: 2 },
      { q: 'ما أسرع حيوان بري؟', a: ['الأسد','الفهد','النمر','الغزال'], correct: 1 },
      { q: 'كم لوناً في قوس قزح؟', a: ['5','6','7','8'], correct: 2 },
      { q: 'أطول برج في العالم؟', a: ['برج خليفة','برج إيفل','برج طوكيو','برج شنغهاي'], correct: 0 },
      { q: 'كم يوماً في السنة الميلادية؟', a: ['360','364','365','366'], correct: 2 },
      { q: 'ما رمز الذهب الكيميائي؟', a: ['Go','Gd','Au','Ag'], correct: 2 },
      { q: 'أعمق نقطة في المحيط؟', a: ['خندق ماريانا','خندق تونغا','خندق جاوة','خندق ياب'], correct: 0 },
      { q: 'من رسم الموناليزا؟', a: ['بيكاسو','فان جوخ','دافنشي','مايكل أنجلو'], correct: 2 },
      { q: 'ما أكثر لغة تحدثاً في العالم؟', a: ['الإنجليزية','الصينية','الإسبانية','الهندية'], correct: 1 },
      { q: 'ما اسم أكبر صحراء في العالم؟', a: ['الصحراء الكبرى','الربع الخالي','غوبي','أنتاركتيكا'], correct: 3 },
    ]
  },
  flags: {
    name: '🗺️ عواصم ومدن',
    code: 'CAPITALS',
    questions: [
      { q: 'ما عاصمة اليابان؟', a: ['بكين','طوكيو','سيول','بانكوك'], correct: 1 },
      { q: 'ما عاصمة فرنسا؟', a: ['برلين','لندن','باريس','روما'], correct: 2 },
      { q: 'ما عاصمة ألمانيا؟', a: ['ميونخ','برلين','هامبورغ','فرانكفورت'], correct: 1 },
      { q: 'ما عاصمة إيطاليا؟', a: ['ميلانو','فينيسيا','روما','نابولي'], correct: 2 },
      { q: 'ما عاصمة بريطانيا؟', a: ['مانشستر','ليفربول','لندن','أدنبرة'], correct: 2 },
      { q: 'ما عاصمة أستراليا؟', a: ['سيدني','ملبورن','كانبيرا','بيرث'], correct: 2 },
      { q: 'ما عاصمة كندا؟', a: ['تورنتو','مونتريال','أوتاوا','فانكوفر'], correct: 2 },
      { q: 'ما عاصمة البرازيل؟', a: ['ريو دي جانيرو','ساو باولو','برازيليا','سلفادور'], correct: 2 },
      { q: 'ما عاصمة كوريا الجنوبية؟', a: ['بوسان','سيول','إنشيون','دايجو'], correct: 1 },
      { q: 'ما عاصمة الهند؟', a: ['مومباي','كولكاتا','نيودلهي','بنغالور'], correct: 2 },
      { q: 'ما عاصمة تركيا؟', a: ['إسطنبول','أنقرة','إزمير','بورصة'], correct: 1 },
      { q: 'ما عاصمة إندونيسيا؟', a: ['جاكرتا','بالي','سومطرة','سورابايا'], correct: 0 },
      { q: 'ما عاصمة الأرجنتين؟', a: ['ريو','بوينس آيرس','مونتيفيديو','سانتياغو'], correct: 1 },
      { q: 'ما عاصمة المكسيك؟', a: ['غوادالاخارا','مونتيري','مكسيكو سيتي','بويبلا'], correct: 2 },
      { q: 'ما عاصمة روسيا؟', a: ['سانت بطرسبرغ','موسكو','كييف','مينسك'], correct: 1 },
    ]
  },
  higherlower: {
    name: '📊 أعلى / أدنى',
    code: 'HIGHERLOWER',
    questions: [
      { q: 'أيهما أكثر سكاناً؟', a: ['السعودية 35م','الإمارات 10م','مصر 110م','عمان 5م'], correct: 2 },
      { q: 'أيهما أكبر مساحة؟', a: ['روسيا','كندا','أمريكا','الصين'], correct: 0 },
      { q: 'أيهما أعلى؟', a: ['برج إيفل 300م','برج خليفة 828م','برج طوكيو 634م','برج بيزا 56م'], correct: 1 },
      { q: 'أيهما أطول نهر؟', a: ['النيل 6650كم','الأمازون 6400كم','اليانغتسي 6300كم','ميسيسيبي 6275كم'], correct: 0 },
      { q: 'أيهما أعمق محيط؟', a: ['الأطلسي','الهادي','الهندي','المتجمد'], correct: 1 },
      { q: 'أيهما أعلى جبل؟', a: ['إفرست 8848م','كي2 8611م','كليمنجارو 5895م','دنالي 6190م'], correct: 0 },
      { q: 'أيهما أكبر اقتصاد؟', a: ['ألمانيا','اليابان','الصين','أمريكا'], correct: 3 },
      { q: 'أيهما أكثر إنتاج نفط؟', a: ['السعودية','روسيا','أمريكا','العراق'], correct: 2 },
      { q: 'أيهما أسرع حيوان؟', a: ['الفهد 110كم/س','الحصان 80كم/س','الأسد 80كم/س','النمر 60كم/س'], correct: 0 },
      { q: 'أيهما أكبر صحراء؟', a: ['الصحراء الكبرى','أنتاركتيكا','الربع الخالي','غوبي'], correct: 1 },
      { q: 'أيهما أثقل معدن؟', a: ['الذهب','الرصاص','الحديد','النحاس'], correct: 0 },
      { q: 'أيهما أطول عمراً؟', a: ['السلحفاة','الفيل','الحوت','الببغاء'], correct: 0 },
      { q: 'أيهما أكثر مطاراً؟', a: ['السعودية 30','مصر 20','ألمانيا 40','أمريكا 5000+'], correct: 3 },
      { q: 'أيهما أعلى سعراً عادةً؟', a: ['ذهب','فضة','ألماس','نحاس'], correct: 2 },
      { q: 'أيهما أطول عمر بطارية؟', a: ['iPhone','Samsung','Xiaomi','Nokia قديم'], correct: 3 },
    ]
  }
};

let _profile, _category, _questions, _current, _score, _answered;

export async function renderTrivia(container) {
  _profile = getCurrentProfile();
  if (!_profile) {
    container.innerHTML = `<div style="padding:40px;text-align:center;">يجب تسجيل الدخول</div>`;
    return;
  }
  renderCategoryPicker(container);
}

function renderCategoryPicker(container) {
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
              <span class="modern-header-code">SDS/GAME/TRIVIA</span>
            </div>
            <div class="modern-header-title">🌍 مسابقة المعرفة</div>
            <div class="modern-header-sub">TRIVIA · CHOOSE A CATEGORY</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" onclick="navigate('activities')">
              <i class="ti ti-arrow-right"></i> رجوع
            </button>
          </div>
        </div>

        <div class="modern-section">
          <div class="modern-section-title">
            → CATEGORIES / الفئات
            <div class="divider"></div>
            <span class="count">04 categories</span>
          </div>
        </div>

        <div style="padding:0 24px 24px;display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
          ${Object.entries(CATEGORIES).map(([key, cat], i) => `
            <button onclick="triviaStart('${key}')" style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:22px;position:relative;overflow:hidden;text-align:right;cursor:pointer;font-family:'Tajawal',sans-serif;">
              <div style="position:absolute;top:0;right:0;width:6px;height:100%;background:${['#2E8B57','#1C4B8E','#C2410C','#CC2229'][i]};"></div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:2px;font-weight:700;">CATEGORY · ${String(i+1).padStart(3,'0')}</div>
              <div style="font-size:20px;color:#0E1A2E;font-weight:800;margin-top:6px;">${cat.name}</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#6B6659;margin-top:4px;letter-spacing:.5px;">${cat.code} · ${cat.questions.length} QUESTIONS</div>
              <div style="margin-top:14px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#1C4B8E;font-weight:700;">▶ ابدأ</div>
            </button>
          `).join('')}
        </div>
      </div>
    </div>`;

  window.triviaStart = (cat) => startGame(cat, container);
}

function startGame(catKey, container) {
  _category = catKey;
  const cat = CATEGORIES[catKey];
  _questions = [...cat.questions].sort(() => Math.random() - 0.5).slice(0, 10);
  _current = 0;
  _score = 0;
  _answered = false;
  renderGame(container);
}

function renderGame(container) {
  const cat = CATEGORIES[_category];
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
              <span class="modern-header-code">SDS/TRIVIA/${cat.code}</span>
            </div>
            <div class="modern-header-title">${cat.name}</div>
            <div class="modern-header-sub">TRIVIA · 10 QUESTIONS</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" onclick="navigate('game-trivia')">
              <i class="ti ti-arrow-right"></i> فئة أخرى
            </button>
          </div>
        </div>

        <div class="modern-stats modern-stats-3">
          <div class="modern-stat">
            <div class="modern-stat-lbl">01 · QUESTION</div>
            <div class="modern-stat-val" id="tv-num">01/10</div>
            <div class="modern-stat-hint">السؤال الحالي</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">02 · SCORE</div>
            <div class="modern-stat-val green" id="tv-score">00</div>
            <div class="modern-stat-hint">إجابات صحيحة</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">03 · POINTS</div>
            <div class="modern-stat-val blue" id="tv-points">00</div>
            <div class="modern-stat-hint">النقاط المكتسبة</div>
          </div>
        </div>

        <div id="tv-body" style="padding:24px;"></div>
      </div>
    </div>`;

  renderQuestion();
}

function renderQuestion() {
  const q = _questions[_current];
  document.getElementById('tv-num').textContent = `${String(_current + 1).padStart(2,'0')}/10`;
  document.getElementById('tv-score').textContent = String(_score).padStart(2, '0');
  document.getElementById('tv-points').textContent = String(_score * 10).padStart(2, '0');

  document.getElementById('tv-body').innerHTML = `
    <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:24px;max-width:700px;margin:0 auto;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;letter-spacing:2px;font-weight:700;">QUESTION · ${String(_current + 1).padStart(2,'0')}</div>
      <div style="font-size:20px;color:#0E1A2E;font-weight:700;margin-top:10px;line-height:1.6;">${q.q}</div>
      <div style="margin-top:22px;display:flex;flex-direction:column;gap:8px;" id="tv-answers">
        ${q.a.map((ans, i) => `
          <button data-idx="${i}" class="tv-ans" style="background:#FAFAF7;border:1.5px solid #E8E5DC;border-radius:6px;padding:14px 18px;text-align:right;font-family:'Tajawal',sans-serif;font-size:14px;cursor:pointer;color:#0E1A2E;font-weight:500;transition:all 0.15s;display:flex;align-items:center;gap:12px;">
            <span style="width:28px;height:28px;background:#F0EDE4;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;color:#6B6659;flex-shrink:0;">${String.fromCharCode(65 + i)}</span>
            <span>${ans}</span>
          </button>
        `).join('')}
      </div>
      <div id="tv-feedback" style="display:none;margin-top:16px;padding:14px;border-radius:6px;text-align:center;font-weight:700;"></div>
    </div>`;

  document.querySelectorAll('.tv-ans').forEach(btn => {
    btn.onmouseover = () => { if (!_answered) btn.style.borderColor = '#1C4B8E'; };
    btn.onmouseout = () => { if (!_answered) btn.style.borderColor = '#E8E5DC'; };
    btn.onclick = () => handleAnswer(parseInt(btn.dataset.idx));
  });
}

function handleAnswer(idx) {
  if (_answered) return;
  _answered = true;
  const q = _questions[_current];
  const buttons = document.querySelectorAll('.tv-ans');
  const feedback = document.getElementById('tv-feedback');

  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.correct) {
      btn.style.background = '#E7F5EE';
      btn.style.borderColor = '#2E8B57';
      btn.style.color = '#2E8B57';
    } else if (i === idx && i !== q.correct) {
      btn.style.background = '#FEF2F2';
      btn.style.borderColor = '#CC2229';
      btn.style.color = '#CC2229';
    }
  });

  if (idx === q.correct) {
    _score++;
    feedback.textContent = '✓ إجابة صحيحة! +10 نقاط';
    feedback.style.background = '#E7F5EE';
    feedback.style.color = '#2E8B57';
  } else {
    feedback.textContent = '✗ إجابة خاطئة';
    feedback.style.background = '#FEF2F2';
    feedback.style.color = '#CC2229';
  }
  feedback.style.display = 'block';

  setTimeout(() => {
    _current++;
    _answered = false;
    if (_current >= _questions.length) finish();
    else renderQuestion();
  }, 1500);
}

async function finish() {
  document.getElementById('tv-body').innerHTML = `
    <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:40px 24px;text-align:center;max-width:500px;margin:0 auto;">
      <div style="font-size:56px;margin-bottom:12px;">${_score >= 8 ? '🏆' : _score >= 5 ? '👏' : '💪'}</div>
      <div style="font-size:24px;color:#0E1A2E;font-weight:800;">${_score >= 8 ? 'ممتاز!' : _score >= 5 ? 'أحسنت!' : 'حاول مرة أخرى'}</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#6B6659;margin-top:6px;letter-spacing:.5px;">
        SCORE: ${_score}/10 · POINTS: +${_score * 10}
      </div>
      <div style="margin-top:20px;display:flex;gap:8px;justify-content:center;">
        <button class="modern-btn modern-btn-primary" onclick="navigate('game-trivia')">🔄 فئة أخرى</button>
        <button class="modern-btn" onclick="navigate('activities')">رجوع</button>
      </div>
    </div>`;

  try {
    await updateTriviaScore(_profile.id || _profile.uid, _profile.name || _profile.email || 'موظف', _score, _category);
  } catch (e) { console.error('trivia save error:', e); }
}
