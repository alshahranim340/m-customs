import { getShipments } from '../../src/firebase/db.js';
import { onAuthChange, ensureAdminProfile, getUserProfile, logOut, isAdmin } from '../../src/firebase/auth.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderNewShipment } from './pages/newShipment.js';
import { renderShipments } from './pages/shipments.js';
import { renderDrivers } from './pages/drivers.js';
import { renderShipmentView } from './pages/shipmentView.js';
import { renderUsers } from './pages/users.js';

let _currentUser    = null;
let _currentProfile = null;

const PAGES = {
  'dashboard':     renderDashboard,
  'new-shipment':  renderNewShipment,
  'shipments':     renderShipments,
  'drivers':       renderDrivers,
  'shipment-view': renderShipmentView,
  'users':         renderUsers,
};

// ─────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────
export function navigate(page, params = {}) {
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
  const { signIn } = import('../../src/firebase/auth.js');

  document.getElementById('root').innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;
      background:linear-gradient(135deg,#1C2D4E 0%,#243859 60%,#2563a8 100%);
      font-family:'Tajawal',sans-serif;direction:rtl;">
      <div style="background:white;border-radius:16px;padding:40px;width:100%;max-width:400px;
        box-shadow:0 20px 60px rgba(0,0,0,0.3);">
        <div style="text-align:center;margin-bottom:28px;">
          <div style="font-size:40px;margin-bottom:8px;">🚛</div>
          <div style="font-size:22px;font-weight:800;color:#1C2D4E;">M-Customs</div>
          <div style="font-size:13px;color:#5a7090;margin-top:4px;">نظام التخليص الجمركي</div>
        </div>
        <div id="login-error" style="display:none;background:#fceaea;color:#b52a2a;
          border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:16px;"></div>
        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:12px;font-weight:600;color:#5a7090;margin-bottom:6px;">البريد الإلكتروني</label>
          <input type="email" id="login-email" placeholder="example@email.com"
            style="width:100%;padding:11px 14px;border:1.5px solid #D0DCE8;border-radius:8px;
            font-size:14px;font-family:'Tajawal',sans-serif;outline:none;direction:ltr;box-sizing:border-box;"
            onkeydown="if(event.key==='Enter')doLogin()">
        </div>
        <div style="margin-bottom:24px;">
          <label style="display:block;font-size:12px;font-weight:600;color:#5a7090;margin-bottom:6px;">كلمة المرور</label>
          <input type="password" id="login-password" placeholder="••••••••"
            style="width:100%;padding:11px 14px;border:1.5px solid #D0DCE8;border-radius:8px;
            font-size:14px;font-family:'Tajawal',sans-serif;outline:none;direction:ltr;box-sizing:border-box;"
            onkeydown="if(event.key==='Enter')doLogin()">
        </div>
        <button onclick="doLogin()" id="login-btn"
          style="width:100%;padding:13px;background:#2563a8;color:white;border:none;
          border-radius:8px;font-size:15px;font-weight:700;font-family:'Tajawal',sans-serif;cursor:pointer;">
          تسجيل الدخول
        </button>
        <div style="text-align:center;margin-top:20px;font-size:11px;color:#5a7090;">
          شركة السديس للخدمات اللوجستية
        </div>
      </div>
    </div>`;

  window.doLogin = async () => {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn      = document.getElementById('login-btn');
    const errBox   = document.getElementById('login-error');

    if (!email || !password) {
      errBox.textContent = 'أدخل البريد الإلكتروني وكلمة المرور';
      errBox.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.textContent = '⏳ جاري تسجيل الدخول...';
    errBox.style.display = 'none';

    try {
      const { signIn } = await import('../../src/firebase/auth.js');
      await signIn(email, password);
    } catch(e) {
      btn.disabled = false;
      btn.textContent = 'تسجيل الدخول';
      const msgs = {
        'auth/user-not-found':     'البريد الإلكتروني غير موجود',
        'auth/wrong-password':     'كلمة المرور غير صحيحة',
        'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة',
        'auth/too-many-requests':  'محاولات كثيرة — حاول لاحقاً',
      };
      errBox.textContent = msgs[e.code] || 'خطأ في تسجيل الدخول';
      errBox.style.display = 'block';
    }
  };
}

// ─────────────────────────────────────────────
// APP SHELL
// ─────────────────────────────────────────────
function renderAppShell(profile) {
  const adminOnly = isAdmin(_currentUser);

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
        <nav class="sidebar-nav">
          <div class="nav-group-label">الرئيسية</div>
          <a class="nav-item active" data-page="dashboard" onclick="navigate('dashboard')">
            <span class="nav-icon">🏠</span> لوحة التحكم
          </a>
          <a class="nav-item" data-page="new-shipment" onclick="navigate('new-shipment')">
            <span class="nav-icon">➕</span> شحنة جديدة
          </a>
          <div class="nav-group-label">السجلات</div>
          <a class="nav-item" data-page="shipments" onclick="navigate('shipments')">
            <span class="nav-icon">📋</span> سجل الشحنات
            <span class="nav-badge" id="badge-shipments">—</span>
          </a>
          <a class="nav-item" data-page="drivers" onclick="navigate('drivers')">
            <span class="nav-icon">👤</span> السائقون
          </a>
          ${adminOnly ? `
          <div class="nav-group-label">الإدارة</div>
          <a class="nav-item" data-page="users" onclick="navigate('users')">
            <span class="nav-icon">👥</span> الموظفون
          </a>` : ''}
        </nav>
        <div class="sidebar-footer">
          <div class="user-chip">
            <div class="user-avatar">${profile?.name?.charAt(0)||'م'}</div>
            <div class="user-info">
              <div class="user-name">${profile?.name||'موظف'}</div>
              <div class="user-role">${profile?.role==='admin'?'مدير النظام':'موظف تخليص'}</div>
            </div>
          </div>
          <button onclick="doLogout()"
            style="margin-top:10px;width:100%;padding:7px;background:rgba(255,255,255,0.08);
            border:1px solid rgba(255,255,255,0.15);border-radius:7px;color:rgba(255,255,255,0.6);
            font-family:'Tajawal',sans-serif;font-size:12px;cursor:pointer;">
            🚪 تسجيل الخروج
          </button>
        </div>
      </aside>
      <main class="main-content">
        <div id="page-container"></div>
      </main>
    </div>`;

  window.navigate     = navigate;
  window.doLogout     = doLogout;
  window.updateBadges = updateBadges;
  window.closeModal   = () => document.getElementById('modal-overlay')?.classList.add('hidden');

  updateBadges();
  navigate('dashboard');
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

    if (!user) {
      showLoginPage();
      return;
    }

    // Get/create profile
    await ensureAdminProfile(user);
    _currentProfile = await getUserProfile(user.uid);

    // Block inactive users
    if (_currentProfile?.active === false) {
      await logOut();
      return;
    }

    renderAppShell(_currentProfile);
  });
}

export function getCurrentProfile() { return _currentProfile; }
export function getCurrentUser()    { return _currentUser; }
