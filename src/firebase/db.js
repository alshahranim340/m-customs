import {
  collection, doc, addDoc, updateDoc, getDoc,
  getDocs, query, where, orderBy, limit, serverTimestamp
} from "firebase/firestore";
import { db } from "./config.js";

// ─────────────────────────────────────────────
// DRIVERS
// ─────────────────────────────────────────────

/**
 * Search drivers by name (partial match across name, name_en, name_ar, iqama, truck)
 */
export async function searchDrivers(nameQuery) {
  const snap = await getDocs(collection(db, "drivers"));
  const lower = nameQuery.toLowerCase();
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(d => d.deleted !== true)
    .filter(d =>
      (d.name || '').toLowerCase().includes(lower) ||
      (d.name_en || '').toLowerCase().includes(lower) ||
      (d.name_ar || '').toLowerCase().includes(lower) ||
      (d.iqama || '').toLowerCase().includes(lower) ||
      (d.truck_number || '').toLowerCase().includes(lower)
    );
}

// ─────────────────────────────────────────────
// TRANSPORT DRIVER LOOKUP
// ─────────────────────────────────────────────
// Match a driver by english name, arabic name, or iqama. Returns null if not found.
export async function findDriverByEnOrIqama(nameEn, iqama, nameAr = '') {
  const snap = await getDocs(collection(db, "drivers"));
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.deleted !== true);
  const normalize = (s) => (s || '').trim().toLowerCase();
  const iqamaN = normalize(iqama);
  const nameEnN = normalize(nameEn);
  const nameArN = normalize(nameAr);

  // Priority 1: iqama (most reliable unique identifier)
  if (iqamaN) {
    const byIqama = list.find(d => normalize(d.iqama) === iqamaN);
    if (byIqama) return byIqama;
  }
  // Priority 2: english name
  if (nameEnN) {
    const byEn = list.find(d => normalize(d.name_en) === nameEnN);
    if (byEn) return byEn;
  }
  // Priority 3: arabic name (prevents duplicate creation when user types in Arabic)
  if (nameArN) {
    const byAr = list.find(d => normalize(d.name_ar) === nameArN || normalize(d.name) === nameArN);
    if (byAr) return byAr;
  }
  // Priority 4: check if the input (nameEn) is actually Arabic text — match against name_ar
  if (nameEnN && /[\u0600-\u06FF]/.test(nameEn)) {
    const byArFallback = list.find(d => normalize(d.name_ar) === nameEnN || normalize(d.name) === nameEnN);
    if (byArFallback) return byArFallback;
  }
  return null;
}

// Get all drivers (excluding soft-deleted) - for autocomplete lists
export async function getAllDrivers() {
  const snap = await getDocs(collection(db, "drivers"));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(d => d.deleted !== true);
}

// Get drivers that are missing arabic name (for admin alert)
export async function getDriversMissingArabic() {
  const snap = await getDocs(collection(db, "drivers"));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(d => !d.name_ar || d.name_ar.trim() === '');
}

