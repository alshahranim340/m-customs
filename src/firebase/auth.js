import {
  getAuth, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, getDocs,
  collection, updateDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from './config.js';
import app from './config.js';

export const auth = getAuth(app);

// المدير الوحيد
const ADMIN_EMAIL = 'alshahranim340@gmail.com';

// الرتب المتاحة
export const ROLES = {
  admin:      { ar: 'مدير النظام',    color: '#c8943a' },
  manager:    { ar: 'مدير قسم',       color: '#8B5CF6' },
  supervisor: { ar: 'مشرف',           color: '#2563a8' },
  employee:   { ar: 'موظف تخليص',     color: '#1a7a50' },
  transport:  { ar: 'موظف نقل',       color: '#3B82F6' },
};

// Elevated access = admin OR manager (used for transport, drivers, deleted-drawer views).
// Note: isAdmin() still checks strictly for ADMIN_EMAIL — used to guard the users page.
export function hasElevatedAccess(profileOrRole) {
  const role = typeof profileOrRole === 'string' ? profileOrRole : profileOrRole?.role;
  return role === 'admin' || role === 'manager';
}

// ─────────────────────────────────────────────
// AUTH STATE
// ─────────────────────────────────────────────
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ─────────────────────────────────────────────
// SIGN IN / OUT
// ─────────────────────────────────────────────
export async function signIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logOut() {
  await signOut(auth);
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// ─────────────────────────────────────────────
// ENSURE PROFILE ON FIRST LOGIN
// ─────────────────────────────────────────────
export async function ensureAdminProfile(user) {
  const existing = await getUserProfile(user.uid);

  if (!existing) {
    // أول تسجيل دخول — إنشاء ملف شخصي
    const isRealAdmin = user.email === ADMIN_EMAIL;
    await setDoc(doc(db, 'users', user.uid), {
      name:       isRealAdmin ? 'المدير' : user.email.split('@')[0],
      email:      user.email,
      role:       isRealAdmin ? 'admin' : 'employee',
      created_at: serverTimestamp(),
      active:     true
    });
  } else if (existing.role === 'admin' && user.email !== ADMIN_EMAIL) {
    // تصحيح: أي حساب آخر حصل على admin بالخطأ → يُخفض لموظف
    await updateDoc(doc(db, 'users', user.uid), { role: 'employee' });
  }
}

// ─────────────────────────────────────────────
// USERS MANAGEMENT
// ─────────────────────────────────────────────
export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      // ترتيب: مدير النظام ثم مدير القسم ثم المشرف ثم الموظفين
      const order = { admin: 0, manager: 1, supervisor: 2, employee: 3, transport: 4 };
      return (order[a.role]||3) - (order[b.role]||3);
    });
}

export async function createEmployee(email, password, name, role = 'employee') {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid  = cred.user.uid;
  await setDoc(doc(db, 'users', uid), {
    name,
    email,
    role,
    created_at: serverTimestamp(),
    active:     true
  });
  return uid;
}

export async function updateEmployee(uid, updates) {
  await updateDoc(doc(db, 'users', uid), {
    ...updates,
    updated_at: serverTimestamp()
  });
}

export function isAdmin(user) {
  return user?.email === ADMIN_EMAIL;
}
