import {
  collection, doc, addDoc, updateDoc, getDoc,
  getDocs, query, where, orderBy, serverTimestamp, deleteDoc, limit
} from 'firebase/firestore';
import { db } from './config.js';

// ═════════════════════════════════════════════
// TRANSPORT REQUESTS
// ═════════════════════════════════════════════
// Status flow: draft → sent → converted (linked to shipment) → done
//
// Fields per request:
//  - truck_number       (رقم الشاحنة)
//  - driver_name        (اسم السائق)
//  - driver_id_number   (رقم الإقامة/Passport)
//  - driver_nationality (جنسية السائق)
//  - customer           (العميل/المصدر)
//  - material           (نوع المادة)
//  - quantity           (الكمية بالطن)
//  - dispatch_date      (تاريخ الإرسال هجري)
//  - delivery_number    (رقم التسليم)
//  - destination        (uae | bahrain | oman)
//  - notes              (ملاحظات اختيارية)
//  - status             (draft | sent | converted | done)
//  - shipment_id        (id الشحنة المرتبطة إذا حُوّلت)
//  - created_by         (uid موظف النقل)
//  - created_by_name    (اسم موظف النقل)

export async function createTransportRequest(data, createdBy) {
  const ref = await addDoc(collection(db, 'transport_requests'), {
    truck_number:       data.truck_number || '',
    driver_name:        data.driver_name || '',
    driver_id_number:   data.driver_id_number || '',
    driver_nationality: data.driver_nationality || '',
    customer:           data.customer || '',
    material:           data.material || '',
    quantity:           parseFloat(data.quantity) || 0,
    dispatch_date:      data.dispatch_date || '',
    delivery_number:    data.delivery_number || '',
    destination:        data.destination || 'uae',
    loading_location:   data.loading_location || '',
    batch_id:           data.batch_id || null,
    batch_label:        data.batch_label || '',
    notes:              data.notes || '',
    status:             data.status || 'draft',
    shipment_id:        null,
    created_by:         createdBy.uid,
    created_by_name:    createdBy.name || createdBy.email || 'موظف نقل',
    created_at:         serverTimestamp(),
    updated_at:         serverTimestamp(),
  });
  return ref.id;
}

