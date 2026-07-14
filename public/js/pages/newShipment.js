import { searchDrivers, createShipment } from '../../../src/firebase/db.js';
import { saveAttachments } from '../../../src/firebase/attachments.js';
import { getExporters, saveExporter } from '../../../src/firebase/exporters.js';
import { fileToBase64 } from '../../../src/utils/fileUtils.js';
import { DECLARATION_TYPES, ATTACHMENTS_ORDER } from '../../../src/utils/constants.js';
import { buildHijriPicker, todayHijri } from '../../../src/utils/hijriDate.js';
import { toast, navigate, getCurrentProfile } from '../app.js';

const PORTS_MAP = {
  uae:     'جمرك البطحاء',
  bahrain: 'جمرك جسر الملك فهد',
  oman:    'جمرك البطحاء'
};

let _selectedDriver = null;
let _uploadedFiles  = {};
let _destination    = 'uae';
let _exporters      = [];

export async function renderNewShipment(container) {
  _selectedDriver = null;
  _uploadedFiles  = {};
  _destination    = 'uae';

  // Load exporters in background
  getExporters().then(list => {
    _exporters = list;
    renderExporterOptions();
  });

  const declOptions = DECLARATION_TYPES.map(d =>
    `<option value="${d.value}" ${d.value==='saudi_origin'?'selected':''}>${d.ar}</option>`
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
            <div class="dest-row">
              <button class="dest-opt selected" data-dest="uae"     onclick="setDest('uae')">🇦🇪 الإمارات</button>
              <button class="dest-opt"          data-dest="bahrain" onclick="setDest('bahrain')">🇧🇭 البحرين</button>
              <button class="dest-opt"          data-dest="oman"    onclick="setDest('oman')">🇴🇲 عُمان</button>
            </div>
            <div class="field">
              <label>المنفذ الجمركي</label>
              <input type="text" id="port-display" value="جمرك البطحاء" readonly
                style="background:var(--surface);color:var(--muted);">
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
                <input type="text" id="driver-name"
                  placeholder="ابحث عن سائق أو أدخل اسم جديد"
                  oninput="searchDriverFn(this.value)" autocomplete="off">
                <div id="driver-suggestions" class="driver-suggestions" style="display:none;"></div>
              </div>
              <div class="hint" id="driver-status"></div>
            </div>
            <div class="form-grid-2">
              <div class="field"><label>الجنسية *</label>
                <input type="text" id="driver-nationality" placeholder="هندي"></div>
              <div class="field"><label>بلد الجواز *</label>
                <input type="text" id="driver-passport-country" placeholder="الهند"></div>
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
              <div class="field"><label>رقم اللوحة *</label>
                <input type="text" id="driver-plate" placeholder="ا د ق 9761"></div>
              <div class="field"><label>قيد حركة الشاحنة</label>
                <input type="text" id="driver-movement-ref" placeholder="اختياري"></div>
            </div>
          </div>
        </div>

        <!-- EXPORTER & GOODS -->
        <div class="card" style="margin-bottom:16px;">
          <div class="card-body">
            <div class="form-section-title">المصدر والبضاعة</div>

            <!-- Exporter -->
            <div class="field">
              <label>اسم المصدر <span style="color:var(--red)">*</span></label>
              <div style="position:relative;">
                <input type="text" id="exporter" placeholder="اكتب أو اختر من القائمة"
                  oninput="filterExporters(this.value)" autocomplete="off">
                <div id="exporter-suggestions" style="
                  display:none;position:absolute;top:calc(100% + 4px);right:0;left:0;
                  background:white;border:1.5px solid var(--blue);border-radius:8px;
                  z-index:200;box-shadow:0 4px 16px rgba(0,0,0,0.12);overflow:hidden;max-height:200px;overflow-y:auto;">
                </div>
              </div>
            </div>

            <!-- Goods -->
            <div class="field">
              <label>وصف البضاعة <span style="color:var(--red)">*</span></label>
              <div style="position:relative;">
                <input type="text" id="goods-desc" placeholder="اكتب أو اختر بضاعة المصدر"
                  oninput="filterGoods(this.value)" autocomplete="off">
                <div id="goods-suggestions" style="
                  display:none;position:absolute;top:calc(100% + 4px);right:0;left:0;
                  background:white;border:1.5px solid var(--blue);border-radius:8px;
                  z-index:200;box-shadow:0 4px 16px rgba(0,0,0,0.12);overflow:hidden;max-height:160px;overflow-y:auto;">
                </div>
              </div>
              <div class="hint" id="goods-hint"></div>
            </div>
          </div>
        </div>

        <!-- DECLARATION -->
        <div class="card" style="margin-bottom:16px;">
          <div class="card-body">
            <div class="form-section-title">بيانات البيان الجمركي</div>
            <div class="form-grid-2">
              <div class="field"><label>رقم البيان *</label>
                <input type="text" id="decl-no" placeholder="117826"></div>
              <div class="field"><label>الرقم الموحد *</label>
                <input type="text" id="unified-no" placeholder="203294400312"></div>
            </div>
            <div class="form-grid-2">
              <div id="hijri-picker-wrap"></div>
              <div class="field"><label>نوع البيان</label>
                <select id="decl-type">${declOptions}</select></div>
            </div>
          </div>
        </div>

        <!-- ATTACHMENTS -->
        <div class="card" style="margin-bottom:16px;">
          <div class="card-body">
            <div class="form-section-title">المرفقات (يمكن رفعها لاحقاً)</div>
            <div class="upload-grid">
              ${ATTACHMENTS_ORDER.map(a => `
                <label class="upload-item" id="upload-${a.key}">
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" style="display:none"
                    onchange="fileSelectedFn('${a.key}',this)">
                  <span class="u-icon">📎</span>
                  <div>
                    <div class="u-name">${a.ar}${a.required?' *':''}</div>
                    <div class="u-state" id="state-${a.key}">اضغط للرفع</div>
                  </div>
                </label>`).join('')}
            </div>
          </div>
        </div>

        <!-- ACTIONS -->
        <div class="card">
          <div class="form-actions">
            <button class="btn btn-gold btn-lg" onclick="submitShipmentFn()" id="btn-submit" style="flex:1;">
              💾 حفظ الشحنة
            </button>
            <button class="btn btn-ghost btn-lg" onclick="saveDraftFn()">📋 مسودة</button>
          </div>
        </div>

      </div>
    </div>`;

  // Expose globals
  // Init hijri date picker
  const hijriWrap = document.getElementById('hijri-picker-wrap');
  if (hijriWrap) hijriWrap.innerHTML = buildHijriPicker('decl-date', todayHijri(), 'التاريخ (هجري) *');

  window.updateHijriValue = window.updateHijriValue;
  window.rebuildHijriDays = window.rebuildHijriDays;
  window.setDest          = setDest;
  window.searchDriverFn   = searchDriverFn;
  window.selectDriver     = selectDriver;
  window.fileSelectedFn   = fileSelectedFn;
  window.submitShipmentFn = submitShipmentFn;
  window.saveDraftFn      = saveDraftFn;
  window.filterExporters  = filterExporters;
  window.selectExporter   = selectExporter;
  window.filterGoods      = filterGoods;
  window.selectGoods      = selectGoods;
}

// ── EXPORTER AUTOCOMPLETE ──
function renderExporterOptions() {
  // called after exporters load
}

function filterExporters(val) {
  const sugg = document.getElementById('exporter-suggestions');
  if (!val || val.length < 1) { sugg.style.display = 'none'; return; }

  const matches = _exporters.filter(e =>
    e.name.toLowerCase().includes(val.toLowerCase())
  );

  if (!matches.length) { sugg.style.display = 'none'; return; }

  sugg.innerHTML = matches.map(e => `
    <div onclick="selectExporter('${e.name.replace(/'/g,"\\'")}','${e.id}')"
      style="padding:10px 14px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border);"
      onmouseover="this.style.background='var(--surface)'"
      onmouseout="this.style.background='white'">
      <div style="font-weight:600;">${e.name}</div>
      <div style="font-size:11px;color:var(--muted);">${(e.goods||[]).join(' · ')}</div>
    </div>`).join('');
  sugg.style.display = 'block';
}

function selectExporter(name, id) {
  document.getElementById('exporter').value = name;
  document.getElementById('exporter-suggestions').style.display = 'none';
  // Show goods for this exporter
  const exp = _exporters.find(e => e.id === id);
  if (exp?.goods?.length) {
    document.getElementById('goods-hint').textContent =
      `بضائع ${name}: ${exp.goods.join(' | ')}`;
  }
}

function filterGoods(val) {
  const exporterName = document.getElementById('exporter').value.trim();
  const exp = _exporters.find(e => e.name === exporterName);
  const sugg = document.getElementById('goods-suggestions');

  if (!exp?.goods?.length) { sugg.style.display = 'none'; return; }

  const matches = val
    ? exp.goods.filter(g => g.toLowerCase().includes(val.toLowerCase()))
    : exp.goods;

  if (!matches.length) { sugg.style.display = 'none'; return; }

  sugg.innerHTML = matches.map(g => `
    <div onclick="selectGoods('${g.replace(/'/g,"\\'")}') "
      style="padding:10px 14px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border);"
      onmouseover="this.style.background='var(--surface)'"
      onmouseout="this.style.background='white'">
      ${g}
    </div>`).join('');
  sugg.style.display = 'block';
}

function selectGoods(goods) {
  document.getElementById('goods-desc').value = goods;
  document.getElementById('goods-suggestions').style.display = 'none';
}

// ── DESTINATION ──
function setDest(dest) {
  _destination = dest;
  document.querySelectorAll('.dest-opt').forEach(el =>
    el.classList.toggle('selected', el.dataset.dest === dest)
  );
  document.getElementById('port-display').value = PORTS_MAP[dest];
}

// ── DRIVER SEARCH ──
let _searchTimeout;
async function searchDriverFn(val) {
  clearTimeout(_searchTimeout);
  const sugg = document.getElementById('driver-suggestions');
  if (val.length < 2) { sugg.style.display = 'none'; return; }
  _searchTimeout = setTimeout(async () => {
    const results = await searchDrivers(val);
    if (!results.length) { sugg.style.display = 'none'; return; }
    sugg.innerHTML = results.map(d => {
      const v = d.vehicles?.[d.vehicles.length-1] || {};
      return `<div class="driver-suggestion-item" onclick="selectDriver('${d.id}')">
        <div class="driver-avatar-sm">${d.name?.charAt(0)||'؟'}</div>
        <div>
          <div class="ds-name">${d.name}</div>
          <div class="ds-detail">${d.nationality||''} · ${v.plate||''} · ${v.vehicle_type||''}</div>
        </div>
        <span class="ds-new">✓ موجود</span>
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
  const v = driver.vehicles?.[driver.vehicles.length-1] || {};
  document.getElementById('driver-name').value              = driver.name || '';
  document.getElementById('driver-nationality').value       = driver.nationality || '';
  document.getElementById('driver-passport-country').value  = driver.passport_country || '';
  document.getElementById('driver-carrier-type').value      = v.carrier_type || '';
  document.getElementById('driver-vehicle-type').value      = v.vehicle_type || '';
  document.getElementById('driver-plate-nationality').value = v.plate_nationality || '';
  document.getElementById('driver-plate').value             = v.plate || '';
  document.getElementById('driver-suggestions').style.display = 'none';
  document.getElementById('driver-status').innerHTML =
    `<span style="color:var(--green);">✓ سائق موجود</span>`;
}

