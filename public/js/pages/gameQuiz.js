import { getCurrentProfile, toast } from '../app.js';
import { updateQuizScore } from '../../../src/firebase/activitiesDb.js';

const QUESTIONS = [
  { q: 'ما هو المستند الأساسي المطلوب لتخليص شحنة بحرية؟', a: ['بوليصة الشحن (B/L)', 'الفاتورة فقط', 'شهادة المنشأ فقط', 'قائمة التعبئة فقط'], correct: 0 },
  { q: 'ما هي المدة القصوى للسماح بتخزين البضائع في الميناء قبل فرض غرامات؟', a: ['5 أيام', '10 أيام', '15 يوم', '30 يوم'], correct: 2 },
  { q: 'ماذا يعني اختصار HS Code؟', a: ['نظام تنسيق التعريفة', 'رمز المنشأ', 'رمز الشاحن', 'رمز الميناء'], correct: 0 },
  { q: 'أي من هذه المدن ليست مدينة سعودية بها ميناء؟', a: ['جدة', 'الدمام', 'ينبع', 'الرياض'], correct: 3 },
  { q: 'ما هي نسبة ضريبة القيمة المضافة في السعودية؟', a: ['5%', '10%', '15%', '20%'], correct: 2 },
  { q: 'ما هو CIF في مصطلحات التجارة الدولية؟', a: ['تكلفة + تأمين + شحن', 'شهادة الاستيراد النهائي', 'تصريح الجمارك للاستيراد', 'الفاتورة الجمركية الدولية'], correct: 0 },
  { q: 'ما هو الرمز الجمركي لدولة الإمارات؟', a: ['SA', 'AE', 'BH', 'OM'], correct: 1 },
  { q: 'ما هي أطول جسر يربط السعودية بالبحرين؟', a: ['جسر الملك فهد', 'جسر الملك سلمان', 'جسر البطحاء', 'الجسر البري'], correct: 0 },
  { q: 'ما هو المستند الذي يثبت أن البضاعة صُنعت في بلد معين؟', a: ['بوليصة الشحن', 'شهادة المنشأ', 'الفاتورة التجارية', 'قائمة التعبئة'], correct: 1 },
  { q: 'ماذا يعني ETA في الشحن؟', a: ['وقت المغادرة المتوقع', 'وقت الوصول المتوقع', 'إجمالي المصاريف الإجمالية', 'رسوم النقل الإضافية'], correct: 1 },
  { q: 'ما هي منظمة الجمارك العالمية؟', a: ['WTO', 'WCO', 'ICC', 'IMO'], correct: 1 },
  { q: 'ما هو ETD؟', a: ['وقت المغادرة المتوقع', 'وقت الوصول المتوقع', 'إجمالي رسوم الشحن', 'رمز التخليص'], correct: 0 },
  { q: 'أي منفذ بحري هو الأكبر في المملكة العربية السعودية؟', a: ['ميناء الملك عبدالله', 'ميناء جدة الإسلامي', 'ميناء الجبيل', 'ميناء ينبع التجاري'], correct: 1 },
  { q: 'ما اسم منصة التخليص الجمركي السعودية؟', a: ['فسح', 'واصل', 'فاتورة', 'أبشر'], correct: 0 },
  { q: 'ما هو الحاوية 40 قدم القياسية؟', a: ['20 FT', '40 FT', '45 FT', 'HC'], correct: 1 },
  { q: 'ماذا يعني LCL في الشحن البحري؟', a: ['حاوية كاملة', 'حمولة أقل من حاوية', 'شحن جوي', 'شحن بري'], correct: 1 },
  { q: 'ما هي مدة سريان تأشيرة السائق للدخول للسعودية عبر منفذ البطحاء؟', a: ['24 ساعة', '48 ساعة', '72 ساعة', 'أسبوع'], correct: 2 },
  { q: 'ما هي الجهة المسؤولة عن هيئة الزكاة والضريبة والجمارك؟', a: ['وزارة المالية', 'وزارة التجارة', 'وزارة الاقتصاد', 'وزارة الصناعة'], correct: 0 },
];

let _profile, _questions, _current, _score, _answered;

