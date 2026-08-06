import {
  getAuth, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, createUserWithEmailAndPassword
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
  admin:      { ar: 'مدير',           color: '#c8943a' },
  supervisor: { ar: 'مشرف',           color: '#2563a8' },
  employee:   { ar: 'موظف تخليص',     color: '#1a7a50' },
  transport:  { ar: 'موظف نقل',       color: '#3B82F6' },
};

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
      // المدير أولاً ثم المشرف ثم الموظفين
      const order = { admin: 0, supervisor: 1, employee: 2, transport: 3 };
      return (order[a.role]||2) - (order[b.role]||2);
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
