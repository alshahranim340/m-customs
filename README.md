# M-Customs — نظام التخليص الجمركي

نظام PWA لإدارة ملفات التخليص الجمركي لشركة عبدالرحمن عبدالعزيز السديس للخدمات اللوجستية.

## الميزات
- إنشاء ملف شحنة كامل (بيانات السائق + البيان الجمركي)
- توليد فورم البيان الجمركي PDF تلقائياً
- توليد محضر استقطاع العينة PDF تلقائياً
- حفظ بيانات السائق تلقائياً عند أول شحنة
- تاريخ كامل لمركبات كل سائق
- تتبع حالة الشحنة (مسودة → مخلص → سائق)
- يدعم: الإمارات (جمرك البطحاء) والبحرين (جسر الملك فهد)

## الإعداد

### 1. تثبيت المتطلبات
\`\`\`bash
npm install
npm install -g firebase-tools
\`\`\`

### 2. تسجيل الدخول لـ Firebase
\`\`\`bash
firebase login
firebase use m-customs
\`\`\`

### 3. تفعيل Firestore
- اذهب لـ Firebase Console
- Firestore Database → Create database → Start in test mode

### 4. تشغيل محلياً
\`\`\`bash
npm run dev
\`\`\`

### 5. النشر
\`\`\`bash
firebase deploy --only firestore:rules
npm run deploy
\`\`\`

## هيكل المشروع
\`\`\`
m-customs/
├── public/
│   ├── index.html          # الصفحة الرئيسية
│   ├── css/main.css        # التصميم
│   └── js/
│       ├── app.js          # الراوتر الرئيسي
│       └── pages/
│           ├── dashboard.js
│           ├── newShipment.js
│           ├── shipments.js
│           └── drivers.js
├── src/
│   ├── firebase/
│   │   ├── config.js       # إعدادات Firebase
│   │   └── db.js           # قاعدة البيانات
│   └── utils/
│       └── pdfGenerator.js # توليد PDF
├── firebase.json
├── firestore.rules
└── package.json
\`\`\`

## قاعدة البيانات (Firestore)

### مجموعة: drivers
\`\`\`json
{
  "name": "أيوب تشوتي",
  "nationality": "هندي",
  "passport_country": "الهند",
  "vehicles": [
    {
      "plate": "ا د ق 9761",
      "vehicle_type": "فولفو",
      "carrier_type": "نقل عام",
      "plate_nationality": "سعودية",
      "added_at": "2024-01-23"
    }
  ]
}
\`\`\`

### مجموعة: shipments
\`\`\`json
{
  "destination": "uae",
  "port": "uae",
  "declaration_no": "117826",
  "unified_no": "203294400312",
  "date": "1448-01-23",
  "exporter": "شركة إدارة خدمات البيئة العالمية",
  "goods_description": "كلور هيدروجين",
  "driver_id": "driver_xxx",
  "driver_snapshot": { ... },
  "status": "draft"
}
\`\`\`
