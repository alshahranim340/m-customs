import { getAllUsers, createEmployee, updateEmployee, isAdmin, ROLES } from '../../../src/firebase/auth.js';
import { getCurrentUser } from '../../../src/firebase/auth.js';
import { toast } from '../app.js';

export async function renderUsers(container) {
  const currentUser = getCurrentUser();
  if (!isAdmin(currentUser)) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🔒</div>
      <div class="empty-title">غير مصرح</div>
    </div>`;
    return;
  }

  container.innerHTML = `
    <div class="topbar">
      <div>
        <div class="topbar-title">👥 إدارة الموظفين</div>
        <div class="topbar-sub">إنشاء وإدارة حسابات الفريق</div>
      </div>
      <div class="topbar-actions">
        <button class="btn btn-primary" onclick="openAddUser()">
          <i class="ti ti-plus"></i> موظف جديد
        </button>
      </div>
    </div>

    <div class="page-body">
      <div class="card">
        <div id="users-list"><div class="loader"><div class="spinner"></div></div></div>
      </div>
    </div>

    <!-- ADD MODAL -->
    <div id="user-modal" class="modal-overlay hidden">
      <div class="modal-box" style="max-width:440px;">
        <div class="modal-title">➕ إضافة حساب جديد</div>

        <div class="field"><label>الاسم الكامل *</label>
          <input type="text" id="u-name" placeholder="محمد أحمد"></div>

        <div class="field"><label>البريد الإلكتروني *</label>
          <input type="email" id="u-email" placeholder="employee@sudais.com.sa"
            style="direction:ltr;"></div>

        <div class="field"><label>كلمة المرور *</label>
          <input type="password" id="u-password" placeholder="6 أحرف على الأقل"
            style="direction:ltr;"></div>

        <div class="field">
          <label>الرتبة *</label>
          <select id="u-role">
            <option value="employee">موظف تخليص</option>
            <option value="supervisor">مشرف</option>
          </select>
        </div>

        <div id="user-error" style="display:none;background:var(--red-light);color:var(--red);
          border-radius:8px;padding:9px 12px;font-size:12px;margin-top:4px;"></div>

        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="closeUserModal()">إلغاء</button>
          <button class="btn btn-primary" onclick="addUser()" id="btn-add-user">💾 إنشاء الحساب</button>
        </div>
      </div>
    </div>

    <!-- EDIT ROLE MODAL -->
    <div id="role-modal" class="modal-overlay hidden">
      <div class="modal-box" style="max-width:360px;">
        <div class="modal-title">✏️ تعديل الرتبة</div>
        <input type="hidden" id="edit-uid">
        <div class="field">
          <label>الرتبة الجديدة</label>
          <select id="edit-role">
            <option value="employee">موظف تخليص</option>
            <option value="supervisor">مشرف</option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="closeRoleModal()">إلغاء</button>
          <button class="btn btn-primary" onclick="saveRole()">💾 حفظ</button>
        </div>
      </div>
    </div>`;

  await loadUsers();

  window.openAddUser    = openAddUser;
  window.closeUserModal = closeUserModal;
  window.addUser        = addUser;
  window.toggleUser     = toggleUser;
  window.openRoleModal  = openRoleModal;
  window.closeRoleModal = closeRoleModal;
  window.saveRole       = saveRole;
}

// ─────────────────────────────────────────────
// LOAD
// ─────────────────────────────────────────────
async function loadUsers() {
  const allUsers = await getAllUsers();
  const users = allUsers.filter(u => u.name && u.name !== "undefined" && u.email && u.email !== "undefined");
  const list  = document.getElementById('users-list');

  if (!users.length) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon"><i class="ti ti-users" style="font-size:44px;color:var(--muted)"></i></div>
      <div class="empty-title">لا يوجد حسابات</div>
    </div>`;
    return;
  }

  list.innerHTML = `<div>${users.map(u => {
    const role     = ROLES[u.role] || ROLES.employee;
    const isAdmin  = u.role === 'admin';
    const initials = u.name?.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase() || '؟';

    return `
    <div style="display:flex;align-items:center;gap:14px;padding:14px 20px;
      border-bottom:0.5px solid var(--border);">

      <!-- Avatar -->
      <div style="width:42px;height:42px;border-radius:50%;
        background:${isAdmin?'var(--gold)':u.role==='supervisor'?'var(--blue)':'var(--green)'};
        color:white;display:flex;align-items:center;justify-content:center;
        font-size:15px;font-weight:700;flex-shrink:0;">
        ${initials}
      </div>

      <!-- Info -->
      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:14px;font-weight:700;color:var(--navy);">${u.name}</span>
          <span style="background:${role.color}22;color:${role.color};
            font-size:10px;font-weight:700;padding:2px 9px;border-radius:20px;">
            ${role.ar}
          </span>
        </div>
        <div style="font-size:11px;color:var(--muted);direction:ltr;text-align:right;margin-top:2px;">
          ${u.email}
        </div>
      </div>

      <!-- Status -->
      <span class="pill ${u.active!==false?'pill-done':'pill-draft'}">
        ${u.active!==false?'نشط':'معطّل'}
      </span>

      <!-- Actions (not for admin) -->
      ${!isAdmin ? `
        <button class="btn btn-sm btn-ghost" onclick="openRoleModal('${u.id}','${u.role}')">
          <i class="ti ti-shield"></i> الرتبة
        </button>
        <button class="btn btn-sm ${u.active!==false?'btn-ghost':'btn-primary'}"
          onclick="toggleUser('${u.id}',${u.active!==false})">
          ${u.active!==false
            ? '<i class="ti ti-ban"></i> تعطيل'
            : '<i class="ti ti-check"></i> تفعيل'}
        </button>
      ` : `
        <span style="font-size:11px;color:var(--muted);">حساب النظام</span>
      `}
    </div>`;
  }).join('')}</div>`;
}

