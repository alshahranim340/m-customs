// PDF Generator — uses jsPDF + jsPDF-AutoTable
// Generates: 1) Customs Export Declaration, 2) Sample Extraction Report

import { STAMP_B64, LOGO_B64 } from "./assets.js";

// ─────────────────────────────────────────────
// PORTS CONFIG (auto-selected by destination)
// ─────────────────────────────────────────────
export const PORTS = {
  uae:     { ar: "جمرك البطحاء",       en: "Al Batha Customs" },
  bahrain: { ar: "جمرك جسر الملك فهد", en: "King Fahd Causeway Customs" }
};

export const DESTINATIONS = {
  uae:     { ar: "الإمارات", en: "UAE",     port: "uae" },
  bahrain: { ar: "البحرين",  en: "Bahrain", port: "bahrain" },
  oman:    { ar: "سلطنة عُمان", en: "Oman", port: "uae" }
};

export const DECLARATION_TYPES = [
  { value: "saudi_origin", ar: "أخصائي منشأ سعودي",  en: "Saudi Origin Specialist" },
  { value: "re_export",    ar: "إعادة تصدير",         en: "Re-Export" },
  { value: "temp_export",  ar: "تصدير مؤقت",          en: "Temporary Export" },
  { value: "transit",      ar: "ترانزيت",              en: "Transit" }
];

