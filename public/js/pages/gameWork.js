import { getCurrentProfile } from '../app.js';
import { updateWorkScore } from '../../../src/firebase/activitiesDb.js';

const CATEGORIES = {
  hscodes: {
    name: '📦 مسابقة أكواد HS',
    code: 'HS-CODES',
    questions: [
      { q: 'ما رمز HS الأربع خانات لـ "قهوة محمصة"؟', a: ['0901','0902','0903','0904'], correct: 0 },
      { q: 'ما رمز HS لـ "سيارات ركاب"؟', a: ['8701','8702','8703','8704'], correct: 2 },
      { q: 'ما رمز HS لـ "أجهزة كمبيوتر"؟', a: ['8470','8471','8472','8473'], correct: 1 },
      { q: 'ما رمز HS لـ "هواتف نقالة"؟', a: ['8517','8518','8519','8520'], correct: 0 },
      { q: 'ما رمز HS لـ "زيت زيتون"؟', a: ['1509','1510','1511','1512'], correct: 0 },
      { q: 'ما رمز HS لـ "ذهب خام"؟', a: ['7106','7107','7108','7109'], correct: 2 },
      { q: 'ما رمز HS لـ "الأدوية"؟', a: ['3002','3003','3004','3005'], correct: 2 },
      { q: 'ما رمز HS لـ "الملابس القطنية"؟', a: ['6104','6105','6106','6109'], correct: 3 },
      { q: 'ما رمز HS لـ "أرز مقشور"؟', a: ['1005','1006','1007','1008'], correct: 1 },
      { q: 'ما رمز HS لـ "أثاث خشبي"؟', a: ['9401','9402','9403','9404'], correct: 2 },
      { q: 'كم عدد خانات كود HS الأساسي؟', a: ['4','6','8','10'], correct: 1 },
      { q: 'ما اسم منظمة الجمارك التي تصدر HS؟', a: ['WTO','WCO','ICC','UN'], correct: 1 },
      { q: 'ما رمز HS لـ "لحوم دواجن مجمدة"؟', a: ['0207','0208','0209','0210'], correct: 0 },
      { q: 'ما رمز HS لـ "بلاستيك خام"؟', a: ['3901','3902','3903','3904'], correct: 0 },
      { q: 'ما رمز HS لـ "الصلب والحديد"؟', a: ['7201','7301','7401','7501'], correct: 0 },
    ]
  },
  ports: {
    name: '🌍 خمّن المنفذ',
    code: 'PORTS',
    questions: [
      { q: 'أكبر ميناء بحري في السعودية؟', a: ['ميناء الملك عبدالله','ميناء جدة الإسلامي','ميناء الجبيل','ميناء ينبع'], correct: 1 },
      { q: 'المنفذ البري الرئيسي مع الإمارات؟', a: ['البطحاء','سلوى','جسر الملك فهد','حالة عمار'], correct: 0 },
      { q: 'المنفذ البري مع البحرين؟', a: ['البطحاء','سلوى','جسر الملك فهد','الحديثة'], correct: 2 },
      { q: 'المنفذ البري مع قطر؟', a: ['البطحاء','سلوى','الرقعي','حالة عمار'], correct: 1 },
      { q: 'أين يقع ميناء الملك عبدالله؟', a: ['جدة','ينبع','رابغ','ضباء'], correct: 2 },
      { q: 'أكبر ميناء صناعي في السعودية؟', a: ['جدة','الجبيل','ينبع','الدمام'], correct: 1 },
      { q: 'ميناء رئيسي في المنطقة الشرقية؟', a: ['الملك عبدالعزيز','الملك فهد','الملك خالد','الملك سلمان'], correct: 0 },
      { q: 'المنفذ البري مع الأردن؟', a: ['حالة عمار','البطحاء','الرقعي','سلوى'], correct: 0 },
      { q: 'المنفذ البري مع العراق؟', a: ['عرعر','جديدة عرعر','الرقعي','الحديثة'], correct: 3 },
      { q: 'أين مطار الملك عبدالعزيز الدولي؟', a: ['الرياض','جدة','الدمام','المدينة'], correct: 1 },
      { q: 'أين مطار الملك خالد الدولي؟', a: ['الرياض','جدة','الدمام','المدينة'], correct: 0 },
      { q: 'مطار الملك فهد الدولي في؟', a: ['الرياض','جدة','الدمام','المدينة'], correct: 2 },
      { q: 'المنفذ البري مع اليمن الرئيسي؟', a: ['الوديعة','الطوال','الخضراء','عرعر'], correct: 1 },
      { q: 'ميناء ينبع التجاري يقع في؟', a: ['البحر الأحمر','الخليج العربي','بحر العرب','خليج عمان'], correct: 0 },
      { q: 'أي منفذ يخدم شحنات النفط الرئيسية؟', a: ['رأس تنورة','جدة','الجبيل','ينبع'], correct: 0 },
    ]
  },
  documents: {
    name: '📄 مطابقة المستندات',
    code: 'DOCS',
    questions: [
      { q: 'أي مستند يثبت ملكية البضاعة أثناء الشحن؟', a: ['الفاتورة','بوليصة الشحن','شهادة المنشأ','قائمة التعبئة'], correct: 1 },
      { q: 'شهادة المنشأ تُصدر من؟', a: ['البنك','الغرفة التجارية','الجمارك','الشاحن'], correct: 1 },
      { q: 'قائمة التعبئة تبين؟', a: ['السعر','محتويات كل صندوق','بلد المنشأ','التأمين'], correct: 1 },
      { q: 'شهادة الصحة النباتية للمنتجات؟', a: ['الصناعية','الزراعية','الطبية','الحيوانية'], correct: 1 },
      { q: 'المستند الجمركي الأساسي؟', a: ['بيان جمركي','فاتورة','بوليصة','تفويض'], correct: 0 },
      { q: 'التفويض في التخليص هو؟', a: ['ورقة دفع','توكيل للمخلص','شهادة منشأ','فاتورة'], correct: 1 },
      { q: 'أي مستند مطلوب للشحن الجوي؟', a: ['B/L','AWB','Manifest','LC'], correct: 1 },
      { q: 'اختصار AWB يعني؟', a: ['بوليصة جوية','ضمان بنكي','شهادة إعلان','فاتورة'], correct: 0 },
      { q: 'شهادة SASO مطلوبة لـ؟', a: ['كل شحنة','السيارات','منتجات محددة','الغذاء فقط'], correct: 2 },
      { q: 'الفاتورة التجارية يجب أن تحتوي؟', a: ['السعر','بلد المنشأ','رقم HS','كل ما سبق'], correct: 3 },
      { q: 'شهادة التأمين تحمي من؟', a: ['الخسارة','التلف','السرقة','كل ما سبق'], correct: 3 },
      { q: 'اعتماد مستندي (LC) هو؟', a: ['شهادة منشأ','ضمان بنكي','فاتورة','بوليصة'], correct: 1 },
      { q: 'مواصفة SFDA لـ؟', a: ['الغذاء والدواء','الاتصالات','السيارات','الملابس'], correct: 0 },
      { q: 'شهادة ISO للمنتج تبين؟', a: ['الجودة','السعر','المنشأ','الوزن'], correct: 0 },
      { q: 'مستند لإدخال بضاعة مؤقت؟', a: ['كارنيه ATA','بوليصة','فاتورة','بيان مؤقت'], correct: 0 },
    ]
  },
  speed: {
    name: '⚡ Speed Data Entry',
    code: 'SPEED',
    questions: [
      { q: 'رقم البوليصة "MSCU 1234567" — أول 4 أحرف؟', a: ['MSCU','1234','U123','SCU1'], correct: 0 },
      { q: 'كم رقماً في رقم البوليصة الحاوية؟', a: ['4','7','11','15'], correct: 2 },
      { q: 'رقم البيان الجمركي السعودي يبدأ بـ؟', a: ['أرقام فقط','حروف فقط','رمز 2026','أي شيء'], correct: 0 },
      { q: 'رمز الدولة للسعودية في الوثائق؟', a: ['SAU','KSA','SA','SUA'], correct: 2 },
      { q: 'رمز الدولة للإمارات؟', a: ['ARE','UAE','AE','EAU'], correct: 2 },
      { q: 'رمز البحرين؟', a: ['BAH','BH','BHR','BR'], correct: 1 },
      { q: 'رمز عمان؟', a: ['OM','OMA','OMN','OMR'], correct: 0 },
      { q: 'رمز عملة السعودية ISO؟', a: ['SR','SAR','SRL','SDR'], correct: 1 },
      { q: 'رمز الدرهم الإماراتي ISO؟', a: ['AED','DHS','UAD','AD'], correct: 0 },
      { q: 'الحاوية 20 قدم = ؟', a: ['20FT','TEU','20 GP','كل ما سبق'], correct: 3 },
      { q: 'الحاوية 40 قدم القياسية = ؟', a: ['FEU','40FT','40 GP','كل ما سبق'], correct: 3 },
      { q: 'رمز الشحن البحري؟', a: ['SEA','SEAF','OCN','MAR'], correct: 0 },
      { q: 'رمز الشحن الجوي؟', a: ['AIR','AWB','AVI','ARF'], correct: 0 },
      { q: 'وحدة قياس الوزن للشحن؟', a: ['KG','TON','LB','كل ما سبق'], correct: 3 },
      { q: 'وحدة قياس الحجم للشحن؟', a: ['CBM','FT3','لتر','م3'], correct: 0 },
    ]
  }
};