export async function renderQuiz(container) {
  _profile = getCurrentProfile();
  if (!_profile) {
    container.innerHTML = `<div style="padding:40px;text-align:center;">يجب تسجيل الدخول</div>`;
    return;
  }

  // Shuffle 10 random questions
  _questions = [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 10);
  _current = 0;
  _score = 0;
  _answered = false;

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
              <span class="modern-header-code">SDS/GAME/QUIZ</span>
            </div>
            <div class="modern-header-title">🧩 ألغاز جمركية</div>
            <div class="modern-header-sub">CUSTOMS QUIZ · 10 QUESTIONS</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" onclick="navigate('activities')">
              <i class="ti ti-arrow-right"></i> رجوع
            </button>
          </div>
        </div>

        <div class="modern-stats modern-stats-3">
          <div class="modern-stat">
            <div class="modern-stat-lbl">01 · QUESTION</div>
            <div class="modern-stat-val" id="q-num">01/10</div>
            <div class="modern-stat-hint">السؤال الحالي</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">02 · SCORE</div>
            <div class="modern-stat-val green" id="q-score">00</div>
            <div class="modern-stat-hint">إجاباتك الصحيحة</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">03 · POINTS</div>
            <div class="modern-stat-val blue" id="q-points">00</div>
            <div class="modern-stat-hint">النقاط المكتسبة</div>
          </div>
        </div>

        <div id="quiz-body" style="padding:24px;"></div>
      </div>
    </div>`;

  renderQuestion();
}

function renderQuestion() {
  const q = _questions[_current];
  const body = document.getElementById('quiz-body');

  document.getElementById('q-num').textContent = `${String(_current + 1).padStart(2,'0')}/10`;
  document.getElementById('q-score').textContent = String(_score).padStart(2, '0');
  document.getElementById('q-points').textContent = String(_score * 10).padStart(2, '0');

  body.innerHTML = `
    <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:24px;max-width:700px;margin:0 auto;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;letter-spacing:2px;font-weight:700;">QUESTION · ${String(_current + 1).padStart(2,'0')}</div>
      <div style="font-size:18px;color:#0E1A2E;font-weight:700;margin-top:10px;line-height:1.6;">${q.q}</div>

      <div style="margin-top:22px;display:flex;flex-direction:column;gap:8px;" id="answers">
        ${q.a.map((ans, i) => `
          <button data-idx="${i}" class="quiz-ans" style="background:#FAFAF7;border:1.5px solid #E8E5DC;border-radius:6px;padding:14px 18px;text-align:right;font-family:'Tajawal',sans-serif;font-size:14px;cursor:pointer;color:#0E1A2E;font-weight:500;transition:all 0.15s;display:flex;align-items:center;gap:12px;">
            <span style="width:28px;height:28px;background:#F0EDE4;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;color:#6B6659;flex-shrink:0;">${String.fromCharCode(65 + i)}</span>
            <span>${ans}</span>
          </button>
        `).join('')}
      </div>

      <div id="quiz-feedback" style="display:none;margin-top:16px;padding:14px;border-radius:6px;text-align:center;font-weight:700;"></div>

      <div style="display:flex;justify-content:space-between;margin-top:20px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#8A8578;letter-spacing:.5px;">
        <span>← ${String(_current + 1).padStart(2,'0')} / 10 →</span>
        <span>SCORE: ${String(_score).padStart(2,'0')} · POINTS: ${_score * 10}</span>
      </div>
    </div>`;

  document.querySelectorAll('.quiz-ans').forEach(btn => {
    btn.onmouseover = () => { if (!_answered) btn.style.borderColor = '#1C4B8E'; };
    btn.onmouseout = () => { if (!_answered) btn.style.borderColor = '#E8E5DC'; };
    btn.onclick = () => handleAnswer(parseInt(btn.dataset.idx));
  });
}

function handleAnswer(idx) {
  if (_answered) return;
  _answered = true;

  const q = _questions[_current];
  const buttons = document.querySelectorAll('.quiz-ans');
  const feedback = document.getElementById('quiz-feedback');

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
    if (_current >= _questions.length) {
      finish();
    } else {
      renderQuestion();
    }
  }, 1600);
}

async function finish() {
  const body = document.getElementById('quiz-body');
  body.innerHTML = `
    <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:40px 24px;text-align:center;max-width:500px;margin:0 auto;">
      <div style="font-size:56px;margin-bottom:12px;">${_score >= 8 ? '🏆' : _score >= 5 ? '👏' : '💪'}</div>
      <div style="font-size:24px;color:#0E1A2E;font-weight:800;">${_score >= 8 ? 'ممتاز!' : _score >= 5 ? 'أحسنت!' : 'حاول مرة أخرى'}</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#6B6659;margin-top:6px;letter-spacing:.5px;">
        SCORE: ${_score}/10 · POINTS: +${_score * 10}
      </div>
      <div style="margin-top:20px;display:flex;gap:8px;justify-content:center;">
        <button class="modern-btn modern-btn-primary" onclick="navigate('game-quiz')">
          🔄 لعبة جديدة
        </button>
        <button class="modern-btn" onclick="navigate('activities')">
          رجوع
        </button>
      </div>
    </div>`;

  try {
    await updateQuizScore(
      _profile.id || _profile.uid,
      _profile.name || _profile.email || 'موظف',
      _score, 10
    );
  } catch (e) { console.error('save quiz error:', e); }
}
