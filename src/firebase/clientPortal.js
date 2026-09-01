/**
 * clientPortal.js — M-Customs
 * إدارة بوابة العملاء
 * المسار: src/firebase/clientPortal.js
 */

import { db } from './config.js';
import {
  doc, setDoc, updateDoc, getDoc,
  serverTimestamp
} from 'firebase/firestore';

const COL = 'client_portals';

/* ── بيانات الشركة — عدّلها هنا فقط ── */
const COMPANY = {
  name      : 'شركة السديس للخدمات اللوجستية',
  name_en   : 'Al-Sudais Logistics',
  phone     : '+966536118708',
  whatsapp  : '+966536118708',
  city      : 'جدة، المملكة العربية السعودية',
};

/* ── توليد token آمن ── */
function newToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(20)))
    .map(b => chars[b % chars.length])
    .join('');
}

/* ── البيانات العامة فقط (لا أسعار، لا ملاحظات داخلية) ── */
function publicShipment(s) {
  return {
    id:             s.id                     || '',
    job_no:         s.job_no || s.internal_no || '',
    bl_number:      s.bl_number              || '',
    status:         s.status                 || 'waiting',
    eta:            s.eta                    || '',
    type:           (s.type || '').toUpperCase(),
    lcl_fcl:        s.lcl_fcl               || '',
    qty:            s.qty                    || '',
    port:           s.port                   || '',
    consignee:      s.consignee              || '',
    customs_no:     s.customs_no             || '',
    bayan_date:     s.bayan_date             || '',
    terminal:       s.terminal               || '',
    do_date:        s.do_date                || '',
    mwani_date:     s.mwani_date             || '',
    eri_free_date:  s.eri_free_date          || '',
    delivered_date: s.delivered_date         || '',
    created_raw:    s.eta                    || '', // for sorting
  };
}

/* ══════════════════════════════════════════════
   إنشاء أو تحديث البوابة
══════════════════════════════════════════════ */
export async function createClientPortal(customerId, customer, shipments) {
  // تحقق من وجود token سابق للعميل
  const custSnap = await getDoc(doc(db, 'import_customers', customerId));
  const existingToken = custSnap.exists() ? custSnap.data()?.portal_token : null;

  if (existingToken) {
    // تحديث البوابة الموجودة
    await updateClientPortal(existingToken, shipments);
    return existingToken;
  }

  // إنشاء بوابة جديدة
  const token = newToken();

  await setDoc(doc(db, COL, token), {
    token,
    customer_id:    customerId,
    customer_name:  customer.company_name   || '',
    customer_phone: customer.phone          || '',
    customer_email: customer.email          || '',
    // بيانات الشركة — تُقرأ من هنا في client.html
    company_name    : COMPANY.name,
    company_name_en : COMPANY.name_en,
    company_phone   : COMPANY.phone,
    company_whatsapp: COMPANY.whatsapp,
    company_city    : COMPANY.city,
    created_at:     serverTimestamp(),
    last_updated:   serverTimestamp(),
    shipments:      shipments.map(publicShipment),
  });

  // حفظ الـ token في وثيقة العميل
  await updateDoc(doc(db, 'import_customers', customerId), {
    portal_token: token,
  });

  return token;
}

/* ══════════════════════════════════════════════
   تحديث بيانات الشحنات في البوابة
   (يُستدعى تلقائياً عند تغيير الحالة)
══════════════════════════════════════════════ */
export async function updateClientPortal(token, shipments) {
  if (!token) return;
  try {
    await updateDoc(doc(db, COL, token), {
      shipments:    shipments.map(publicShipment),
      last_updated: serverTimestamp(),
    });
  } catch(e) {
    console.warn('[ClientPortal] sync failed:', e.message);
  }
}
