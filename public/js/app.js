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
import { renderTransportDashboard } from './pages/transportDashboard.js';
import { renderIncomingBatches } from './pages/incomingBatches.js';
import { renderUserAvatar, openAvatarPicker } from './avatars.js';
import { startNotifications, stopNotifications } from './notifications.js';
import { initCommandPalette, reloadCommandPaletteData } from './commandPalette.js';
import { initDarkMode, showSplashScreen, playSound, celebrate, checkMilestone, renderAvatar } from './enhancements.js';
import { getShipments } from '../../src/firebase/db.js';
import { onAuthChange, ensureAdminProfile, getUserProfile, logOut, isAdmin, getCurrentUser, signIn } from '../../src/firebase/auth.js';
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
  'transport-dashboard': renderTransportDashboard,
  'incoming-batches': renderIncomingBatches,
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
export function toast(msg, type = 'success', opts = {}) {
  const tc = document.getElementById('toast-container');
  if (!tc) return;

  // Sound feedback
  try {
    if (type === 'success') playSound('success');
    else if (type === 'error') playSound('error');
  } catch(e) {}

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  const duration = opts.duration || (opts.undo ? 8000 : 3500);
  const id = 'toast-' + Date.now() + Math.random().toString(36).substring(2, 6);
  el.id = id;

  // Enhanced styling for undo toasts
  if (opts.undo) {
    el.style.cssText = `
      display:flex; align-items:center; gap:12px; padding:12px 16px;
      background:#0E1A2E; color:white; border-radius:8px;
      box-shadow:0 8px 32px rgba(14,26,46,0.35);
      font-family:Tajawal,sans-serif; font-size:13px;
      max-width:420px; margin-bottom:8px; border-left:4px solid #D4B266;
      animation:toastSlideIn 0.2s ease-out;
    `;
    el.innerHTML = `
      <div style="flex:1;">${msg}</div>
      <button id="undo-${id}" style="
        background:#D4B266; color:#0E1A2E; border:none; border-radius:5px;
        padding:6px 14px; font-family:Tajawal,sans-serif; font-size:12px;
        font-weight:800; cursor:pointer; white-space:nowrap;
      "><i class="ti ti-arrow-back-up"></i> تراجع</button>
      <div id="progress-${id}" style="
        position:absolute; bottom:0; left:0; height:3px; background:#D4B266;
        border-bottom-left-radius:8px; width:100%;
        transition:width ${duration}ms linear;
      "></div>
    `;
    el.style.position = 'relative';
    tc.appendChild(el);

    // Trigger progress bar
    requestAnimationFrame(() => {
      const p = document.getElementById(`progress-${id}`);
      if (p) p.style.width = '0%';
    });

    let undone = false;
    const timeout = setTimeout(() => {
      if (!undone) el.remove();
    }, duration);

    document.getElementById(`undo-${id}`).onclick = async () => {
      undone = true;
      clearTimeout(timeout);
      el.style.opacity = '0.5';
      el.querySelector('button').disabled = true;
      el.querySelector('button').innerHTML = '<i class="ti ti-loader"></i> جاري...';
      try {
        await opts.undo();
        toast('✓ تم التراجع', 'success');
      } catch (e) {
        toast('فشل التراجع: ' + (e.message || e), 'error');
      }
      el.remove();
    };
  } else {
    el.textContent = msg;
    tc.appendChild(el);
    setTimeout(() => el.remove(), duration);
  }
}

// Add animation keyframe once
if (!document.getElementById('toast-anim-style')) {
  const s = document.createElement('style');
  s.id = 'toast-anim-style';
  s.textContent = '@keyframes toastSlideIn { from { transform:translateY(-8px); opacity:0; } to { transform:translateY(0); opacity:1; } }';
  document.head.appendChild(s);
}
window.toast = toast;

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

  // Incoming batches (new/unviewed) count
  try {
    const { getUnviewedBatchCount } = await import('../../src/firebase/transportDb.js');
    const count = await getUnviewedBatchCount();
    const ibBadge = document.getElementById('badge-incoming-batches');
    if (ibBadge) {
      if (count > 0) {
        ibBadge.style.display = '';
        ibBadge.textContent = count;
      } else {
        ibBadge.style.display = 'none';
      }
    }
  } catch(e) { /* badge is optional */ }
}