// ─────────────────────────────────────────────
// FORM 1: CUSTOMS EXPORT DECLARATION
// ─────────────────────────────────────────────
export function generateDeclarationPDF(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const port = PORTS[data.port] || PORTS.uae;

  // ── Header bar ──
  doc.setFillColor(28, 45, 78);
  doc.rect(0, 0, 210, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Customs Export Declaration", 10, 9);
  doc.text("البيان الجمركي للصادر", 200, 9, { align: "right" });

  // ── Logo + company info ──
  doc.addImage(LOGO_B64, "JPEG", 10, 17, 60, 22);
  doc.setTextColor(28, 45, 78);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("شركة عبدالرحمن عبدالعزيز السديس للخدمات اللوجستية", 200, 21, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("ABDULRAHMAN ABDULAZIZ AL-SUDAIS LOGISTICS SERVICES COMPANY", 200, 26, { align: "right" });
  doc.setTextColor(90, 112, 144);
  doc.text("C.R 4030126911 | جدة – حي الجوهرة – المملكة العربية السعودية", 200, 31, { align: "right" });

  // ── Divider ──
  doc.setDrawColor(28, 45, 78);
  doc.setLineWidth(0.5);
  doc.line(10, 42, 200, 42);

  // ── Section: Customs info ──
  doc.setFillColor(28, 45, 78);
  doc.rect(10, 44, 190, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`${port.en} / ${port.ar}`, 105, 49, { align: "center" });

  doc.autoTable({
    startY: 51,
    margin: { left: 10, right: 10 },
    styles: { font: "helvetica", fontSize: 9, cellPadding: 3, halign: "right" },
    columnStyles: {
      0: { cellWidth: 45, fillColor: [232, 237, 244], fontStyle: "bold", halign: "right" },
      1: { cellWidth: 50, halign: "right" },
      2: { cellWidth: 45, fillColor: [232, 237, 244], fontStyle: "bold", halign: "right" },
      3: { cellWidth: 50, halign: "right" }
    },
    body: [
      ["نظام التصدير الآلي", port.ar, "أسم المخلص الجمركي", "شركة عبدالرحمن عبدالعزيز السديس"],
      [data.exporter, "المصدر", _getDeclType(data.declaration_type), "نوع البيان"]
    ]
  });

  // ── Section: Declaration numbers ──
  const y1 = doc.lastAutoTable.finalY;
  doc.setFillColor(28, 45, 78);
  doc.rect(10, y1 + 2, 190, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text("أرقام البيان — Declaration Numbers", 105, y1 + 7, { align: "center" });

  doc.autoTable({
    startY: y1 + 9,
    margin: { left: 10, right: 10 },
    styles: { font: "helvetica", fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 32, fillColor: [232, 237, 244], fontStyle: "bold", halign: "right" },
      1: { cellWidth: 30, halign: "center", fontStyle: "bold", fontSize: 11 },
      2: { cellWidth: 32, fillColor: [232, 237, 244], fontStyle: "bold", halign: "right" },
      3: { cellWidth: 58, halign: "center", fontStyle: "bold", fontSize: 11 },
      4: { cellWidth: 20, fillColor: [232, 237, 244], fontStyle: "bold", halign: "right" },
      5: { cellWidth: 18, halign: "center" }
    },
    body: [[
      "رقم البيان", data.declaration_no,
      "الرقم الموحد", data.unified_no,
      "التاريخ", data.date
    ]]
  });

  // ── Section: Goods ──
  const y2 = doc.lastAutoTable.finalY;
  doc.setFillColor(28, 45, 78);
  doc.rect(10, y2 + 2, 190, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.text("وصف البضاعة — Cargo Description", 105, y2 + 7, { align: "center" });

  doc.autoTable({
    startY: y2 + 9,
    margin: { left: 10, right: 10 },
    styles: { font: "helvetica", fontSize: 9, cellPadding: 3, halign: "right" },
    columnStyles: {
      0: { cellWidth: 50, fillColor: [232, 237, 244], fontStyle: "bold" },
      1: { fontStyle: "bold", fontSize: 11 }
    },
    body: [["وصف البضاعة / Goods Description", data.goods_description]]
  });

  // ── Section: Vehicle & Driver ──
  const y3 = doc.lastAutoTable.finalY;
  doc.setFillColor(28, 45, 78);
  doc.rect(10, y3 + 2, 190, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.text("بيانات الشاحنة والسائق — Vehicle & Driver Information", 105, y3 + 7, { align: "center" });

  doc.autoTable({
    startY: y3 + 9,
    margin: { left: 10, right: 10 },
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 3, halign: "center" },
    headStyles: { fillColor: [232, 237, 244], textColor: [28, 45, 78], fontStyle: "bold" },
    head: [[
      "عدد", "قيد حركة الشاحنة", "أرقام اللوحات",
      "جنسيتها", "أسم السائق", "جنسيته", "نوع السيارة", "نوع الناقل"
    ]],
    body: [
      [
        "1",
        data.driver_snapshot?.movement_ref || "",
        data.driver_snapshot?.plate || "",
        data.driver_snapshot?.plate_nationality || "",
        data.driver_snapshot?.name || "",
        data.driver_snapshot?.nationality || "",
        data.driver_snapshot?.vehicle_type || "",
        data.driver_snapshot?.carrier_type || ""
      ],
      ["", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", ""]
    ]
  });

  // ── Footer ──
  const pageH = doc.internal.pageSize.height;
  doc.setFillColor(28, 45, 78);
  doc.rect(0, pageH - 12, 210, 12, "F");
  doc.setTextColor(180, 200, 220);
  doc.setFontSize(8);
  doc.text("www.sudais.com.sa  |  info@sudais.com.sa  |  9200 08305", 10, pageH - 5);
  doc.text("Jeddah – Al Jawhara District – Building 3508 – Unit 14 – Postal 22416", 200, pageH - 5, { align: "right" });

  return doc;
}

// ─────────────────────────────────────────────
// FORM 2: SAMPLE EXTRACTION REPORT
// ─────────────────────────────────────────────
export function generateSamplePDF(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const port = PORTS[data.port] || PORTS.uae;

  // ── Letterhead ──
  doc.addImage(LOGO_B64, "JPEG", 10, 10, 55, 20);
  doc.setTextColor(28, 45, 78);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("شركة عبدالرحمن عبدالعزيز السديس", 200, 14, { align: "right" });
  doc.text("للخـدمـات اللـوجستيـة", 200, 20, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("ABDULRAHMAN ABDULAZIZ AL-SUDAIS", 200, 25, { align: "right" });
  doc.text("LOGISTICS SERVICES COMPANY", 200, 29, { align: "right" });
  doc.setTextColor(90, 112, 144);
  doc.setFontSize(7.5);
  doc.text("سجل تجاري 4030126911 – جدة – حي الجوهرة – المملكة العربية السعودية", 200, 33, { align: "right" });
  doc.text("Jeddah – Al Jawhara District – Kingdom of Saudi Arabia – C.R 4030126911", 200, 37, { align: "right" });

  doc.setDrawColor(28, 45, 78);
  doc.setLineWidth(0.6);
  doc.line(10, 40, 200, 40);

  // ── Titles ──
  doc.setTextColor(28, 45, 78);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`${port.ar} / الصادرات`, 200, 50, { align: "right" });
  doc.setFontSize(12);
  doc.text("( محضر استقطاع عينه ) مشتقات بتروليه (", 200, 58, { align: "right" });

  // ── Reference paragraph ──
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  const refText = "اشاره الى تعميم معالي مدير عام الجمارك رقم 1004 س/43م هـ بشأن الاشراف على استخراج عينات المواد بتاريخ 1428-10-08 هـ البترولية تمهيدا لارسالها الى مختبرات تحليل المنتجات البتروليه";
  const refLines = doc.splitTextToSize(refText, 180);
  doc.text(refLines, 200, 68, { align: "right" });

  // ── Main content lines ──
  const dayName = _getHijriDay(data.date);
  let cy = 68 + (refLines.length * 5) + 8;
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);

  const lines = [
    `انه في ${dayName} الموافق ${data.date} هـ تم استقطاع عينه من الشاحنه`,
    `رقم اللوحه ${data.driver_snapshot?.plate} بقياده السائق ${data.driver_snapshot?.name} لجنسيه ${data.driver_snapshot?.nationality}`,
    `بموجب جواز سفر صادر من ${data.driver_snapshot?.passport_country}`,
    `وبموجب بيان رقم : ${data.declaration_no} بتاريخ ${data.date}`,
    `والارساليه باسم المصدر : ${data.exporter} .`
  ];

  lines.forEach(line => {
    doc.text(line, 200, cy, { align: "right" });
    cy += 9;
  });

  // ── Signatures ──
  cy += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(28, 45, 78);

  // Row 1 titles
  doc.text("اسم السائق / " + data.driver_snapshot?.name, 195, cy, { align: "right" });
  doc.text("الختم", 120, cy, { align: "center" });
  doc.text("مندوب صاحب الشأن", 50, cy, { align: "center" });

  cy += 30;

  // Row 2 titles
  doc.text("المعاين المختص", 195, cy, { align: "right" });
  doc.text("موظف التفتيش المعاكس", 120, cy, { align: "center" });
  doc.text("موظف الدعم والتشغيل", 50, cy, { align: "center" });

  // ── Stamp ──
  doc.addImage(STAMP_B64, "PNG", 15, cy - 5, 35, 35);

  // ── Footer ──
  const pageH = doc.internal.pageSize.height;
  doc.setFillColor(28, 45, 78);
  doc.rect(0, pageH - 12, 210, 12, "F");
  doc.setTextColor(180, 200, 220);
  doc.setFontSize(8);
  doc.text("www.sudais.com.sa  |  info@sudais.com.sa  |  9200 08305", 10, pageH - 5);
  doc.text("Jeddah – Al Jawhara District – Building 3508 – Unit 14 – Postal 22416", 200, pageH - 5, { align: "right" });

  return doc;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function _getDeclType(val) {
  return DECLARATION_TYPES.find(d => d.value === val)?.ar || val;
}

function _getHijriDay(dateStr) {
  // Returns approximate Arabic day name based on date
  const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  try {
    const d = new Date(dateStr.replace(/-/g, "/"));
    return days[d.getDay()] || "الأربعاء";
  } catch { return "الأربعاء"; }
}
