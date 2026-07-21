import {
  collection, doc, addDoc, updateDoc, getDoc,
  getDocs, deleteDoc, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from './config.js';

// ─────────────────────────────────────────────
// AUTO NUMBER — QT-YYYY-XXXX
// ─────────────────────────────────────────────
export async function generateQuotationNumber() {
  const snap = await getDocs(collection(db, 'quotations'));
  if (snap.empty) return 'QTN-0001';
  let maxNum = 0;
  snap.docs.forEach(d => {
    const num = d.data().number || '';
    const m = num.match(/QTN-(\d+)/);
    if (m) {
      const n = parseInt(m[1]);
      if (n > maxNum) maxNum = n;
    }
  });
  return `QTN-${String(maxNum + 1).padStart(4, '0')}`;
}

// ─────────────────────────────────────────────
// PORTS — نفس منافذ النظام
// ─────────────────────────────────────────────
export const QUOTATION_PORTS = {
  sea: [
    { value: 'jed_sea', ar: 'ميناء جدة الإسلامي',              en: 'Jeddah Islamic Port' },
    { value: 'dmm_sea', ar: 'ميناء الملك عبدالعزيز الدمام',    en: 'King Abdulaziz Port – Dammam' },
    { value: 'rab_sea', ar: 'ميناء الملك عبدالله رابغ',         en: 'King Abdullah Port – Rabigh' },
  ],
  air: [
    { value: 'jed_air', ar: 'مطار الملك عبدالعزيز الدولي',     en: 'King Abdulaziz Int\'l Airport' },
    { value: 'ruh_air', ar: 'مطار الملك خالد الدولي',           en: 'King Khalid Int\'l Airport' },
    { value: 'dmm_air', ar: 'مطار الملك فهد الدولي',            en: 'King Fahd Int\'l Airport' },
  ],
  land: [
    { value: 'batha',   ar: 'منفذ البطحاء',                     en: 'Al Batha Border' },
    { value: 'fahd',    ar: 'جسر الملك فهد',                    en: 'King Fahd Causeway' },
  ]
};

export const PORT_ICONS = { sea: '🚢', air: '✈️', land: '🚛' };

// مدن المملكة
export const KSA_CITIES = [
  'الرياض','جدة','مكة المكرمة','المدينة المنورة','الدمام','الخبر','الظهران',
  'الأحساء','تبوك','القصيم','أبها','جازان','نجران','الباحة','حائل','عرعر',
  'سكاكا','الجوف','ينبع','الطائف','بريدة','عنيزة','القطيف','الجبيل','رابغ',
  'الليث','القنفذة','بيشة','محايل عسير','صبيا','صامطة','الوجه','أملج','ضباء',
];

// حالات العرض
export const QUOTATION_STATUS = {
  pending:  { ar: 'قيد الانتظار', class: 'pill-draft',   color: '#92400e', bg: '#FEF3C7' },
  accepted: { ar: 'مقبول',        class: 'pill-done',    color: '#166534', bg: '#DCFCE7' },
  rejected: { ar: 'مرفوض',        class: 'pill-draft',   color: '#B91C1C', bg: '#FEE2E2' },
};

// ─────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────
export async function getQuotations() {
  const q = query(collection(db, 'quotations'), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getQuotation(id) {
  const snap = await getDoc(doc(db, 'quotations', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createQuotation(data) {
  const ref = await addDoc(collection(db, 'quotations'), {
    ...data,
    status: 'pending',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return ref.id;
}

export async function updateQuotation(id, data) {
  await updateDoc(doc(db, 'quotations', id), {
    ...data,
    updated_at: serverTimestamp(),
  });
}

export async function deleteQuotation(id) {
  await deleteDoc(doc(db, 'quotations', id));
}
