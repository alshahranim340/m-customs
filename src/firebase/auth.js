import {
  getAuth, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, createUserWithEmailAndPassword
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, getDocs,
  collection, updateDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from './config.js';
import app from './config.js';

export const auth = getAuth(app);

// Admin UID — يتحدد بعد أول تسجيل دخول
const ADMIN_EMAIL = 'alshahranim340@gmail.com';

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
// USERS MANAGEMENT (admin only)
// ─────────────────────────────────────────────
export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createEmployee(email, password, name) {
  // Create Firebase Auth user
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid  = cred.user.uid;

  // Save profile to Firestore
  await setDoc(doc(db, 'users', uid), {
    name,
    email,
    role:       'employee',
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

// Save admin profile on first login
export async function ensureAdminProfile(user) {
  const existing = await getUserProfile(user.uid);
  if (!existing) {
    await setDoc(doc(db, 'users', user.uid), {
      name:       'المدير',
      email:      user.email,
      role:       'admin',
      created_at: serverTimestamp(),
      active:     true
    });
  }
}
