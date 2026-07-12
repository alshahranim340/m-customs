import { searchDrivers, createShipment } from '../../../src/firebase/db.js';
import { generateDeclarationPDF, generateSamplePDF, DECLARATION_TYPES } from '../../../src/utils/pdfGenerator.js';
import { toast, navigate } from '../app.js';

const ATTACHMENTS = [
  { key: 'invoice',       ar: 'الفاتورة التجارية',         required: true },
  { key: 'packing_list',  ar: 'قائمة التعبئة (Packing List)', required: true },
  { key: 'coo',           ar: 'شهادة المنشأ',               required: true },
  { key: 'analysis_cert', ar: 'شهادة تحليل العينة',         required: false },
  { key: 'saudi_clearance',ar: 'بيان فسح سعودي',            required: true },
  { key: 'driver_docs',   ar: 'بيانات السائق',               required: true },
];

// State
let _selectedDriver = null;
let _uploadedFiles  = {};
let _destination    = 'uae';

export async function renderNewShipment(container) {
  _selectedDriver = null;
  _uploadedFiles  = {};
  _destination    = 'uae';

  const declOptions = DECLARATION_TYPES.map(d =>
    `<option value="${d.value}" ${d.value === 'saudi_origin' ? 'selected' : ''}>${d.ar}</option>`
  ).join('');

  container.innerHTML = `
    <div class="topbar">
      <div>
        <div class="topbar-title">➕ شحنة جديدة</div>
        <div class="topbar-sub">أدخل البيانات — الفورمات تتولد تلقائياً</div>
      </div>
      <div class="topbar-actions">
        <button class="btn btn-ghost" onclick="navigate('dashboard')">← رجوع</button>
      </div>
    </div>

    <div class="page-body">
      <div style="max-width:720px;">

        <!-- DESTINATION -->
        <div class="card" style="margin-bottom:16px;">
          <div class="card-body">
            <div class="form-section-title">وجهة التصدير والمنفذ</div>
            <div class="dest-row" id="dest-row">
              <button class="dest-opt selected" data-dest="uae"     onclick="setDest('uae')">🇦🇪 الإمارات</button>
              <button class="dest-opt"          data-dest="bahrain" onclick="setDest('bahrain')">🇧🇭 البحرين</button>
              <button class="dest-opt"          data-dest="oman"    onclick="setDest('oman')">🇴🇲 سلطنة عُمان</button>
            </div>
            <div class="field form-full">
              <label>المنفذ الجمركي</label>
              <input type="text" id="port-display" value="جمرك البطحاء" readonly
                style="background:var(--surface);color:var(--muted);">
              <div class="hint">يتحدد تلقائياً حسب الوجهة — يمكن التعديل</div>
            </div>
          </div>
        </div>

        <!-- DRIVER -->
        <div class="card" style="margin-bottom:16px;">
          <div class="card-body">
            <div class="form-section-title">بيانات السائق والشاحنة</div>

            <div class="field">
              <label>اسم السائق <span style="color:var(--red)">*</span></label>
              <div class="driver-search-wrap">
                <input type="text" id="driver-name" placeholder="ابحث عن سائق أو أدخل اسم جديد"
                  oninput="searchDriver(this.value)" autocomplete="off">
                <div id="driver-suggestions" class="driver-suggestions" style="display:none;"></div>
              </div>
              <div class="hint" id="driver-status"></div>
            </div>

            <div class="form-grid-2">
              <div class="field"><label>الجنسية <span style="color:var(--red)">*</span></label>
                <input type="text" id="driver-nationality" placeholder="مثال: هندي"></div>
              <div class="field"><label>بلد الجواز <span style="color:var(--red)">*</span></label>
                <input type="text" id="driver-passport-country" placeholder="مثال: الهند"></div>
            </div>
            <div class="form-grid-3">
              <div class="field"><label>نوع الناقل</label>
                <input type="text" id="driver-carrier-type" placeholder="نقل عام"></div>
              <div class="field"><label>نوع السيارة</label>
                <input type="text" id="driver-vehicle-type" placeholder="فولفو"></div>
              <div class="field"><label>جنسية اللوحة</label>
                <input type="text" id="driver-plate-nationality" placeholder="سعودية"></div>
            </div>
            <div class="form-grid-2">
              <div class="field"><label>رقم اللوحة <span style="color:var(--red)">*</span></label>
                <input type="text" id="driver-plate" placeholder="ا د ق 9761"></div>
              <div class="field"><label>قيد حركة الشاحنة</label>
                <input type="text" id="driver-movement-ref" placeholder="اختياري"></div>
            </div>
          </div>
        </div>

        <!-- DECLARATION -->
        <div class="card" style="margin-bottom:16px;">
          <div class="card-body">
            <div class="form-section-title">بيانات البيان الجمركي</div>
            <div class="form-grid-2">
              <div class="field"><label>رقم البيان <span style="color:var(--red)">*</span></label>
                <input type="text" id="decl-no" placeholder="117826"></div>
              <div class="field"><label>الرقم الموحد (المبدئي) <span style="color:var(--red)">*</span></label>
                <input type="text" id="unified-no" placeholder="203294400312"></div>
            </div>
            <div class="form-grid-2">
              <div class="field"><label>التاريخ (هجري) <span style="color:var(--red)">*</span></label>
                <input type="text" id="decl-date" placeholder="1448-01-23"></div>
              <div class="field"><label>نوع البيان</label>
                <select id="decl-type">${declOptions}</select></div>
            </div>
            <div class="form-grid-2">
              <div class="field"><label>اسم المصدر <span style="color:var(--red)">*</span></label>
                <input type="text" id="exporter" placeholder="شركة إدارة خدمات البيئة العالمية المحدودة"></div>
              <div class="field"><label>وصف البضاعة <span style="color:var(--red)">*</span></label>
                <input type="text" id="goods-desc" placeholder="كلور هيدروجين"></div>
            </div>
          </div>
        </div>

        <!-- ATTACHMENTS -->
        <div class="card" style="margin-bottom:16px;">
          <div class="card-body">
            <div class="form-section-title">المرفقات — ${ATTACHMENTS.length} ملفات</div>
            <div class="upload-grid" id="upload-grid">
              ${ATTACHMENTS.map(a => `
                <div class="upload-item ${a.required ? 'required' : ''}" id="upload-${a.key}">
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                    onchange="fileSelected('${a.key}', this)">
                  <span class="u-icon">📎</span>
                  <div>
                    <div class="u-name">${a.ar}${a.required ? ' *' : ''}</div>
                    <div class="u-state" id="state-${a.key}">اضغط للرفع</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- ACTIONS -->
        <div class="card">
          <div class="form-actions">
            <button class="btn btn-gold btn-lg" onclick="submitShipment()" id="btn-submit" style="flex:1;">
              🖨️ حفظ وتوليد الفورمات
            </button>
            <button class="btn btn-ghost btn-lg" onclick="saveDraft()">
              💾 حفظ مسودة
            </button>
          </div>
        </div>

      </div>
    </div>`;

  // Expose functions to global scope
  window.setDest       = setDest;
  window.searchDriver  = searchDriverDriver;
  window.selectDriver  = selectDriver;
  window.fileSelected  = fileSelected;
  window.submitShipment= submitShipment;
  window.saveDraft     = saveDraft;
}

// ─────────────────────────────────────────────
// DESTINATION
// ─────────────────────────────────────────────
const PORTS_MAP = {
  uae:     'جمرك البطحاء',
  bahrain: 'جمرك جسر الملك فهد',
  oman:    'جمرك البطحاء'
};

function setDest(dest) {
  _destination = dest;
  document.querySelectorAll('.dest-opt').forEach(el =>
    el.classList.toggle('selected', el.dataset.dest === dest)
  );
  document.getElementById('port-display').value = PORTS_MAP[dest];
}

// ─────────────────────────────────────────────
// DRIVER SEARCH
// ─────────────────────────────────────────────
let _searchTimeout;

async function searchDriverDriver(val) {
  clearTimeout(_searchTimeout);
  const sugg = document.getElementById('driver-suggestions');

  if (val.length < 2) { sugg.style.display = 'none'; return; }

  _searchTimeout = setTimeout(async () => {
    const results = await searchDrivers(val);
    if (results.length === 0) { sugg.style.display = 'none'; return; }

    sugg.innerHTML = results.map(d => {
      const lastVehicle = d.vehicles?.[d.vehicles.length - 1];
      return `
        <div class="driver-suggestion-item" onclick="selectDriver('${d.id}')">
          <div class="driver-avatar-sm">${d.name?.charAt(0) || '؟'}</div>
          <div>
            <div class="ds-name">${d.name}</div>
            <div class="ds-detail">${d.nationality || ''} · ${lastVehicle?.plate || ''} · ${lastVehicle?.vehicle_type || ''}</div>
          </div>
        </div>`;
    }).join('');
    sugg.style.display = 'block';
  }, 300);
}

async function selectDriver(driverId) {
  const { getDriver } = await import('../../../src/firebase/db.js');
  const driver = await getDriver(driverId);
  if (!driver) return;

  _selectedDriver = driver;
  const lastVehicle = driver.vehicles?.[driver.vehicles.length - 1] || {};

  document.getElementById('driver-name').value             = driver.name || '';
  document.getElementById('driver-nationality').value      = driver.nationality || '';
  document.getElementById('driver-passport-country').value = driver.passport_country || '';
  document.getElementById('driver-carrier-type').value     = lastVehicle.carrier_type || '';
  document.getElementById('driver-vehicle-type').value     = lastVehicle.vehicle_type || '';
  document.getElementById('driver-plate-nationality').value= lastVehicle.plate_nationality || '';
  document.getElementById('driver-plate').value            = lastVehicle.plate || '';

  document.getElementById('driver-suggestions').style.display = 'none';
  document.getElementById('driver-status').innerHTML =
    `<span style="color:var(--green);">✓ سائق موجود — سيتم تحديث بياناته تلقائياً عند الحفظ</span>`;
}

// ─────────────────────────────────────────────
// FILE UPLOAD
// ─────────────────────────────────────────────
function fileSelected(key, input) {
  const file = input.files[0];
  if (!file) return;
  _uploadedFiles[key] = file;

  const item  = document.getElementById(`upload-${key}`);
  const state = document.getElementById(`state-${key}`);
  item.classList.add('uploaded');
  item.querySelector('.u-icon').textContent = '✅';
  state.textContent = file.name.length > 20 ? file.name.substring(0, 20) + '…' : file.name;
}

// ─────────────────────────────────────────────
// COLLECT FORM DATA
// ─────────────────────────────────────────────
function collectFormData() {
  const portKey = _destination === 'bahrain' ? 'bahrain' : 'uae';
  return {
    shipment: {
      destination:      _destination,
      port:             portKey,
      declaration_no:   document.getElementById('decl-no').value.trim(),
      unified_no:       document.getElementById('unified-no').value.trim(),
      date:             document.getElementById('decl-date').value.trim(),
      declaration_type: document.getElementById('decl-type').value,
      exporter:         document.getElementById('exporter').value.trim(),
      goods_description:document.getElementById('goods-desc').value.trim(),
    },
    driver: {
      name:              document.getElementById('driver-name').value.trim(),
      nationality:       document.getElementById('driver-nationality').value.trim(),
      passport_country:  document.getElementById('driver-passport-country').value.trim(),
      carrier_type:      document.getElementById('driver-carrier-type').value.trim(),
      vehicle_type:      document.getElementById('driver-vehicle-type').value.trim(),
      plate_nationality: document.getElementById('driver-plate-nationality').value.trim(),
      plate:             document.getElementById('driver-plate').value.trim(),
      movement_ref:      document.getElementById('driver-movement-ref').value.trim(),
    }
  };
}

function validateForm(data) {
  const required = [
    [data.driver.name,              'اسم السائق'],
    [data.driver.nationality,       'جنسية السائق'],
    [data.driver.plate,             'رقم اللوحة'],
    [data.shipment.declaration_no,  'رقم البيان'],
    [data.shipment.unified_no,      'الرقم الموحد'],
    [data.shipment.date,            'التاريخ'],
    [data.shipment.exporter,        'اسم المصدر'],
    [data.shipment.goods_description,'وصف البضاعة'],
  ];
  for (const [val, label] of required) {
    if (!val) return `حقل مطلوب: ${label}`;
  }
  return null;
}

// ─────────────────────────────────────────────
// SUBMIT
// ─────────────────────────────────────────────
async function submitShipment() {
  const { shipment, driver } = collectFormData();
  const err = validateForm({ shipment, driver });
  if (err) { toast(err, 'error'); return; }

  const btn = document.getElementById('btn-submit');
  btn.disabled = true;
  btn.textContent = '⏳ جاري الحفظ...';

  try {
    // Merge driver snapshot into shipment
    const fullShipment = { ...shipment, driver_snapshot: driver };

    // Save to Firestore (auto-saves driver)
    const shipmentId = await createShipment(fullShipment, driver, _selectedDriver?.id || null);

    toast('✅ تم حفظ الشحنة وتوليد الفورمات', 'success');

    // Generate PDFs
    setTimeout(() => {
      generatePDFs(fullShipment, shipmentId);
    }, 500);

  } catch(e) {
    console.error(e);
    toast('حدث خطأ أثناء الحفظ', 'error');
    btn.disabled = false;
    btn.textContent = '🖨️ حفظ وتوليد الفورمات';
  }
}

async function saveDraft() {
  const { shipment, driver } = collectFormData();
  if (!driver.name && !shipment.declaration_no) {
    toast('أدخل بيانات أولاً', 'error'); return;
  }
  try {
    const fullShipment = { ...shipment, driver_snapshot: driver, status: 'draft' };
    await createShipment(fullShipment, driver, _selectedDriver?.id || null);
    toast('✅ تم حفظ المسودة', 'success');
  } catch(e) {
    toast('خطأ في الحفظ', 'error');
  }
}

// ─────────────────────────────────────────────
// PDF GENERATION
// ─────────────────────────────────────────────
function generatePDFs(data, shipmentId) {
  try {
    const doc1 = generateDeclarationPDF(data);
    const doc2 = generateSamplePDF(data);

    const driverName = data.driver_snapshot?.name?.replace(/\s+/g, '_') || 'driver';

    doc1.save(`بيان_${driverName}_${data.declaration_no}.pdf`);
    setTimeout(() => {
      doc2.save(`محضر_عينة_${driverName}_${data.declaration_no}.pdf`);
      toast('📄 تم تنزيل الفورمات — ارفع المرفقات ودمجها', 'info');
      navigate('shipments');
    }, 800);
  } catch(e) {
    console.error('PDF error:', e);
    toast('تم الحفظ — تعذّر توليد PDF', 'error');
  }
}
