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
