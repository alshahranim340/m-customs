/**
 * feature-migration-appointments.js — M-Customs
 * هجرة تلقائية: الطلبات القديمة التي رُفعت وثيقة موعدها → تحديث لمكتمل
 * المسار: public/js/feature-migration-appointments.js
 *
 * يعمل مرة واحدة فقط عند أول تحميل، ثم يُسجَّل في localStorage
 */

import { db }         from '../../src/firebase/config.js';
import { getAuth }    from 'firebase/auth';
import {
  collection, getDocs, doc, getDoc, updateDoc, query, where
} from 'firebase/firestore';

const MIGRATION_KEY = 'mcustoms_appt_migration_v1';

/* ══════════════════════════════════════════════
   دالة التحديث الرئيسية
══════════════════════════════════════════════ */
async function runMigration() {

  // تأكد أن المستخدم مسجّل دخوله
  const auth = getAuth();
  if (!auth.currentUser) return;

  // تحقق إذا سبق تشغيل الهجرة
  if (localStorage.getItem(MIGRATION_KEY)) {
    console.log('[Migration] Already done — skipping');
    return;
  }

  console.log('[Migration] Starting appointment migration...');

  try {
    /* 1. جلب كل الشحنات غير المكتملة */
    const snap = await getDocs(
      query(collection(db, 'shipments'), where('status', '!=', 'done'))
    );

    if (snap.empty) {
      console.log('[Migration] No pending shipments found');
      localStorage.setItem(MIGRATION_KEY, '1');
      return;
    }

    let checked  = 0;
    let migrated = 0;
    const total  = snap.docs.length;

    /* 2. لكل شحنة غير مكتملة — تحقق من وجود وثيقة الموعد */
    for (const shipDoc of snap.docs) {
      checked++;
      const sid = shipDoc.id;

      try {
        /* metadata وثيقة الموعد محفوظة كـ {shipmentId}_appointment */
        const apptMeta = await getDoc(doc(db, 'attachments', `${sid}_appointment`));

        if (!apptMeta.exists()) continue;

        /* وثيقة الموعد موجودة ← حدّث الحالة */
        const metaData = apptMeta.data();

        /* تاريخ الإكمال: استخدم updated_at من المرفق إن وُجد */
        let completedAt = '';
        if (metaData.updated_at?.toDate) {
          completedAt = metaData.updated_at.toDate()
            .toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' })
            .split('/').reverse().join('-');
        } else {
          completedAt = new Date().toISOString().slice(0, 10);
        }

        await updateDoc(doc(db, 'shipments', sid), {
          status      : 'done',
          completed_at: completedAt,
        });

        migrated++;
        console.log(`[Migration] ✓ ${sid} → done (${completedAt})`);

      } catch(e) {
        console.warn(`[Migration] Failed for ${sid}:`, e.message);
      }
    }

    /* 3. سجّل إنجاز الهجرة */
    localStorage.setItem(MIGRATION_KEY, '1');
    console.log(`[Migration] ✔ Done: ${migrated}/${checked} shipments updated`);

    /* 4. أخبر المستخدم */
    if (migrated > 0) {
      setTimeout(() => {
        const toast = window.toast || ((msg) => console.log(msg));
        toast(`✅ تم تحديث ${migrated} شحنة قديمة إلى "مكتمل" تلقائياً`, 'success');
      }, 1500);
    }

  } catch(e) {
    console.error('[Migration] Error:', e.message);
  }
}

/* ══════════════════════════════════════════════
   تشغيل عند جاهزية التطبيق
══════════════════════════════════════════════ */
function startWhenReady() {
  const auth = getAuth();

  auth.onAuthStateChanged(user => {
    if (!user) return;

    /* تأخير قصير لإعطاء التطبيق وقت للتهيئة */
    setTimeout(runMigration, 3000);
  });
}

if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', startWhenReady);
else
  startWhenReady();
