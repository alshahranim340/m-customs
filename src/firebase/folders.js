import {
  collection, doc, setDoc, getDocs, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from './config.js';

// ─────────────────────────────────────────────
// FOLDERS — مجلدات تنظيم الشحنات
// ─────────────────────────────────────────────

export async function getFolders() {
  const snap = await getDocs(collection(db, 'folders'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0));
}

export async function createFolder(name) {
  const id = 'folder_' + Date.now();
  await setDoc(doc(db, 'folders', id), {
    name,
    created_at: serverTimestamp()
  });
  return id;
}

export async function deleteFolder(id) {
  await deleteDoc(doc(db, 'folders', id));
}
