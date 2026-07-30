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
    <div class="page-body" style="padding:20px 24px;background:#F5F7FA;">
      <div class="modern-page">
        <!-- Header -->
        <div class="modern-header">
          <div class="modern-header-brand">
            <div class="modern-header-icon"><i class="ti ti-users"></i></div>
            <div>
              <div class="modern-header-title">إدارة الموظفين</div>
              <div class="modern-header-sub">إنشاء وإدارة حسابات الفريق</div>
            </div>
          </div>
          <div class="modern-header-actions">
            <button class="modern-btn" onclick="printUsersReport()">
              <i class="ti ti-printer"></i> طباعة التقرير
            </button>
            <button class="modern-btn modern-btn-primary" onclick="openAddUser()">
              <i class="ti ti-plus"></i> موظف جديد
            </button>
          </div>
        </div>

        <!-- Stats -->
        <div id="users-stats"></div>

        <!-- Search -->
        <div class="modern-search-bar">
          <div class="modern-search-wrap">
            <i class="ti ti-search modern-search-icon"></i>
            <input type="text" id="user-search" class="modern-search-input"
              placeholder="ابحث بالاسم أو البريد الإلكتروني...">
          </div>
        </div>

        <div id="users-list" style="padding:0 24px 20px;"><div class="loader"><div class="spinner"></div></div></div>
      </div>
    </div>

    <!-- ADD MODAL -->
    <div id="user-modal" class="modal-overlay hidden">
      <div class="modal-box" style="max-width:440px;">
        <div class="modal-title">➕ إضافة حساب جديد</div>
        <div class="field"><label>الاسم الكامل *</label>
          <input type="text" id="u-name" placeholder="محمد أحمد"></div>
        <div class="field"><label>البريد الإلكتروني *</label>
          <input type="email" id="u-email" placeholder="employee@sudais.com.sa" style="direction:ltr;"></div>
        <div class="field"><label>كلمة المرور *</label>
          <input type="password" id="u-password" placeholder="6 أحرف على الأقل" style="direction:ltr;"></div>
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

  document.getElementById('user-search').oninput = e => filterUsers(e.target.value);

  window.openAddUser    = openAddUser;
  window.closeUserModal = closeUserModal;
  window.addUser        = addUser;
  window.toggleUser     = toggleUser;
  window.openRoleModal  = openRoleModal;
  window.closeRoleModal = closeRoleModal;
  window.saveRole       = saveRole;
  window.filterUsers    = filterUsers;
  window.printUsersReport = printUsersReport;
}

let _allUsers = [];

// ─────────────────────────────────────────────
// LOAD
// ─────────────────────────────────────────────
async function loadUsers() {
  const allUsers = await getAllUsers();
  _allUsers = allUsers.filter(u => u.name && u.name !== 'undefined' && u.email && u.email !== 'undefined');
  renderStats();
  renderUserList(_allUsers);
}

function renderStats() {
  const total    = _allUsers.length;
  const active   = _allUsers.filter(u => u.active !== false).length;
  const inactive = _allUsers.filter(u => u.active === false).length;

  const el = document.getElementById('users-stats');
  if (!el) return;
  el.innerHTML = `
    <div style="padding:18px 24px;display:grid;grid-template-columns:repeat(3,1fr);gap:20px;background:#FAFBFC;border-bottom:1px solid #F0F1F5;">
      <div>
        <div style="font-size:11px;color:#697386;font-weight:600;letter-spacing:.3px;text-transform:uppercase;">إجمالي الحسابات</div>
        <div style="font-size:26px;font-weight:700;color:#0A2540;margin-top:4px;letter-spacing:-0.5px;">${total}</div>
        <div style="font-size:11px;color:#697386;margin-top:2px;display:flex;align-items:center;gap:4px;"><span style="width:6px;height:6px;border-radius:50%;background:#1C4B8E;"></span> مسجل</div>
      </div>
      <div>
        <div style="font-size:11px;color:#697386;font-weight:600;letter-spacing:.3px;text-transform:uppercase;">نشط</div>
        <div style="font-size:26px;font-weight:700;color:#2E8B57;margin-top:4px;letter-spacing:-0.5px;">${active}</div>
        <div style="font-size:11px;color:#2E8B57;margin-top:2px;display:flex;align-items:center;gap:4px;"><span style="width:6px;height:6px;border-radius:50%;background:#2E8B57;"></span> فعّال</div>
      </div>
      <div>
        <div style="font-size:11px;color:#697386;font-weight:600;letter-spacing:.3px;text-transform:uppercase;">معطّل</div>
        <div style="font-size:26px;font-weight:700;color:#CC2229;margin-top:4px;letter-spacing:-0.5px;">${inactive}</div>
        <div style="font-size:11px;color:#CC2229;margin-top:2px;display:flex;align-items:center;gap:4px;"><span style="width:6px;height:6px;border-radius:50%;background:#CC2229;"></span> غير نشط</div>
      </div>
    </div>`;
}