// ─────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────
function showLoginPage() {
  const wasIdleLogout = sessionStorage.getItem('_idle_logout') === '1';
  sessionStorage.removeItem('_idle_logout');

  document.getElementById('root').innerHTML = `
<style>

*{box-sizing:border-box;margin:0;padding:0;}

:root {
  --saudi-green: #006C35;
  --saudi-green-dark: #004822;
  --saudi-green-light: #128a4a;
  --gold: #c8943a;
  --gold-light: #e8b850;
  --gold-dark: #8a6320;
  --navy: #0A1828;
  --navy-2: #142642;
  --ivory: #F5F0E4;
  --cream: #FDF9EF;
  --sand: #E8DFC8;
}

body{
  font-family:'Tajawal',sans-serif;
  direction:rtl;
  min-height:100vh;
  background: #0a1420;
  position:relative;
  padding: 0 0 60px;
}

/* ═══════════════ BACKGROUND LAYERS ═══════════════ */

/* Night sky gradient */
.sky {
  position: fixed; inset: 0;
  background:
    radial-gradient(ellipse 60% 40% at 30% 20%, rgba(0, 108, 53, 0.18) 0%, transparent 70%),
    radial-gradient(ellipse 50% 40% at 75% 25%, rgba(200, 148, 58, 0.14) 0%, transparent 65%),
    linear-gradient(180deg,
      #0a1420 0%,
      #0f1c30 40%,
      #142642 70%,
      #1a3050 100%);
}

/* Islamic geometric pattern overlay (subtle) */
.pattern-overlay {
  position: fixed; inset: 0;
  opacity: 0.06;
  background-image:
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'><g fill='none' stroke='%23c8943a' stroke-width='1'><path d='M70 20 L90 40 L110 40 L110 60 L130 70 L110 80 L110 100 L90 100 L70 120 L50 100 L30 100 L30 80 L10 70 L30 60 L30 40 L50 40 Z'/><circle cx='70' cy='70' r='18'/><path d='M70 40 L100 70 L70 100 L40 70 Z'/></g></svg>");
  background-size: 180px 180px;
  pointer-events: none;
}

/* Distant city lights (subtle horizon glow) */
.horizon {
  position: fixed; bottom: 0; left: 0; right: 0; height: 40%;
  background: linear-gradient(180deg,
    transparent 0%,
    rgba(200, 148, 58, 0.05) 60%,
    rgba(0, 108, 53, 0.12) 100%);
  pointer-events: none;
}

/* ═══════════════ ISOMETRIC PORT SCENE ═══════════════ */

.port-scene {
  position: fixed;
  left: 5%;
  bottom: 8%;
  width: 620px;
  height: 500px;
  pointer-events: none;
  filter: drop-shadow(0 30px 60px rgba(0, 0, 0, 0.5));
}

.port-scene svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

/* Animation for crane */
@keyframes craneSwing {
  0%, 100% { transform: rotate(-2deg); }
  50%      { transform: rotate(4deg); }
}
.crane-arm {
  transform-origin: 320px 180px;
  animation: craneSwing 8s ease-in-out infinite;
}
.crane-arm-2 {
  transform-origin: 490px 200px;
  animation: craneSwing 10s ease-in-out infinite reverse;
}

/* Blinking warning lights */
@keyframes blink {
  0%, 40%, 100% { opacity: 1; }
  50%, 90%      { opacity: 0.2; }
}
.warn-light {
  animation: blink 2s ease-in-out infinite;
}
.warn-light.delay-1 { animation-delay: 0.5s; }
.warn-light.delay-2 { animation-delay: 1s; }

/* Palm sway */
@keyframes palmSway {
  0%, 100% { transform: rotate(-1deg); }
  50%      { transform: rotate(1.5deg); }
}
.palm-fronds {
  transform-origin: 50% 100%;
  animation: palmSway 6s ease-in-out infinite;
}
.palm-fronds.delay-1 { animation-delay: 1s; }

/* Container yard subtle glow */
.container-glow {
  animation: glow 4s ease-in-out infinite;
}
@keyframes glow {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* Rising particles (heat shimmer / port activity) */
.spark {
  position: fixed;
  width: 2px; height: 2px;
  background: var(--gold-light);
  border-radius: 50%;
  box-shadow: 0 0 6px var(--gold);
  pointer-events: none;
  animation: rise linear infinite;
}
@keyframes rise {
  0%   { transform: translateY(0) scale(0); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 0.5; }
  100% { transform: translateY(-70vh) scale(1); opacity: 0; }
}

/* ═══════════════ LOGISTICS CORNER ORNAMENTS ═══════════════ */
.corner-motif {
  position: fixed;
  width: 260px;
  height: 220px;
  opacity: 0.55;
  pointer-events: none;
  z-index: 2;
}
.corner-motif.tr { top: 20px; right: 20px; }
.corner-motif.bl { bottom: 20px; right: 20px; }

/* Route line flowing animation */
@keyframes flowRoute {
  to { stroke-dashoffset: -40; }
}
.route-anim { animation: flowRoute 3s linear infinite; }
.route-anim.slow { animation-duration: 5s; }
.route-anim.reverse { animation-direction: reverse; }

/* Port dot pulse */
@keyframes portPulse {
  0%, 100% { opacity: 0.5; r: 2.5; }
  50%      { opacity: 1; r: 4; }
}
.port-pulse { animation: portPulse 2s ease-in-out infinite; }
.port-pulse.d1 { animation-delay: 0.5s; }
.port-pulse.d2 { animation-delay: 1s; }
.port-pulse.d3 { animation-delay: 1.5s; }

/* Plane flight animation */
@keyframes flyPath {
  0%   { offset-distance: 0%; opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { offset-distance: 100%; opacity: 0; }
}

/* ═══════════════ LOGIN CARD ═══════════════ */
.wrap {
  position: relative;
  z-index: 100;
  width: 460px;
  max-width: calc(100% - 40px);
  margin: 0 auto;
  animation: cardIn 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes cardIn {
  from { opacity: 0; transform: translateY(32px) scale(0.97); }
  to   { opacity: 1; transform: none; }
}

.card {
  background: linear-gradient(165deg, #FDFAF1 0%, #F5F0E1 100%);
  border-radius: 18px;
  overflow: hidden;
  position: relative;
  box-shadow:
    0 40px 100px rgba(0, 0, 20, 0.7),
    0 20px 50px rgba(0, 0, 20, 0.4),
    0 0 0 1px rgba(200, 148, 58, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

/* Saudi flag top bar (green + gold) */
.card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 5px;
  background: linear-gradient(90deg,
    var(--saudi-green) 0%,
    var(--saudi-green-light) 40%,
    var(--gold) 60%,
    var(--gold-light) 100%);
  z-index: 3;
}

/* Card corner star ornaments */
.card::after {
  content: '';
  position: absolute;
  top: 20px; right: 20px;
  width: 60px; height: 60px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60'><g fill='none' stroke='%23c8943a' stroke-width='0.8' opacity='0.35'><path d='M30 5 L38 22 L55 25 L42 37 L46 55 L30 46 L14 55 L18 37 L5 25 L22 22 Z'/><circle cx='30' cy='30' r='8'/><circle cx='30' cy='30' r='14'/></g></svg>");
  pointer-events: none;
  z-index: 1;
}

/* Card header */
.header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 26px 14px;
  position: relative;
  border-bottom: 1px dashed rgba(200, 148, 58, 0.28);
}

.logo-frame {
  width: 62px; height: 62px;
  border-radius: 14px;
  background: white;
  padding: 6px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.15),
    0 0 0 2px var(--gold),
    0 0 0 5px rgba(200, 148, 58, 0.15);
  position: relative;
}
.logo-frame::before {
  content: '';
  position: absolute;
  inset: -12px;
  border-radius: 20px;
  border: 1px solid rgba(0, 108, 53, 0.15);
  pointer-events: none;
}
.logo-frame img {
  width: 100%; height: 100%;
  object-fit: contain;
  display: block;
}

.brand { flex: 1; }
.brand-ar {
  font-family: 'Cairo', 'Tajawal', sans-serif;
  font-size: 19px;
  font-weight: 900;
  color: var(--navy);
  line-height: 1.05;
  letter-spacing: -0.5px;
}
.brand-en {
  font-family: Georgia, serif;
  font-size: 8.5px;
  font-weight: 700;
  color: var(--gold-dark);
  letter-spacing: 3.5px;
  margin-top: 3px;
}
.brand-line {
  width: 34px;
  height: 2px;
  background: linear-gradient(90deg, var(--gold), transparent);
  margin: 6px 0 5px;
}
.brand-sub {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--saudi-green-dark);
}
.brand-sub-en {
  font-family: monospace;
  font-size: 7.5px;
  font-weight: 600;
  color: rgba(0, 72, 34, 0.55);
  letter-spacing: 1.8px;
  margin-top: 2px;
}

/* Status strip (deep green) */
.status-strip {
  background: linear-gradient(90deg, var(--saudi-green-dark), var(--saudi-green), var(--saudi-green-dark));
  padding: 7px 26px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: monospace;
  font-size: 10px;
  letter-spacing: 2.5px;
  position: relative;
}
.status-strip::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
}
.status-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--gold-light);
  box-shadow: 0 0 12px var(--gold), 0 0 4px var(--gold-light);
  animation: pulse 2s ease-in-out infinite;
  flex-shrink: 0;
}
@keyframes pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50%      { opacity: 1; transform: scale(1.4); }
}
.status-label { color: var(--gold-light); font-weight: 800; }
.status-val { color: rgba(255, 255, 255, 0.75); }

/* Form area */
.form { padding: 18px 26px 14px; }

.welcome {
  text-align: center;
  margin-bottom: 14px;
  position: relative;
}
.welcome-title {
  font-family: 'Cairo', sans-serif;
  font-size: 15px;
  font-weight: 900;
  color: var(--navy);
  margin-bottom: 3px;
}
.welcome-sub {
  font-size: 10px;
  color: var(--saudi-green-dark);
  font-weight: 700;
  letter-spacing: 1px;
}
.welcome-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 5px;
}
.welcome-ornament .line {
  flex: 0 0 60px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
}
.welcome-ornament .diamond {
  width: 6px; height: 6px;
  background: var(--gold);
  transform: rotate(45deg);
}

.field { margin-bottom: 10px; }
.field label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  font-weight: 800;
  color: var(--navy);
  margin-bottom: 5px;
}
.field label .ic {
  color: var(--gold);
  font-size: 15px;
  width: 16px;
  text-align: center;
}
.field .input-wrap {
  position: relative;
}
.field input {
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid rgba(200, 148, 58, 0.35);
  border-radius: 10px;
  font-size: 14px;
  font-family: 'Tajawal', sans-serif;
  color: var(--navy);
  background: rgba(255, 255, 255, 0.7);
  outline: none;
  transition: all 0.25s;
  direction: ltr;
  text-align: right;
}
.field input:focus {
  border-color: var(--saudi-green);
  background: white;
  box-shadow: 0 0 0 3.5px rgba(0, 108, 53, 0.12);
}

.login-btn {
  width: 100%;
  padding: 11px;
  margin-top: 6px;
  background: linear-gradient(135deg,
    var(--saudi-green-dark) 0%,
    var(--saudi-green) 50%,
    var(--saudi-green-light) 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 800;
  font-family: 'Cairo', 'Tajawal', sans-serif;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-shadow:
    0 8px 24px rgba(0, 108, 53, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  border-top: 1px solid var(--gold);
  transition: all 0.25s;
  position: relative;
  overflow: hidden;
}
.login-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent 40%, rgba(200, 148, 58, 0.22) 100%);
  opacity: 0;
  transition: opacity 0.3s;
}
.login-btn:hover::before { opacity: 1; }
.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 32px rgba(0, 108, 53, 0.6);
}
.btn-arrow { font-size: 20px; transition: transform 0.25s; }
.login-btn:hover .btn-arrow { transform: translateX(-4px); }

/* Card footer */
.footer {
  background: linear-gradient(135deg,
    rgba(0, 108, 53, 0.05),
    rgba(200, 148, 58, 0.05));
  border-top: 1px dashed rgba(200, 148, 58, 0.28);
  padding: 9px 26px;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.foot-item {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  font-weight: 700;
  color: var(--saudi-green-dark);
}
.foot-icon { color: var(--gold); font-size: 13px; }

.saudi-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  background: var(--saudi-green);
  color: white;
  border-radius: 20px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.2px;
  font-family: monospace;
}
.saudi-badge::before {
  content: '';
  width: 8px; height: 8px;
  background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23e8b850'><path d='M12 2 L14.4 9.2 L22 9.2 L15.8 13.8 L18.2 21 L12 16.4 L5.8 21 L8.2 13.8 L2 9.2 L9.6 9.2 Z'/></svg>") center/contain no-repeat;
}

/* ═══ هوية "الختم" — قسم صور حقيقية (طائرة/سفينة/شاحنة) + بطاقة دخول عائمة ═══ */
.hero { position: relative; margin-bottom: -85px; }
.hero-band {
  position: relative;
  width: 100%;
  height: 10vh;
  min-height: 68px;
  max-height: 108px;
  background-size: cover;
  background-position: center;
  background-color: #0e1b30;
  overflow: hidden;
}
.hero-band-shade {
  position: absolute; inset: 0;
  background: linear-gradient(180deg,
    rgba(8, 16, 28, 0.60) 0%,
    rgba(8, 16, 28, 0.10) 45%,
    rgba(8, 16, 28, 0.15) 60%,
    rgba(8, 16, 28, 0.70) 100%);
}
/* مرساة يمين فقط — يتجنّب زر الوضع الليلي/النهاري الثابت أعلى يسار الصفحة */
.hero-topbar {
  position: absolute; top: 12px; right: 20px;
  display: flex; align-items: center;
  gap: 8px;
  max-width: min(75%, 360px);
  z-index: 2;
}
.hero-brand-ar {
  color: #fff;
  font-family: 'Cairo', 'Tajawal', sans-serif;
  font-size: clamp(13px, 2.4vw, 17px);
  font-weight: 900;
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.55);
}
.hero-brand-sub {
  color: rgba(255, 255, 255, 0.9);
  font-size: 9px;
  margin-top: 2px;
  line-height: 1.4;
  text-shadow: 0 1px 10px rgba(0, 0, 0, 0.55);
}
.hero-logo-badge {
  width: 38px; height: 38px;
  border-radius: 9px;
  background: #fff;
  padding: 4px;
  flex-shrink: 0;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35), 0 0 0 2px var(--gold);
}
.hero-logo-badge img { width: 100%; height: 100%; object-fit: contain; display: block; }
/* bottom = مقدار تراكب البطاقة (85px) + هامش أمان 12px، حتى لا تختفي الصف خلف البطاقة */
.hero-modes {
  position: absolute; right: 20px; bottom: 97px; left: 20px;
  display: flex; align-items: center; gap: 10px;
  z-index: 3;
}
.hero-mode { display: flex; align-items: center; gap: 5px; }
.hero-mode span {
  color: #fff; font-size: 10px; font-weight: 800;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.55);
}
.hero-mode svg { width: 13px; height: 13px; color: var(--gold-light); }
.hero-mode-sep { width: 18px; height: 1px; background: rgba(255, 255, 255, 0.4); }

@media (max-width: 640px) {
  .hero-band { height: 8vh; min-height: 54px; max-height: 76px; }
  .hero-topbar { top: 8px; right: 14px; max-width: 82%; gap: 6px; }
  .hero-logo-badge { width: 30px; height: 30px; border-radius: 7px; }
  .hero-modes { right: 14px; left: 14px; bottom: 72px; gap: 6px; }
  .hero { margin-bottom: -62px; }
}
@media (prefers-reduced-motion: reduce) {
  .wrap { animation: none; }
}

</style>


<div class="hero">
  <div class="hero-band" style="background-image:url('https://images.pexels.com/photos/1911388/pexels-photo-1911388.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=1600')">
    <div class="hero-band-shade"></div>
    <div class="hero-topbar">
      <div class="hero-logo-badge">
        <img src="data:image/jpeg;base64,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gfdYfq6x6VMxmAf+ylm2DP7OpsFe4z6zrPu9pme23X2qP9HI1yzg0QqyGHtC1DsSBZALWV2cg6hCQZwNw2JLNaqaBTukrmAtBIKauHXgKL1gNdw6p+imF6pT2jWB6qErZdNYVxAbMB3QE7eku7OYuoJQescKn76NksLowh4GMf6ORBZcFCb3zGofkdIcuOhGHhMs5US2dGbHcKUwEPHWG58V6IjGJxMEeuVqnC0pSlKUrRleAoFfFgIAAMhtaSzcN90b1sINle43jHZZjTnZJZ1lm2nANLGQg0wsQ03LJZ1lnUlnWWbGGOU8ZZ1PWEx6xvHYu+nIrloTXWWgFavDvMsIWSrNyMrwf2hjy1LTFmUCW9kv6QsSfuSQsQJXUmYAJ8fqUXThDPwuzwlDvXNEw2ozYhNJc4Lrv3TMJ3R1TPt2uIQOcqxhWX9eXVl75v5OLcQC89hlSYGac5iN+aR34aUbTuLPEHG+0EomkGMZSIJPvOsRhkeL6yjrwj+zI34UpbMDF/ZLImvvB24nMqmKxLedgONe1gIhbrQxO/DoPAN9LgrhkmQTPnNBM12UXFKyWdGkKOlwELtzKkvw7hXh2JjdEyMIMABUYTLw1OtR2YVgxIQ4Q9XWksgUEzhikKh8nlrAQ/8AQjWH0htYtxCi4CoRVZxicnjUIV7imUesA0Izs6jpwDgJewrhdhs7Cdh6TsIAZBsUzD5QDIDYtmPSAGQEQcydh6QAyIg5kAMiUdCUdCUdCIcwgeQ9OTolZWVlZWVlZWVlZWVlZWVlZXe/X/1r/wD/APw7EzFU2n//2gAMAwEAAgADAAAAEAggggQfPLM/ffffffffffffffQggggknfPPENfffffffffffffQgggggkcYEgsh8woj3fffffffQggggggQYAjGjvcAINvffffffQggggggwwWg5Vwvv603PfffffQggggggQRgkXPvvvvrvffffffaggggggQVARMNvvvvvnfffffffggggggAQYzUn/vvvvo/ffffffqgggggSQQZiLsPvvvqsdfffffvgggggSQQQQRBsvvvqvMxdfffvrggggUSQQQVeDUvfovPFnffffvrgggm+QQQQQcaHvl/PP8AX3333760JHk0ckEEEEtXXPzzxb33333725mb01+8sMsAT0fzzwv3333377768QgEEU4AJp/7zzyn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" alt="السديس اللوجستية">
      </div>
      <div>
        <div class="hero-brand-ar">السديس اللوجستية</div>
        <div class="hero-brand-sub">تسهيل التخليص الجمركي .. من أجل تجارة أسرع وأكثر أمانًا</div>
      </div>
    </div>
  </div>

  <div class="hero-band" style="background-image:url('https://images.pexels.com/photos/14392678/pexels-photo-14392678.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=1600')">
    <div class="hero-band-shade"></div>
  </div>

  <div class="hero-band" style="background-image:url('https://images.pexels.com/photos/5410923/pexels-photo-5410923.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=1600')">
    <div class="hero-band-shade"></div>
  </div>

  <!-- مثبّتة على .hero نفسها (وليست داخل آخر شريط) حتى تبقى دائمًا فوق حافة البطاقة العلوية بغض النظر عن ارتفاع الشاشة -->
  <div class="hero-modes">
    <div class="hero-mode">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 12L22 4L14 12L22 20L2 12Z"/></svg>
      <span>جوًا</span>
    </div>
    <span class="hero-mode-sep"></span>
    <div class="hero-mode">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 16L22 16L19 21L5 21Z"/><path d="M12 16V3L18 9H12Z"/></svg>
      <span>بحرًا</span>
    </div>
    <span class="hero-mode-sep"></span>
    <div class="hero-mode">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 8H14V17H2Z"/><path d="M14 11H18L22 15V17H14Z"/><circle cx="6" cy="19" r="1.8"/><circle cx="17" cy="19" r="1.8"/></svg>
      <span>برًا</span>
    </div>
  </div>
</div>

<!-- ═══════════════════ LOGIN CARD ═══════════════════ -->
<div class="wrap">
<div class="card">
  <div class="header">
    <div class="logo-frame">
      <img src="data:image/jpeg;base64,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gfdYfq6x6VMxmAf+ylm2DP7OpsFe4z6zrPu9pme23X2qP9HI1yzg0QqyGHtC1DsSBZALWV2cg6hCQZwNw2JLNaqaBTukrmAtBIKauHXgKL1gNdw6p+imF6pT2jWB6qErZdNYVxAbMB3QE7eku7OYuoJQescKn76NksLowh4GMf6ORBZcFCb3zGofkdIcuOhGHhMs5US2dGbHcKUwEPHWG58V6IjGJxMEeuVqnC0pSlKUrRleAoFfFgIAAMhtaSzcN90b1sINle43jHZZjTnZJZ1lm2nANLGQg0wsQ03LJZ1lnUlnWWbGGOU8ZZ1PWEx6xvHYu+nIrloTXWWgFavDvMsIWSrNyMrwf2hjy1LTFmUCW9kv6QsSfuSQsQJXUmYAJ8fqUXThDPwuzwlDvXNEw2ozYhNJc4Lrv3TMJ3R1TPt2uIQOcqxhWX9eXVl75v5OLcQC89hlSYGac5iN+aR34aUbTuLPEHG+0EomkGMZSIJPvOsRhkeL6yjrwj+zI34UpbMDF/ZLImvvB24nMqmKxLedgONe1gIhbrQxO/DoPAN9LgrhkmQTPnNBM12UXFKyWdGkKOlwELtzKkvw7hXh2JjdEyMIMABUYTLw1OtR2YVgxIQ4Q9XWksgUEzhikKh8nlrAQ/8AQjWH0htYtxCi4CoRVZxicnjUIV7imUesA0Izs6jpwDgJewrhdhs7Cdh6TsIAZBsUzD5QDIDYtmPSAGQEQcydh6QAyIg5kAMiUdCUdCUdCIcwgeQ9OTolZWVlZWVlZWVlZWVlZWVlZXe/X/1r/wD/APw7EzFU2n//2gAMAwEAAgADAAAAEAggggQfPLM/ffffffffffffffQggggknfPPENfffffffffffffQgggggkcYEgsh8woj3fffffffQggggggQYAjGjvcAINvffffffQggggggwwWg5Vwvv603PfffffQggggggQRgkXPvvvvrvffffffaggggggQVARMNvvvvvnfffffffggggggAQYzUn/vvvvo/ffffffqgggggSQQZiLsPvvvqsdfffffvgggggSQQQQRBsvvvqvMxdfffvrggggUSQQQVeDUvfovPFnffffvrgggm+QQQQQcaHvl/PP8AX3333760JHk0ckEEEEtXXPzzxb33333725mb01+8sMsAT0fzzwv3333377768QgEEU4AJp/7zzyn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" alt="السديس اللوجستية">
    </div>
    <div class="brand">
      <div class="brand-ar">السديس اللوجستية</div>
      <div class="brand-en">AL SUDAIS LOGISTICS</div>
      <div class="brand-line"></div>
      <div class="brand-sub">نظام التخليص الجمركي</div>
      <div class="brand-sub-en">CUSTOMS CLEARANCE PLATFORM</div>
    </div>
  </div>

  <div class="status-strip">
    <div class="status-dot"></div>
    <span class="status-label">SDS</span>
    <span class="status-val">·&nbsp;&nbsp;JEDDAH&nbsp;&nbsp;·&nbsp;&nbsp;AUTHORIZED PORTAL</span>
    <span class="saudi-badge" style="margin-right:auto;">KSA</span>
  </div>

  <div class="form">
    <div class="welcome">
      <div class="welcome-title">مرحباً بعودتك</div>
      <div class="welcome-sub">تسجيل الدخول إلى النظام</div>
      <div class="welcome-ornament">
        <div class="line"></div>
        <div class="diamond"></div>
        <div class="line"></div>
      </div>
    </div>

    <div class="field">
      <label><span class="ic">✉</span> البريد الإلكتروني</label>
      <input type="email" id="email" placeholder="name@example.com">
    </div>
    <div class="field">
      <label><span class="ic">🔒</span> كلمة المرور</label>
      <input type="password" id="password" placeholder="••••••••">
    </div>

    <div id="err" style="display:none;padding:10px;margin-bottom:10px;background:rgba(196,24,24,0.1);color:#c41818;border:1px solid rgba(196,24,24,0.3);border-radius:6px;font-size:13px;align-items:center;gap:8px;"></div>
    <button class="login-btn" id="login-btn" onclick="doLogin()">
      <span>تسجيل الدخول</span>
      <span class="btn-arrow">←</span>
    </button>
  </div>

  <div class="footer">
    <div class="foot-item">
      <span class="foot-icon">📍</span>
      <span>جدة · المملكة العربية السعودية</span>
    </div>
    <div class="foot-item">
      <span class="foot-icon">🌐</span>
      <span>الإمارات · البحرين · عُمان</span>
    </div>
  </div>
</div>
</div>



  `;

  if (wasIdleLogout) {
    setTimeout(() => {
      alert('تم تسجيل الخروج بسبب عدم النشاط لمدة 30 دقيقة.');
    }, 200);
  }

  // Sparks particles
  const sparksEl = document.getElementById('sparks');
  if (sparksEl) {
    for (let i = 0; i < 25; i++) {
      const s = document.createElement('div');
      s.className = 'spark';
      s.style.left = (5 + Math.random() * 90) + 'vw';
      s.style.bottom = (5 + Math.random() * 30) + 'vh';
      const dur = 6 + Math.random() * 4;
      s.style.animationDuration = dur + 's';
      s.style.animationDelay = (-Math.random() * dur) + 's';
      sparksEl.appendChild(s);
    }
  }

  window.doLogin = async () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn = document.getElementById('login-btn');
    const errBox = document.getElementById('err');
    errBox.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<div style="width:20px;height:20px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 0.8s linear infinite;"></div>';

    try {
      await signIn(email, password);
    } catch (e) {
      btn.disabled = false;
      btn.innerHTML = 'دخول <span class="btn-arrow">←</span>';
      const msgs = {
        'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة',
        'auth/user-not-found': 'المستخدم غير موجود',
        'auth/wrong-password': 'كلمة المرور غير صحيحة',
        'auth/invalid-email': 'البريد الإلكتروني غير صحيح',
        'auth/too-many-requests': 'محاولات كثيرة، حاول لاحقاً',
      };
      errBox.innerHTML = `<i class="ti ti-alert-circle"></i> ${msgs[e.code] || 'خطأ في تسجيل الدخول'}`;
      errBox.style.display = 'flex';
    }
  };

  if (!document.getElementById('spin-style')) {
    const s = document.createElement('style');
    s.id = 'spin-style';
    s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(s);
  }
}