// ─────────────────────────────────────────────
// ADD USER
// ─────────────────────────────────────────────
function openAddUser() {
  document.getElementById('user-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('u-name').focus(), 100);
}

function closeUserModal() {
  document.getElementById('user-modal').classList.add('hidden');
  ['u-name','u-email','u-password'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('u-role').value = 'employee';
  document.getElementById('user-error').style.display = 'none';
}

async function addUser() {
  const name     = document.getElementById('u-name').value.trim();
  const email    = document.getElementById('u-email').value.trim();
  const password = document.getElementById('u-password').value;
  const role     = document.getElementById('u-role').value;
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
    await createEmployee(email, password, name, role);
    toast(`✅ تم إنشاء حساب ${name} — ${ROLES[role].ar}`, 'success');
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

// ─────────────────────────────────────────────
// EDIT ROLE
// ─────────────────────────────────────────────
function openRoleModal(uid, currentRole) {
  document.getElementById('edit-uid').value  = uid;
  document.getElementById('edit-role').value = currentRole;
  document.getElementById('role-modal').classList.remove('hidden');
}

function closeRoleModal() {
  document.getElementById('role-modal').classList.add('hidden');
}

async function saveRole() {
  const uid  = document.getElementById('edit-uid').value;
  const role = document.getElementById('edit-role').value;
  await updateEmployee(uid, { role });
  toast(`✅ تم تحديث الرتبة إلى ${ROLES[role].ar}`, 'success');
  closeRoleModal();
  await loadUsers();
}

// ─────────────────────────────────────────────
// TOGGLE ACTIVE
// ─────────────────────────────────────────────
async function toggleUser(uid, currentlyActive) {
  await updateEmployee(uid, { active: !currentlyActive });
  toast(currentlyActive ? '⚠️ تم تعطيل الحساب' : '✅ تم تفعيل الحساب',
        currentlyActive ? 'error' : 'success');
  await loadUsers();
}
