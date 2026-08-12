import {
  collection, doc, addDoc, updateDoc, getDoc,
  getDocs, query, where, orderBy, serverTimestamp
} from "firebase/firestore";
import { db } from "./config.js";

// ─────────────────────────────────────────────
// DRIVERS
// ─────────────────────────────────────────────

/**
 * Search drivers by name (partial match via stored index)
 */
export async function searchDrivers(nameQuery) {
  const snap = await getDocs(collection(db, "drivers"));
  const lower = nameQuery.toLowerCase();
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(d => d.name?.toLowerCase().includes(lower));
}

// ─────────────────────────────────────────────
// TRANSPORT DRIVER LOOKUP
// ─────────────────────────────────────────────
// Match a driver by english name or iqama. Returns null if not found.
export async function findDriverByEnOrIqama(nameEn, iqama) {
  const snap = await getDocs(collection(db, "drivers"));
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const normalize = (s) => (s || '').trim().toLowerCase();
  const nameEnN = normalize(nameEn);
  const iqamaN = normalize(iqama);
  if (iqamaN) {
    const byIqama = list.find(d => normalize(d.iqama) === iqamaN);
    if (byIqama) return byIqama;
  }
  if (nameEnN) {
    const byEn = list.find(d => normalize(d.name_en) === nameEnN);
    if (byEn) return byEn;
  }
  return null;
}

// Get all drivers - for autocomplete lists
export async function getAllDrivers() {
  const snap = await getDocs(collection(db, "drivers"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Get drivers that are missing arabic name (for admin alert)
export async function getDriversMissingArabic() {
  const snap = await getDocs(collection(db, "drivers"));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(d => !d.name_ar || d.name_ar.trim() === '');
}

// Upsert driver from transport department input
// - If exists (by iqama or name_en): update phone/truck_number, keep name_ar
// - If new: create with name_ar empty
export async function upsertTransportDriver(data) {
  const existing = await findDriverByEnOrIqama(data.name_en, data.iqama);

  if (existing) {
    // Update mutable fields (phone, truck_number, nationality if changed)
    const updates = {
      updated_at: serverTimestamp(),
    };
    if (data.phone && data.phone !== existing.phone) updates.phone = data.phone;
    if (data.truck_number && data.truck_number !== existing.truck_number) {
      updates.truck_number = data.truck_number;
    }
    if (data.nationality && data.nationality !== existing.nationality) {
      updates.nationality = data.nationality;
    }
    // Also update name_en/iqama if user filled the missing one
    if (data.name_en && !existing.name_en) updates.name_en = data.name_en;
    if (data.iqama && !existing.iqama) updates.iqama = data.iqama;

    if (Object.keys(updates).length > 1) { // more than just updated_at
      await updateDoc(doc(db, "drivers", existing.id), updates);
    }
    return { id: existing.id, ...existing, ...updates };
  }

  // Create new driver
  const ref = await addDoc(collection(db, "drivers"), {
    name_en: data.name_en || '',
    name_ar: '', // empty — admin fills later
    iqama: data.iqama || '',
    nationality: data.nationality || '',
    phone: data.phone || '',
    truck_number: data.truck_number || '',
    source: 'transport',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return { id: ref.id, name_en: data.name_en, name_ar: '', iqama: data.iqama,
    nationality: data.nationality, phone: data.phone, truck_number: data.truck_number };
}

// Update just the arabic name (for admin)
export async function updateDriverArabicName(driverId, nameAr) {
  await updateDoc(doc(db, "drivers", driverId), {
    name_ar: nameAr,
    updated_at: serverTimestamp(),
  });
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
 * Get all shipments, newest first
 */
export async function getShipments(limitCount = 50) {
  const q = query(
    collection(db, "shipments"),
    orderBy("created_at", "desc")
  );
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
// Uses driver.name_ar if available, falls back to name_en.
// Creates as 'draft' status - admin fills declaration#, date, attachments later.
export async function createShipmentFromTransportRequest(req, driver) {
  // Get plate from driver's most recent truck (or from request if driver is new)
  const plate = req.truck_number || driver?.truck_number || '';

  // Use arabic name if driver has one, otherwise english name
  const driverDisplayName = driver?.name_ar?.trim() || driver?.name_en || req.driver_name || '';

  const ref = await addDoc(collection(db, "shipments"), {
    // Empty declaration# - admin fills later
    declaration_no: '',
    // Use dispatch_date as initial date (admin can change)
    date: req.dispatch_date || '',
    destination: req.destination || 'uae',
    exporter: req.customer || '',
    // Driver snapshot at time of creation
    driver_id: driver?.id || null,
    driver_snapshot: {
      name: driverDisplayName,
      name_en: driver?.name_en || req.driver_name || '',
      nationality: driver?.nationality || req.driver_nationality || '',
      passport_country: driver?.iqama || req.driver_id_number || '',
      plate: plate,
      plate_nationality: '',
      vehicle_type: '',
      carrier_type: '',
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
