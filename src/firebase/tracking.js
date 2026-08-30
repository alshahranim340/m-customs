/**
 * tracking.js — M-Customs
 * إدارة روابط تتبع الشحنات للعملاء
 * المسار: src/firebase/tracking.js
 */

import {
  doc, setDoc, getDoc, updateDoc, deleteDoc,
  serverTimestamp, increment
} from 'firebase/firestore';
import { db } from './config.js';

const COL = 'tracking_tokens';

/* توليد token عشوائي 12 حرف */
function newToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map(b => chars[b % chars.length])
    .join('');
}

/* ══════════════════════════════════════════════
   إنشاء رابط تتبع جديد
   يخزن البيانات العامة فقط (لا أسعار، لا ملاحظات)
══════════════════════════════════════════════ */
export async function createTrackingLink(shipmentId, shipment) {
  const token = newToken();

  const publicData = {
    shipment_id:    shipmentId,
    bl_number:      shipment.bl_number      || '',
    job_no:         shipment.job_no         || shipment.internal_no || '',
    customer_name:  shipment.customer_name  || '',
    consignee:      shipment.consignee      || '',
    type:           shipment.type           || 'sea',
    port:           shipment.port           || '',
    eta:            shipment.eta            || '',
    lcl_fcl:        shipment.lcl_fcl        || '',
    qty:            shipment.qty            || '',
    status:         shipment.status         || 'waiting',
    terminal:       shipment.terminal       || '',
    customs_no:     shipment.customs_no     || '',
    do_date:        shipment.do_date        || '',
    delivered_date: shipment.delivered_date || '',
    created_at:     serverTimestamp(),
    views:          0,
  };

  await setDoc(doc(db, COL, token), publicData);
  return token;
}

/* ══════════════════════════════════════════════
   تحديث بيانات الرابط (عند تغيير الحالة)
══════════════════════════════════════════════ */
export async function updateTrackingStatus(token, updates) {
  if (!token) return;
  try {
    await updateDoc(doc(db, COL, token), updates);
  } catch(_) {}
}

/* ══════════════════════════════════════════════
   حذف رابط التتبع
══════════════════════════════════════════════ */
export async function deleteTrackingLink(token) {
  if (!token) return;
  try {
    await deleteDoc(doc(db, COL, token));
  } catch(_) {}
}
