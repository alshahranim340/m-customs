import { getAllUsers, createEmployee, updateEmployee, isAdmin } from '../../../src/firebase/auth.js';
import { getCurrentUser } from '../../../src/firebase/auth.js';
import { toast } from '../app.js';

export async function renderUsers(container) {
  const currentUser = getCurrentUser();
  if (!isAdmin(currentUser)) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔒</div>
      <div class="empty-title">غير مصرح</div></div>`;
    return;
  }

  container.innerHTML = `
    <div class="topbar">
      <div>
        <div class="topbar-title">👥 إدارة الموظفين</div>
        <div class="topbar-sub">إنشاء وإدارة حسابات الموظفين</div>
      </div>
      <div class="topbar-actions">
        <button class="btn btn-primary" onclick="openAddUser()">➕ موظف جديد</button>
      </div>
    </div>
    <div class="page-body">
      <div class="card">
        <div id="users-list"><div class="loader"><div class="spinner"></div></div></div>
      </div>
    </div>

    <!-- ADD USER MODAL -->
    <div id="user-modal" class="modal-overlay hidden">
      <div class="modal-box" style="max-width:420px;">
        <div class="modal-title">➕ إضافة موظف جديد</div>
        <div class="field"><label>الاسم الكامل *</label>
          <input type="text" id="u-name" placeholder="محمد أحمد"></div>
        <div class="field"><label>البريد الإلكتروني *</label>
          <input type="email" id="u-email" placeholder="employee@company.com"
            style="direction:ltr;"></div>
        <div class="field"><label>كلمة المرور *</label>
          <input type="password" id="u-password" placeholder="8 أحرف على الأقل"
            style="direction:ltr;"></div>
        <div id="user-error" style="display:none;background:#fceaea;color:#b52a2a;
          border-radius:8px;padding:8px 12px;font-size:12px;margin-top:8px;"></div>
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="closeUserModal()">إلغاء</button>
          <button class="btn btn-primary" onclick="addUser()" id="btn-add-user">💾 إنشاء الحساب</button>
        </div>
      </div>
    </div>`;

  await loadUsers();

  window.openAddUser    = openAddUser;
  window.closeUserModal = closeUserModal;
  window.addUser        = addUser;
  window.toggleUser     = toggleUser;
}

async function loadUsers() {
  const users = await getAllUsers();
  const list  = document.getElementById('users-list');

  if (!users.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">👤</div>
      <div class="empty-title">لا يوجد موظفون بعد</div></div>`;
    return;
  }

  list.innerHTML = `
    <div style="padding:4px 0;">
      ${users.map(u => `
        <div style="display:flex;align-items:center;gap:14px;padding:14px 20px;
          border-bottom:1px solid var(--border);">
          <div style="width:40px;height:40px;border-radius:50%;
            background:${u.role==='admin'?'var(--gold)':'var(--blue)'};
            color:white;display:flex;align-items:center;justify-content:center;
            font-size:16px;font-weight:700;flex-shrink:0;">
            ${u.name?.charAt(0)||'؟'}
          </div>
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:700;color:var(--navy);">
              ${u.name}
              ${u.role==='admin'?'<span style="background:var(--gold);color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;margin-right:8px;">مدير</span>':''}
            </div>
            <div style="font-size:12px;color:var(--muted);direction:ltr;text-align:right;">
              ${u.email}
            </div>
          </div>
          <span class="pill ${u.active!==false?'pill-done':'pill-draft'}">
            ${u.active!==false?'نشط':'معطّل'}
          </span>
          ${u.role !== 'admin' ? `
            <button class="btn btn-sm btn-ghost"
              onclick="toggleUser('${u.id}',${u.active!==false})">
              ${u.active!==false?'تعطيل':'تفعيل'}
            </button>` : ''}
        </div>`).join('')}
    </div>`;
}

function openAddUser() {
  document.getElementById('user-modal').classList.remove('hidden');
  document.getElementById('u-name').focus();
}

function closeUserModal() {
  document.getElementById('user-modal').classList.add('hidden');
  document.getElementById('u-name').value = '';
  document.getElementById('u-email').value = '';
  document.getElementById('u-password').value = '';
  document.getElementById('user-error').style.display = 'none';
}

async function addUser() {
  const name     = document.getElementById('u-name').value.trim();
  const email    = document.getElementById('u-email').value.trim();
  const password = document.getElementById('u-password').value;
  const errBox   = document.getElementById('user-error');
  const btn      = document.getElementById('btn-add-user');

  if (!name || !email || !password) {
    errBox.textContent = 'جميع الحقول مطلوبة';
    errBox.style.display = 'block';
    return;
  }
  if (password.length < 6) {
    errBox.textContent = 'كلمة المرور 6 أحرف على الأقل';
    errBox.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ جاري الإنشاء...';
  errBox.style.display = 'none';

  try {
    await createEmployee(email, password, name);
    toast(`✅ تم إنشاء حساب ${name}`, 'success');
    closeUserModal();
    await loadUsers();
  } catch(e) {
    const msgs = {
      'auth/email-already-in-use': 'البريد الإلكتروني مستخدم مسبقاً',
      'auth/invalid-email':        'بريد إلكتروني غير صالح',
      'auth/weak-password':        'كلمة المرور ضعيفة جداً',
    };
    errBox.textContent = msgs[e.code] || 'خطأ في إنشاء الحساب';
    errBox.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 إنشاء الحساب';
  }
}

async function toggleUser(uid, currentlyActive) {
  await updateEmployee(uid, { active: !currentlyActive });
  toast(currentlyActive ? '⚠️ تم تعطيل الحساب' : '✅ تم تفعيل الحساب', 'success');
  await loadUsers();
}
