import {
  collection, doc, addDoc, updateDoc, getDoc,
  getDocs, deleteDoc, query, orderBy, serverTimestamp, where
} from "firebase/firestore";
import { db } from "./config.js";

// ─────────────────────────────────────────────
// AGENTS — الوكلاء
// ─────────────────────────────────────────────

export const IMPORT_AGENTS = [
  { id: 'sal',               name: 'SAL',              emails: ['jeddlvoffice@sal.sa'] },
  { id: 'cma_cgm',           name: 'CMA-CGM',          emails: ['ksa.service@cma-cgm.com','jed.inv@cma-cgm.com'] },
  { id: 'hapag_lloyd',       name: 'Hapag-Lloyd',       emails: ['digital-business@hlag.com','saudiarabia@service.hlag.com'] },
  { id: 'sats',              name: 'SATS',              emails: ['jed_care@sats.com.sa'] },
  { id: 'cosco',             name: 'COSCO',             emails: ['bakhrre@coscon.com','alghaal@coscon.com','coscojedimport@coscon.com','cosdmmimport@coscon.com','coscoryd@coscon.com','coscoksadet@coscon.com'] },
  { id: 'trident_freight',   name: 'Trident Freight',   emails: ['marwan@trident-freight.com','ruyuf.saad@trident-freight.com','impjed@trident-freight.com','sreekumar.g@trident-freight.com','r.alwaldi@trident-freight.com'] },
  { id: 'freight_care',      name: 'Freight Care',      emails: ['cs1.jed@freightcare.com'] },
  { id: 'rsgt',              name: 'RSGT',              emails: ['jip.customs@rsgtmpt.com','c.s@rsgt.com','waleed.ali@rsgtmpt.com','portal@rsgt.com','jip.operations@rsgtmpt.com'] },
  { id: 'aks_global',        name: 'AKS Global',        emails: ['csimp@aksglobal.com','dinesh@aksglobal.com','accounts@aksglobal.com','acts4@aksglobal.com','csjed1@aksglobal.com'] },
  { id: 'dp_world',          name: 'DP World',          emails: ['dpwjed.apps@dpworld.com','dpwjed.customerservice@dpworld.com'] },
  { id: 'kanoo',             name: 'Kanoo',             emails: ['abdulaziz.alaslani@kanoo.com','netra.thapa@kanoo.com'] },
  { id: 'kuehne_nagel',      name: 'Kuehne+Nagel',      emails: ['mohammed.abdulmatin@kuehne-nagel.com','henrik.rickers@kuehne-nagel.com'] },
  { id: 'transmar',          name: 'Transmar',          emails: ['jeddah@transmar.com'] },
  { id: 'international_link',name: 'International Link', emails: ['docjed@international-link.com','operations@international-link.com','arrival@international-link.com','panic@international-link.com'] },
  { id: 'efs_logistics',     name: 'EFS Logistics',     emails: ['internship@efslogistics.net'] },
  { id: 'ssa_jeddah',        name: 'SSA Jeddah',        emails: ['docs02@ssajeddah.com','turkon.sup@ssajeddah.com','dodesk@ssajeddah.com'] },
  { id: 'serviscos_ksa',     name: 'Serviscos KSA',     emails: ['akadasah@serviscoksa.com','riskandarani@serviscoksa.com'] },
  { id: 'logipoint',         name: 'Logipoint',         emails: ['operation.customs@logipoint.sa'] },
  { id: 'maersk',            name: 'Maersk',            emails: ['JEDDAH.DECOUNTER@maersk.com'] },
  { id: 'smc_logistic',      name: 'SMC Logistic',      emails: ['accts1.dmm@smclogistic.com','accts2.dmm@smclogistic.com','imp1.dmm@smclogistic.com'] },
  { id: 'oocl',              name: 'OOCL',              emails: ['ziyad.aljohani@oocl.com','abdulaziz.al-ghamdi@oocl.com','eDO-DMM@oocl.com','eDO-JED@oocl.com'] },
  { id: 'global_psa',        name: 'Global PSA',        emails: ['sgpc-billingteam@globalpsa.com','s.alethaman@globalpsa.com','r.mohammed@globalpsa.com'] },
  { id: 'messina_line',      name: 'Messina Line',      emails: ['jed.office@messinaline.com.sa','sami.labib@messinaline.com.sa'] },
  { id: 'aet_shipping',      name: 'AET Shipping',      emails: ['aetdam@aetshipping.com'] },
];

