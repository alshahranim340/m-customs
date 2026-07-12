// Shipment View & Print Page
import { getShipment } from '../../../src/firebase/db.js';

const DEST  = { uae: '🇦🇪 الإمارات — جمرك البطحاء', bahrain: '🇧🇭 البحرين — جمرك جسر الملك فهد', oman: '🇴🇲 سلطنة عُمان' };
const PORTS = { uae: 'جمرك البطحاء', bahrain: 'جمرك جسر الملك فهد' };
const STATUS = {
  draft: 'مسودة', sent_broker: 'أُرسل للمخلص',
  broker_replied: 'رد المخلص', sent_driver: 'أُرسل للسائق', done: 'مكتمل'
};
const DECL_TYPES = {
  saudi_origin: 'أخصائي منشأ سعودي', re_export: 'إعادة تصدير',
  temp_export: 'تصدير مؤقت', transit: 'ترانزيت'
};

export async function renderShipmentView(container, { id }) {
  if (!id) { container.innerHTML = '<div class="empty-state"><div class="empty-title">لا يوجد معرف للشحنة</div></div>'; return; }

  const s = await getShipment(id);
  if (!s) { container.innerHTML = '<div class="empty-state"><div class="empty-title">الشحنة غير موجودة</div></div>'; return; }

  const port = PORTS[s.port] || PORTS.uae;

  container.innerHTML = `
    <div class="topbar no-print">
      <div>
        <div class="topbar-title">📄 بيانات الشحنة #${s.declaration_no || '—'}</div>
        <div class="topbar-sub">${s.driver_snapshot?.name || ''}</div>
      </div>
      <div class="topbar-actions">
        <button class="btn btn-ghost" onclick="navigate('shipments')">← رجوع</button>
        <button class="btn btn-primary" onclick="window.print()">🖨️ طباعة</button>
      </div>
    </div>

    <div class="page-body">
      <div id="print-area">

        <!-- FORM 1: CUSTOMS DECLARATION -->
        <div class="print-form" id="form-declaration">

          <!-- Letterhead -->
          <div class="lh-row">
            <div class="lh-company">
              <div class="lh-ar">شركة عبدالرحمن عبدالعزيز السديس للخدمات اللوجستية</div>
              <div class="lh-en">ABDULRAHMAN ABDULAZIZ AL-SUDAIS LOGISTICS SERVICES COMPANY</div>
              <div class="lh-addr">سجل تجاري 4030126911 – جدة – حي الجوهرة – المملكة العربية السعودية</div>
            </div>
            <div class="lh-logo-placeholder">السديس<br>AL SUDAIS</div>
          </div>

          <!-- Form title bar -->
          <div class="form-title-bar">
            <span>Customs Export Declaration</span>
            <span>البيان الجمركي للصادر</span>
          </div>

          <!-- Port & Broker -->
          <table class="form-tbl">
            <tr>
              <td class="lbl">جمرك / Customs</td>
              <td class="val">${port} / نظام التصدير الآلي</td>
              <td class="lbl">أسم المخلص الجمركي</td>
              <td class="val">شركة عبدالرحمن عبدالعزيز السديس</td>
            </tr>
            <tr>
              <td class="lbl">المصدر / Exporter</td>
              <td class="val bold" colspan="3">${s.exporter || '—'}</td>
            </tr>
            <tr>
              <td class="lbl">نوع البيان</td>
              <td class="val">${DECL_TYPES[s.declaration_type] || s.declaration_type || '—'}</td>
              <td class="lbl">حالة الشحنة</td>
              <td class="val">${STATUS[s.status] || s.status}</td>
            </tr>
          </table>

          <!-- Declaration numbers -->
          <div class="section-bar">أرقام البيان — Declaration Numbers</div>
          <table class="form-tbl">
            <tr>
              <td class="lbl">رقم البيان</td>
              <td class="val bold big">${s.declaration_no || '—'}</td>
              <td class="lbl">الرقم الموحد</td>
              <td class="val bold big">${s.unified_no || '—'}</td>
              <td class="lbl">التاريخ</td>
              <td class="val bold">${s.date || '—'}</td>
            </tr>
          </table>

          <!-- Goods -->
          <div class="section-bar">وصف البضاعة — Cargo Description</div>
          <table class="form-tbl">
            <tr>
              <td class="lbl">وصف البضاعة / Goods</td>
              <td class="val bold" colspan="3">${s.goods_description || '—'}</td>
            </tr>
          </table>

          <!-- Vehicle & Driver -->
          <div class="section-bar">بيانات الشاحنة والسائق — Vehicle & Driver</div>
          <table class="form-tbl">
            <thead>
              <tr>
                <th>عدد</th><th>قيد حركة الشاحنة</th><th>أرقام اللوحات</th>
                <th>جنسيتها</th><th>أسم السائق</th><th>جنسيته</th>
                <th>نوع السيارة</th><th>نوع الناقل</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="center">1</td>
                <td class="center">${s.driver_snapshot?.movement_ref || ''}</td>
                <td class="center bold">${s.driver_snapshot?.plate || '—'}</td>
                <td class="center">${s.driver_snapshot?.plate_nationality || '—'}</td>
                <td class="bold">${s.driver_snapshot?.name || '—'}</td>
                <td class="center">${s.driver_snapshot?.nationality || '—'}</td>
                <td class="center">${s.driver_snapshot?.vehicle_type || '—'}</td>
                <td class="center">${s.driver_snapshot?.carrier_type || '—'}</td>
              </tr>
              <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
              <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
            </tbody>
          </table>

          <div class="form-footer-bar">
            www.sudais.com.sa &nbsp;|&nbsp; info@sudais.com.sa &nbsp;|&nbsp; 9200 08305 &nbsp;|&nbsp;
            Jeddah – Al Jawhara District – Building 3508 – Unit 14 – Postal 22416
          </div>
        </div>

        <!-- PAGE BREAK -->
        <div class="page-break"></div>

        <!-- FORM 2: SAMPLE EXTRACTION -->
        <div class="print-form" id="form-sample">

          <!-- Letterhead -->
          <div class="lh-row">
            <div class="lh-company">
              <div class="lh-ar">شركة عبدالرحمن عبدالعزيز السديس للخدمات اللوجستية</div>
              <div class="lh-en">ABDULRAHMAN ABDULAZIZ AL-SUDAIS LOGISTICS SERVICES COMPANY</div>
              <div class="lh-addr">سجل تجاري 4030126911 – جدة – حي الجوهرة – المملكة العربية السعودية</div>
            </div>
            <div class="lh-logo-placeholder">السديس<br>AL SUDAIS</div>
          </div>

          <div class="sample-main-title">${port} / الصادرات</div>
          <div class="sample-sub-title">( محضر استقطاع عينه ) مشتقات بتروليه (</div>

          <div class="sample-ref">
            اشاره الى تعميم معالي مدير عام الجمارك رقم <strong>1004 س/43م هـ</strong>
            بشأن الاشراف على استخراج عينات المواد بتاريخ <strong>1428-10-08 هـ</strong>
            البترولية تمهيدا لارسالها الى مختبرات تحليل المنتجات البتروليه
          </div>

          <div class="sample-body">
            <p>انه في <strong>الأربعاء الموافق ${s.date || '—'} هـ</strong> تم استقطاع عينه من الشاحنه</p>
            <p>رقم اللوحه <strong>${s.driver_snapshot?.plate || '—'}</strong> بقياده السائق <strong>${s.driver_snapshot?.name || '—'}</strong> لجنسيه <strong>${s.driver_snapshot?.nationality || '—'}</strong></p>
            <p>بموجب جواز سفر صادر من <strong>${s.driver_snapshot?.passport_country || s.driver_snapshot?.nationality || '—'}</strong></p>
            <p>وبموجب بيان رقم : <strong>${s.declaration_no || '—'}</strong> بتاريخ <strong>${s.date || '—'}</strong></p>
            <p>والارساليه باسم المصدر : <strong>${s.exporter || '—'}</strong> .</p>
          </div>

          <!-- Signatures -->
          <div class="sign-grid">
            <div class="sign-cell">
              <div class="sign-title">اسم السائق / ${s.driver_snapshot?.name || '—'}</div>
              <div class="sign-line"></div>
            </div>
            <div class="sign-cell" style="text-align:center;">
              <div class="sign-title">الختم</div>
              <div class="stamp-circle">شركة عبدالرحمن عبدالعزيز السديس للخدمات اللوجستية</div>
            </div>
            <div class="sign-cell" style="text-align:left;">
              <div class="sign-title">مندوب صاحب الشأن</div>
              <div class="sign-line"></div>
            </div>
          </div>
          <div class="sign-grid" style="margin-top:16px;">
            <div class="sign-cell"><div class="sign-title">المعاين المختص</div></div>
            <div class="sign-cell" style="text-align:center;"><div class="sign-title">موظف التفتيش المعاكس</div></div>
            <div class="sign-cell" style="text-align:left;"><div class="sign-title">موظف الدعم والتشغيل</div></div>
          </div>

          <div class="form-footer-bar">
            www.sudais.com.sa &nbsp;|&nbsp; info@sudais.com.sa &nbsp;|&nbsp; 9200 08305 &nbsp;|&nbsp;
            Jeddah – Al Jawhara District – Building 3508 – Unit 14 – Postal 22416
          </div>
        </div>

      </div>
    </div>`;
}
