import {
  doc, setDoc, getDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from './config.js';

// ─────────────────────────────────────────────
// Split large base64 into chunks < 800KB each
// ─────────────────────────────────────────────
const CHUNK_SIZE = 700000; // 700KB per chunk (safe under 1MB limit)

function splitToChunks(base64) {
  const chunks = [];
  for (let i = 0; i < base64.length; i += CHUNK_SIZE) {
    chunks.push(base64.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
}

function joinChunks(chunks) {
  return chunks.join('');
}

// ─────────────────────────────────────────────
// SAVE one attachment (split into chunks)
// ─────────────────────────────────────────────
export async function saveAttachment(shipmentId, key, fileData) {
  const chunks = splitToChunks(fileData.base64);

  // Save metadata doc first
  await setDoc(doc(db, 'attachments', `${shipmentId}_${key}`), {
    shipment_id:  shipmentId,
    key,
    name:         fileData.name,
    type:         fileData.type,
    chunk_count:  chunks.length,
    updated_at:   serverTimestamp()
  });

  // Save chunks one by one (sequential) لتجنب حدود Firestore write rate
  for (let i = 0; i < chunks.length; i++) {
    await setDoc(doc(db, 'attachments', `${shipmentId}_${key}_chunk${i}`), {
      data: chunks[i]
    });
  }
}

// ─────────────────────────────────────────────
// GET one attachment (reassemble chunks)
// ─────────────────────────────────────────────
export async function getAttachment(shipmentId, key) {
  const metaSnap = await getDoc(doc(db, 'attachments', `${shipmentId}_${key}`));
  if (!metaSnap.exists()) return null;

  const meta  = metaSnap.data();
  const count = meta.chunk_count || 1;

  // استرجاع الـ chunks بشكل متوازٍ
  const chunkSnaps = await Promise.all(
    Array.from({ length: count }, (_, i) =>
      getDoc(doc(db, 'attachments', `${shipmentId}_${key}_chunk${i}`))
    )
  );

  // التحقق من اكتمال جميع الـ chunks
  const missingChunks = chunkSnaps
    .map((s, i) => (!s.exists() ? i : null))
    .filter(i => i !== null);

  if (missingChunks.length > 0) {
    console.warn(`[attachments] ملف "${key}": chunks ناقصة:`, missingChunks);
  }

  const base64 = joinChunks(
    chunkSnaps.map(s => s.exists() ? s.data().data : '')
  );

  return { ...meta, base64 };
}

// ─────────────────────────────────────────────
// قائمة مفاتيح المرفقات — مصدر واحد للحقيقة
// أضف أي key جديد هنا فقط
// ─────────────────────────────────────────────
export const ATTACHMENT_KEYS = [
  'invoice',
  'packing_list',
  'coo',
  'analysis_cert',
  'saudi_clearance',
  'driver_docs',
  'broker_reply',
  'broker_reply_2',    // ← رد المخلص 2
  'appointment',
];

// ─────────────────────────────────────────────
// GET all attachments for a shipment
// ─────────────────────────────────────────────
export async function getAttachments(shipmentId) {
  const result = {};

  await Promise.all(ATTACHMENT_KEYS.map(async key => {
    const data = await getAttachment(shipmentId, key);
    if (data) result[key] = data;
  }));

  return result;
}

// ─────────────────────────────────────────────
// SAVE multiple attachments
// ─────────────────────────────────────────────
export async function saveAttachments(shipmentId, filesObj) {
  // حفظ واحداً تلو الآخر لتجنب ضغط Firestore
  for (const [key, fileData] of Object.entries(filesObj)) {
    await saveAttachment(shipmentId, key, fileData);
  }
}

// ─────────────────────────────────────────────
// DELETE one attachment (metadata + all chunks)
// ─────────────────────────────────────────────
export async function deleteAttachment(shipmentId, key) {
  const metaRef  = doc(db, 'attachments', `${shipmentId}_${key}`);
  const metaSnap = await getDoc(metaRef);

  if (metaSnap.exists()) {
    const count = metaSnap.data().chunk_count || 1;
    // حذف جميع الـ chunks
    for (let i = 0; i < count; i++) {
      try {
        await deleteDoc(doc(db, 'attachments', `${shipmentId}_${key}_chunk${i}`));
      } catch(e) {}
    }
    // حذف الـ metadata
    await deleteDoc(metaRef);
  }
}
