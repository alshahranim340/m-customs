import { renderActivities } from './pages/activities.js';
import { renderSnake } from './pages/gameSnake.js';
import { renderTicTacToe } from './pages/gameTicTacToe.js';
import { renderQuiz } from './pages/gameQuiz.js';
import { renderMemory } from './pages/gameMemory.js';
import { render2048 } from './pages/game2048.js';
import { renderConnect4 } from './pages/gameConnect4.js';
import { renderAim } from './pages/gameAim.js';
import { renderReaction } from './pages/gameReaction.js';
import { renderHangman } from './pages/gameHangman.js';
import { renderTrivia } from './pages/gameTrivia.js';
import { renderWork } from './pages/gameWork.js';
import { renderChess } from './pages/gameChess.js';
import { renderPingPong } from './pages/gamePingPong.js';
import { renderFrogger } from './pages/gameFrogger.js';
import { renderExportReport } from './pages/exportReport.js';
import { renderTransportRequests } from './pages/transportRequests.js';
import { renderTransportSettings } from './pages/transportSettings.js';
import { getShipments } from '../../src/firebase/db.js';
import { onAuthChange, ensureAdminProfile, getUserProfile, logOut, isAdmin, getCurrentUser } from '../../src/firebase/auth.js';
import { renderDashboard }      from './pages/dashboard.js';
import { renderNewShipment }    from './pages/newShipment.js';
import { renderShipments }      from './pages/shipments.js';
import { renderQuotations }    from './pages/quotations.js';
import { renderDrivers }        from './pages/drivers.js';
import { renderShipmentView }   from './pages/shipmentView.js';
import { renderUsers }          from './pages/users.js';

// ── Import section ──
import { autoAlertOnLogin } from '../../src/utils/notifications.js';
import { renderImportDashboard } from './pages/import/importDashboard.js';
import { renderImportShipments } from './pages/import/importShipments.js';
import { renderImportExpenses }  from './pages/import/importExpenses.js';
import { renderImportCalendar }  from './pages/import/importCalendar.js';
import { renderImportCustomers } from './pages/import/importCustomers.js';
import { renderImportAgents }    from './pages/import/importAgents.js';

let _currentUser    = null;
let _currentProfile = null;
let _activeSection  = 'export'; // 'export' | 'import'

const PAGES = {
  // Export
  'dashboard':        renderDashboard,
  'new-shipment':     renderNewShipment,
  'shipments':        renderShipments,
  'drivers':          renderDrivers,
  'quotations':       renderQuotations,
  'shipment-view':    renderShipmentView,
  'users':            renderUsers,
  // Import
  'import-dashboard': renderImportDashboard,
  'import-shipments': renderImportShipments,
  'import-expenses':  renderImportExpenses,
  'import-calendar':  renderImportCalendar,
  'import-customers': renderImportCustomers,
  'import-agents':    renderImportAgents,
  // Activities
  'activities':       renderActivities,
  'game-snake':       renderSnake,
  'game-xo':          renderTicTacToe,
  'game-quiz':        renderQuiz,
  'game-memory':      renderMemory,
  'game-2048':        render2048,
  'game-c4':          renderConnect4,
  'game-aim':         renderAim,
  'game-reaction':    renderReaction,
  'game-hangman':     renderHangman,
  'game-trivia':      renderTrivia,
  'game-work':        renderWork,
  'game-chess':       renderChess,
  'game-pingpong':    renderPingPong,
  'game-frogger':     renderFrogger,
  'export-report':    renderExportReport,
  'transport-requests': renderTransportRequests,
  'transport-settings': renderTransportSettings,
};

// ─────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────
export function navigate(page, params = {}) {
  // Determine which section this page belongs to
  const isActivityPage = page === 'activities' || page.startsWith('game-');
  const isImportPage = page.startsWith('import-') || page === 'quotations';
  if (!isActivityPage) _activeSection = isImportPage ? 'import' : 'export';

  // Update section switcher
  document.getElementById('section-export')?.classList.toggle('section-active', !isImportPage);
  document.getElementById('section-import')?.classList.toggle('section-active', isImportPage);

  // Show/hide correct nav groups
  document.getElementById('nav-export')?.style.setProperty('display', isImportPage ? 'none' : 'block');
  document.getElementById('nav-import')?.style.setProperty('display', isImportPage ? 'block' : 'none');

  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.page === page)
  );

  const container = document.getElementById('page-container');
  if (!container) return;
  container.innerHTML = '<div class="loader"><div class="spinner"></div></div>';

  const renderer = PAGES[page];
  if (renderer) renderer(container, params);
  window._currentPage = page;
}

// ─────────────────────────────────────────────
// SECTION SWITCH
// ─────────────────────────────────────────────
export function switchSection(section) {
  if (section === 'import') {
    navigate('import-dashboard');
  } else {
    navigate('dashboard');
  }
}