// ── FILE UPLOAD ──
async function fileSelectedFn(key, input) {
  const file = input.files[0];
  if (!file) return;
  const state = document.getElementById(`state-${key}`);
  const item  = document.getElementById(`upload-${key}`);
  state.textContent = '⏳ جاري التحميل...';
  try {
    const b64 = await fileToBase64(file);
    _uploadedFiles[key] = { name: file.name, base64: b64, type: file.type };
    item.classList.add('uploaded');
    item.querySelector('.u-icon').textContent = '✅';
    state.textContent = file.name.length > 22 ? file.name.substring(0,22)+'…' : file.name;
  } catch(e) { state.textContent = 'خطأ في الرفع'; }
}

// ── COLLECT & VALIDATE ──
function collectData() {
  return {
    shipment: {
      destination:       _destination,
      port:              _destination === 'bahrain' ? 'bahrain' : 'uae',
      declaration_no:    document.getElementById('decl-no').value.trim(),
      unified_no:        document.getElementById('unified-no').value.trim(),
      date:              document.getElementById('decl-date').value.trim(),
      declaration_type:  document.getElementById('decl-type').value,
      exporter:          document.getElementById('exporter').value.trim(),
      goods_description: document.getElementById('goods-desc').value.trim(),
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

function validate({ shipment, driver }) {
  const req = [
    [driver.name,              'اسم السائق'],
    [driver.plate,             'رقم اللوحة'],
    [shipment.declaration_no,  'رقم البيان'],
    [shipment.unified_no,      'الرقم الموحد'],
    [shipment.date,            'التاريخ'],
    [shipment.exporter,        'اسم المصدر'],
    [shipment.goods_description,'وصف البضاعة'],
  ];
  for (const [v, label] of req) {
    if (!v) return `حقل مطلوب: ${label}`;
  }
  return null;
}

// ── SUBMIT ──
async function submitShipmentFn() {
  const { shipment, driver } = collectData();
  const err = validate({ shipment, driver });
  if (err) { toast(err, 'error'); return; }

  const btn = document.getElementById('btn-submit');
  btn.disabled = true;
  btn.textContent = '⏳ جاري الحفظ...';

  try {
    const profile = getCurrentProfile();
    const fullShipment = {
      ...shipment,
      driver_snapshot: driver,
      status: 'draft',
      created_by: { uid: profile?.id||'', name: profile?.name||'—' }
    };
    const shipmentId = await createShipment(fullShipment, driver, _selectedDriver?.id || null);

    // Save attachments separately
    if (Object.keys(_uploadedFiles).length > 0) {
      await saveAttachments(shipmentId, _uploadedFiles);
    }

    // Save exporter & goods for future use
    await saveExporter(shipment.exporter, shipment.goods_description);

    toast('✅ تم حفظ الشحنة', 'success');
    window.updateBadges?.();
    navigate('shipments');
  } catch(e) {
    console.error(e);
    toast('حدث خطأ أثناء الحفظ', 'error');
    btn.disabled = false;
    btn.textContent = '💾 حفظ الشحنة';
  }
}

async function saveDraftFn() {
  const { shipment, driver } = collectData();
  if (!driver.name && !shipment.declaration_no) {
    toast('أدخل بيانات أولاً', 'error'); return;
  }
  try {
    const profile = getCurrentProfile();
    const fullShipment = {
      ...shipment,
      driver_snapshot: driver,
      status: 'draft',
      created_by: { uid: profile?.id||'', name: profile?.name||'—' }
    };
    const shipmentId = await createShipment(fullShipment, driver, _selectedDriver?.id || null);
    if (Object.keys(_uploadedFiles).length > 0) {
      await saveAttachments(shipmentId, _uploadedFiles);
    }
    if (shipment.exporter) await saveExporter(shipment.exporter, shipment.goods_description);
    toast('✅ تم حفظ المسودة', 'success');
    window.updateBadges?.();
    navigate('shipments');
  } catch(e) { toast('خطأ في الحفظ', 'error'); }
}