// Upsert driver from transport department input
// - If exists (by iqama or name_en): update fields, keep name_ar
// - Tracks vehicle history in vehicles[] when truck_number changes
// - Accepts extended fields (passport_country, vehicle_type, carrier_type, plate_nationality)
//   used by the clearance section
// - Returns { id, ...driverData, changes: { truck_changed: {from,to}|null, phone_changed, ... } }
export async function upsertTransportDriver(data) {
  const existing = await findDriverByEnOrIqama(data.name_en, data.iqama, data.name_ar);

  // Normalize incoming values (trim strings)
  const clean = (v) => (typeof v === 'string' ? v.trim() : v);
  const inbound = {
    name_en:           clean(data.name_en) || '',
    name_ar:           clean(data.name_ar) || '',
    iqama:             clean(data.iqama) || '',
    phone:             clean(data.phone) || '',
    nationality:       clean(data.nationality) || '',
    truck_number:      clean(data.truck_number) || '',
    passport_country:  clean(data.passport_country) || '',
    vehicle_type:      clean(data.vehicle_type) || '',
    carrier_type:      clean(data.carrier_type) || '',
    plate_nationality: clean(data.plate_nationality) || '',
  };

  if (existing) {
    const updates = { updated_at: serverTimestamp() };
    const changes = {
      truck_changed: null,
      phone_changed: false,
      other_changed: false,
    };

    // Truck number: track history in vehicles[]
    if (inbound.truck_number && inbound.truck_number !== (existing.truck_number || '')) {
      const nowIso = new Date().toISOString();
      const vehicles = Array.isArray(existing.vehicles) ? [...existing.vehicles] : [];

      // Mark previous vehicle as replaced (find last one without replaced_at)
      const lastActiveIdx = vehicles.map(v => !v.replaced_at).lastIndexOf(true);
      if (lastActiveIdx >= 0) {
        vehicles[lastActiveIdx] = { ...vehicles[lastActiveIdx], replaced_at: nowIso };
      }

      // Add new vehicle entry (only if not already the last one)
      const lastPlate = vehicles.length ? vehicles[vehicles.length - 1].plate : null;
      if (lastPlate !== inbound.truck_number) {
        vehicles.push({
          plate: inbound.truck_number,
          plate_nationality: inbound.plate_nationality || '',
          vehicle_type: inbound.vehicle_type || '',
          carrier_type: inbound.carrier_type || '',
          added_at: nowIso,
        });
      }

      updates.truck_number = inbound.truck_number;
      updates.vehicles = vehicles;
      changes.truck_changed = { from: existing.truck_number || '', to: inbound.truck_number };
    }

    // Extended fields (clearance-only): update to latest when provided
    const extendedFields = ['passport_country', 'vehicle_type', 'carrier_type', 'plate_nationality'];
    for (const field of extendedFields) {
      if (inbound[field] && inbound[field] !== (existing[field] || '')) {
        updates[field] = inbound[field];
        changes.other_changed = true;
      }
    }

    // Core mutable fields
    if (inbound.phone && inbound.phone !== (existing.phone || '')) {
      updates.phone = inbound.phone;
      changes.phone_changed = true;
    }
    if (inbound.nationality && inbound.nationality !== (existing.nationality || '')) {
      updates.nationality = inbound.nationality;
      changes.other_changed = true;
    }
    if (inbound.iqama && inbound.iqama !== (existing.iqama || '')) {
      updates.iqama = inbound.iqama;
      changes.other_changed = true;
    }

    // Fill english name if missing (don't overwrite)
    if (inbound.name_en && !existing.name_en) {
      updates.name_en = inbound.name_en;
      changes.other_changed = true;
    }
    // Fill arabic name if missing (don't overwrite)
    if (inbound.name_ar && !existing.name_ar) {
      updates.name_ar = inbound.name_ar;
      changes.other_changed = true;
    }

    // Only write if something actually changed (beyond updated_at)
    if (Object.keys(updates).length > 1) {
      await updateDoc(doc(db, "drivers", existing.id), updates);
    }

    return {
      id: existing.id,
      ...existing,
      ...updates,
      changes,
    };
  }

  // Create new driver
  const nowIso = new Date().toISOString();
  const vehicles = inbound.truck_number ? [{
    plate: inbound.truck_number,
    plate_nationality: inbound.plate_nationality || '',
    vehicle_type: inbound.vehicle_type || '',
    carrier_type: inbound.carrier_type || '',
    added_at: nowIso,
  }] : [];

  const newDoc = {
    name_en: inbound.name_en,
    name_ar: inbound.name_ar || '',
    iqama: inbound.iqama,
    nationality: inbound.nationality,
    phone: inbound.phone,
    truck_number: inbound.truck_number,
    passport_country: inbound.passport_country,
    vehicle_type: inbound.vehicle_type,
    carrier_type: inbound.carrier_type,
    plate_nationality: inbound.plate_nationality,
    vehicles,
    source: 'transport',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, "drivers"), newDoc);
  return {
    id: ref.id,
    ...newDoc,
    changes: { truck_changed: null, phone_changed: false, other_changed: false, is_new: true },
  };
}