let _profile, _category, _questions, _current, _score, _answered;

export async function renderWork(container) {
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
              <span class="modern-header-code">SDS/GAME/WORK</span>
            </div>
            <div class="modern-header-title">💼 مسابقة التخصص</div>
            <div class="modern-header-sub">WORK QUIZ · CUSTOMS EXPERTISE</div>
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
            <button onclick="workStart('${key}')" style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:22px;position:relative;overflow:hidden;text-align:right;cursor:pointer;font-family:'Tajawal',sans-serif;">
              <div style="position:absolute;top:0;right:0;width:6px;height:100%;background:${['#2E8B57','#1C4B8E','#C2410C','#CC2229'][i]};"></div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#8A8578;letter-spacing:2px;font-weight:700;">CATEGORY · ${String(i+1).padStart(3,'0')}</div>
              <div style="font-size:20px;color:#0E1A2E;font-weight:800;margin-top:6px;">${cat.name}</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#6B6659;margin-top:4px;letter-spacing:.5px;">${cat.code} · ${cat.questions.length} QUESTIONS · +15 PTS/CORRECT</div>
              <div style="margin-top:14px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#1C4B8E;font-weight:700;">▶ ابدأ</div>
            </button>
          `).join('')}
        </div>
      </div>
    </div>`;

  window.workStart = (cat) => startGame(cat, container);
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
              <span class="modern-header-code">SDS/WORK/${cat.code}</span>
            </div>
            <div class="modern-header-title">${cat.name}</div>
            <div class="modern-header-sub">10 QUESTIONS · +15 POINTS/CORRECT</div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" onclick="navigate('game-work')">
              <i class="ti ti-arrow-right"></i> فئة أخرى
            </button>
          </div>
        </div>

        <div class="modern-stats modern-stats-3">
          <div class="modern-stat">
            <div class="modern-stat-lbl">01 · QUESTION</div>
            <div class="modern-stat-val" id="wk-num">01/10</div>
            <div class="modern-stat-hint">السؤال الحالي</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">02 · SCORE</div>
            <div class="modern-stat-val green" id="wk-score">00</div>
            <div class="modern-stat-hint">إجابات صحيحة</div>
          </div>
          <div class="modern-stat">
            <div class="modern-stat-lbl">03 · POINTS</div>
            <div class="modern-stat-val blue" id="wk-points">00</div>
            <div class="modern-stat-hint">النقاط المكتسبة</div>
          </div>
        </div>

        <div id="wk-body" style="padding:24px;"></div>
      </div>
    </div>`;

  renderQuestion();
}

function renderQuestion() {
  const q = _questions[_current];
  document.getElementById('wk-num').textContent = `${String(_current + 1).padStart(2,'0')}/10`;
  document.getElementById('wk-score').textContent = String(_score).padStart(2, '0');
  document.getElementById('wk-points').textContent = String(_score * 15).padStart(2, '0');

  document.getElementById('wk-body').innerHTML = `
    <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:24px;max-width:700px;margin:0 auto;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#8A8578;letter-spacing:2px;font-weight:700;">QUESTION · ${String(_current + 1).padStart(2,'0')}</div>
      <div style="font-size:20px;color:#0E1A2E;font-weight:700;margin-top:10px;line-height:1.6;">${q.q}</div>
      <div style="margin-top:22px;display:flex;flex-direction:column;gap:8px;" id="wk-answers">
        ${q.a.map((ans, i) => `
          <button data-idx="${i}" class="wk-ans" style="background:#FAFAF7;border:1.5px solid #E8E5DC;border-radius:6px;padding:14px 18px;text-align:right;font-family:'Tajawal',sans-serif;font-size:14px;cursor:pointer;color:#0E1A2E;font-weight:500;transition:all 0.15s;display:flex;align-items:center;gap:12px;">
            <span style="width:28px;height:28px;background:#F0EDE4;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;color:#6B6659;flex-shrink:0;">${String.fromCharCode(65 + i)}</span>
            <span>${ans}</span>
          </button>
        `).join('')}
      </div>
      <div id="wk-feedback" style="display:none;margin-top:16px;padding:14px;border-radius:6px;text-align:center;font-weight:700;"></div>
    </div>`;

  document.querySelectorAll('.wk-ans').forEach(btn => {
    btn.onmouseover = () => { if (!_answered) btn.style.borderColor = '#1C4B8E'; };
    btn.onmouseout = () => { if (!_answered) btn.style.borderColor = '#E8E5DC'; };
    btn.onclick = () => handleAnswer(parseInt(btn.dataset.idx));
  });
}

function handleAnswer(idx) {
  if (_answered) return;
  _answered = true;
  const q = _questions[_current];
  const buttons = document.querySelectorAll('.wk-ans');
  const feedback = document.getElementById('wk-feedback');

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
    feedback.textContent = '✓ إجابة صحيحة! +15 نقطة';
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
  document.getElementById('wk-body').innerHTML = `
    <div style="background:white;border:1px solid #E8E5DC;border-radius:6px;padding:40px 24px;text-align:center;max-width:500px;margin:0 auto;">
      <div style="font-size:56px;margin-bottom:12px;">${_score >= 8 ? '🏆' : _score >= 5 ? '👏' : '💪'}</div>
      <div style="font-size:24px;color:#0E1A2E;font-weight:800;">${_score >= 8 ? 'خبير!' : _score >= 5 ? 'أحسنت!' : 'تحتاج مذاكرة'}</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#6B6659;margin-top:6px;letter-spacing:.5px;">
        SCORE: ${_score}/10 · POINTS: +${_score * 15}
      </div>
      <div style="margin-top:20px;display:flex;gap:8px;justify-content:center;">
        <button class="modern-btn modern-btn-primary" onclick="navigate('game-work')">🔄 فئة أخرى</button>
        <button class="modern-btn" onclick="navigate('activities')">رجوع</button>
      </div>
    </div>`;

  try {
    await updateWorkScore(_profile.id || _profile.uid, _profile.name || _profile.email || 'موظف', _score, _category);
  } catch (e) { console.error('work save error:', e); }
}
