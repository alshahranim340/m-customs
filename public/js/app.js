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

        <!-- Vehicle 1: Premium Wide-body Airliner -->
        <div class="vehicle vehicle-plane">
          <svg viewBox="0 0 380 120" width="340" height="108" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="plBody" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#FFFFFF"/>
                <stop offset="40%" stop-color="#F0F4FA"/>
                <stop offset="100%" stop-color="#B8C4D4"/>
              </linearGradient>
              <linearGradient id="plBelly" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#D0D8E8"/>
                <stop offset="100%" stop-color="#A0AABB"/>
              </linearGradient>
              <linearGradient id="plWing" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#E8EDF5"/>
                <stop offset="100%" stop-color="#B0BAC8"/>
              </linearGradient>
              <linearGradient id="plEngine" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stop-color="#2A3545"/>
                <stop offset="30%" stop-color="#4A5568"/>
                <stop offset="100%" stop-color="#2A3545"/>
              </linearGradient>
              <linearGradient id="plTail" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stop-color="#1C2D4E"/>
                <stop offset="100%" stop-color="#2563a8"/>
              </linearGradient>
              <linearGradient id="plCockpit" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stop-color="#6BA3CC" stop-opacity="0.9"/>
                <stop offset="100%" stop-color="#2A4A6E" stop-opacity="0.95"/>
              </linearGradient>
              <filter id="plGlow">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <linearGradient id="contrailGrad" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stop-color="rgba(255,255,255,0)" />
                <stop offset="40%" stop-color="rgba(255,255,255,0.6)" />
                <stop offset="100%" stop-color="rgba(255,255,255,0.15)" />
              </linearGradient>
            </defs>

            <!-- Contrails (twin engine trails) -->
            <path d="M 360 62 Q 300 60 200 58 Q 120 57 20 60" stroke="url(#contrailGrad)" stroke-width="4" fill="none" opacity="0.7"/>
            <path d="M 360 66 Q 300 64 200 62 Q 120 61 20 64" stroke="url(#contrailGrad)" stroke-width="3" fill="none" opacity="0.5"/>

            <!-- Main wing (starboard visible) -->
            <path d="M 160 60 L 90 100 L 130 100 L 185 65 Z" fill="url(#plWing)" stroke="#8A96A8" stroke-width="0.6"/>
            <!-- Wing flap detail -->
            <path d="M 100 98 L 130 98 L 155 68 L 148 70 Z" fill="#C8D0DC" opacity="0.6"/>
            <!-- Winglet -->
            <path d="M 90 100 L 86 92 L 92 92 L 94 100 Z" fill="#D0D8E8" stroke="#9AA4B4" stroke-width="0.4"/>

            <!-- Wing (port, partially visible below) -->
            <path d="M 175 65 L 200 98 L 230 100 L 195 63 Z" fill="url(#plWing)" stroke="#8A96A8" stroke-width="0.5" opacity="0.7"/>
            <path d="M 228 98 L 232 90 L 236 90 L 234 98 Z" fill="#D0D8E8" stroke="#9AA4B4" stroke-width="0.4" opacity="0.7"/>

            <!-- Main fuselage — cross-section tapered tube -->
            <!-- Belly shadow -->
            <path d="M 28 65 Q 15 63 8 60 L 8 68 Q 15 71 28 69 L 320 69 Q 340 69 355 60 Q 340 62 320 65 Z" fill="url(#plBelly)"/>
            <!-- Fuselage top -->
            <path d="M 28 55 Q 18 52 10 56 L 8 60 Q 15 63 28 65 L 320 65 Q 340 65 355 60 L 350 55 Q 338 52 320 55 Z" fill="url(#plBody)" stroke="#9AA4B2" stroke-width="0.5"/>

            <!-- Blue cheatline (livery stripe) -->
            <path d="M 28 58 Q 18 56 12 58 L 10 60 L 28 62 L 320 62 Q 338 62 348 58 Q 338 56 320 58 Z" fill="url(#plTail)" opacity="0.75"/>
            <!-- Gold accent line below blue -->
            <path d="M 40 62.5 L 318 62.5 Q 330 62.5 340 60 Q 330 63 318 63.5 L 40 63.5 Z" fill="#c8943a" opacity="0.5"/>

            <!-- Windows row (oval portholes) -->
            <g opacity="0.9">
              ${Array.from({length: 28}, (_, i) => `
                <rect x="${42 + i * 9.8}" y="57.5" width="5.5" height="3.5" rx="1.5" fill="#2A3E5A" stroke="#4A6080" stroke-width="0.3"/>
                <rect x="${43 + i * 9.8}" y="57.8" width="2" height="1.2" rx="0.5" fill="rgba(180,220,255,0.5)"/>
              `).join('')}
            </g>

            <!-- Cockpit nose -->
            <path d="M 8 58 Q 0 60 0 60 Q 0 60 8 62 L 28 65 L 28 55 Z" fill="url(#plBody)" stroke="#8A96A8" stroke-width="0.4"/>
            <!-- Cockpit glass -->
            <path d="M 12 58 Q 6 60 12 62 L 26 64 L 26 56 Z" fill="url(#plCockpit)"/>
            <!-- Cockpit frame lines -->
            <line x1="18" y1="56.5" x2="18" y2="63.5" stroke="rgba(255,255,255,0.3)" stroke-width="0.5"/>

            <!-- Horizontal stabilizers (tail) -->
            <path d="M 310 58 L 295 46 L 308 46 L 320 56 Z" fill="url(#plWing)" stroke="#8A96A8" stroke-width="0.5"/>
            <path d="M 315 62 L 300 74 L 313 74 L 322 64 Z" fill="url(#plWing)" stroke="#8A96A8" stroke-width="0.5" opacity="0.8"/>

            <!-- Vertical stabilizer -->
            <path d="M 318 57 Q 335 30 348 22 L 355 26 Q 345 34 330 60 Z" fill="url(#plTail)" stroke="#1C2D4E" stroke-width="0.4"/>
            <!-- Tail logo (SDS mark) -->
            <circle cx="340" cy="38" r="5" fill="rgba(200,148,58,0.8)"/>
            <text x="340" y="41" fill="white" font-family="Arial" font-size="5" font-weight="900" text-anchor="middle">SDS</text>

            <!-- Engine 1 (on wing, port) -->
            <ellipse cx="130" cy="78" rx="18" ry="9" fill="url(#plEngine)" stroke="#1A2535" stroke-width="0.6"/>
            <ellipse cx="115" cy="78" rx="7" ry="8" fill="#1A2535"/>
            <ellipse cx="115" cy="78" rx="5" ry="6" fill="#0A1525"/>
            <!-- Engine fan face highlight -->
            <circle cx="115" cy="78" r="3.5" fill="none" stroke="rgba(100,140,180,0.4)" stroke-width="0.8"/>
            <!-- Engine nacelle detail -->
            <path d="M 115 70 L 148 72 L 148 84 L 115 86 Z" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>
            <!-- Engine pylon -->
            <path d="M 135 71 L 140 65 L 145 66 L 140 72 Z" fill="#3A4552" stroke="#2A3545" stroke-width="0.3"/>

            <!-- Engine 2 (on wing, starboard, slightly visible) -->
            <ellipse cx="205" cy="76" rx="15" ry="7.5" fill="url(#plEngine)" stroke="#1A2535" stroke-width="0.5" opacity="0.75"/>
            <ellipse cx="193" cy="76" rx="5.5" ry="6.5" fill="#1A2535" opacity="0.75"/>
            <path d="M 195 69 L 220 71 L 220 81 L 195 83 Z" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="0.4" opacity="0.75"/>

            <!-- Nose gear (tucked) -->
            <rect x="38" y="66" width="4" height="5" rx="1" fill="#2A3545" opacity="0.6"/>

            <!-- Landing lights (nose) -->
            <circle cx="6" cy="60" r="1.5" fill="#FFF9E0" opacity="0.9" filter="url(#plGlow)"/>
          </svg>
        </div>

        <!-- Vehicle 2: Premium Container Vessel -->
        <div class="vehicle vehicle-ship">
          <svg viewBox="0 0 480 160" width="420" height="140" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="shHull" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#1E3A5F"/>
                <stop offset="60%" stop-color="#162E4D"/>
                <stop offset="100%" stop-color="#0D1E35"/>
              </linearGradient>
              <linearGradient id="shDeck" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#2A3F58"/>
                <stop offset="100%" stop-color="#1C2F48"/>
              </linearGradient>
              <linearGradient id="shWater" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="rgba(56,189,248,0.35)"/>
                <stop offset="100%" stop-color="rgba(14,56,100,0.1)"/>
              </linearGradient>
              <linearGradient id="shBridge" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#F0F4FA"/>
                <stop offset="100%" stop-color="#D8E0EE"/>
              </linearGradient>
              <linearGradient id="shFoam" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stop-color="rgba(255,255,255,0.9)"/>
                <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
              </linearGradient>
              <filter id="shShadow" x="-10%" y="-10%" width="120%" height="130%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="rgba(0,0,40,0.4)"/>
              </filter>
            </defs>

            <!-- Water surface -->
            <path d="M 0 118 Q 24 112 48 118 T 96 118 T 144 118 T 192 118 T 240 118 T 288 118 T 336 118 T 384 118 T 432 118 T 480 118 V 160 H 0 Z" fill="url(#shWater)"/>
            <!-- Water ripple lines -->
            <path d="M 0 124 Q 30 120 60 124 T 120 124 T 180 124 T 240 124 T 300 124 T 360 124 T 420 124 T 480 124" stroke="rgba(255,255,255,0.12)" stroke-width="1" fill="none"/>
            <path d="M 0 130 Q 40 126 80 130 T 160 130 T 240 130 T 320 130 T 400 130 T 480 130" stroke="rgba(255,255,255,0.08)" stroke-width="0.8" fill="none"/>

            <!-- Bow foam/wake -->
            <path d="M 18 112 Q 8 118 0 122 L 0 118 Q 10 115 20 112 Z" fill="url(#shFoam)" opacity="0.7"/>
            <path d="M 24 115 Q 12 120 0 126 L 0 124 Q 14 119 26 115 Z" fill="url(#shFoam)" opacity="0.4"/>

            <!-- Hull main body -->
            <path d="M 22 78 L 440 78 L 460 98 L 450 118 L 30 118 L 12 98 Z" fill="url(#shHull)" stroke="#0A1828" stroke-width="0.8" filter="url(#shShadow)"/>

            <!-- Red waterline boot-topping -->
            <path d="M 20 108 L 442 108 L 452 116 L 28 116 Z" fill="#B71C1C"/>
            <!-- Red-to-hull shadow line -->
            <path d="M 20 108 L 442 108" stroke="#8B0000" stroke-width="0.5"/>

            <!-- Hull portholes row -->
            <g fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="0.8">
              ${Array.from({length: 18}, (_, i) => `
                <circle cx="${48 + i * 22}" cy="95" r="3.5"/>
                <circle cx="${48 + i * 22}" cy="95" r="2" fill="rgba(120,180,240,0.2)" stroke="none"/>
              `).join('')}
            </g>

            <!-- Hull company name lettering -->
            <text x="220" y="102" fill="rgba(255,255,255,0.18)" font-family="Arial Black, sans-serif" font-size="14" font-weight="900" text-anchor="middle" letter-spacing="6">AL SUDAIS</text>

            <!-- Deck surface -->
            <rect x="22" y="68" width="418" height="12" rx="1" fill="url(#shDeck)" stroke="#0F1E30" stroke-width="0.6"/>
            <!-- Deck edge rail line -->
            <line x1="22" y1="69" x2="440" y2="69" stroke="rgba(255,255,255,0.15)" stroke-width="0.8"/>

            <!-- ===== CONTAINERS ===== -->
            <!-- Container colors: red, green, gold, blue, rust, grey-blue -->
            ${(() => {
              const colors = ['#CC2229','#2E8B57','#c8943a','#1C5FAA','#8B3A1A','#3A6080','#A8342A','#1E7A44','#B8862A','#235299'];
              const rows = [
                { y: 26, count: 16, xStart: 30, w: 24, h: 16, gap: 26 },
                { y: 42, count: 18, xStart: 20, w: 24, h: 16, gap: 26 },
                { y: 58, count: 18, xStart: 20, w: 24, h: 12, gap: 26 },
              ];
              return rows.map(row =>
                Array.from({length: row.count}, (_, i) => {
                  const c = colors[(i + row.y) % colors.length];
                  const x = row.xStart + i * row.gap;
                  return `
                    <rect x="${x}" y="${row.y}" width="${row.w}" height="${row.h}" fill="${c}" stroke="#0A1828" stroke-width="0.5" rx="0.5"/>
                    <line x1="${x}" y1="${row.y + row.h/2}" x2="${x + row.w}" y2="${row.y + row.h/2}" stroke="rgba(0,0,0,0.25)" stroke-width="0.4"/>
                    <line x1="${x + row.w/2}" y1="${row.y}" x2="${x + row.w/2}" y2="${row.y + row.h}" stroke="rgba(0,0,0,0.2)" stroke-width="0.4"/>
                    <rect x="${x+1}" y="${row.y+1}" width="${row.w*0.4}" height="2" rx="0.5" fill="rgba(255,255,255,0.12)"/>
                  `;
                }).join('')
              ).join('');
            })()}

            <!-- ===== BRIDGE / SUPERSTRUCTURE ===== -->
            <!-- Bridge base -->
            <rect x="360" y="30" width="68" height="52" rx="2" fill="url(#shBridge)" stroke="#8A96A8" stroke-width="0.6"/>
            <!-- Bridge levels -->
            <rect x="364" y="30" width="60" height="10" fill="#E0E8F4" stroke="#8A96A8" stroke-width="0.4"/>
            <rect x="366" y="40" width="56" height="10" fill="#D8E4F2" stroke="#8A96A8" stroke-width="0.4"/>
            <rect x="368" y="50" width="52" height="10" fill="#D0DCF0" stroke="#8A96A8" stroke-width="0.4"/>
            <!-- Bridge windows (navigation bridge) -->
            ${Array.from({length: 5}, (_, i) => `
              <rect x="${368 + i * 11}" y="32" width="8" height="6" rx="1" fill="url(#plCockpit)" stroke="#6A80A0" stroke-width="0.4"/>
              <rect x="${369 + i * 11}" y="33" width="3" height="2" rx="0.5" fill="rgba(200,240,255,0.4)"/>
            `).join('')}
            <!-- Bridge windows level 2 -->
            ${Array.from({length: 4}, (_, i) => `
              <rect x="${370 + i * 13}" y="42" width="9" height="6" rx="1" fill="rgba(80,120,180,0.6)" stroke="#6A80A0" stroke-width="0.4"/>
            `).join('')}
            <!-- Bridge wing (jutting out) -->
            <rect x="428" y="34" width="10" height="24" rx="1" fill="#D8E4F2" stroke="#8A96A8" stroke-width="0.4"/>

            <!-- Funnel / Smokestack -->
            <rect x="380" y="14" width="22" height="18" rx="2" fill="#1C2D4E" stroke="#0A1828" stroke-width="0.6"/>
            <!-- Funnel top rim -->
            <rect x="378" y="12" width="26" height="4" rx="1" fill="#243859"/>
            <!-- Funnel company color band -->
            <rect x="380" y="16" width="22" height="5" fill="#c8943a" opacity="0.85"/>
            <!-- Smoke -->
            <circle cx="391" cy="10" r="4" fill="rgba(180,180,200,0.35)"/>
            <circle cx="395" cy="6" r="5" fill="rgba(180,180,200,0.25)"/>
            <circle cx="388" cy="2" r="6" fill="rgba(180,180,200,0.18)"/>

            <!-- Radar mast -->
            <line x1="394" y1="12" x2="394" y2="-2" stroke="#5A6880" stroke-width="1"/>
            <circle cx="394" cy="-2" r="2" fill="#CC2229"/>
            <!-- Radar arm -->
            <line x1="386" y1="4" x2="402" y2="4" stroke="#4A5870" stroke-width="0.8"/>

            <!-- Cargo cranes on deck -->
            ${[80, 160, 240].map((x, i) => `
              <rect x="${x}" y="50" width="4" height="18" fill="#5A6880" stroke="#3A4858" stroke-width="0.4"/>
              <path d="${x+2} 50 L ${x+20} 58 L ${x+20} 60 L ${x+2} 52 Z" fill="#4A5870" stroke="#3A4858" stroke-width="0.3"/>
              <line x1="${x+2}" y1="50" x2="${x+20}" y2="58" stroke="#6A7890" stroke-width="0.5"/>
            `).join('')}

            <!-- Anchor chain (bow) -->
            <path d="M 22 90 Q 18 92 14 90" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" fill="none"/>
            <circle cx="14" cy="90" r="2" fill="#3A4552" stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/>

            <!-- Navigation light (masthead) -->
            <circle cx="394" cy="-2" r="1.5" fill="#FFF9E0" opacity="0.9"/>
          </svg>
        </div>

        <!-- Vehicle 3: Premium Semi-Truck with Refrigerated Trailer -->
        <div class="vehicle vehicle-truck">
          <svg viewBox="0 0 420 130" width="380" height="118" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="trBody" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#FFFFFF"/>
                <stop offset="40%" stop-color="#F2F5FA"/>
                <stop offset="100%" stop-color="#C8D0DC"/>
              </linearGradient>
              <linearGradient id="trBodySide" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#E8EDF5"/>
                <stop offset="100%" stop-color="#B0BAC8"/>
              </linearGradient>
              <linearGradient id="trCab" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#2A72C8"/>
                <stop offset="50%" stop-color="#1E5BAA"/>
                <stop offset="100%" stop-color="#152848"/>
              </linearGradient>
              <linearGradient id="trCabSide" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#1E5BAA"/>
                <stop offset="100%" stop-color="#0F1E38"/>
              </linearGradient>
              <linearGradient id="trWind" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stop-color="#7BBAD8" stop-opacity="0.85"/>
                <stop offset="100%" stop-color="#2A4A6E" stop-opacity="0.95"/>
              </linearGradient>
              <linearGradient id="trWheel" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#3A4552"/>
                <stop offset="100%" stop-color="#1C2530"/>
              </linearGradient>
              <linearGradient id="trGrille" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#C8A84A"/>
                <stop offset="100%" stop-color="#8A6820"/>
              </linearGradient>
              <filter id="trShadow">
                <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="rgba(0,0,0,0.4)"/>
              </filter>
            </defs>

            <!-- Ground shadow -->
            <ellipse cx="210" cy="125" rx="190" ry="6" fill="rgba(0,0,0,0.2)"/>

            <!-- ===== TRAILER ===== -->
            <!-- Trailer top face (3D effect) -->
            <path d="M 14 22 L 16 16 L 258 16 L 262 22 Z" fill="#E0E8F5" stroke="#A0AABC" stroke-width="0.5"/>
            <!-- Trailer main side panel -->
            <rect x="14" y="22" width="248" height="68" rx="2" fill="url(#trBody)" stroke="#8A96A8" stroke-width="0.6" filter="url(#trShadow)"/>
            <!-- Trailer ribbing (vertical corrugations) -->
            ${Array.from({length: 22}, (_, i) => `
              <line x1="${24 + i * 10.5}" y1="22" x2="${24 + i * 10.5}" y2="90" stroke="rgba(120,135,155,0.18)" stroke-width="0.8"/>
            `).join('')}
            <!-- Trailer top rail -->
            <rect x="14" y="22" width="248" height="3" fill="rgba(255,255,255,0.6)"/>
            <!-- Trailer bottom sill -->
            <rect x="14" y="87" width="248" height="3" fill="#8A96A8"/>

            <!-- Company branding on trailer -->
            <rect x="40" y="42" width="180" height="28" rx="2" fill="rgba(28,45,78,0.06)" stroke="rgba(28,45,78,0.15)" stroke-width="0.8"/>
            <!-- SDS Logo mark on trailer -->
            <circle cx="58" cy="56" r="9" fill="rgba(28,45,78,0.12)" stroke="rgba(28,45,78,0.2)" stroke-width="0.5"/>
            <text x="58" y="59.5" fill="rgba(28,45,78,0.65)" font-family="Arial Black, sans-serif" font-size="7" font-weight="900" text-anchor="middle">SDS</text>
            <!-- Company name -->
            <text x="148" y="54" fill="rgba(28,45,78,0.55)" font-family="Arial, sans-serif" font-size="10" font-weight="800" text-anchor="middle" letter-spacing="2">السديس اللوجستية</text>
            <text x="148" y="65" fill="rgba(28,45,78,0.4)" font-family="Arial, sans-serif" font-size="7" font-weight="600" text-anchor="middle" letter-spacing="3">AL SUDAIS LOGISTICS</text>

            <!-- Trailer rear door lines -->
            <line x1="14" y1="22" x2="14" y2="90" stroke="#6A7888" stroke-width="1.5"/>
            <line x1="18" y1="24" x2="18" y2="88" stroke="rgba(255,255,255,0.3)" stroke-width="0.6"/>
            <!-- Door handle -->
            <rect x="10" y="52" width="4" height="8" rx="1" fill="#5A6474" stroke="#3A4452" stroke-width="0.5"/>

            <!-- Trailer front (connects to 5th wheel) -->
            <rect x="258" y="22" width="8" height="68" fill="#B0BACA" stroke="#8A96A8" stroke-width="0.4"/>

            <!-- Landing gear (support legs) -->
            <rect x="230" y="90" width="6" height="18" fill="#4A5568" rx="1"/>
            <rect x="228" y="106" width="10" height="3" rx="1" fill="#3A4452"/>
            <rect x="240" y="90" width="6" height="18" fill="#4A5568" rx="1"/>
            <rect x="238" y="106" width="10" height="3" rx="1" fill="#3A4452"/>

            <!-- ===== CAB / TRACTOR ===== -->
            <!-- Cab roof fairing (aerodynamic) -->
            <path d="M 266 14 Q 290 8 340 12 L 345 18 Q 300 14 266 20 Z" fill="#1E5BAA" stroke="#152848" stroke-width="0.5"/>
            <!-- Cab side deflectors -->
            <path d="M 266 20 L 266 14 L 270 12 L 274 16 L 274 22 Z" fill="#1A4A90" stroke="#0F2D60" stroke-width="0.4"/>

            <!-- Cab main body -->
            <path d="M 266 22 L 346 22 L 368 38 L 372 90 L 266 90 Z" fill="url(#trCab)" stroke="#0F1E38" stroke-width="0.6"/>
            <!-- Cab top highlight -->
            <path d="M 268 22 L 345 22 L 360 32 L 360 26 L 346 18 L 268 18 Z" fill="rgba(255,255,255,0.12)"/>

            <!-- Windshield -->
            <path d="M 272 26 L 346 26 L 366 40 L 366 62 L 272 62 Z" fill="url(#trWind)" stroke="#4A6A88" stroke-width="0.6"/>
            <!-- Windshield reflections -->
            <path d="M 278 28 L 340 28 L 355 38 L 355 34 L 342 25 L 278 25 Z" fill="rgba(255,255,255,0.12)"/>
            <path d="M 280 44 L 360 52 L 360 56 L 280 48 Z" fill="rgba(255,255,255,0.06)"/>
            <!-- Windshield wiper -->
            <line x1="300" y1="61" x2="360" y2="56" stroke="rgba(0,0,0,0.4)" stroke-width="0.8"/>

            <!-- A-pillars -->
            <line x1="272" y1="26" x2="272" y2="62" stroke="rgba(0,0,0,0.4)" stroke-width="2"/>
            <line x1="366" y1="40" x2="366" y2="62" stroke="rgba(0,0,0,0.3)" stroke-width="1.5"/>

            <!-- Door panel -->
            <path d="M 268 64 L 370 64 L 370 88 L 268 88 Z" fill="rgba(0,0,0,0.12)"/>
            <!-- Door line -->
            <line x1="268" y1="64" x2="370" y2="64" stroke="rgba(255,255,255,0.2)" stroke-width="0.8"/>
            <!-- Door handle -->
            <rect x="300" y="74" width="18" height="4" rx="2" fill="rgba(200,200,220,0.5)" stroke="rgba(255,255,255,0.3)" stroke-width="0.5"/>

            <!-- Gold accent stripe on cab -->
            <rect x="266" y="60" width="106" height="4" fill="url(#trGrille)" opacity="0.8"/>

            <!-- ===== GRILLE & FRONT ===== -->
            <!-- Grille panel -->
            <rect x="368" y="44" width="22" height="36" rx="1" fill="#0A1520" stroke="#1A2535" stroke-width="0.6"/>
            <!-- Grille bars -->
            ${Array.from({length: 7}, (_, i) => `
              <rect x="370" y="${47 + i * 4.5}" width="18" height="1.5" rx="0.5" fill="#c8943a" opacity="0.7"/>
            `).join('')}
            <!-- Grille vertical divider -->
            <line x1="379" y1="44" x2="379" y2="80" stroke="#c8943a" stroke-width="0.8" opacity="0.5"/>
            <!-- SDS badge on grille -->
            <rect x="371" y="56" width="16" height="9" rx="1" fill="rgba(200,148,58,0.2)" stroke="#c8943a" stroke-width="0.5"/>
            <text x="379" y="62.5" fill="#c8943a" font-family="Arial Black" font-size="5" font-weight="900" text-anchor="middle">SDS</text>

            <!-- Bumper -->
            <path d="M 366 78 L 392 78 L 392 88 L 366 88 Z" rx="1" fill="#1A2A3E" stroke="#0A1520" stroke-width="0.6"/>
            <!-- Bumper chrome strip -->
            <rect x="366" y="80" width="26" height="2" fill="rgba(255,255,255,0.2)"/>

            <!-- Headlights -->
            <!-- Main headlight L -->
            <rect x="368" y="44" width="8" height="6" rx="1" fill="#FFF8D0" stroke="#8A8058" stroke-width="0.5" opacity="0.95"/>
            <rect x="369" y="45" width="3" height="2" rx="0.5" fill="rgba(255,255,200,0.6)"/>
            <!-- Main headlight R (partial) -->
            <rect x="382" y="44" width="8" height="6" rx="1" fill="#FFF8D0" stroke="#8A8058" stroke-width="0.5" opacity="0.95"/>
            <!-- DRL strip -->
            <rect x="368" y="50" width="22" height="2" rx="1" fill="rgba(255,240,180,0.4)"/>
            <!-- Fog lights -->
            <circle cx="373" cy="82" r="3" fill="#FFF5B0" stroke="#8A8048" stroke-width="0.4" opacity="0.8"/>
            <circle cx="386" cy="82" r="3" fill="#FFF5B0" stroke="#8A8048" stroke-width="0.4" opacity="0.8"/>

            <!-- Side mirror -->
            <rect x="358" y="32" width="10" height="14" rx="2" fill="#1C3060" stroke="#0A1838" stroke-width="0.5"/>
            <rect x="359" y="33" width="8" height="8" rx="1" fill="rgba(120,160,200,0.4)"/>
            <!-- Mirror stalk -->
            <rect x="361" y="26" width="4" height="8" fill="#162540" rx="1"/>

            <!-- Exhaust stacks (dual chrome) -->
            <rect x="268" y="6" width="5" height="18" rx="2" fill="#4A5568" stroke="#2A3545" stroke-width="0.5"/>
            <rect x="275" y="8" width="5" height="16" rx="2" fill="#4A5568" stroke="#2A3545" stroke-width="0.5"/>
            <!-- Stack tops -->
            <rect x="267" y="5" width="7" height="3" rx="1" fill="#3A4552"/>
            <rect x="274" y="7" width="7" height="3" rx="1" fill="#3A4552"/>
            <!-- Exhaust smoke -->
            <circle cx="271" cy="4" r="3" fill="rgba(180,180,200,0.3)"/>
            <circle cx="278" cy="2" r="4" fill="rgba(180,180,200,0.2)"/>

            <!-- Fuel tanks (saddle tanks) -->
            <ellipse cx="280" cy="96" rx="22" ry="8" fill="#3A4552" stroke="#2A3540" stroke-width="0.5"/>
            <ellipse cx="280" cy="96" rx="18" ry="6" fill="#4A5568"/>
            <!-- Tank cap -->
            <circle cx="280" cy="90" r="3" fill="#5A6575" stroke="#3A4552" stroke-width="0.5"/>

            <ellipse cx="310" cy="96" rx="18" ry="7" fill="#3A4552" stroke="#2A3540" stroke-width="0.5"/>
            <ellipse cx="310" cy="96" rx="14" ry="5" fill="#4A5568"/>

            <!-- ===== WHEELS ===== -->
            <!-- Trailer wheels — dual rear axle -->
            ${[30, 52, 84, 106].map(x => `
              <circle cx="${x}" cy="102" r="16" fill="url(#trWheel)" stroke="#0A1218" stroke-width="0.8"/>
              <circle cx="${x}" cy="102" r="11" fill="#2A3545"/>
              <circle cx="${x}" cy="102" r="7" fill="#3A4858"/>
              <circle cx="${x}" cy="102" r="2.5" fill="#5A6875"/>
              ${Array.from({length: 8}, (_, s) => {
                const a = s * 45 * Math.PI / 180;
                return `<line x1="${x + Math.cos(a)*4}" y1="${102 + Math.sin(a)*4}" x2="${x + Math.cos(a)*10}" y2="${102 + Math.sin(a)*10}" stroke="#4A5868" stroke-width="1"/>`;
              }).join('')}
            `).join('')}

            <!-- Cab wheels — dual drive axle -->
            ${[310, 338, 356, 384].map((x, i) => `
              <circle cx="${x}" cy="102" r="${i < 2 ? 18 : 16}" fill="url(#trWheel)" stroke="#0A1218" stroke-width="0.8"/>
              <circle cx="${x}" cy="102" r="${i < 2 ? 12 : 10}" fill="#2A3545"/>
              <circle cx="${x}" cy="102" r="${i < 2 ? 8 : 7}" fill="#3A4858"/>
              <circle cx="${x}" cy="102" r="3" fill="#5A6875"/>
              ${Array.from({length: 8}, (_, s) => {
                const a = s * 45 * Math.PI / 180;
                const r1 = i < 2 ? 4.5 : 4, r2 = i < 2 ? 11 : 9;
                return `<line x1="${x + Math.cos(a)*r1}" y1="${102 + Math.sin(a)*r1}" x2="${x + Math.cos(a)*r2}" y2="${102 + Math.sin(a)*r2}" stroke="#4A5868" stroke-width="1.1"/>`;
              }).join('')}
            `).join('')}

            <!-- Mud flaps -->
            <rect x="8" y="95" width="6" height="14" rx="1" fill="#1A2030" opacity="0.8"/>
            <rect x="128" y="95" width="6" height="14" rx="1" fill="#1A2030" opacity="0.8"/>
            <rect x="298" y="94" width="6" height="14" rx="1" fill="#1A2030" opacity="0.8"/>
          </svg>
        </div>

        <!-- Floating particles -->
        <div class="particles">
          ${Array.from({length: 20}, (_, i) => `<div class="particle particle-${i}"></div>`).join('')}
        </div>
      </div>

      <!-- Login card (business card style) -->
      <div class="login-card-wrap">
        <div class="business-card">

          <!-- Decorative diagonal ribbon -->
          <div class="card-ribbon"></div>
          <div class="card-corner-tl"></div>
          <div class="card-corner-br"></div>

          <!-- Header with logo and brand -->
          <div class="card-header">
            <div class="logo-placeholder" id="company-logo">
              <!-- Logo will be inserted here — placeholder for now -->
              <div class="logo-inner">
                <svg viewBox="0 0 60 60" width="52" height="52">
                  <defs>
                    <linearGradient id="lgGrad" x1="0" x2="1" y1="0" y2="1">
                      <stop offset="0" stop-color="#2563a8"/>
                      <stop offset="1" stop-color="#1C2D4E"/>
                    </linearGradient>
                  </defs>
                  <!-- Simple placeholder mark -->
                  <circle cx="30" cy="30" r="26" fill="url(#lgGrad)" stroke="#c8943a" stroke-width="1.5"/>
                  <text x="30" y="38" fill="#c8943a" font-family="Segoe UI, sans-serif" font-size="20" font-weight="900" text-anchor="middle">SDS</text>
                </svg>
              </div>
              <div class="logo-hint">LOGO</div>
            </div>
            <div class="card-brand">
              <div class="card-company">السديس اللوجستية</div>
              <div class="card-company-en">SDS LOGISTICS</div>
              <div class="card-divider"></div>
              <div class="card-tagline">نظام التخليص الجمركي</div>
              <div class="card-tagline-en">CUSTOMS CLEARANCE PLATFORM</div>
            </div>
          </div>

          <!-- Serial number bar (like real business cards) -->
          <div class="card-serial">
            <span class="serial-lbl">CARD NO</span>
            <span class="serial-val">SDS · AUTH · ${new Date().getFullYear()}</span>
            <span class="serial-dot"></span>
          </div>

          ${wasIdleLogout ? `
            <div class="idle-notice">
              <i class="ti ti-clock-hour-4"></i>
              <span>تم تسجيل خروجك تلقائياً بسبب عدم النشاط</span>
            </div>
          ` : ''}

          <!-- Error box -->
          <div id="login-error" class="login-error" style="display:none;"></div>

          <!-- Login form area -->
          <div class="card-form">

            <div class="form-welcome">
              <span class="welcome-line"></span>
              <span class="welcome-text">مرحباً بعودتك</span>
              <span class="welcome-line"></span>
            </div>

            <!-- Email -->
            <div class="login-field">
              <label>
                <i class="ti ti-mail"></i>
                <span>البريد الإلكتروني</span>
              </label>
              <div class="input-wrap">
                <input type="email" id="login-email" placeholder="name@sds.com"
                  autocomplete="username"
                  onkeydown="if(event.key==='Enter')document.getElementById('login-password').focus()">
              </div>
            </div>

            <!-- Password -->
            <div class="login-field">
              <label>
                <i class="ti ti-lock"></i>
                <span>كلمة المرور</span>
              </label>
              <div class="input-wrap">
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

          </div>

          <!-- Footer with contact-style info -->
          <div class="card-footer">
            <div class="footer-item">
              <i class="ti ti-map-pin"></i>
              <span>جدة · المملكة العربية السعودية</span>
            </div>
            <div class="footer-item">
              <i class="ti ti-world"></i>
              <span>الإمارات · البحرين · عمان</span>
            </div>
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

      /* Vehicles orbit around the card in curved 3D paths */
      .vehicle {
        position: absolute;
        top: 50%; left: 50%;
        filter: drop-shadow(0 10px 30px rgba(0,0,0,0.6));
        transform-origin: center;
        will-change: transform;
      }
      .vehicle-plane {
        animation: orbitPlane 26s linear infinite;
        margin-left: -170px;
        margin-top: -54px;
      }
      .vehicle-ship {
        animation: orbitShip 34s linear infinite;
        margin-left: -210px;
        margin-top: -70px;
      }
      .vehicle-truck {
        animation: orbitTruck 30s linear infinite;
        margin-left: -190px;
        margin-top: -59px;
      }

      /* Plane: high orbit — comes from top-right, arcs over card, exits bottom-left */
      @keyframes orbitPlane {
        0% {
          transform: translate(40vw, -35vh) scale(0.4) rotate(-15deg);
          opacity: 0;
        }
        10% { opacity: 0.9; }
        25% {
          transform: translate(30vw, -25vh) scale(0.7) rotate(-25deg);
        }
        50% {
          transform: translate(0, -30vh) scale(1) rotate(-40deg);
        }
        75% {
          transform: translate(-30vw, -25vh) scale(0.7) rotate(-55deg);
        }
        90% { opacity: 0.9; }
        100% {
          transform: translate(-40vw, -35vh) scale(0.4) rotate(-65deg);
          opacity: 0;
        }
      }

      /* Ship: mid orbit — sails behind/around card on horizon */
      @keyframes orbitShip {
        0% {
          transform: translate(45vw, 20vh) scale(0.5);
          opacity: 0;
        }
        8% { opacity: 0.85; }
        30% {
          transform: translate(28vw, 25vh) scale(0.8);
        }
        50% {
          transform: translate(0, 30vh) scale(1.05);
        }
        70% {
          transform: translate(-28vw, 25vh) scale(0.8);
        }
        92% { opacity: 0.85; }
        100% {
          transform: translate(-45vw, 20vh) scale(0.5);
          opacity: 0;
        }
      }

      /* Truck: low orbit — drives at ground level in front of card */
      @keyframes orbitTruck {
        0% {
          transform: translate(50vw, 35vh) scale(0.6) rotateY(0deg);
          opacity: 0;
        }
        10% { opacity: 1; }
        30% {
          transform: translate(30vw, 40vh) scale(0.85);
        }
        50% {
          transform: translate(0, 42vh) scale(1);
        }
        70% {
          transform: translate(-30vw, 40vh) scale(0.85);
        }
        90% { opacity: 1; }
        100% {
          transform: translate(-50vw, 35vh) scale(0.6);
          opacity: 0;
        }
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

      /* Business card */
      .login-card-wrap {
        position: relative;
        z-index: 10;
        padding: 20px;
        max-width: 520px;
        width: 100%;
        animation: cardEntry 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both;
        perspective: 1200px;
      }
      @keyframes cardEntry {
        from {
          opacity: 0;
          transform: translateY(40px) rotateX(-15deg);
        }
        to {
          opacity: 1;
          transform: translateY(0) rotateX(0);
        }
      }
      .business-card {
        position: relative;
        background:
          linear-gradient(135deg,
            #FDFCF9 0%,
            #F5F2EA 100%);
        border-radius: 12px;
        padding: 0;
        overflow: hidden;
        box-shadow:
          0 30px 80px rgba(0,0,0,0.5),
          0 12px 30px rgba(0,0,0,0.3),
          inset 0 1px 0 rgba(255,255,255,0.8),
          inset 0 -1px 0 rgba(0,0,0,0.05);
        border: 1px solid rgba(200,148,58,0.3);
      }

      /* Diagonal gold ribbon */
      .card-ribbon {
        position: absolute;
        top: -40px; left: -40px;
        width: 200px; height: 80px;
        background: linear-gradient(135deg,
          #c8943a 0%,
          #d4a94f 50%,
          #b57e2c 100%);
        transform: rotate(-45deg);
        opacity: 0.15;
        pointer-events: none;
      }
      .card-corner-tl {
        position: absolute;
        top: 0; right: 0;
        width: 60px; height: 60px;
        border-top: 3px solid #c8943a;
        border-right: 3px solid #c8943a;
        border-top-right-radius: 12px;
        opacity: 0.6;
        pointer-events: none;
      }
      .card-corner-br {
        position: absolute;
        bottom: 0; left: 0;
        width: 60px; height: 60px;
        border-bottom: 3px solid #c8943a;
        border-left: 3px solid #c8943a;
        border-bottom-left-radius: 12px;
        opacity: 0.6;
        pointer-events: none;
      }

      /* Card header */
      .card-header {
        display: flex;
        align-items: center;
        gap: 20px;
        padding: 28px 32px 20px;
        background: linear-gradient(135deg,
          rgba(28,45,78,0.03) 0%,
          rgba(37,99,168,0.06) 100%);
        border-bottom: 2px solid rgba(200,148,58,0.2);
      }
      .logo-placeholder {
        position: relative;
        width: 80px; height: 80px;
        border-radius: 10px;
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        overflow: hidden;
        box-shadow: 0 2px 12px rgba(0,0,0,0.12), 0 0 0 1px rgba(200,148,58,0.25);
      }
      .logo-inner {
        width: 100%; height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4px;
      }
      .logo-inner img {
        width: 100%; height: 100%;
        object-fit: contain;
        display: block;
      }
      .logo-hint {
        position: absolute;
        bottom: -4px; left: 50%;
        transform: translateX(-50%);
        background: #c8943a;
        color: white;
        font-family: 'JetBrains Mono', monospace;
        font-size: 7px;
        letter-spacing: 1.5px;
        padding: 1px 6px;
        border-radius: 3px;
        font-weight: 800;
      }
      .card-brand {
        flex: 1;
      }
      .card-company {
        font-size: 22px;
        font-weight: 800;
        color: #0E1A2E;
        line-height: 1.1;
      }
      .card-company-en {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: #c8943a;
        letter-spacing: 3px;
        font-weight: 800;
        margin-top: 2px;
      }
      .card-divider {
        width: 40px;
        height: 2px;
        background: linear-gradient(90deg, #c8943a, transparent);
        margin: 8px 0;
      }
      .card-tagline {
        font-size: 13px;
        color: #4a5568;
        font-weight: 600;
      }
      .card-tagline-en {
        font-family: 'JetBrains Mono', monospace;
        font-size: 9px;
        color: #8A8578;
        letter-spacing: 1.5px;
        font-weight: 700;
        margin-top: 2px;
      }

      /* Serial number bar */
      .card-serial {
        background: #0E1A2E;
        color: white;
        padding: 8px 32px;
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
      }
      .serial-lbl {
        color: #c8943a;
        font-weight: 800;
        letter-spacing: 2px;
      }
      .serial-val {
        color: #F5F2EA;
        letter-spacing: 2px;
        font-weight: 700;
      }
      .serial-dot {
        width: 6px; height: 6px;
        background: #2E8B57;
        border-radius: 50%;
        margin-right: auto;
        animation: serialPulse 2s ease-in-out infinite;
        box-shadow: 0 0 8px rgba(46,139,87,0.6);
      }
      @keyframes serialPulse {
        0%, 100% { opacity: 0.7; }
        50% { opacity: 1; }
      }

      /* Card form */
      .card-form {
        padding: 24px 32px 20px;
      }

      /* Welcome divider */
      .form-welcome {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
      }
      .welcome-line {
        flex: 1;
        height: 1px;
        background: linear-gradient(90deg,
          transparent,
          rgba(200,148,58,0.4),
          transparent);
      }
      .welcome-text {
        font-size: 13px;
        font-weight: 700;
        color: #0E1A2E;
        letter-spacing: 1px;
      }

      /* Idle notice */
      .idle-notice {
        background: #FEF9E7;
        border: 1px solid #F0C674;
        border-radius: 8px;
        padding: 10px 14px;
        margin: 16px 32px 0;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #8A6B33;
        font-weight: 600;
      }

      /* Fields */
      .login-field {
        margin-bottom: 14px;
      }
      .login-field label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 700;
        color: #0E1A2E;
        margin-bottom: 6px;
      }
      .login-field label i {
        color: #c8943a;
        font-size: 15px;
      }
      .input-wrap {
        position: relative;
      }
      .login-field input {
        width: 100%;
        padding: 12px 14px;
        border: 1.5px solid #E0DBC7;
        border-radius: 6px;
        font-size: 14px;
        font-family: 'Tajawal', sans-serif;
        color: #0E1A2E;
        background: rgba(255,255,255,0.7);
        outline: none;
        transition: all 0.2s;
        direction: ltr;
        text-align: right;
      }
      .login-field input:focus {
        border-color: #c8943a;
        background: white;
        box-shadow: 0 0 0 3px rgba(200, 148, 58, 0.15);
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
        color: #c8943a;
      }

      /* Login button */
      .login-btn {
        width: 100%;
        padding: 14px;
        background: linear-gradient(135deg, #1C2D4E 0%, #2563a8 100%);
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 15px;
        font-weight: 800;
        font-family: 'Tajawal', sans-serif;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-top: 6px;
        transition: all 0.2s;
        box-shadow:
          0 4px 12px rgba(37, 99, 168, 0.3),
          inset 0 1px 0 rgba(255,255,255,0.15);
        position: relative;
        overflow: hidden;
        border-top: 1px solid rgba(200,148,58,0.4);
      }
      .login-btn::before {
        content: '';
        position: absolute;
        top: 0; left: -100%;
        width: 100%; height: 100%;
        background: linear-gradient(90deg,
          transparent,
          rgba(200,148,58,0.3),
          transparent);
        transition: left 0.6s;
      }
      .login-btn:hover::before { left: 100%; }
      .login-btn:hover {
        transform: translateY(-2px);
        box-shadow:
          0 8px 20px rgba(37, 99, 168, 0.4),
          inset 0 1px 0 rgba(255,255,255,0.2);
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
        margin: 16px 32px 0;
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

      /* Card footer — contact info style */
      .card-footer {
        background: linear-gradient(135deg,
          rgba(28,45,78,0.04) 0%,
          rgba(37,99,168,0.06) 100%);
        border-top: 1px dashed rgba(200,148,58,0.3);
        padding: 14px 32px;
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 10px;
      }
      .footer-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: #4a5568;
        font-weight: 600;
      }
      .footer-item i {
        color: #c8943a;
        font-size: 13px;
      }

      /* Mobile */
      @media (max-width: 500px) {
        .card-header { padding: 20px 20px 16px; gap: 14px; }
        .card-serial { padding: 6px 20px; }
        .card-form { padding: 20px; }
        .card-footer { padding: 12px 20px; }
        .card-company { font-size: 18px; }
        .logo-placeholder { width: 60px; height: 60px; }
        .card-corner-tl, .card-corner-br { width: 40px; height: 40px; }
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