// Update just the arabic name (for admin)
export async function updateDriverArabicName(driverId, nameAr) {
  await updateDoc(doc(db, "drivers", driverId), {
    name_ar: nameAr,
    updated_at: serverTimestamp(),
  });
}

// ─────────────────────────────────────────────
// DRIVER SOFT-DELETE (with restore support)
// ─────────────────────────────────────────────
// Mark a driver as deleted (soft-delete). Tracks who deleted and when.
// The driver document remains in the collection but is hidden from the main list.
export async function softDeleteDriver(driverId, deletedByName) {
  await updateDoc(doc(db, "drivers", driverId), {
    deleted: true,
    deleted_at: new Date().toISOString(),
    deleted_by: deletedByName || 'مستخدم',
    updated_at: serverTimestamp(),
  });
}

// Restore a soft-deleted driver (removes the deleted flag)
export async function restoreDeletedDriver(driverId) {
  await updateDoc(doc(db, "drivers", driverId), {
    deleted: false,
    deleted_at: null,
    deleted_by: null,
    updated_at: serverTimestamp(),
  });
}

// Get only deleted drivers — for admin recovery drawer
export async function getDeletedDrivers() {
  const snap = await getDocs(collection(db, "drivers"));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(d => d.deleted === true);
}

/**
 * Get a single driver by ID
 */
