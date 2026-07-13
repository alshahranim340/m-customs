import {
  collection, doc, setDoc, getDocs,
  updateDoc, arrayUnion, serverTimestamp
} from 'firebase/firestore';
import { db } from './config.js';

// ─────────────────────────────────────────────
// EXPORTERS — المصدرون وبضائعهم
// ─────────────────────────────────────────────

/**
 * Get all exporters
 * Returns: [{ id, name, goods: ['بضاعة١', 'بضاعة٢'] }]
 */
export async function getExporters() {
  const snap = await getDocs(collection(db, 'exporters'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Save exporter + goods (create or update)
 */
export async function saveExporter(name, goodsItem) {
  // Use name as ID (cleaned)
  const id = name.trim().replace(/\s+/g, '_').substring(0, 50);
  const ref = doc(db, 'exporters', id);

  const snap = await import('firebase/firestore').then(m =>
    m.getDoc(ref)
  );

  if (snap.exists()) {
    // Add new goods item if not already there
    const existing = snap.data().goods || [];
    if (goodsItem && !existing.includes(goodsItem)) {
      await updateDoc(ref, {
        goods:      arrayUnion(goodsItem),
        updated_at: serverTimestamp()
      });
    }
  } else {
    // Create new exporter
    await setDoc(ref, {
      name,
      goods:      goodsItem ? [goodsItem] : [],
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
  }

  return id;
}