// ─────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────
export function toast(msg, type = 'success') {
  const tc = document.getElementById('toast-container');
  if (!tc) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  tc.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ─────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────
export function showModal(title, content, actions = []) {
  const overlay = document.getElementById('modal-overlay');
  const box     = document.getElementById('modal-box');
  const actionsHtml = actions.map(a =>
    `<button class="btn ${a.class || 'btn-ghost'}" onclick="${a.onclick}">${a.label}</button>`
  ).join('');
  box.innerHTML = `
    <div class="modal-title">${title}</div>
    <div class="modal-body">${content}</div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
      ${actionsHtml}
    </div>`;
  overlay.classList.remove('hidden');
}

export function closeModal() {
  document.getElementById('modal-overlay')?.classList.add('hidden');
}
window.closeModal = closeModal;

// ─────────────────────────────────────────────
// BADGES
// ─────────────────────────────────────────────
export async function updateBadges() {
  try {
    const shipments = await getShipments(100);
    const badge = document.getElementById('badge-shipments');
    if (badge) badge.textContent = shipments.length || '0';
  } catch(e) {}
}

// ─────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────
function showLoginPage() {
  const wasIdleLogout = sessionStorage.getItem('_idle_logout') === '1';
  sessionStorage.removeItem('_idle_logout');

  document.getElementById('root').innerHTML = `
    <div class="login-page">

      <!-- Animated background -->
      <div class="login-bg">
        <!-- World map SVG -->
        <svg class="world-map" viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg">
          <!-- Simplified continents as dots pattern -->
          <g class="continents" fill="rgba(255,255,255,0.15)">
            ${_generateWorldDots()}
          </g>
          <!-- Trade routes (animated dashed lines) -->
          <g class="routes" stroke="rgba(255,255,255,0.35)" stroke-width="1.5" fill="none" stroke-dasharray="4 6">
            <path class="route-1" d="M 200,300 Q 500,150 800,280" />
            <path class="route-2" d="M 300,400 Q 600,500 950,350" />
            <path class="route-3" d="M 150,200 Q 400,350 700,180" />
          </g>
          <!-- Cities as glowing dots -->
          <g class="cities">
            <circle cx="220" cy="290" r="4" class="city-dot city-1" />
            <circle cx="800" cy="280" r="4" class="city-dot city-2" />
            <circle cx="300" cy="400" r="4" class="city-dot city-3" />
            <circle cx="950" cy="350" r="4" class="city-dot city-4" />
            <circle cx="600" cy="220" r="4" class="city-dot city-5" />
          </g>
        </svg>

        <!-- Vehicle 1: Airplane (crosses top) -->
        <div class="vehicle vehicle-plane">
          <svg viewBox="0 0 64 64" width="64" height="64" fill="white">
            <path d="M32 8c-1 0-2 .5-2.5 1.5L26 20 4 26c-1 .3-1.5 1-1.5 2v3c0 .8 1 1.3 1.7 1L26 26v10l-6 3v3l10-2 2 4 2-4 10 2v-3l-6-3V26l21.8 6c.7.3 1.7-.2 1.7-1v-3c0-1-.5-1.7-1.5-2L38 20l-3.5-10.5C34 8.5 33 8 32 8z"/>
          </svg>
        </div>

        <!-- Vehicle 2: Ship (crosses middle) -->
        <div class="vehicle vehicle-ship">
          <svg viewBox="0 0 80 60" width="80" height="60" fill="white">
            <!-- Waves -->
            <path d="M0 48 Q 10 44 20 48 T 40 48 T 60 48 T 80 48 V 60 H 0 Z" opacity="0.4"/>
            <!-- Hull -->
            <path d="M8 38 L 72 38 L 66 48 L 14 48 Z"/>
            <!-- Container stacks -->
            <rect x="18" y="26" width="10" height="12" fill="#2563a8"/>
            <rect x="30" y="26" width="10" height="12" fill="#CC2229"/>
            <rect x="42" y="26" width="10" height="12" fill="#2E8B57"/>
            <rect x="22" y="18" width="10" height="8" fill="#c8943a"/>
            <rect x="34" y="18" width="10" height="8" fill="#1C2D4E"/>
            <!-- Bridge -->
            <rect x="52" y="20" width="14" height="18"/>
            <rect x="56" y="14" width="6" height="6"/>
          </svg>
        </div>

        <!-- Vehicle 3: Truck (crosses bottom) -->
        <div class="vehicle vehicle-truck">
          <svg viewBox="0 0 100 50" width="100" height="50" fill="white">
            <!-- Trailer -->
            <rect x="0" y="12" width="60" height="26" rx="2"/>
            <!-- Cab -->
            <rect x="60" y="18" width="24" height="20" rx="2"/>
            <rect x="66" y="22" width="14" height="10" fill="#1C2D4E"/>
            <!-- Wheels -->
            <circle cx="14" cy="42" r="6" fill="#1C2D4E"/>
            <circle cx="14" cy="42" r="3" fill="white"/>
            <circle cx="46" cy="42" r="6" fill="#1C2D4E"/>
            <circle cx="46" cy="42" r="3" fill="white"/>
            <circle cx="74" cy="42" r="6" fill="#1C2D4E"/>
            <circle cx="74" cy="42" r="3" fill="white"/>
            <!-- Logo detail -->
            <rect x="8" y="20" width="44" height="10" fill="rgba(28,45,78,0.3)" rx="1"/>
          </svg>
        </div>

        <!-- Floating particles -->
        <div class="particles">
          ${Array.from({length: 20}, (_, i) => `<div class="particle particle-${i}"></div>`).join('')}
        </div>
      </div>

      <!-- Login card -->
      <div class="login-card-wrap">
        <div class="login-card">

          <!-- Header -->
          <div class="login-header">
            <div class="login-logo">
              <div class="logo-dots">
                <span class="logo-dot" style="background:#CC2229"></span>
                <span class="logo-dot" style="background:#c8943a"></span>
                <span class="logo-dot" style="background:#2E8B57"></span>
              </div>
              <div class="logo-brand">M-CUSTOMS</div>
              <div class="logo-year">EST · 2026</div>
            </div>
            <div class="login-title">مرحباً بعودتك</div>
            <div class="login-subtitle">نظام التخليص الجمركي — قوة الفنيين</div>
          </div>

          ${wasIdleLogout ? `
            <div class="idle-notice">
              <i class="ti ti-clock-hour-4"></i>
              <span>تم تسجيل خروجك تلقائياً بسبب عدم النشاط</span>
            </div>
          ` : ''}

          <!-- Error box -->
          <div id="login-error" class="login-error" style="display:none;"></div>

          <!-- Email -->
          <div class="login-field">
            <label>
              <span class="field-num">01</span>
              <span>البريد الإلكتروني</span>
              <span class="field-hint">EMAIL</span>
            </label>
            <div class="input-wrap">
              <i class="ti ti-mail input-icon"></i>
              <input type="email" id="login-email" placeholder="name@company.com"
                autocomplete="username"
                onkeydown="if(event.key==='Enter')document.getElementById('login-password').focus()">
            </div>
          </div>

          <!-- Password -->
          <div class="login-field">
            <label>
              <span class="field-num">02</span>
              <span>كلمة المرور</span>
              <span class="field-hint">PASSWORD</span>
            </label>
            <div class="input-wrap">
              <i class="ti ti-lock input-icon"></i>
              <input type="password" id="login-password" placeholder="••••••••••"
                autocomplete="current-password"
                onkeydown="if(event.key==='Enter')doLogin()">
              <button type="button" class="pwd-toggle" onclick="_togglePwd()" title="إظهار/إخفاء">
                <i class="ti ti-eye" id="pwd-toggle-icon"></i>
              </button>
            </div>
          </div>

          <!-- Login button -->
          <button onclick="doLogin()" id="login-btn" class="login-btn">
            <span class="login-btn-text">تسجيل الدخول</span>
            <i class="ti ti-arrow-left login-btn-icon"></i>
          </button>

          <!-- Footer -->
          <div class="login-footer">
            <div class="footer-line">
              <span class="footer-dot"></span>
              <span>شركة قوة الفنيين للخدمات اللوجستية</span>
              <span class="footer-dot"></span>
            </div>
            <div class="footer-code">SDS/AUTH/${new Date().getFullYear()}</div>
          </div>

        </div>
      </div>

    </div>

    <style>
      :root {
        --nav-blue: #1C2D4E;
        --nav-blue-2: #243859;
        --accent: #2563a8;
      }
      * { box-sizing: border-box; }

      .login-page {
        position: fixed; inset: 0;
        overflow: hidden;
        font-family: 'Tajawal', sans-serif;
        direction: rtl;
        background: linear-gradient(135deg,
          #0B1628 0%,
          #1C2D4E 30%,
          #243859 60%,
          #2563a8 100%);
        display: flex; align-items: center; justify-content: center;
      }

      /* Animated background */
      .login-bg {
        position: absolute; inset: 0;
        overflow: hidden;
        pointer-events: none;
      }
      .world-map {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 90%; height: 90%;
        opacity: 0.4;
      }
      .city-dot {
        fill: #4FD1C5;
        filter: drop-shadow(0 0 6px rgba(79, 209, 197, 0.8));
      }
      .city-1 { animation: cityPulse 2s ease-in-out infinite; }
      .city-2 { animation: cityPulse 2s ease-in-out infinite 0.4s; }
      .city-3 { animation: cityPulse 2s ease-in-out infinite 0.8s; }
      .city-4 { animation: cityPulse 2s ease-in-out infinite 1.2s; }
      .city-5 { animation: cityPulse 2s ease-in-out infinite 1.6s; }
      @keyframes cityPulse {
        0%, 100% { opacity: 0.5; r: 4; }
        50% { opacity: 1; r: 6; }
      }
      .route-1 { animation: dashFlow 6s linear infinite; }
      .route-2 { animation: dashFlow 8s linear infinite reverse; }
      .route-3 { animation: dashFlow 10s linear infinite; }
      @keyframes dashFlow {
        to { stroke-dashoffset: -50; }
      }

      /* Vehicles */
      .vehicle {
        position: absolute;
        filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
      }
      .vehicle-plane {
        top: 12%;
        animation: flyRTL 18s linear infinite;
      }
      .vehicle-ship {
        top: 52%;
        animation: sailRTL 25s linear infinite;
      }
      .vehicle-truck {
        top: 78%;
        animation: driveRTL 20s linear infinite 3s;
      }
      @keyframes flyRTL {
        0% { transform: translateX(-100px) rotate(-8deg); opacity: 0; }
        10% { opacity: 1; }
        50% { transform: translateX(50vw) rotate(-8deg) translateY(-15px); opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateX(calc(100vw + 100px)) rotate(-8deg); opacity: 0; }
      }
      @keyframes sailRTL {
        0% { transform: translateX(-120px); opacity: 0; }
        8% { opacity: 1; }
        50% { transform: translateX(50vw) translateY(-4px); }
        92% { opacity: 1; }
        100% { transform: translateX(calc(100vw + 120px)); opacity: 0; }
      }
      @keyframes driveRTL {
        0% { transform: translateX(-120px); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateX(calc(100vw + 120px)); opacity: 0; }
      }

      /* Floating particles */
      .particles {
        position: absolute; inset: 0;
      }
      .particle {
        position: absolute;
        width: 3px; height: 3px;
        background: rgba(255,255,255,0.5);
        border-radius: 50%;
        animation: floatUp linear infinite;
      }
      @keyframes floatUp {
        from { transform: translateY(100vh); opacity: 0; }
        10%, 90% { opacity: 1; }
        to { transform: translateY(-20px); opacity: 0; }
      }
      ${Array.from({length: 20}, (_, i) => `
        .particle-${i} {
          left: ${(i * 5.3) % 100}%;
          animation-duration: ${8 + (i * 0.7) % 12}s;
          animation-delay: ${(i * 0.5) % 8}s;
        }
      `).join('')}

      /* Login card */
      .login-card-wrap {
        position: relative;
        z-index: 10;
        padding: 20px;
        max-width: 460px;
        width: 100%;
        animation: cardEntry 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both;
      }
      @keyframes cardEntry {
        from {
          opacity: 0;
          transform: translateY(30px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      .login-card {
        background: rgba(255,255,255,0.98);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.3);
        border-radius: 16px;
        padding: 36px 32px;
        box-shadow:
          0 20px 60px rgba(0,0,0,0.3),
          0 8px 20px rgba(0,0,0,0.15),
          inset 0 1px 0 rgba(255,255,255,0.5);
      }

      /* Header */
      .login-header {
        text-align: center;
        margin-bottom: 28px;
      }
      .login-logo {
        margin-bottom: 20px;
      }
      .logo-dots {
        display: flex;
        justify-content: center;
        gap: 6px;
        margin-bottom: 10px;
      }
      .logo-dot {
        display: inline-block;
        width: 10px; height: 10px;
        border-radius: 50%;
        animation: dotBounce 1.4s ease-in-out infinite;
      }
      .logo-dot:nth-child(1) { animation-delay: 0s; }
      .logo-dot:nth-child(2) { animation-delay: 0.15s; }
      .logo-dot:nth-child(3) { animation-delay: 0.3s; }
      @keyframes dotBounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      .logo-brand {
        font-family: 'JetBrains Mono', monospace;
        font-size: 22px;
        font-weight: 800;
        color: #0E1A2E;
        letter-spacing: 3px;
      }
      .logo-year {
        font-family: 'JetBrains Mono', monospace;
        font-size: 9px;
        color: #8A8578;
        letter-spacing: 3px;
        font-weight: 700;
        margin-top: 2px;
      }
      .login-title {
        font-size: 24px;
        font-weight: 800;
        color: #0E1A2E;
        margin-top: 8px;
      }
      .login-subtitle {
        font-size: 12px;
        color: #6B6659;
        margin-top: 4px;
      }

      /* Idle notice */
      .idle-notice {
        background: #FEF9E7;
        border: 1px solid #F0C674;
        border-radius: 8px;
        padding: 10px 14px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #8A6B33;
        font-weight: 600;
      }

      /* Fields */
      .login-field {
        margin-bottom: 16px;
      }
      .login-field label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 700;
        color: #0E1A2E;
        margin-bottom: 6px;
      }
      .field-num {
        font-family: 'JetBrains Mono', monospace;
        font-size: 9px;
        background: #0E1A2E;
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        letter-spacing: 1px;
        font-weight: 800;
      }
      .field-hint {
        font-family: 'JetBrains Mono', monospace;
        font-size: 9px;
        color: #8A8578;
        letter-spacing: 1.5px;
        margin-right: auto;
        font-weight: 700;
      }
      .input-wrap {
        position: relative;
      }
      .input-icon {
        position: absolute;
        right: 14px;
        top: 50%;
        transform: translateY(-50%);
        color: #8A8578;
        font-size: 18px;
        pointer-events: none;
      }
      .login-field input {
        width: 100%;
        padding: 13px 42px 13px 42px;
        border: 1.5px solid #E8E5DC;
        border-radius: 8px;
        font-size: 14px;
        font-family: 'Tajawal', sans-serif;
        color: #0E1A2E;
        background: #FAFAF7;
        outline: none;
        transition: all 0.2s;
        direction: ltr;
        text-align: right;
      }
      .login-field input:focus {
        border-color: #2563a8;
        background: white;
        box-shadow: 0 0 0 3px rgba(37, 99, 168, 0.12);
      }
      .pwd-toggle {
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        background: transparent;
        border: none;
        color: #8A8578;
        cursor: pointer;
        padding: 6px;
        border-radius: 4px;
        transition: all 0.15s;
      }
      .pwd-toggle:hover {
        background: #F0EDE4;
        color: #0E1A2E;
      }

      /* Login button */
      .login-btn {
        width: 100%;
        padding: 14px;
        background: linear-gradient(135deg, #1C2D4E 0%, #2563a8 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 15px;
        font-weight: 800;
        font-family: 'Tajawal', sans-serif;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-top: 8px;
        transition: all 0.2s;
        box-shadow: 0 4px 12px rgba(37, 99, 168, 0.3);
        position: relative;
        overflow: hidden;
      }
      .login-btn::before {
        content: '';
        position: absolute;
        top: 0; left: -100%;
        width: 100%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        transition: left 0.6s;
      }
      .login-btn:hover::before { left: 100%; }
      .login-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(37, 99, 168, 0.4);
      }
      .login-btn:active { transform: translateY(0); }
      .login-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        transform: none;
      }
      .login-btn-icon {
        font-size: 18px;
        transition: transform 0.2s;
      }
      .login-btn:hover .login-btn-icon {
        transform: translateX(-4px);
      }

      /* Error */
      .login-error {
        background: #FEF2F2;
        border: 1px solid #FCA5A5;
        color: #CC2229;
        border-radius: 8px;
        padding: 10px 14px;
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        animation: shake 0.4s;
      }
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-6px); }
        75% { transform: translateX(6px); }
      }

      /* Footer */
      .login-footer {
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px solid #F0EDE4;
        text-align: center;
      }
      .footer-line {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 11px;
        color: #6B6659;
        font-weight: 600;
      }
      .footer-dot {
        width: 4px; height: 4px;
        border-radius: 50%;
        background: #C8C4B8;
      }
      .footer-code {
        font-family: 'JetBrains Mono', monospace;
        font-size: 9px;
        color: #8A8578;
        letter-spacing: 2px;
        font-weight: 700;
        margin-top: 6px;
      }

      /* Mobile */
      @media (max-width: 500px) {
        .login-card {
          padding: 28px 24px;
        }
        .vehicle-plane, .vehicle-ship { display: none; }
        .vehicle-truck { top: 85%; }
      }
    </style>
  `;

  window._togglePwd = () => {
    const inp = document.getElementById('login-password');
    const icon = document.getElementById('pwd-toggle-icon');
    if (inp.type === 'password') {
      inp.type = 'text';
      icon.className = 'ti ti-eye-off';
    } else {
      inp.type = 'password';
      icon.className = 'ti ti-eye';
    }
  };

  window.doLogin = async () => {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn      = document.getElementById('login-btn');
    const errBox   = document.getElementById('login-error');
    const btnText  = btn.querySelector('.login-btn-text');
    const btnIcon  = btn.querySelector('.login-btn-icon');

    if (!email || !password) {
      errBox.innerHTML = '<i class="ti ti-alert-circle"></i> أدخل البريد الإلكتروني وكلمة المرور';
      errBox.style.display = 'flex';
      errBox.style.animation = 'none';
      setTimeout(() => errBox.style.animation = 'shake 0.4s', 10);
      return;
    }
    btn.disabled = true;
    btnText.textContent = 'جاري تسجيل الدخول...';
    btnIcon.className = 'ti ti-loader login-btn-icon';
    btnIcon.style.animation = 'spin 1s linear infinite';
    errBox.style.display = 'none';

    try {
      const { signIn } = await import('../../src/firebase/auth.js');
      await signIn(email, password);
    } catch(e) {
      btn.disabled = false;
      btnText.textContent = 'تسجيل الدخول';
      btnIcon.className = 'ti ti-arrow-left login-btn-icon';
      btnIcon.style.animation = 'none';
      const msgs = {
        'auth/user-not-found':     'البريد الإلكتروني غير موجود',
        'auth/wrong-password':     'كلمة المرور غير صحيحة',
        'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة',
        'auth/too-many-requests':  'محاولات كثيرة — حاول لاحقاً',
      };
      errBox.innerHTML = `<i class="ti ti-alert-circle"></i> ${msgs[e.code] || 'خطأ في تسجيل الدخول'}`;
      errBox.style.display = 'flex';
      errBox.style.animation = 'none';
      setTimeout(() => errBox.style.animation = 'shake 0.4s', 10);
    }
  };

  // Add spin animation for loader
  if (!document.getElementById('spin-style')) {
    const s = document.createElement('style');
    s.id = 'spin-style';
    s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(s);
  }
}

// Generate world map dots
function _generateWorldDots() {
  // Simplified continents outline (approximate coordinates)
  const continents = [
    // Europe
    {x: 550, y: 180, w: 90, h: 70},
    // Asia
    {x: 700, y: 170, w: 200, h: 130},
    // Africa
    {x: 570, y: 260, w: 100, h: 180},
    // N. America
    {x: 150, y: 170, w: 180, h: 130},
    // S. America
    {x: 280, y: 320, w: 80, h: 160},
    // Australia
    {x: 880, y: 400, w: 90, h: 60},
  ];
  let dots = '';
  continents.forEach(c => {
    for (let y = c.y; y < c.y + c.h; y += 12) {
      for (let x = c.x; x < c.x + c.w; x += 12) {
        // Random offset for organic look
        const jitterX = (Math.sin(x * y) + 1) * 3;
        const jitterY = (Math.cos(x + y) + 1) * 3;
        if (Math.random() > 0.3) {
          dots += `<circle cx="${x + jitterX}" cy="${y + jitterY}" r="1.5"/>`;
        }
      }
    }
  });
  return dots;
}

// ─────────────────────────────────────────────
// APP SHELL
// ─────────────────────────────────────────────
function renderAppShell(profile) {
  const adminOnly = isAdmin(_currentUser);
  const isTransport = profile?.role === 'transport';
  const isCustoms = profile?.role === 'employee' || profile?.role === 'supervisor' || adminOnly;

  document.getElementById('root').innerHTML = `
    <div class="app-layout" id="app">
      <aside class="sidebar">
        <div class="sidebar-logo">
          <div class="logo-icon">🚛</div>
          <div class="logo-text">
            <div class="logo-name">M-Customs</div>
            <div class="logo-sub">نظام التخليص الجمركي</div>
          </div>
        </div>

        <!-- Section Switcher (hidden for transport-only users) -->
        <div class="section-switcher" ${isTransport ? 'style="display:none;"' : ''}>
          <button id="section-export" class="section-btn section-active" onclick="switchSection('export')">
            <i class="ti ti-truck"></i> الصادر
          </button>
          <button id="section-import" class="section-btn" onclick="switchSection('import')">
            <i class="ti ti-ship"></i> الوارد
          </button>
        </div>

        ${isTransport ? `
        <!-- Transport-only Nav -->
        <nav class="sidebar-nav" id="nav-transport">
          <div class="nav-group-label">قسم النقل</div>
          <a class="nav-item active" data-page="transport-requests" onclick="navigate('transport-requests')">
            <i class="ti ti-truck-delivery"></i> طلبات النقل
          </a>
          <a class="nav-item" data-page="transport-settings" onclick="navigate('transport-settings')">
            <i class="ti ti-settings"></i> إدارة القوائم
          </a>
          <div class="nav-group-label">الترفيه</div>
          <a class="nav-item" data-page="activities" onclick="navigate('activities')">
            <i class="ti ti-device-gamepad-2"></i> الفعاليات
          </a>
        </nav>
        ` : `

        <!-- Export Nav -->
        <nav class="sidebar-nav" id="nav-export">
          <div class="nav-group-label">الرئيسية</div>
          <a class="nav-item active" data-page="dashboard" onclick="navigate('dashboard')">
            <i class="ti ti-home"></i> لوحة التحكم
          </a>
          <a class="nav-item" data-page="new-shipment" onclick="navigate('new-shipment')">
            <i class="ti ti-plus"></i> شحنة جديدة
          </a>
          <div class="nav-group-label">السجلات</div>
          <a class="nav-item" data-page="shipments" onclick="navigate('shipments')">
            <i class="ti ti-list"></i> سجل الشحنات
            <span class="nav-badge" id="badge-shipments">—</span>
          </a>
          <a class="nav-item" data-page="drivers" onclick="navigate('drivers')">
            <i class="ti ti-user"></i> السائقون
          </a>
          ${adminOnly ? `
          <div class="nav-group-label">قسم النقل</div>
          <a class="nav-item" data-page="transport-requests" onclick="navigate('transport-requests')">
            <i class="ti ti-truck-delivery"></i> طلبات النقل
          </a>
          <div class="nav-group-label">الإدارة</div>
          <a class="nav-item" data-page="users" onclick="navigate('users')">
            <i class="ti ti-users"></i> الموظفون
          </a>` : ''}
          <div class="nav-group-label">الترفيه</div>
          <a class="nav-item" data-page="activities" onclick="navigate('activities')">
            <i class="ti ti-device-gamepad-2"></i> الفعاليات
          </a>
        </nav>

        <!-- Import Nav -->
        <nav class="sidebar-nav" id="nav-import" style="display:none;">
          <div class="nav-group-label">الوارد</div>
          <a class="nav-item" data-page="import-dashboard" onclick="navigate('import-dashboard')">
            <i class="ti ti-layout-dashboard"></i> لوحة التحكم
          </a>
          <a class="nav-item" data-page="import-shipments" onclick="navigate('import-shipments')">
            <i class="ti ti-package"></i> الشحنات
          </a>
          <a class="nav-item" data-page="import-expenses" onclick="navigate('import-expenses')">
            <i class="ti ti-receipt"></i> المصاريف</a>
          <a class="nav-item" data-page="quotations" onclick="navigate('quotations')">
            <i class="ti ti-file-text"></i> عروض الأسعار
          </a>
          <a class="nav-item" data-page="import-calendar" onclick="navigate('import-calendar')">
            <i class="ti ti-calendar"></i> التقويم والتنبيهات
          </a>
          <div class="nav-group-label">البيانات</div>
          <a class="nav-item" data-page="import-customers" onclick="navigate('import-customers')">
            <i class="ti ti-building"></i> العملاء
          </a>
          <a class="nav-item" data-page="import-agents" onclick="navigate('import-agents')">
            <i class="ti ti-users"></i> الوكلاء
          </a>
          <div class="nav-group-label">الترفيه</div>
          <a class="nav-item" data-page="activities" onclick="navigate('activities')">
            <i class="ti ti-device-gamepad-2"></i> الفعاليات
          </a>
        </nav>
        `}

        <div class="sidebar-footer">
          <div class="user-chip">
            <div class="user-avatar">${profile?.name?.charAt(0)||'م'}</div>
            <div class="user-info">
              <div class="user-name">${profile?.name||'موظف'}</div>
              <div class="user-role">${profile?.role==='admin'?'مدير النظام':profile?.role==='transport'?'موظف نقل':profile?.role==='supervisor'?'مشرف':'موظف تخليص'}</div>
            </div>
          </div>
          <button onclick="doLogout()"
            style="margin-top:10px;width:100%;padding:7px;background:rgba(255,255,255,0.06);
            border:0.5px solid rgba(255,255,255,0.12);border-radius:7px;color:rgba(255,255,255,0.5);
            font-family:'Tajawal',sans-serif;font-size:12px;cursor:pointer;
            display:flex;align-items:center;justify-content:center;gap:6px;">
            <i class="ti ti-logout" style="font-size:14px"></i> تسجيل الخروج
          </button>
        </div>
      </aside>
      <main class="main-content">
        <div id="page-container"></div>
      </main>
    </div>`;

  window.navigate      = navigate;
  window.switchSection = switchSection;
  window.doLogout      = doLogout;
  window.updateBadges  = updateBadges;
  window.closeModal    = closeModal;

  updateBadges();
  // Transport users go straight to their requests page
  if (profile?.role === 'transport') {
    navigate('transport-requests');
  } else {
    navigate('dashboard');
  }
}

// ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────
async function doLogout() {
  await logOut();
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
export async function initApp() {
  onAuthChange(async (user) => {
    _currentUser = user;
    if (!user) { showLoginPage(); return; }

    await ensureAdminProfile(user);
    _currentProfile = await getUserProfile(user.uid);

    if (_currentProfile?.active === false) { await logOut(); return; }

    renderAppShell(_currentProfile);
    // Auto alert on login
    _triggerAutoAlert();
    // Start idle timer
    _startIdleTimer();
  });
}

export function getCurrentProfile() { return _currentProfile; }

// ─────────────────────────────────────────────
// AUTO ALERT TRIGGER
// ─────────────────────────────────────────────
async function _triggerAutoAlert() {
  try {
    const { getImportShipments } = await import('../../src/firebase/importDb.js');
    const { getAllUsers } = await import('../../src/firebase/auth.js');
    const [shipments, users] = await Promise.all([getImportShipments(), getAllUsers()]);
    await autoAlertOnLogin(shipments, users);
  } catch(e) {
    console.log('Auto alert skipped:', e.message);
  }
}

// ═════════════════════════════════════════════
// IDLE TIMEOUT - Auto logout after 30 min inactivity
// ═════════════════════════════════════════════
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const IDLE_WARNING_MS = 60 * 1000; // Warn 1 min before logout
let _idleTimer = null;
let _idleWarningTimer = null;
let _idleWarningShown = false;

function _startIdleTimer() {
  _resetIdleTimer();
  // Listen to user activity
  ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'].forEach(evt => {
    document.addEventListener(evt, _resetIdleTimer, { passive: true });
  });
}