export async function getDriver(driverId) {
  const snap = await getDoc(doc(db, "drivers", driverId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Save a new driver — called automatically on first shipment
 */
export async function saveDriver(driverData) {
  const ref = await addDoc(collection(db, "drivers"), {
    ...driverData,
    vehicles: [{
      plate: driverData.plate,
      plate_nationality: driverData.plate_nationality,
      vehicle_type: driverData.vehicle_type,
      carrier_type: driverData.carrier_type,
      added_at: new Date().toISOString()
    }],
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });
  return ref.id;
}

/**
 * Update driver info — keeps vehicle history
 */
export async function updateDriver(driverId, updates, newVehicle = null) {
  const driver = await getDriver(driverId);
  const vehicles = driver.vehicles || [];

  if (newVehicle) {
    // Add new vehicle to history if plate changed
    const lastPlate = vehicles[vehicles.length - 1]?.plate;
    if (lastPlate !== newVehicle.plate) {
      vehicles.push({ ...newVehicle, added_at: new Date().toISOString() });
    } else {
      // Update current vehicle details
      vehicles[vehicles.length - 1] = {
        ...vehicles[vehicles.length - 1],
        ...newVehicle
      };
    }
  }

  await updateDoc(doc(db, "drivers", driverId), {
    ...updates,
    vehicles,
    updated_at: serverTimestamp()
  });
}

// ─────────────────────────────────────────────
// SHIPMENTS
// ─────────────────────────────────────────────

/**
 * Create a new shipment — saves driver if new
 */
export async function createShipment(shipmentData, driverData, existingDriverId = null) {
  let driver_id = existingDriverId;

  if (!driver_id) {
    // First time this driver — save to DB
    driver_id = await saveDriver(driverData);
  } else {
    // Check if vehicle changed and update history
    const newVehicle = {
      plate: driverData.plate,
      plate_nationality: driverData.plate_nationality,
      vehicle_type: driverData.vehicle_type,
      carrier_type: driverData.carrier_type
    };
    await updateDriver(driver_id, {
      name: driverData.name,
      nationality: driverData.nationality,
      passport_country: driverData.passport_country
    }, newVehicle);
  }

  const ref = await addDoc(collection(db, "shipments"), {
    ...shipmentData,
    driver_id,
    // Snapshot of driver data at time of shipment
    driver_snapshot: {
      name: driverData.name,
      nationality: driverData.nationality,
      passport_country: driverData.passport_country,
      plate: driverData.plate,
      plate_nationality: driverData.plate_nationality,
      vehicle_type: driverData.vehicle_type,
      carrier_type: driverData.carrier_type,
      movement_ref: driverData.movement_ref || ""
    },
    status: "draft", // draft → sent_broker → broker_replied → sent_driver → done
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });

  return ref.id;
}

/**
 * Get shipments, newest first.
 * Pass limitCount to cap how many are fetched (recommended for
 * lightweight/preview use — splash stats, command palette, dashboard
 * alerts). Omit it (or pass 0/undefined) to fetch the full collection,
 * e.g. for the Shipments Ledger page which must show every shipment.
 */
export async function getShipments(limitCount) {
  const constraints = [collection(db, "shipments"), orderBy("created_at", "desc")];
  if (limitCount) constraints.push(limit(limitCount));
  const q = query(...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get single shipment
 */
export async function getShipment(shipmentId) {
  const snap = await getDoc(doc(db, "shipments", shipmentId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Update shipment status and data
 */
export async function updateShipment(shipmentId, updates) {
  await updateDoc(doc(db, "shipments", shipmentId), {
    ...updates,
    updated_at: serverTimestamp()
  });
}

// ─────────────────────────────────────────────
// CREATE SHIPMENT FROM TRANSPORT REQUEST
// ─────────────────────────────────────────────
// Automatically creates a shipment from a transport request.
// Uses driver.name_ar if available (customs docs need Arabic), falls back to name_en.
// Creates as 'draft' status - admin fills declaration#, date, attachments later.
export async function createShipmentFromTransportRequest(req, driver) {
  // If driver not provided or lacks Arabic name, try to look up from drivers collection
  // using the request's driver_name / iqama. This ensures clearance receives Arabic.
  let resolvedDriver = driver;
  if (!resolvedDriver?.name_ar || !resolvedDriver.name_ar.trim()) {
    try {
      const looked = await findDriverByEnOrIqama(req.driver_name, req.driver_id_number, req.driver_name);
      if (looked) resolvedDriver = { ...looked, ...(driver || {}) };
    } catch (e) {
      // best-effort — fall through with what we have
    }
  }

  // Get plate from request first (most recent), fallback to driver's latest
  const plate = req.truck_number || resolvedDriver?.truck_number || '';

  // Prefer Arabic name for clearance (Saudi customs docs). Fallback to English, then request field.
  const driverDisplayName =
    resolvedDriver?.name_ar?.trim() ||
    resolvedDriver?.name?.trim() ||   // legacy field
    resolvedDriver?.name_en?.trim() ||
    req.driver_name || '';

  const ref = await addDoc(collection(db, "shipments"), {
    // Empty declaration# - admin fills later
    declaration_no: '',
    // Use dispatch_date as initial date (admin can change)
    date: req.dispatch_date || '',
    destination: req.destination || 'uae',
    exporter: req.customer || '',
    // Driver snapshot at time of creation
    driver_id: resolvedDriver?.id || null,
    driver_snapshot: {
      name: driverDisplayName,
      name_en: resolvedDriver?.name_en || req.driver_name || '',
      nationality: resolvedDriver?.nationality || req.driver_nationality || '',
      passport_country: resolvedDriver?.passport_country || resolvedDriver?.iqama || req.driver_id_number || '',
      plate: plate,
      plate_nationality: resolvedDriver?.plate_nationality || '',
      vehicle_type: resolvedDriver?.vehicle_type || '',
      carrier_type: resolvedDriver?.carrier_type || '',
      movement_ref: req.delivery_number || ''
    },
    // Extra transport info
    material: req.material || '',
    quantity: req.quantity || 0,
    delivery_number: req.delivery_number || '',
    // Link back to transport request
    transport_request_id: req.id,
    source: 'transport',
    status: 'draft',
    notes: req.notes || '',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });

  return ref.id;
}

// ─────────────────────────────────────────────
// IMPORT SHIPMENTS — للداشبورد (قراءة مباشرة)
// ─────────────────────────────────────────────
export async function getImportShipments() {
  const q    = query(collection(db, 'import_shipments'), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
