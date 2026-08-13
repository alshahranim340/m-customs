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

        <!-- Vehicle 1: Realistic Airliner -->
        <div class="vehicle vehicle-plane">
          <svg viewBox="0 0 200 80" width="180" height="72" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="planeBody" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stop-color="#F5F7FA"/>
                <stop offset="0.5" stop-color="#FFFFFF"/>
                <stop offset="1" stop-color="#C7CED8"/>
              </linearGradient>
              <linearGradient id="planeStripe" x1="0" x2="1">
                <stop offset="0" stop-color="#2563a8"/>
                <stop offset="1" stop-color="#1C2D4E"/>
              </linearGradient>
            </defs>
            <!-- Contrail -->
            <ellipse cx="195" cy="42" rx="60" ry="1.5" fill="rgba(255,255,255,0.5)"/>
            <ellipse cx="195" cy="42" rx="30" ry="0.8" fill="rgba(255,255,255,0.8)"/>
            <!-- Main fuselage -->
            <path d="M 20 40 Q 12 38 5 40 L 5 44 Q 12 46 20 44 L 175 44 Q 190 44 195 42 Q 190 40 175 40 Z" fill="url(#planeBody)" stroke="#8A93A0" stroke-width="0.4"/>
            <!-- Blue stripe -->
            <rect x="20" y="41.5" width="155" height="1.2" fill="url(#planeStripe)"/>
            <!-- Windows row -->
            <g fill="#0E1A2E">
              ${Array.from({length: 25}, (_, i) => `<circle cx="${28 + i * 5.5}" cy="41.5" r="0.6"/>`).join('')}
            </g>
            <!-- Cockpit windows -->
            <path d="M 8 41 L 18 39 L 18 42 L 8 42 Z" fill="#4A5A6E"/>
            <!-- Main wing -->
            <path d="M 85 44 L 60 60 L 78 60 L 105 46 Z" fill="url(#planeBody)" stroke="#8A93A0" stroke-width="0.3"/>
            <path d="M 105 44 L 130 58 L 148 58 L 115 44 Z" fill="url(#planeBody)" stroke="#8A93A0" stroke-width="0.3" opacity="0.9"/>
            <!-- Engine 1 -->
            <ellipse cx="82" cy="52" rx="6" ry="3.2" fill="#3A4552"/>
            <ellipse cx="79" cy="52" rx="2" ry="2.6" fill="#1C2D4E"/>
            <!-- Engine 2 -->
            <ellipse cx="128" cy="50" rx="5" ry="2.8" fill="#3A4552"/>
            <ellipse cx="125.5" cy="50" rx="1.8" ry="2.3" fill="#1C2D4E"/>
            <!-- Tail wings -->
            <path d="M 165 40 L 180 30 L 185 32 L 175 42 Z" fill="url(#planeBody)" stroke="#8A93A0" stroke-width="0.3"/>
            <path d="M 165 44 L 180 52 L 185 50 L 175 42 Z" fill="url(#planeBody)" stroke="#8A93A0" stroke-width="0.3"/>
            <!-- Vertical stabilizer -->
            <path d="M 170 40 L 188 26 L 195 30 L 178 42 Z" fill="url(#planeStripe)"/>
            <!-- Nose highlight -->
            <ellipse cx="8" cy="41" rx="3" ry="2" fill="rgba(255,255,255,0.5)"/>
          </svg>
        </div>

        <!-- Vehicle 2: Realistic Cargo Ship with containers -->
        <div class="vehicle vehicle-ship">
          <svg viewBox="0 0 260 120" width="240" height="110" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="hullGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stop-color="#1C2D4E"/>
                <stop offset="1" stop-color="#0B1628"/>
              </linearGradient>
              <linearGradient id="waterGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stop-color="rgba(79,209,197,0.4)"/>
                <stop offset="1" stop-color="rgba(37,99,168,0.2)"/>
              </linearGradient>
            </defs>
            <!-- Water waves -->
            <path d="M 0 88 Q 15 84 30 88 T 60 88 T 90 88 T 120 88 T 150 88 T 180 88 T 210 88 T 240 88 T 260 88 V 120 H 0 Z" fill="url(#waterGrad)"/>
            <path d="M 0 94 Q 20 90 40 94 T 80 94 T 120 94 T 160 94 T 200 94 T 240 94 T 260 94 V 120 H 0 Z" fill="rgba(255,255,255,0.15)"/>
            <!-- Hull (main body) -->
            <path d="M 20 60 L 235 60 L 250 78 L 235 92 L 25 92 L 10 78 Z" fill="url(#hullGrad)" stroke="#0E1A2E" stroke-width="0.5"/>
            <!-- Waterline stripe -->
            <path d="M 20 82 L 235 82 L 240 88 L 20 88 Z" fill="#CC2229"/>
            <!-- Hull details/portholes -->
            <g fill="rgba(255,255,255,0.15)">
              ${Array.from({length: 12}, (_, i) => `<circle cx="${35 + i * 15}" cy="72" r="1.5"/>`).join('')}
            </g>
            <!-- Container stacks (multiple rows and columns) -->
            <!-- Row 1 (bottom) -->
            ${['#CC2229', '#2E8B57', '#c8943a', '#2563a8', '#8B4513', '#CC2229', '#2E8B57', '#c8943a', '#2563a8', '#CC2229'].map((color, i) => `
              <rect x="${28 + i * 20}" y="46" width="18" height="14" fill="${color}" stroke="#0E1A2E" stroke-width="0.4"/>
              <line x1="${28 + i * 20}" y1="52" x2="${46 + i * 20}" y2="52" stroke="rgba(0,0,0,0.3)" stroke-width="0.3"/>
              <line x1="${37 + i * 20}" y1="46" x2="${37 + i * 20}" y2="60" stroke="rgba(0,0,0,0.3)" stroke-width="0.3"/>
            `).join('')}
            <!-- Row 2 (middle) -->
            ${['#2563a8', '#CC2229', '#c8943a', '#2E8B57', '#8B4513', '#2E8B57', '#CC2229', '#c8943a', '#2563a8'].map((color, i) => `
              <rect x="${38 + i * 20}" y="32" width="18" height="14" fill="${color}" stroke="#0E1A2E" stroke-width="0.4" opacity="0.95"/>
              <line x1="${38 + i * 20}" y1="38" x2="${56 + i * 20}" y2="38" stroke="rgba(0,0,0,0.3)" stroke-width="0.3"/>
            `).join('')}
            <!-- Row 3 (top, fewer containers) -->
            ${['#c8943a', '#2E8B57', '#CC2229', '#2563a8', '#c8943a'].map((color, i) => `
              <rect x="${58 + i * 20}" y="18" width="18" height="14" fill="${color}" stroke="#0E1A2E" stroke-width="0.4" opacity="0.9"/>
            `).join('')}
            <!-- Bridge/Superstructure -->
            <rect x="200" y="30" width="28" height="30" fill="#F5F7FA" stroke="#8A93A0" stroke-width="0.4"/>
            <rect x="203" y="34" width="22" height="4" fill="#2563a8"/>
            <rect x="203" y="41" width="22" height="4" fill="#2563a8"/>
            <rect x="203" y="48" width="22" height="4" fill="#2563a8"/>
            <!-- Antenna/mast -->
            <line x1="214" y1="30" x2="214" y2="12" stroke="#8A93A0" stroke-width="0.6"/>
            <circle cx="214" cy="12" r="1.2" fill="#CC2229"/>
            <!-- Smoke stack -->
            <rect x="215" y="20" width="8" height="14" fill="#3A4552"/>
            <rect x="216" y="18" width="6" height="4" fill="#1C2D4E"/>
            <!-- Smoke puffs -->
            <circle cx="219" cy="14" r="2.5" fill="rgba(200,200,200,0.4)"/>
            <circle cx="222" cy="10" r="3" fill="rgba(200,200,200,0.3)"/>
            <circle cx="225" cy="6" r="3.5" fill="rgba(200,200,200,0.2)"/>
            <!-- Bow anchor detail -->
            <path d="M 15 68 L 22 72 L 15 76 Z" fill="#F5F7FA" opacity="0.6"/>
          </svg>
        </div>

        <!-- Vehicle 3: Realistic Semi-Truck with trailer -->
        <div class="vehicle vehicle-truck">
          <svg viewBox="0 0 220 90" width="200" height="82" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="trailerGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stop-color="#F8FAFB"/>
                <stop offset="0.5" stop-color="#E8ECF1"/>
                <stop offset="1" stop-color="#B8C0CB"/>
              </linearGradient>
              <linearGradient id="cabGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stop-color="#2563a8"/>
                <stop offset="1" stop-color="#1C2D4E"/>
              </linearGradient>
            </defs>
            <!-- Trailer body -->
            <rect x="8" y="20" width="130" height="45" fill="url(#trailerGrad)" stroke="#5A6474" stroke-width="0.5" rx="1"/>
            <!-- Trailer horizontal ribbing -->
            ${Array.from({length: 8}, (_, i) => `<line x1="8" y1="${25 + i * 5}" x2="138" y2="${25 + i * 5}" stroke="#8A93A0" stroke-width="0.2" opacity="0.5"/>`).join('')}
            <!-- Company logo panel on trailer -->
            <rect x="30" y="35" width="80" height="18" fill="rgba(28,45,78,0.08)" stroke="rgba(28,45,78,0.2)" stroke-width="0.5" rx="1"/>
            <text x="70" y="46" fill="#1C2D4E" font-family="Segoe UI, sans-serif" font-size="9" font-weight="800" text-anchor="middle" opacity="0.6">SDS · LOGISTICS</text>
            <!-- Trailer door lines -->
            <line x1="8" y1="20" x2="8" y2="65" stroke="#5A6474" stroke-width="0.8"/>
            <line x1="12" y1="24" x2="12" y2="61" stroke="#8A93A0" stroke-width="0.3"/>
            <!-- Trailer support -->
            <rect x="140" y="55" width="6" height="10" fill="#3A4552"/>
            <!-- Cab/Tractor -->
            <path d="M 148 30 L 178 30 L 195 40 L 195 65 L 148 65 Z" fill="url(#cabGrad)" stroke="#0B1628" stroke-width="0.4"/>
            <!-- Windshield -->
            <path d="M 152 35 L 176 35 L 190 43 L 190 50 L 152 50 Z" fill="#4A6580" opacity="0.9"/>
            <path d="M 154 37 L 174 37 L 186 43 L 186 47 L 154 47 Z" fill="#7BA0C0" opacity="0.7"/>
            <!-- Grille -->
            <rect x="190" y="52" width="5" height="10" fill="#0B1628"/>
            <line x1="190" y1="54" x2="195" y2="54" stroke="#8A93A0" stroke-width="0.3"/>
            <line x1="190" y1="56" x2="195" y2="56" stroke="#8A93A0" stroke-width="0.3"/>
            <line x1="190" y1="58" x2="195" y2="58" stroke="#8A93A0" stroke-width="0.3"/>
            <!-- Headlight -->
            <circle cx="192" cy="47" r="1.8" fill="#FFF6C1" stroke="#8A93A0" stroke-width="0.3"/>
            <!-- Side mirror -->
            <rect x="180" y="30" width="3" height="4" fill="#1C2D4E"/>
            <!-- Exhaust stack -->
            <rect x="149" y="18" width="3" height="14" fill="#3A4552"/>
            <rect x="148.5" y="17" width="4" height="1.5" fill="#1C2D4E"/>
            <!-- Fuel tank -->
            <ellipse cx="163" cy="68" rx="6" ry="4" fill="#8A93A0"/>
            <!-- Wheels: Trailer (4 wheels — 2 axles at back) -->
            <g>
              <circle cx="30" cy="68" r="8" fill="#0B1628"/>
              <circle cx="30" cy="68" r="5" fill="#3A4552"/>
              <circle cx="30" cy="68" r="1.5" fill="#8A93A0"/>
              <line x1="24" y1="68" x2="36" y2="68" stroke="#8A93A0" stroke-width="0.4"/>
              <line x1="30" y1="62" x2="30" y2="74" stroke="#8A93A0" stroke-width="0.4"/>
            </g>
            <g>
              <circle cx="50" cy="68" r="8" fill="#0B1628"/>
              <circle cx="50" cy="68" r="5" fill="#3A4552"/>
              <circle cx="50" cy="68" r="1.5" fill="#8A93A0"/>
              <line x1="44" y1="68" x2="56" y2="68" stroke="#8A93A0" stroke-width="0.4"/>
              <line x1="50" y1="62" x2="50" y2="74" stroke="#8A93A0" stroke-width="0.4"/>
            </g>
            <g>
              <circle cx="110" cy="68" r="8" fill="#0B1628"/>
              <circle cx="110" cy="68" r="5" fill="#3A4552"/>
              <circle cx="110" cy="68" r="1.5" fill="#8A93A0"/>
              <line x1="104" y1="68" x2="116" y2="68" stroke="#8A93A0" stroke-width="0.4"/>
              <line x1="110" y1="62" x2="110" y2="74" stroke="#8A93A0" stroke-width="0.4"/>
            </g>
            <g>
              <circle cx="130" cy="68" r="8" fill="#0B1628"/>
              <circle cx="130" cy="68" r="5" fill="#3A4552"/>
              <circle cx="130" cy="68" r="1.5" fill="#8A93A0"/>
              <line x1="124" y1="68" x2="136" y2="68" stroke="#8A93A0" stroke-width="0.4"/>
              <line x1="130" y1="62" x2="130" y2="74" stroke="#8A93A0" stroke-width="0.4"/>
            </g>
            <!-- Cab wheels -->
            <g>
              <circle cx="160" cy="68" r="9" fill="#0B1628"/>
              <circle cx="160" cy="68" r="5.5" fill="#3A4552"/>
              <circle cx="160" cy="68" r="1.8" fill="#8A93A0"/>
              <line x1="154" y1="68" x2="166" y2="68" stroke="#8A93A0" stroke-width="0.4"/>
              <line x1="160" y1="62" x2="160" y2="74" stroke="#8A93A0" stroke-width="0.4"/>
            </g>
            <g>
              <circle cx="185" cy="68" r="9" fill="#0B1628"/>
              <circle cx="185" cy="68" r="5.5" fill="#3A4552"/>
              <circle cx="185" cy="68" r="1.8" fill="#8A93A0"/>
              <line x1="179" y1="68" x2="191" y2="68" stroke="#8A93A0" stroke-width="0.4"/>
              <line x1="185" y1="62" x2="185" y2="74" stroke="#8A93A0" stroke-width="0.4"/>
            </g>
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
              <div class="logo-inner">
                <img src="/logo.png" style="width:100%;height:100%;object-fit:contain;" alt="السديس اللوجستية">
              </div>
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
        filter: drop-shadow(0 8px 24px rgba(0,0,0,0.5));
        transform-origin: center;
      }
      .vehicle-plane {
        animation: orbitPlane 24s linear infinite;
      }
      .vehicle-ship {
        animation: orbitShip 32s linear infinite;
      }
      .vehicle-truck {
        animation: orbitTruck 28s linear infinite;
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
        width: 72px; height: 72px;
        border: 2px dashed rgba(200,148,58,0.4);
        border-radius: 8px;
        background: rgba(255,255,255,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        overflow: hidden;
      }
      .logo-inner {
        width: 100%; height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
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