export async function getTransportRequests(limitCount = 100) {
  const q = query(
    collection(db, 'transport_requests'),
    orderBy('created_at', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getTransportRequest(id) {
  const snap = await getDoc(doc(db, 'transport_requests', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function updateTransportRequest(id, updates) {
  await updateDoc(doc(db, 'transport_requests', id), {
    ...updates,
    updated_at: serverTimestamp(),
  });
}

export async function deleteTransportRequest(id) {
  await deleteDoc(doc(db, 'transport_requests', id));
}

// Get requests by status (useful for filtering "sent but not yet converted")
export async function getRequestsByStatus(status, limitCount = 100) {
  const q = query(
    collection(db, 'transport_requests'),
    where('status', '==', status),
    orderBy('created_at', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Mark request as converted to a shipment (called when auto-creating shipment)
export async function linkRequestToShipment(requestId, shipmentId) {
  await updateDoc(doc(db, 'transport_requests', requestId), {
    status: 'converted',
    shipment_id: shipmentId,
    converted_at: serverTimestamp(),
  });
}

// ═════════════════════════════════════════════
// DROPDOWN OPTIONS (metadata)
// ═════════════════════════════════════════════
// Stored in a single doc for easy management
// Path: transport_metadata/dropdowns

const METADATA_DOC = 'transport_metadata/dropdowns';

export async function getTransportDropdowns() {
  const snap = await getDoc(doc(db, 'transport_metadata', 'dropdowns'));
  if (!snap.exists()) {
    // Return sensible defaults
    return {
      customers: [],
      materials: [],
      nationalities: ['هندي', 'باكستاني', 'بنغلاديشي', 'مصري', 'يمني', 'أردني', 'سوري', 'فلبيني', 'أفغاني', 'سعودي'],
    };
  }
  return snap.data();
}

export async function updateTransportDropdowns(updates) {
  const ref = doc(db, 'transport_metadata', 'dropdowns');
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    // Create with defaults + updates
    const { setDoc } = await import('firebase/firestore');
    await setDoc(ref, {
      customers: [],
      materials: [],
      nationalities: ['هندي', 'باكستاني', 'بنغلاديشي', 'مصري', 'يمني', 'أردني', 'سوري', 'فلبيني', 'أفغاني', 'سعودي'],
      ...updates,
      updated_at: serverTimestamp(),
    });
  } else {
    await updateDoc(ref, {
      ...updates,
      updated_at: serverTimestamp(),
    });
  }
}

// Convenience: add a single value to a list (customers, materials, nationalities)
export async function addDropdownValue(field, value) {
  if (!value || !value.trim()) return;
  const current = await getTransportDropdowns();
  const list = current[field] || [];
  const trimmed = value.trim();
  if (list.includes(trimmed)) return;
  await updateTransportDropdowns({
    [field]: [...list, trimmed].sort(),
  });
}
// Create an incoming_batch record — visible to clearance department
// Groups multiple truck requests + their created shipment IDs into a single
// batch record so clearance can see and download the Excel per batch.
export async function createIncomingBatch(requests, shipmentIds, sender) {
  if (!requests || requests.length === 0) return null;
  const first = requests[0];

  // Compute totals
  const totalQty = requests.reduce((s, r) => s + (parseFloat(r.quantity) || 0), 0);

  // Snapshot each truck's data (used later to build the Excel)
  const trucks = requests.map(r => ({
    driver_name:        r.driver_name || '',
    driver_id_number:   r.driver_id_number || '',
    driver_nationality: r.driver_nationality || '',
    truck_number:       r.truck_number || '',
    quantity:           parseFloat(r.quantity) || 0,
    delivery_number:    r.delivery_number || '',
    loading_location:   r.loading_location || '',
    dispatch_date:      r.dispatch_date || '',
    phone:              r._phone || '',
    request_id:         r.id || '',
  }));

  const payload = {
    batch_id:         first.batch_id || `single-${first.id || Date.now()}`,
    batch_label:      first.batch_label || '',
    customer:         first.customer || '',
    material:         first.material || '',
    destination:      first.destination || 'uae',
    loading_location: first.loading_location || '',
    dispatch_date:    first.dispatch_date || '',
    trucks_count:     trucks.length,
    total_qty:        totalQty,
    trucks:           trucks,
    shipment_ids:     shipmentIds || [],
    sent_by_name:     sender?.name || '',
    sent_by_email:    sender?.email || '',
    sent_by_uid:      sender?.uid || '',
    sent_at:          serverTimestamp(),
    status:           'new',       // 'new' → 'viewed' when clearance opens it
    viewed_by:        null,
    viewed_at:        null,
  };

  const ref = await addDoc(collection(db, 'incoming_batches'), payload);
  return ref.id;
}

// Get incoming batches (most recent first), optionally filter by status
export async function getIncomingBatches(limitCount = 200, statusFilter = null) {
  let q = query(
    collection(db, 'incoming_batches'),
    orderBy('sent_at', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  const batches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (statusFilter) return batches.filter(b => b.status === statusFilter);
  return batches;
}

// Mark a batch as viewed by clearance (removes the "new" badge)
export async function markBatchViewed(batchDocId, viewerName) {
  await updateDoc(doc(db, 'incoming_batches', batchDocId), {
    status:    'viewed',
    viewed_by: viewerName || 'مستخدم',
    viewed_at: new Date().toISOString(),
  });
}

// Count of unviewed batches — for sidebar badge
export async function getUnviewedBatchCount() {
  const snap = await getDocs(collection(db, 'incoming_batches'));
  return snap.docs.filter(d => (d.data() || {}).status === 'new').length;
}
