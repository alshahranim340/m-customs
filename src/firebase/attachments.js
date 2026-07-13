import {
  doc, setDoc, getDoc, getDocs,
  collection, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from './config.js';

// ─────────────────────────────────────────────
// ATTACHMENTS — stored as separate Firestore docs
// Path: attachments/{shipmentId}_{key}
// ─────────────────────────────────────────────

/**
 * Save one attachment for a shipment
 */
export async function saveAttachment(shipmentId, key, fileData) {
  const docId = `${shipmentId}_${key}`;
  await setDoc(doc(db, 'attachments', docId), {
    shipment_id: shipmentId,
    key,
    name:        fileData.name,
    type:        fileData.type,
    base64:      fileData.base64,
    updated_at:  serverTimestamp()
  });
}

/**
 * Get one attachment
 */
export async function getAttachment(shipmentId, key) {
  const snap = await getDoc(doc(db, 'attachments', `${shipmentId}_${key}`));
  return snap.exists() ? snap.data() : null;
}

/**
 * Get all attachments for a shipment
 * Returns object: { invoice: {...}, packing_list: {...}, ... }
 */
export async function getAttachments(shipmentId) {
  const result = {};
  const keys = ['invoice','packing_list','coo','analysis_cert','saudi_clearance','driver_docs'];
  await Promise.all(keys.map(async key => {
    const data = await getAttachment(shipmentId, key);
    if (data) result[key] = data;
  }));
  return result;
}

/**
 * Delete one attachment
 */
export async function deleteAttachment(shipmentId, key) {
  await deleteDoc(doc(db, 'attachments', `${shipmentId}_${key}`));
}

/**
 * Save multiple attachments at once
 */
export async function saveAttachments(shipmentId, filesObj) {
  await Promise.all(
    Object.entries(filesObj).map(([key, fileData]) =>
      saveAttachment(shipmentId, key, fileData)
    )
  );
}