function _resetIdleTimer() {
  if (_idleWarningShown) {
    _hideIdleWarning();
  }
  clearTimeout(_idleTimer);
  clearTimeout(_idleWarningTimer);

  // Show warning 1 min before logout
  _idleWarningTimer = setTimeout(() => {
    _showIdleWarning();
  }, IDLE_TIMEOUT_MS - IDLE_WARNING_MS);

  // Auto-logout after timeout
  _idleTimer = setTimeout(async () => {
    _hideIdleWarning();
    await logOut();
    // Show a message on the login page
    sessionStorage.setItem('_idle_logout', '1');
  }, IDLE_TIMEOUT_MS);
}

function _showIdleWarning() {
  if (_idleWarningShown) return;
  _idleWarningShown = true;

  let seconds = 60;
  const existing = document.getElementById('idle-warning');
  if (existing) existing.remove();

  const warning = document.createElement('div');
  warning.id = 'idle-warning';
  warning.innerHTML = `
    <div class="idle-backdrop"></div>
    <div class="idle-box">
      <div class="idle-icon">⏱</div>
      <div class="idle-title">تنبيه: هل ما زلت هنا؟</div>
      <div class="idle-sub">سيتم تسجيل خروجك تلقائياً خلال</div>
      <div class="idle-countdown" id="idle-countdown">60</div>
      <div class="idle-hint">ثانية</div>
      <button class="idle-btn" onclick="_stayLoggedIn()">
        <i class="ti ti-check"></i> نعم، ما زلت هنا
      </button>
    </div>
    <style>
      #idle-warning {
        position:fixed;inset:0;z-index:100000;
        display:flex;align-items:center;justify-content:center;
        font-family:'Tajawal',sans-serif;
        animation:idleFadeIn 0.2s ease-out;
      }
      @keyframes idleFadeIn { from { opacity:0; } to { opacity:1; } }
      .idle-backdrop {
        position:absolute;inset:0;
        background:rgba(14,26,46,0.85);
        backdrop-filter:blur(4px);
      }
      .idle-box {
        position:relative;background:white;
        border:1px solid #E8E5DC;border-radius:14px;
        padding:36px 40px;text-align:center;
        max-width:400px;width:90%;
        box-shadow:0 20px 60px rgba(14,26,46,0.4);
        animation:idleSlide 0.3s ease-out;
      }
      @keyframes idleSlide {
        from { transform:translateY(-20px);opacity:0; }
        to { transform:translateY(0);opacity:1; }
      }
      .idle-icon {
        font-size:48px;margin-bottom:12px;
        animation:idlePulse 1s ease-in-out infinite;
      }
      @keyframes idlePulse {
        0%,100% { transform:scale(1); }
        50% { transform:scale(1.1); }
      }
      .idle-title {
        font-size:20px;font-weight:800;color:#0E1A2E;margin-bottom:6px;
      }
      .idle-sub {
        font-size:13px;color:#6B6659;
      }
      .idle-countdown {
        font-family:'JetBrains Mono',monospace;
        font-size:56px;font-weight:800;color:#CC2229;
        margin:14px 0 0;line-height:1;
      }
      .idle-hint {
        font-size:11px;color:#8A8578;letter-spacing:2px;
        font-family:'JetBrains Mono',monospace;font-weight:700;
        margin-bottom:22px;
      }
      .idle-btn {
        background:#2E8B57;color:white;border:none;
        padding:12px 28px;border-radius:8px;
        font-family:'Tajawal',sans-serif;font-size:14px;font-weight:800;
        cursor:pointer;display:inline-flex;align-items:center;gap:8px;
        transition:all 0.15s;
      }
      .idle-btn:hover { background:#1F6640;transform:translateY(-1px); }
    </style>
  `;
  document.body.appendChild(warning);

  // Countdown
  const countdownEl = document.getElementById('idle-countdown');
  const countdownInterval = setInterval(() => {
    seconds--;
    if (countdownEl) countdownEl.textContent = seconds;
    if (seconds <= 0) clearInterval(countdownInterval);
  }, 1000);
  warning.dataset.interval = countdownInterval;
}

function _hideIdleWarning() {
  const warning = document.getElementById('idle-warning');
  if (warning) {
    if (warning.dataset.interval) clearInterval(warning.dataset.interval);
    warning.remove();
  }
  _idleWarningShown = false;
}

function _stayLoggedIn() {
  _hideIdleWarning();
  _resetIdleTimer();
}

window._stayLoggedIn = _stayLoggedIn;