function filterUsers(search = '') {
  if (!search) { renderUserList(_allUsers); return; }
  const q = search.toLowerCase();
  renderUserList(_allUsers.filter(u =>
    u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
  ));
}

function renderUserList(users) {
  const list = document.getElementById('users-list');
  if (!list) return;

  if (!users.length) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon"><i class="ti ti-users" style="font-size:44px;color:var(--muted)"></i></div>
      <div class="empty-title">لا يوجد حسابات</div>
    </div>`;
    return;
  }

  // Sort: admin first, then supervisor, then employee
  const order = { admin: 0, supervisor: 1, employee: 2 };
  const sorted = [...users].sort((a, b) => (order[a.role]||2) - (order[b.role]||2));

  list.innerHTML = `
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:var(--surface);border-bottom:1px solid var(--border);">
          <th style="padding:12px 18px;text-align:right;font-size:12px;font-weight:600;color:var(--muted);">الموظف</th>
          <th style="padding:12px 18px;text-align:right;font-size:12px;font-weight:600;color:var(--muted);">البريد الإلكتروني</th>
          <th style="padding:12px 18px;text-align:center;font-size:12px;font-weight:600;color:var(--muted);">الرتبة</th>
          <th style="padding:12px 18px;text-align:center;font-size:12px;font-weight:600;color:var(--muted);">الحالة</th>
          <th style="padding:12px 18px;text-align:center;font-size:12px;font-weight:600;color:var(--muted);">إجراءات</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map(u => {
          const role    = ROLES[u.role] || ROLES.employee;
          const isAdm   = u.role === 'admin';
          const initials = u.name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '؟';
          const avatarBg = isAdm ? 'var(--gold)' : u.role === 'supervisor' ? 'var(--blue)' : 'var(--green)';
          const isActive = u.active !== false;

          return `
          <tr style="border-bottom:0.5px solid var(--border);transition:background .15s;"
            onmouseover="this.style.background='var(--surface)'"
            onmouseout="this.style.background=''">

            <!-- Avatar + Name -->
            <td style="padding:14px 18px;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:40px;height:40px;border-radius:50%;background:${avatarBg};
                  color:white;display:flex;align-items:center;justify-content:center;
                  font-size:14px;font-weight:700;flex-shrink:0;">
                  ${initials}
                </div>
                <div>
                  <div style="font-weight:700;color:var(--navy);font-size:14px;">${u.name}</div>
                  ${isAdm ? `<div style="font-size:10px;color:var(--muted);">حساب النظام</div>` : ''}
                </div>
              </div>
            </td>

            <!-- Email -->
            <td style="padding:14px 18px;">
              <div style="font-size:13px;color:var(--muted);direction:ltr;">${u.email}</div>
            </td>

            <!-- Role -->
            <td style="padding:14px 18px;text-align:center;">
              <span style="background:${role.color}20;color:${role.color};
                font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;">
                ${role.ar}
              </span>
            </td>

            <!-- Status -->
            <td style="padding:14px 18px;text-align:center;">
              <span class="pill ${isActive ? 'pill-done' : 'pill-draft'}">
                ${isActive ? '● نشط' : '● معطّل'}
              </span>
            </td>

            <!-- Actions -->
            <td style="padding:14px 18px;text-align:center;">
              ${!isAdm ? `
                <div style="display:flex;gap:6px;justify-content:center;">
                  <button class="btn btn-sm btn-ghost" onclick="openRoleModal('${u.id}','${u.role}')"
                    title="تعديل الرتبة">
                    <i class="ti ti-shield"></i> الرتبة
                  </button>
                  <button class="btn btn-sm ${isActive ? 'btn-ghost' : 'btn-primary'}"
                    onclick="toggleUser('${u.id}',${isActive})"
                    title="${isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}">
                    ${isActive
                      ? '<i class="ti ti-ban"></i> تعطيل'
                      : '<i class="ti ti-check"></i> تفعيل'}
                  </button>
                </div>
              ` : `<span style="font-size:11px;color:var(--muted);">—</span>`}
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

// ─────────────────────────────────────────────
// PRINT REPORT
// ─────────────────────────────────────────────
function printUsersReport() {
  const order = { admin: 0, supervisor: 1, employee: 2 };
  const sorted = [..._allUsers].sort((a, b) => (order[a.role]||2) - (order[b.role]||2));
  const now = new Date().toLocaleDateString('ar-SA', { year:'numeric', month:'long', day:'numeric' });
  const total   = sorted.length;
  const active  = sorted.filter(u => u.active !== false).length;
  const inactive = sorted.filter(u => u.active === false).length;

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>تقرير الموظفين</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Tajawal',sans-serif; direction:rtl; color:#1C2D4E; background:white; padding:32px; }

        .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; padding-bottom:16px; border-bottom:2px solid #1C2D4E; }
        .header-title { font-size:22px; font-weight:800; color:#1C2D4E; }
        .header-sub { font-size:13px; color:#5a7090; margin-top:4px; }
        .header-date { font-size:12px; color:#5a7090; text-align:left; }

        .stats { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:24px; }
        .stat { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px 16px; text-align:center; }
        .stat-num { font-size:28px; font-weight:800; color:#1C2D4E; }
        .stat-lbl { font-size:12px; color:#5a7090; margin-top:2px; }

        table { width:100%; border-collapse:collapse; margin-top:8px; }
        thead tr { background:#1C2D4E; color:white; }
        th { padding:10px 14px; font-size:12px; font-weight:600; text-align:right; }
        td { padding:11px 14px; font-size:13px; border-bottom:0.5px solid #e2e8f0; }
        tr:nth-child(even) td { background:#f8fafc; }

        .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; }
        .badge-admin    { background:#FEF3C7; color:#92400E; }
        .badge-super    { background:#DBEAFE; color:#1D4ED8; }
        .badge-employee { background:#DCFCE7; color:#166534; }
        .badge-active   { background:#DCFCE7; color:#166534; }
        .badge-inactive { background:#FEE2E2; color:#B91C1C; }

        .footer { margin-top:32px; text-align:center; font-size:11px; color:#5a7090; border-top:1px solid #e2e8f0; padding-top:12px; }

        @media print {
          body { padding:16px; }
          @page { margin:1cm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="header-title">👥 تقرير الموظفين</div>
          <div class="header-sub">شركة عبدالرحمن عبدالعزيز السديس للخدمات اللوجستية</div>
        </div>
        <div class="header-date">
          <div>تاريخ التقرير</div>
          <div style="font-weight:700;margin-top:4px;">${now}</div>
        </div>
      </div>

      <div class="stats">
        <div class="stat"><div class="stat-num">${total}</div><div class="stat-lbl">إجمالي الحسابات</div></div>
        <div class="stat"><div class="stat-num" style="color:#166534;">${active}</div><div class="stat-lbl">نشط</div></div>
        <div class="stat"><div class="stat-num" style="color:#B91C1C;">${inactive}</div><div class="stat-lbl">معطّل</div></div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>اسم الموظف</th>
            <th>البريد الإلكتروني</th>
            <th>الرتبة</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map((u, i) => {
            const roleBadge = u.role === 'admin'
              ? `<span class="badge badge-admin">مدير</span>`
              : u.role === 'supervisor'
              ? `<span class="badge badge-super">مشرف</span>`
              : `<span class="badge badge-employee">موظف تخليص</span>`;
            const statusBadge = u.active !== false
              ? `<span class="badge badge-active">نشط</span>`
              : `<span class="badge badge-inactive">معطّل</span>`;
            return `
              <tr>
                <td style="color:#5a7090;font-size:12px;">${i + 1}</td>
                <td style="font-weight:700;">${u.name}</td>
                <td style="direction:ltr;color:#5a7090;">${u.email}</td>
                <td>${roleBadge}</td>
                <td>${statusBadge}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>

      <div class="footer">
        M-Customs — نظام التخليص الجمركي &nbsp;|&nbsp; شركة السديس للخدمات اللوجستية
      </div>

      <script>
        window.onload = () => { window.print(); }
      </script>
    </body>
    </html>
  `);
  win.document.close();
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