export async function getAgents() {
  const snap = await getDocs(collection(db, 'import_agents'));
  const saved = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  // Merge built-in with saved (saved takes priority)
  const savedIds = saved.map(a => a.id);
  const builtIn  = IMPORT_AGENTS.filter(a => !savedIds.includes(a.id));
  return [...builtIn, ...saved].sort((a, b) => a.name.localeCompare(b.name));
}

export async function addAgent(agentData) {
  const ref = await addDoc(collection(db, 'import_agents'), {
    ...agentData,
    created_at: serverTimestamp()
  });
  return ref.id;
}

// ─────────────────────────────────────────────
// CUSTOMERS — العملاء
// ─────────────────────────────────────────────

export async function getCustomers() {
  const q = query(collection(db, 'import_customers'), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addCustomer(data) {
  const ref = await addDoc(collection(db, 'import_customers'), {
    ...data,
    created_at: serverTimestamp()
  });
  return ref.id;
}

export async function updateCustomer(id, data) {
  await updateDoc(doc(db, 'import_customers', id), {
    ...data,
    updated_at: serverTimestamp()
  });
}

export async function deleteCustomer(id) {
  await deleteDoc(doc(db, 'import_customers', id));
}

// ─────────────────────────────────────────────
// IMPORT SHIPMENTS — شحنات الوارد
// ─────────────────────────────────────────────

export const IMPORT_PORTS = {
  air: [
    { value: 'jed_air',  ar: 'مطار جدة' },
    { value: 'ruh_air',  ar: 'مطار الرياض' },
    { value: 'dmm_air',  ar: 'مطار الدمام' },
  ],
  sea: [
    { value: 'jed_sea',  ar: 'ميناء جدة الإسلامي' },
    { value: 'dmm_sea',  ar: 'ميناء الملك عبدالعزيز الدمام' },
    { value: 'rab_sea',  ar: 'ميناء الملك عبدالله رابغ' },
  ],
  land: [
    { value: 'batha',    ar: 'منفذ البطحاء' },
    { value: 'fahd',     ar: 'جسر الملك فهد' },
  ]
};

export const IMPORT_STATUS = {
  waiting:          { ar: 'قيد الانتظار',         class: 'pill-draft' },
  clearance:        { ar: 'قيد التخليص الجمركي',  class: 'pill-sent'  },
  out_for_delivery: { ar: 'خرج للتسليم',           class: 'pill-replied'},
  delivered:        { ar: 'تم التسليم',            class: 'pill-done'  },
};

export async function getImportShipments(limitCount = 100) {
  const q = query(collection(db, 'import_shipments'), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getImportShipment(id) {
  const snap = await getDoc(doc(db, 'import_shipments', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createImportShipment(data) {
  const ref = await addDoc(collection(db, 'import_shipments'), {
    ...data,
    status: 'waiting',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });
  return ref.id;
}

export async function updateImportShipment(id, data) {
  await updateDoc(doc(db, 'import_shipments', id), {
    ...data,
    updated_at: serverTimestamp()
  });
}

export async function deleteImportShipment(id) {
  await deleteDoc(doc(db, 'import_shipments', id));
}

// ─────────────────────────────────────────────
// EXPENSES — المصاريف
// ─────────────────────────────────────────────

export const DEFAULT_FEE_TYPES = [
  'رسوم إذن التسليم',
  'رسوم تفريغ',
  'رسوم موانئ',
  'رسوم حجز موعد',
  'رسوم ساحة التخزين',
  'رسوم الأرضيات',
];

export async function getFeeTypes() {
  const snap = await getDocs(collection(db, 'import_fee_types'));
  const saved = snap.docs.map(d => d.data().name);
  const all = [...DEFAULT_FEE_TYPES];
  saved.forEach(n => { if (!all.includes(n)) all.push(n); });
  return all;
}

export async function addFeeType(name) {
  await addDoc(collection(db, 'import_fee_types'), { name, created_at: serverTimestamp() });
}

export async function getExpenses() {
  const q = query(collection(db, 'import_expenses'), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getExpensesByShipment(shipmentId) {
  const q = query(collection(db, 'import_expenses'), where('shipment_id', '==', shipmentId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createExpense(data) {
  const ref = await addDoc(collection(db, 'import_expenses'), {
    ...data,
    paid: false,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });
  return ref.id;
}

export async function updateExpense(id, data) {
  await updateDoc(doc(db, 'import_expenses', id), {
    ...data,
    updated_at: serverTimestamp()
  });
}

export async function deleteExpense(id) {
  await deleteDoc(doc(db, 'import_expenses', id));
}
