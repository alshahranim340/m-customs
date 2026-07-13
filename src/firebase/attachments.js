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

  // Save metadata doc
  await setDoc(doc(db, 'attachments', `${shipmentId}_${key}`), {
    shipment_id:  shipmentId,
    key,
    name:         fileData.name,
    type:         fileData.type,
    chunk_count:  chunks.length,
    updated_at:   serverTimestamp()
  });

  // Save each chunk as a separate doc
  await Promise.all(chunks.map((chunk, i) =>
    setDoc(doc(db, 'attachments', `${shipmentId}_${key}_chunk${i}`), {
      data: chunk
    })
  ));
}

// ─────────────────────────────────────────────
// GET one attachment (reassemble chunks)
// ─────────────────────────────────────────────
export async function getAttachment(shipmentId, key) {
  const metaSnap = await getDoc(doc(db, 'attachments', `${shipmentId}_${key}`));
  if (!metaSnap.exists()) return null;

  const meta   = metaSnap.data();
  const count  = meta.chunk_count || 1;

  // Fetch all chunks in parallel
  const chunkSnaps = await Promise.all(
    Array.from({ length: count }, (_, i) =>
      getDoc(doc(db, 'attachments', `${shipmentId}_${key}_chunk${i}`))
    )
  );

  const base64 = joinChunks(
    chunkSnaps.map(s => s.exists() ? s.data().data : '')
  );

  return { ...meta, base64 };
}

// ─────────────────────────────────────────────
// GET all attachments for a shipment
// ─────────────────────────────────────────────
export async function getAttachments(shipmentId) {
  const keys = ['invoice','packing_list','coo','analysis_cert','saudi_clearance','driver_docs'];
  const result = {};

  await Promise.all(keys.map(async key => {
    const data = await getAttachment(shipmentId, key);
    if (data) result[key] = data;
  }));

  return result;
}

// ─────────────────────────────────────────────
// SAVE multiple attachments
// ─────────────────────────────────────────────
export async function saveAttachments(shipmentId, filesObj) {
  // Save one by one to avoid overwhelming Firestore
  for (const [key, fileData] of Object.entries(filesObj)) {
    await saveAttachment(shipmentId, key, fileData);
  }
}
