import { dayNameFromHijri } from '../../../src/utils/hijriDate.js';
import { LOGO_B64, STAMP_B64 } from '../../../src/utils/assets.js';
import { getShipment } from '../../../src/firebase/db.js';

const PORTS = {
  uae:     { ar: 'جمرك البطحاء',       en: 'Al Batha Customs' },
  bahrain: { ar: 'جمرك جسر الملك فهد', en: 'King Fahd Causeway Customs' }
};

const DECL_TYPES = {
  saudi_origin: 'أخصائي منشأ سعودي',
  re_export:    'إعادة تصدير',
  temp_export:  'تصدير مؤقت',
  transit:      'ترانزيت'
};

const STATUS_AR = {
  draft: 'مسودة', sent_broker: 'أُرسل للمخلص',
  broker_replied: 'رد المخلص', sent_driver: 'أُرسل للسائق', done: 'مكتمل'
};

export async function renderShipmentView(container, { id }) {
  if (!id) return;

  container.innerHTML = `
    <div class="topbar no-print">
      <div>
        <div class="topbar-title">📄 عرض الشحنة</div>
        <div class="topbar-sub">الفورمات الجاهزة للطباعة</div>
      </div>
      <div class="topbar-actions">
        <button class="btn btn-ghost" onclick="navigate('shipments')">← رجوع</button>
        <button class="btn btn-primary" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
      </div>
    </div>
    <div class="page-body">
      <div id="forms-container"><div class="loader"><div class="spinner"></div></div></div>
    </div>`;

  const s = await getShipment(id);
  if (!s) {
    document.getElementById('forms-container').innerHTML =
      '<div class="empty-state"><div class="empty-title">الشحنة غير موجودة</div></div>';
    return;
  }

  const port    = PORTS[s.port] || PORTS.uae;
  const drv     = s.driver_snapshot || {};
  const declType= DECL_TYPES[s.declaration_type] || s.declaration_type || 'أخصائي منشأ سعودي';

  document.getElementById('forms-container').innerHTML = buildForms(s, port, drv, declType);
}

