export const DECLARATION_TYPES = [
  { value: 'saudi_origin', ar: 'أخصائي منشأ سعودي',  en: 'Saudi Origin Specialist' },
  { value: 're_export',    ar: 'إعادة تصدير',         en: 'Re-Export' },
  { value: 'temp_export',  ar: 'تصدير مؤقت',          en: 'Temporary Export' },
  { value: 'transit',      ar: 'ترانزيت',              en: 'Transit' }
];

export const PORTS = {
  uae:     { ar: 'جمرك البطحاء',       en: 'Al Batha Customs' },
  bahrain: { ar: 'جمرك جسر الملك فهد', en: 'King Fahd Causeway Customs' }
};

// ترتيب المرفقات في الملف الموحد
export const ATTACHMENTS_ORDER = [
  { key: 'invoice',        ar: 'الفاتورة التجارية',          required: true  },
  { key: 'packing_list',   ar: 'قائمة التعبئة (Packing List)', required: true  },
  { key: 'coo',            ar: 'شهادة المنشأ',                required: true  },
  { key: 'analysis_cert',  ar: 'شهادة تحليل العينة',          required: false },
  { key: 'saudi_clearance',ar: 'بيان فسح سعودي',              required: true  },
  { key: 'driver_docs',    ar: 'بيانات السائق',                required: true  },
  { key: 'broker_reply',   ar: 'رد المخلص 1',                  required: false },
  { key: 'broker_reply_2', ar: 'رد المخلص 2',                  required: false },
  { key: 'appointment',    ar: 'وثيقة الموعد',                 required: false },
];
