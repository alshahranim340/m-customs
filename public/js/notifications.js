// ══════════════════════════════════════════════════════════════
// REAL-TIME NOTIFICATIONS — Firestore onSnapshot listeners
// Plays sound + shows banner when new data arrives.
// ══════════════════════════════════════════════════════════════

import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../src/firebase/config.js';

let _listeners = [];      // active snapshot unsubscribe functions
let _initialLoad = {};    // track initial snapshot per collection (skip notification)
let _profile = null;
let _onRefresh = null;    // callback to refresh current page data

// ─────────────────────────────────────────────
// NOTIFICATION SOUND (Web Audio API — no external files)
// ─────────────────────────────────────────────
let _audioCtx = null;
function playNotificationSound() {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _audioCtx;

    // Two-tone chime: C5 → E5
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.value = 523.25; // C5
    osc2.type = 'sine';
    osc2.frequency.value = 659.25; // E5

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.3);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.6);
  } catch (e) {
    // Audio not available — silent fallback
  }
}

// ─────────────────────────────────────────────
// NOTIFICATION BANNER
// ─────────────────────────────────────────────
let _bannerTimeout = null;
function showNotificationBanner(message, icon = '📥', color = '#1C4B8E') {
  // Remove existing
  document.getElementById('rt-notif-banner')?.remove();
  if (_bannerTimeout) clearTimeout(_bannerTimeout);

  const banner = document.createElement('div');
  banner.id = 'rt-notif-banner';
  banner.style.cssText = `
    position:fixed;top:0;left:0;right:0;z-index:100001;
    background:linear-gradient(135deg,${color} 0%,#0E1A2E 100%);
    color:white;padding:12px 20px;
    display:flex;align-items:center;justify-content:center;gap:12px;
    font-family:'Tajawal',sans-serif;font-size:14px;font-weight:700;
    box-shadow:0 4px 20px rgba(14,26,46,0.3);
    animation:rtSlideDown 0.35s ease-out;
    cursor:pointer;
  `;
  banner.innerHTML = `
    <span style="font-size:20px;">${icon}</span>
    <span>${message}</span>
    <button onclick="this.parentElement.remove()" style="background:rgba(255,255,255,0.15);border:none;color:white;border-radius:4px;padding:4px 10px;font-size:12px;cursor:pointer;margin-right:8px;">✕</button>
  `;

  // Add animation CSS if not exists
  if (!document.getElementById('rt-notif-style')) {
    const style = document.createElement('style');
    style.id = 'rt-notif-style';
    style.textContent = `
      @keyframes rtSlideDown { from { transform:translateY(-100%); opacity:0; } to { transform:translateY(0); opacity:1; } }
      @keyframes rtSlideUp { from { transform:translateY(0); opacity:1; } to { transform:translateY(-100%); opacity:0; } }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(banner);

  // Click banner to dismiss
  banner.onclick = () => banner.remove();

  // Auto-dismiss after 8 seconds
  _bannerTimeout = setTimeout(() => {
    if (banner.parentNode) {
      banner.style.animation = 'rtSlideUp 0.3s ease-in forwards';
      setTimeout(() => banner.remove(), 300);
    }
  }, 8000);
}

// ─────────────────────────────────────────────
// START LISTENERS
// ─────────────────────────────────────────────
export function startNotifications(profile, onRefreshCallback) {
  // Clean up any existing listeners
  stopNotifications();

  _profile = profile;
  _onRefresh = onRefreshCallback;
  _initialLoad = {};

  const role = profile?.role || 'employee';
  const isTransport = role === 'transport';
  const isCustoms = role === 'employee' || role === 'supervisor';
  const isElevated = role === 'admin' || role === 'manager';

  // 1. Listen for incoming_batches (clearance + admin/manager)
  if (isCustoms || isElevated) {
    listenCollection('incoming_batches', (change) => {
      const data = change.doc.data();
      const customer = data.customer || 'دفعة';
      const trucks = data.trucks_count || 0;
      playNotificationSound();
      showNotificationBanner(
        `📥 دفعة واردة جديدة: ${customer} (${trucks} شاحنة) — من ${data.sent_by_name || 'النقل'}`,
        '🚛',
        '#2E8B57'
      );
      // Update sidebar badge
      if (window.updateBadges) window.updateBadges();
      // Refresh if on incoming-batches page
      triggerRefresh();
    });
  }

  // 2. Listen for transport_requests (transport + admin/manager)
  if (isTransport || isElevated) {
    listenCollection('transport_requests', (change) => {
      const data = change.doc.data();
      // Only notify on new requests (not updates)
      if (data.status === 'draft') {
        const driver = data.driver_name || 'سائق';
        const customer = data.customer || '';
        playNotificationSound();
        showNotificationBanner(
          `📋 طلب نقل جديد: ${driver} — ${customer}`,
          '📋',
          '#1C4B8E'
        );
      }
      triggerRefresh();
    });
  }

  // 3. Listen for shipments (clearance + admin/manager — new shipments from transport)
  if (isCustoms || isElevated) {
    listenCollection('shipments', (change) => {
      const data = change.doc.data();
      if (data.source === 'transport') {
        const driver = data.driver_snapshot?.name || 'سائق';
        playNotificationSound();
        showNotificationBanner(
          `📦 شحنة جديدة من النقل: ${driver}`,
          '📦',
          '#8B6914'
        );
        if (window.updateBadges) window.updateBadges();
        triggerRefresh();
      }
    });
  }
}

function listenCollection(collectionName, onNewDoc) {
  _initialLoad[collectionName] = true;

  const unsub = onSnapshot(
    collection(db, collectionName),
    (snapshot) => {
      // Skip the first snapshot (initial load of existing data)
      if (_initialLoad[collectionName]) {
        _initialLoad[collectionName] = false;
        return;
      }

      // Only react to added documents (not modified/removed)
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          onNewDoc(change);
        }
      });
    },
    (error) => {
      console.warn(`Notification listener error (${collectionName}):`, error);
    }
  );

  _listeners.push(unsub);
}

function triggerRefresh() {
  if (_onRefresh) {
    // Small delay to let Firestore settle
    setTimeout(() => _onRefresh(), 500);
  }
}

// ─────────────────────────────────────────────
// STOP LISTENERS (on logout)
// ─────────────────────────────────────────────
export function stopNotifications() {
  _listeners.forEach(unsub => {
    try { unsub(); } catch (e) {}
  });
  _listeners = [];
  _initialLoad = {};
}