function buildForms(s, port, drv, declType) {
  return `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;800&display=swap');

    .forms-wrap { font-family: 'Tajawal', sans-serif; direction: rtl; max-width: 900px; margin: 0 auto; }

    /* ── FORM CARD ── */
    .f-card {
      background: white;
      border: 1px solid #D0DCE8;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 28px;
    }

    /* ── LETTERHEAD ── */
    .f-lh {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 16px 24px 14px;
      border-bottom: 2.5px solid #1C2D4E;
    }
    .f-lh-text .f-lh-ar   { font-size: 14px; font-weight: 800; color: #1C2D4E; line-height: 1.5; }
    .f-lh-text .f-lh-en   { font-size: 10px; font-weight: 600; color: #1C2D4E; letter-spacing: 0.5px; line-height: 1.6; }
    .f-lh-text .f-lh-addr { font-size: 9px; color: #5a7090; margin-top: 3px; }
    .f-lh-logo {
      background: #1C2D4E;
      color: white;
      font-size: 12px;
      font-weight: 800;
      text-align: center;
      padding: 10px 18px;
      border-radius: 8px;
      line-height: 1.5;
      flex-shrink: 0;
    }

    /* ── TITLE BAR ── */
    .f-title-bar {
      background: #1C2D4E;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 20px;
      font-size: 12px;
      font-weight: 700;
    }

    /* ── SECTION BAR ── */
    .f-section {
      background: #1C2D4E;
      color: white;
      padding: 6px 18px;
      font-size: 11.5px;
      font-weight: 700;
    }

    /* ── TABLE ── */
    .f-tbl { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    .f-tbl td, .f-tbl th {
      border: 1px solid #1C2D4E;
      padding: 7px 12px;
      vertical-align: middle;
    }
    .f-tbl th {
      background: #e8edf4;
      font-weight: 700;
      color: #1C2D4E;
      text-align: center;
      font-size: 11.5px;
    }
    .f-lbl  { background: #f4f7fb; font-weight: 700; color: #1C2D4E; width: 20%; white-space: nowrap; }
    .f-val  { color: #1a2535; }
    .f-bold { font-weight: 800; color: #1C2D4E; font-size: 14px; }
    .f-ctr  { text-align: center; }

    /* ── FOOTER BAR ── */
    .f-footer {
      background: #1C2D4E;
      color: rgba(255,255,255,0.7);
      font-size: 9.5px;
      padding: 8px 20px;
      display: flex;
      justify-content: space-between;
    }

    /* ── SAMPLE FORM ── */
    .f-main-title {
      font-size: 18px; font-weight: 800; color: #1C2D4E;
      text-align: right; margin: 14px 24px 4px;
      border-right: 5px solid #1C2D4E; padding-right: 10px;
    }
    .f-sub-title {
      font-size: 14px; font-weight: 600; color: #1C2D4E;
      text-align: right; padding: 0 30px 12px;
    }
    .f-ref {
      font-size: 12px; color: #333; line-height: 2;
      text-align: right; margin: 0 24px 18px;
      padding-right: 12px; border-right: 3px solid #D0DCE8;
    }
    .f-body {
      font-size: 14px; color: #1a2535;
      line-height: 3; text-align: right;
      padding: 0 24px; margin-bottom: 32px;
    }
    .f-body p { margin: 0; }
    .f-body strong { color: #1C2D4E; }

    /* ── SIGNATURES ── */
    .f-sign-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      padding: 0 24px;
      margin-bottom: 8px;
    }
    .f-sign-cell { padding: 0 10px; }
    .f-sign-title {
      font-size: 13px; font-weight: 700; color: #1C2D4E;
      margin-bottom: 40px;
    }
    .f-stamp {
      width: 90px; height: 90px;
      border-radius: 50%;
      border: 3px solid #3a6099;
      color: #3a6099;
      font-size: 9px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      text-align: center; line-height: 1.5; padding: 10px;
      margin: 0 auto 12px;
    }

    /* ── PAGE BREAK ── */
    .f-page-break { height: 0; page-break-after: always; margin: 0; }

    /* ── PRINT ── */
    @media print {
      .no-print { display: none !important; }
      .main-content { margin-right: 0 !important; }
      .page-body { padding: 0 !important; }
      .forms-wrap { max-width: 100%; }
      .f-card { border: none; border-radius: 0; margin-bottom: 0; box-shadow: none; }
      .f-page-break { page-break-after: always; }
      body { background: white !important; }
    }
  </style>

  <div class="forms-wrap">

    <!-- ══════════════════════════════════
         FORM 1 — البيان الجمركي
    ══════════════════════════════════ -->
    <div class="f-card">

      <div class="f-title-bar">
        <span>Customs Export Declaration — نظام التصدير الآلي</span>
        <span>البيان الجمركي للصادر</span>
      </div>

      <div class="f-lh">
        <div class="f-lh-text">
          <div class="f-lh-ar">شركة عبدالرحمن عبدالعزيز السديس<br>للخدمات اللوجستية</div>
          <div class="f-lh-en">ABDULRAHMAN ABDULAZIZ AL-SUDAIS<br>LOGISTICS SERVICES COMPANY</div>
          <div class="f-lh-addr">سجل تجاري 4030126911 – جدة – حي الجوهرة – المملكة العربية السعودية &nbsp;|&nbsp; Jeddah – Al Jawhara District – KSA</div>
        </div>
        <img src="${LOGO_B64}" style="height:60px;object-fit:contain;">
      </div>

      <div class="f-section">${port.ar} / ${port.en} — بيانات جمركية</div>
      <table class="f-tbl">
        <tr>
          <td class="f-lbl">جمرك / Customs</td>
          <td class="f-val">${port.ar} — نظام التصدير الآلي</td>
          <td class="f-lbl">أسم المخلص الجمركي</td>
          <td class="f-val">شركة عبدالرحمن عبدالعزيز السديس</td>
        </tr>
        <tr>
          <td class="f-lbl">المصدر / Exporter</td>
          <td class="f-val" colspan="3" style="font-weight:700;">${s.exporter || '—'}</td>
        </tr>
        <tr>
          <td class="f-lbl">نوع البيان</td>
          <td class="f-val">✅ ${declType}</td>
          <td class="f-lbl">إعادة تصدير</td><td></td>
        </tr>
      </table>

      <div class="f-section">أرقام البيان — Declaration Numbers</div>
      <table class="f-tbl">
        <tr>
          <td class="f-lbl">رقم البيان / No.</td>
          <td class="f-val f-bold f-ctr">${s.declaration_no || '—'}</td>
          <td class="f-lbl">الرقم الموحد / Unified</td>
          <td class="f-val f-bold f-ctr">${s.unified_no || '—'}</td>
          <td class="f-lbl">التاريخ / Date</td>
          <td class="f-val f-bold f-ctr">${s.date || '—'}</td>
        </tr>
      </table>

      <div class="f-section">وصف البضاعة — Cargo Description</div>
      <table class="f-tbl">
        <tr>
          <td class="f-lbl">وصف البضاعة / Goods</td>
          <td class="f-val" style="font-weight:700;font-size:14px;">${s.goods_description || '—'}</td>
        </tr>
      </table>

      <div class="f-section">بيانات الشاحنة والسائق — Vehicle & Driver Information</div>
      <table class="f-tbl">
        <thead>
          <tr>
            <th>عدد</th>
            <th>قيد حركة الشاحنة</th>
            <th>أرقام اللوحات</th>
            <th>جنسيتها</th>
            <th>أسم السائق</th>
            <th>جنسيته</th>
            <th>نوع السيارة</th>
            <th>نوع الناقل</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="f-ctr" style="font-weight:700;">1</td>
            <td class="f-ctr">${drv.movement_ref || ''}</td>
            <td class="f-ctr" style="font-weight:700;">${drv.plate || '—'}</td>
            <td class="f-ctr">${drv.plate_nationality || '—'}</td>
            <td style="font-weight:700;">${drv.name || '—'}</td>
            <td class="f-ctr">${drv.nationality || '—'}</td>
            <td class="f-ctr">${drv.vehicle_type || '—'}</td>
            <td class="f-ctr">${drv.carrier_type || '—'}</td>
          </tr>
          <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
          <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
        </tbody>
      </table>

      <div class="f-footer">
        <span>www.sudais.com.sa &nbsp;|&nbsp; info@sudais.com.sa &nbsp;|&nbsp; 9200 08305</span>
        <span>Jeddah – Al Jawhara District – Building 3508 – Unit 14 – Postal code 22416</span>
      </div>
    </div>

    <!-- PAGE BREAK -->
    <div class="f-page-break"></div>

    <!-- ══════════════════════════════════
         FORM 2 — محضر استقطاع العينة
    ══════════════════════════════════ -->
    <div class="f-card">

      <div class="f-lh">
        <div class="f-lh-text">
          <div class="f-lh-ar">شركة عبدالرحمن عبدالعزيز السديس<br>للخدمات اللوجستية</div>
          <div class="f-lh-en">ABDULRAHMAN ABDULAZIZ AL-SUDAIS<br>LOGISTICS SERVICES COMPANY</div>
          <div class="f-lh-addr">سجل تجاري 4030126911 – جدة – حي الجوهرة – المملكة العربية السعودية &nbsp;|&nbsp; C.R 4030126911</div>
        </div>
        <img src="${LOGO_B64}" style="height:60px;object-fit:contain;">
      </div>

      <div class="f-main-title">${port.ar} / الصادرات</div>
      <div class="f-sub-title">( محضر استقطاع عينه ) مشتقات بتروليه (</div>

      <div class="f-ref">
        اشاره الى تعميم معالي مدير عام الجمارك رقم <strong>1004 س/43م هـ</strong>
        بشأن الاشراف على استخراج عينات المواد بتاريخ <strong>1428-10-08 هـ</strong>
        البترولية تمهيدا لارسالها الى مختبرات تحليل المنتجات البتروليه
      </div>

      <div class="f-body">
        <p>انه في <strong>${s.sample_day_name || (s.sample_date ? dayNameFromHijri(s.sample_date) : '—')} الموافق ${s.sample_date || '—'} هـ</strong> تم استقطاع عينه من الشاحنه</p>
        <p>رقم اللوحه <strong>${drv.plate || '—'}</strong> بقياده السائق <strong>${drv.name || '—'}</strong> لجنسيه <strong>${drv.nationality || '—'}</strong></p>
        <p>بموجب جواز سفر صادر من <strong>${drv.passport_country || drv.nationality || '—'}</strong></p>
        <p>وبموجب بيان رقم : <strong>${s.declaration_no || '—'}</strong> بتاريخ <strong>${s.date || '—'}</strong></p>
        <p>والارساليه باسم المصدر : <strong>${s.exporter || '—'}</strong> .</p>
      </div>

      <!-- Signatures Row 1 -->
      <div class="f-sign-grid">
        <div class="f-sign-cell" style="text-align:right;">
          <div class="f-sign-title">اسم السائق / ${drv.name || '—'}</div>
        </div>
        <div class="f-sign-cell" style="text-align:center;">
          <div class="f-sign-title">الختم</div>
          <img src="${STAMP_B64}" style="width:90px;height:90px;object-fit:contain;opacity:0.92;margin:0 auto;display:block;">
        </div>
        <div class="f-sign-cell" style="text-align:left;">
          <div class="f-sign-title">مندوب صاحب الشأن</div>
        </div>
      </div>

      <!-- Signatures Row 2 -->
      <div class="f-sign-grid" style="margin-bottom:24px;">
        <div class="f-sign-cell" style="text-align:right;">
          <div class="f-sign-title">المعاين المختص</div>
        </div>
        <div class="f-sign-cell" style="text-align:center;">
          <div class="f-sign-title">موظف التفتيش المعاكس</div>
        </div>
        <div class="f-sign-cell" style="text-align:left;">
          <div class="f-sign-title">موظف الدعم والتشغيل</div>
        </div>
      </div>

      <div class="f-footer">
        <span>www.sudais.com.sa &nbsp;|&nbsp; info@sudais.com.sa &nbsp;|&nbsp; 9200 08305</span>
        <span>Jeddah – Al Jawhara District – Building 3508 – Unit 14 – Postal code 22416 .6204</span>
      </div>
    </div>

  </div>`;
}
