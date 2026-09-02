/**
 * feature-email-test.js — M-Customs
 * زر اختبار الإيميل — بـ static imports يعمل مع Vite
 * المسار: public/js/feature-email-test.js
 */

import { sendTestAlert }  from '../../src/utils/notifications.js';
import { getShipments }   from '../../src/firebase/db.js';
import { getAuth }        from 'firebase/auth';

/* ── Global handler for test button ── */
window._dashTestEmail = async function () {
  const btn  = document.getElementById('btn-test-email');
  const orig = btn?.textContent || '🧪 اختبار الإيميل';
  if (btn) { btn.disabled = true; btn.textContent = '⏳ جاري الإرسال...'; }

  try {
    const auth      = getAuth();
    const testEmail = auth.currentUser?.email;

    if (!testEmail) {
      alert('لا يمكن التعرف على إيميلك — تأكد أنك مسجّل دخولك');
      return;
    }

    const shipments = await getShipments();
    await sendTestAlert(testEmail, shipments);

    if (btn) {
      btn.textContent = '✅ تم الإرسال!';
      setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 3000);
    }
    alert('✅ تم إرسال إيميل تجريبي إلى:\n' + testEmail + '\n\nتحقق من صندوق الوارد أو Spam');

  } catch(e) {
    console.error('[Test Email]', e);
    if (btn) {
      btn.textContent = '❌ خطأ';
      setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 3000);
    }
    alert('خطأ: ' + e.message);
  }
};

console.log('[M-Customs] ✔ Email Test feature loaded');