// ─────────────────────────────────────────────
// APP SHELL
// ─────────────────────────────────────────────
function renderAppShell(profile) {
  const adminOnly = isAdmin(_currentUser);
  const isTransport = profile?.role === 'transport';
  const isManager = profile?.role === 'manager';
  const isElevated = adminOnly || isManager; // admin or manager: sees transport + can access everything
  const isCustoms = profile?.role === 'employee' || profile?.role === 'supervisor' || adminOnly || isManager;

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
          <a class="nav-item active" data-page="transport-dashboard" onclick="navigate('transport-dashboard')">
            <i class="ti ti-layout-dashboard"></i> لوحة التحكم
          </a>
          <a class="nav-item" data-page="transport-requests" onclick="navigate('transport-requests')">
            <i class="ti ti-truck-delivery"></i> طلبات النقل
          </a>
          <a class="nav-item" data-page="drivers" onclick="navigate('drivers')">
            <i class="ti ti-user"></i> السائقون
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
          <a class="nav-item" data-page="incoming-batches" onclick="navigate('incoming-batches')">
            <i class="ti ti-inbox"></i> الدفعات الواردة
            <span class="nav-badge" id="badge-incoming-batches" style="display:none;background:#CC2229;">0</span>
          </a>
          <a class="nav-item" data-page="drivers" onclick="navigate('drivers')">
            <i class="ti ti-user"></i> السائقون
          </a>
          ${isElevated ? `
          <div class="nav-group-label">قسم النقل</div>
          <a class="nav-item" data-page="transport-requests" onclick="navigate('transport-requests')">
            <i class="ti ti-truck-delivery"></i> طلبات النقل
          </a>
          ${adminOnly ? `
          <div class="nav-group-label">الإدارة</div>
          <a class="nav-item" data-page="users" onclick="navigate('users')">
            <i class="ti ti-users"></i> الموظفون
          </a>` : ''}` : ''}
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
            <div id="user-avatar-wrap" style="position:relative;cursor:pointer;" onclick="_openAvatarPicker()" title="تعديل الصورة الشخصية">
              ${renderUserAvatar(profile?.avatar, profile?.name || 'م', 40)}
              <div id="user-avatar-edit-overlay" style="position:absolute;inset:0;border-radius:50%;background:rgba(14,26,46,0.65);display:none;align-items:center;justify-content:center;color:#D4B266;">
                <i class="ti ti-pencil" style="font-size:16px;"></i>
              </div>
            </div>
            <div class="user-info">
              <div class="user-name">${profile?.name||'موظف'}</div>
              <div class="user-role">${profile?.role==='admin'?'مدير النظام':profile?.role==='manager'?'مدير قسم':profile?.role==='transport'?'موظف نقل':profile?.role==='supervisor'?'مشرف':'موظف تخليص'}</div>
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

  // Avatar picker — opens modal for user to change their profile picture
  window._openAvatarPicker = () => {
    openAvatarPicker(profile?.avatar, async (newAvatar) => {
      // Update local profile so UI reflects immediately
      if (profile) profile.avatar = newAvatar;
      // Re-render sidebar avatar without full reload
      const wrap = document.getElementById('user-avatar-wrap');
      if (wrap) {
        wrap.innerHTML = `
          ${renderUserAvatar(newAvatar, profile?.name || 'م', 40)}
          <div id="user-avatar-edit-overlay" style="position:absolute;inset:0;border-radius:50%;background:rgba(14,26,46,0.65);display:none;align-items:center;justify-content:center;color:#D4B266;">
            <i class="ti ti-pencil" style="font-size:16px;"></i>
          </div>
        `;
        wireAvatarHover();
      }
    });
  };

  // Wire hover-to-show-pencil on avatar
  function wireAvatarHover() {
    const wrap = document.getElementById('user-avatar-wrap');
    const overlay = document.getElementById('user-avatar-edit-overlay');
    if (!wrap || !overlay) return;
    wrap.onmouseenter = () => { overlay.style.display = 'flex'; };
    wrap.onmouseleave = () => { overlay.style.display = 'none'; };
  }
  wireAvatarHover();

  // Initialize Command Palette (Ctrl+K)
  initCommandPalette(navigate);

  // Initialize dark mode (auto after Maghrib)
  initDarkMode();

  // Expose sound + celebrate for milestones and other pages
  window._playSound = playSound;
  window._celebrate = celebrate;
  window._checkMilestone = checkMilestone;
  window._renderAvatar = renderAvatar;

  // Floating search button (bottom-left) — opens Command Palette
  if (!document.getElementById('cp-fab')) {
    const fab = document.createElement('button');
    fab.id = 'cp-fab';
    fab.title = 'بحث سريع (Ctrl+K)';
    fab.innerHTML = '<i class="ti ti-search"></i><span style="font-family:JetBrains Mono,monospace;font-size:10px;letter-spacing:1px;">CTRL+K</span>';
    fab.style.cssText = `
      position:fixed; bottom:24px; left:24px; z-index:9998;
      background:#0E1A2E; color:#D4B266;
      border:1.5px solid #D4B266; border-radius:24px;
      padding:10px 16px; display:flex; align-items:center; gap:8px;
      font-family:Tajawal,sans-serif; font-size:13px; font-weight:700;
      cursor:pointer; box-shadow:0 6px 20px rgba(14,26,46,0.25);
      transition:transform 0.15s;
    `;
    fab.onmouseenter = () => { fab.style.transform = 'translateY(-2px)'; };
    fab.onmouseleave = () => { fab.style.transform = 'translateY(0)'; };
    fab.onclick = () => window._openCommandPalette();
    document.body.appendChild(fab);
  }

  updateBadges();

  // Start real-time notifications (sound + banner on new data)
  startNotifications(profile, () => {
    // Refresh callback: re-trigger current page's data load if possible
    const currentPage = document.querySelector('.nav-item.active')?.dataset?.page;
    if (currentPage) navigate(currentPage);
  });

  // Transport users go straight to their dashboard
  if (profile?.role === 'transport') {
    navigate('transport-dashboard');
  } else {
    navigate('dashboard');
  }
}

// ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────
async function doLogout() {
  stopNotifications(); // Clean up listeners
  await logOut();
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
export async function initApp() {
  let _splashShown = false;
  onAuthChange(async (user) => {
    _currentUser = user;
    if (!user) { showLoginPage(); _splashShown = false; return; }

    await ensureAdminProfile(user);
    _currentProfile = await getUserProfile(user.uid);

    if (_currentProfile?.active === false) { await logOut(); return; }

    renderAppShell(_currentProfile);

    // Splash screen — only once per auth session
    if (!_splashShown) {
      _splashShown = true;
    try {
      const logoMatch = document.body.innerHTML.match(/src="(data:image\/[^"]+)"[^>]*(?:alt="[^"]*SDS|class="logo)/);
      const logoDataUri = logoMatch ? logoMatch[1] : null;

      // Fetcher with retry — handles Firestore cold start on refresh
      const statsFetcher = async () => {
        const { getShipments } = await import('../../src/firebase/db.js');

        // Wait for Firestore to warm up, then try up to 3 times
        let shipments = [];
        for (let attempt = 0; attempt < 3; attempt++) {
          await new Promise(r => setTimeout(r, attempt === 0 ? 400 : 1200));
          try {
            shipments = await getShipments(500);
            console.log(`splash stats attempt ${attempt+1}: got ${shipments.length} shipments`);
            if (shipments.length > 0) break;
          } catch (e) {
            console.warn(`splash stats attempt ${attempt+1} failed`, e);
          }
        }

        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const thisMonth = shipments.filter(s => {
          const d = s.created_at?.toDate ? s.created_at.toDate() : (s.created_at ? new Date(s.created_at) : null);
          return d && d >= monthStart;
        }).length;
        const inProgress = shipments.filter(s => s.status === 'draft' || s.status === 'sent_broker' || !s.status).length;
        const result = { total: shipments.length, thisMonth, inProgress };
        console.log('splash fetcher returning:', result);
        return result;
      };

      showSplashScreen(logoDataUri, statsFetcher);
    } catch(e) { console.warn('splash failed', e); }
    } // end if !_splashShown

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
