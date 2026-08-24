// ══════════════════════════════════════════════════════════════
// AVATAR PICKER — 12 preset SVG avatars (customs/transport themed)
// + upload from computer (stored as base64 in user profile)
// ══════════════════════════════════════════════════════════════

import { getCurrentUser } from '../../src/firebase/auth.js';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../src/firebase/config.js';

// Palette — matches the app's design system
const P = {
  navy:   '#0E1A2E',
  gold:   '#D4B266',
  green:  '#2E8B57',
  blue:   '#1C4B8E',
  red:    '#CC2229',
  purple: '#8B5CF6',
  amber:  '#D97706',
  teal:   '#0D9488',
  slate:  '#475569',
  ivory:  '#F5F0E4',
};

// 12 preset avatars — each is { id, bg, name, svg (icon body only, will be centered in circle) }
// Icons use ivory/white color for contrast against colored backgrounds.
export const PRESET_AVATARS = [
  {
    id: 'truck', name: 'شاحنة',
    bg: P.navy,
    svg: `<g fill="${P.ivory}" stroke="${P.ivory}"><path d="M4 40 L4 22 L28 22 L28 32 L36 32 L44 24 L52 24 L52 40 Z" fill="${P.ivory}" stroke-width="2" stroke-linejoin="round"/><rect x="30" y="26" width="10" height="6" fill="${P.gold}" stroke="none"/><circle cx="14" cy="42" r="4" fill="${P.navy}" stroke="${P.ivory}" stroke-width="2"/><circle cx="44" cy="42" r="4" fill="${P.navy}" stroke="${P.ivory}" stroke-width="2"/></g>`,
  },
  {
    id: 'ship', name: 'سفينة',
    bg: P.blue,
    svg: `<g fill="${P.ivory}"><path d="M8 32 L10 20 L46 20 L48 32 Z" stroke="${P.ivory}" stroke-width="1.5"/><rect x="22" y="10" width="12" height="12" fill="${P.gold}"/><path d="M6 34 Q10 42 28 42 Q46 42 50 34 Z" stroke="${P.ivory}" stroke-width="2"/><line x1="4" y1="45" x2="52" y2="45" stroke="${P.ivory}" stroke-width="2" stroke-dasharray="2,3" opacity="0.6"/></g>`,
  },
  {
    id: 'plane', name: 'طائرة',
    bg: P.gold,
    svg: `<g fill="${P.navy}"><path d="M28 6 L32 22 L52 30 L52 34 L32 30 L30 44 L36 46 L36 50 L28 48 L20 50 L20 46 L26 44 L24 30 L4 34 L4 30 L24 22 Z" stroke="${P.navy}" stroke-width="1" stroke-linejoin="round"/></g>`,
  },
  {
    id: 'container', name: 'حاوية',
    bg: P.red,
    svg: `<g><rect x="6" y="14" width="44" height="30" fill="${P.ivory}" stroke="${P.ivory}" stroke-width="2"/><line x1="14" y1="14" x2="14" y2="44" stroke="${P.red}" stroke-width="1.5"/><line x1="22" y1="14" x2="22" y2="44" stroke="${P.red}" stroke-width="1.5"/><line x1="30" y1="14" x2="30" y2="44" stroke="${P.red}" stroke-width="1.5"/><line x1="38" y1="14" x2="38" y2="44" stroke="${P.red}" stroke-width="1.5"/><line x1="46" y1="14" x2="46" y2="44" stroke="${P.red}" stroke-width="1.5"/><rect x="10" y="20" width="36" height="6" fill="${P.red}" opacity="0.15"/></g>`,
  },
  {
    id: 'warehouse', name: 'مستودع',
    bg: P.green,
    svg: `<g fill="${P.ivory}"><path d="M4 22 L28 8 L52 22 L52 46 L4 46 Z" stroke="${P.ivory}" stroke-width="2" stroke-linejoin="round"/><rect x="20" y="30" width="16" height="16" fill="${P.green}" stroke="${P.ivory}" stroke-width="1.5"/><rect x="10" y="26" width="8" height="8" fill="${P.green}" opacity="0.6"/><rect x="38" y="26" width="8" height="8" fill="${P.green}" opacity="0.6"/></g>`,
  },
  {
    id: 'scale', name: 'ميزان الجمارك',
    bg: P.purple,
    svg: `<g fill="${P.ivory}" stroke="${P.ivory}"><rect x="26" y="10" width="4" height="34" fill="${P.ivory}"/><path d="M16 42 L40 42 L38 46 L18 46 Z" stroke-width="1.5"/><line x1="10" y1="16" x2="46" y2="16" stroke-width="2"/><path d="M6 16 L14 30 L2 30 Z" fill="${P.ivory}" stroke-width="1.5"/><path d="M50 16 L58 30 L42 30 Z" fill="${P.ivory}" stroke-width="1.5" transform="translate(-8,0)"/><circle cx="28" cy="10" r="3" fill="${P.gold}" stroke="${P.ivory}" stroke-width="1"/></g>`,
  },
  {
    id: 'globe', name: 'كرة أرضية',
    bg: P.teal,
    svg: `<g fill="none" stroke="${P.ivory}" stroke-width="2"><circle cx="28" cy="28" r="22" fill="${P.ivory}" stroke="${P.ivory}"/><ellipse cx="28" cy="28" rx="22" ry="9" fill="none" stroke="${P.teal}"/><ellipse cx="28" cy="28" rx="9" ry="22" fill="none" stroke="${P.teal}"/><line x1="6" y1="28" x2="50" y2="28" stroke="${P.teal}"/><line x1="28" y1="6" x2="28" y2="50" stroke="${P.teal}"/></g>`,
  },
  {
    id: 'clipboard', name: 'بيان جمركي',
    bg: P.amber,
    svg: `<g><rect x="12" y="10" width="32" height="40" rx="3" fill="${P.ivory}" stroke="${P.ivory}" stroke-width="2"/><rect x="20" y="6" width="16" height="8" rx="2" fill="${P.gold}" stroke="${P.amber}" stroke-width="1"/><line x1="18" y1="22" x2="38" y2="22" stroke="${P.amber}" stroke-width="1.5"/><line x1="18" y1="28" x2="38" y2="28" stroke="${P.amber}" stroke-width="1.5"/><line x1="18" y1="34" x2="30" y2="34" stroke="${P.amber}" stroke-width="1.5"/><circle cx="34" cy="40" r="4" fill="${P.green}"/><path d="M32 40 L34 42 L37 39" stroke="${P.ivory}" stroke-width="1.5" fill="none"/></g>`,
  },
  {
    id: 'anchor', name: 'مرساة',
    bg: P.slate,
    svg: `<g fill="none" stroke="${P.ivory}" stroke-width="2.5" stroke-linecap="round"><circle cx="28" cy="10" r="4" fill="${P.ivory}"/><line x1="28" y1="14" x2="28" y2="46"/><line x1="20" y1="20" x2="36" y2="20"/><path d="M10 34 Q10 46 28 46 Q46 46 46 34" fill="none"/><line x1="10" y1="34" x2="6" y2="30"/><line x1="46" y1="34" x2="50" y2="30"/></g>`,
  },
  {
    id: 'map', name: 'خريطة',
    bg: P.navy,
    svg: `<g><path d="M6 12 L20 8 L36 14 L50 10 L50 44 L36 48 L20 44 L6 48 Z" fill="${P.ivory}" stroke="${P.ivory}" stroke-width="1.5" stroke-linejoin="round"/><line x1="20" y1="8" x2="20" y2="44" stroke="${P.navy}" stroke-width="1.5" stroke-dasharray="2,2"/><line x1="36" y1="14" x2="36" y2="48" stroke="${P.navy}" stroke-width="1.5" stroke-dasharray="2,2"/><circle cx="28" cy="26" r="3" fill="${P.red}"/><path d="M28 22 Q31 24 31 27 Q31 30 28 32 Q25 30 25 27 Q25 24 28 22" fill="${P.red}"/></g>`,
  },
  {
    id: 'chart', name: 'تقارير',
    bg: P.green,
    svg: `<g><rect x="8" y="8" width="40" height="40" rx="3" fill="${P.ivory}" stroke="${P.ivory}" stroke-width="1.5"/><rect x="14" y="30" width="6" height="14" fill="${P.green}"/><rect x="24" y="22" width="6" height="22" fill="${P.gold}"/><rect x="34" y="16" width="6" height="28" fill="${P.blue}"/><polyline points="14,26 24,20 34,14 44,10" fill="none" stroke="${P.red}" stroke-width="2" stroke-linecap="round"/><circle cx="44" cy="10" r="2.5" fill="${P.red}"/></g>`,
  },
  {
    id: 'stamp', name: 'ختم',
    bg: P.red,
    svg: `<g><circle cx="28" cy="26" r="16" fill="none" stroke="${P.ivory}" stroke-width="2.5"/><circle cx="28" cy="26" r="10" fill="none" stroke="${P.ivory}" stroke-width="1.5" stroke-dasharray="2,2"/><text x="28" y="30" text-anchor="middle" fill="${P.ivory}" font-family="Arial" font-size="10" font-weight="900">✓</text><rect x="10" y="44" width="36" height="4" rx="2" fill="${P.ivory}"/></g>`,
  },
];

// ══════════════════════════════════════════════════════════════
// Render an avatar (for use in sidebar, users list, etc.)
// Accepts: avatarData (either preset id like "truck" or base64 data URL),
//          fallbackName (for initials if no avatar),
//          size (px)
// Returns: HTML string
// ══════════════════════════════════════════════════════════════
export function renderUserAvatar(avatarData, fallbackName, size = 40) {
  const s = size;
  const initials = (fallbackName || 'م').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  // No avatar → initials chip with random gradient
  if (!avatarData) {
    return `
      <div class="user-avatar-chip" style="width:${s}px;height:${s}px;border-radius:50%;background:linear-gradient(135deg,#8B5CF6 0%,#EC4899 100%);color:white;display:flex;align-items:center;justify-content:center;font-size:${Math.floor(s*0.38)}px;font-weight:800;flex-shrink:0;font-family:Tajawal,sans-serif;">
        ${initials}
      </div>`;
  }

  // Base64 uploaded image
  if (typeof avatarData === 'string' && avatarData.startsWith('data:')) {
    return `
      <div class="user-avatar-chip" style="width:${s}px;height:${s}px;border-radius:50%;overflow:hidden;flex-shrink:0;background:#333;">
        <img src="${avatarData}" alt="avatar" style="width:100%;height:100%;object-fit:cover;display:block;">
      </div>`;
  }

  // Preset avatar (svg id)
  const preset = PRESET_AVATARS.find(p => p.id === avatarData);
  if (preset) {
    return `
      <div class="user-avatar-chip" style="width:${s}px;height:${s}px;border-radius:50%;background:${preset.bg};display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">
        <svg viewBox="0 0 56 56" style="width:${Math.floor(s*0.72)}px;height:${Math.floor(s*0.72)}px;">${preset.svg}</svg>
      </div>`;
  }

  // Fallback: initials
  return renderUserAvatar(null, fallbackName, size);
}

// ══════════════════════════════════════════════════════════════
// Open the picker modal
// After save, calls onSaved(newAvatarValue) for the UI to refresh.
// ══════════════════════════════════════════════════════════════
export function openAvatarPicker(currentAvatar, onSaved) {
  const existing = document.getElementById('avatar-picker-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'avatar-picker-modal';
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(14,26,46,0.7);z-index:100000;
    display:flex;align-items:center;justify-content:center;padding:20px;
    font-family:Tajawal,sans-serif;
  `;

  let selected = currentAvatar || null;
  let uploaded = null; // base64 string if user just uploaded

  modal.innerHTML = `
    <div style="background:#F5F3EC;border-radius:12px;width:100%;max-width:640px;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(14,26,46,0.5);">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#0E1A2E 0%,#1C2B48 100%);color:white;padding:18px 22px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;color:#D4B266;font-weight:700;">SDS · PROFILE · AVATAR</div>
          <div style="font-size:18px;font-weight:900;margin-top:3px;">🎨 اختر صورتك الشخصية</div>
        </div>
        <button onclick="document.getElementById('avatar-picker-modal').remove()" style="background:transparent;border:none;color:white;font-size:26px;cursor:pointer;padding:4px 10px;">×</button>
      </div>

      <!-- Body -->
      <div style="flex:1;overflow-y:auto;padding:22px;">

        <!-- Preview -->
        <div style="display:flex;align-items:center;gap:16px;background:white;border:1px solid #E8E5DC;border-radius:10px;padding:14px 18px;margin-bottom:18px;">
          <div id="avatar-preview" style="width:64px;height:64px;flex-shrink:0;">
            ${renderUserAvatar(selected, 'م', 64)}
          </div>
          <div style="flex:1;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.5px;color:#8A8578;font-weight:700;">PREVIEW</div>
            <div style="font-size:14px;font-weight:800;color:#0E1A2E;margin-top:2px;" id="preview-label">${selected ? 'صورة مُختارة' : 'بدون صورة'}</div>
          </div>
        </div>

        <!-- Preset gallery -->
        <div style="margin-bottom:20px;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.5px;color:#0E1A2E;font-weight:800;margin-bottom:12px;">
            🎨 GALLERY · ${PRESET_AVATARS.length} صورة إبداعية
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:10px;">
            ${PRESET_AVATARS.map(p => `
              <div class="avatar-choice" data-avatar-id="${p.id}" title="${p.name}" style="cursor:pointer;padding:6px;border-radius:10px;border:2px solid transparent;transition:all 0.15s;text-align:center;background:white;">
                <div style="width:100%;aspect-ratio:1;border-radius:50%;background:${p.bg};display:flex;align-items:center;justify-content:center;overflow:hidden;">
                  <svg viewBox="0 0 56 56" style="width:70%;height:70%;">${p.svg}</svg>
                </div>
                <div style="font-size:9px;color:#6B6659;margin-top:4px;font-weight:700;">${p.name}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Upload -->
        <div style="background:white;border:1px dashed #D4B266;border-radius:10px;padding:18px;text-align:center;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.5px;color:#8B6914;font-weight:800;margin-bottom:8px;">📁 UPLOAD FROM DEVICE</div>
          <div style="font-size:12px;color:#6B6659;margin-bottom:12px;">اختر صورة من جهازك (JPG / PNG · بحد أقصى 700 KB)</div>
          <input type="file" id="avatar-upload" accept="image/*" style="display:none;">
          <button id="avatar-upload-btn" style="background:#D4B266;color:#0E1A2E;border:none;border-radius:6px;padding:9px 20px;font-family:Tajawal,sans-serif;font-size:13px;font-weight:800;cursor:pointer;">
            <i class="ti ti-upload"></i> اختر صورة
          </button>
          <div id="upload-msg" style="font-size:11px;color:#8A8578;margin-top:8px;"></div>
        </div>

      </div>

      <!-- Footer -->
      <div style="background:white;border-top:1px solid #E8E5DC;padding:14px 22px;display:flex;justify-content:space-between;gap:10px;">
        <button id="avatar-remove-btn" style="background:transparent;color:#CC2229;border:none;padding:9px 14px;font-family:Tajawal,sans-serif;font-size:12px;font-weight:700;cursor:pointer;">
          <i class="ti ti-trash"></i> إزالة الصورة
        </button>
        <div style="display:flex;gap:10px;">
          <button onclick="document.getElementById('avatar-picker-modal').remove()" style="background:#F5F3EC;color:#6B6659;border:1px solid #E8E5DC;border-radius:5px;padding:9px 18px;font-family:Tajawal,sans-serif;font-size:13px;font-weight:700;cursor:pointer;">
            إلغاء
          </button>
          <button id="avatar-save-btn" style="background:#2E8B57;color:white;border:none;border-radius:5px;padding:9px 24px;font-family:Tajawal,sans-serif;font-size:13px;font-weight:800;cursor:pointer;">
            <i class="ti ti-check"></i> حفظ
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const updatePreview = () => {
    const val = uploaded || selected;
    document.getElementById('avatar-preview').innerHTML = renderUserAvatar(val, 'م', 64);
    document.getElementById('preview-label').textContent = val ? 'صورة مُختارة' : 'بدون صورة';
    // Highlight selection
    modal.querySelectorAll('.avatar-choice').forEach(el => {
      el.style.borderColor = (!uploaded && el.dataset.avatarId === selected) ? '#2E8B57' : 'transparent';
      el.style.background = (!uploaded && el.dataset.avatarId === selected) ? '#E7F5EE' : 'white';
    });
  };
  updatePreview();

  // Preset selection
  modal.querySelectorAll('.avatar-choice').forEach(el => {
    el.onclick = () => {
      selected = el.dataset.avatarId;
      uploaded = null;
      document.getElementById('upload-msg').textContent = '';
      updatePreview();
    };
    el.onmouseenter = () => { if (el.dataset.avatarId !== selected) el.style.background = '#F5F3EC'; };
    el.onmouseleave = () => { if (el.dataset.avatarId !== selected) el.style.background = 'white'; };
  });

  // Upload button
  document.getElementById('avatar-upload-btn').onclick = () => {
    document.getElementById('avatar-upload').click();
  };
  document.getElementById('avatar-upload').onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const msgEl = document.getElementById('upload-msg');
    // Validate size (700 KB before we resize/compress)
    if (file.size > 5 * 1024 * 1024) {
      msgEl.style.color = '#CC2229';
      msgEl.textContent = '❌ الصورة كبيرة جداً (الحد الأقصى 5 ميجا قبل الضغط)';
      return;
    }
    msgEl.style.color = '#6B6659';
    msgEl.textContent = '⏳ جاري ضغط الصورة...';
    try {
      const compressed = await compressImage(file, 400, 0.8);
      const sizeKB = Math.round(compressed.length / 1024);
      if (sizeKB > 700) {
        msgEl.style.color = '#CC2229';
        msgEl.textContent = `❌ الصورة بعد الضغط ${sizeKB} KB — جرّب صورة أصغر`;
        return;
      }
      uploaded = compressed;
      selected = null;
      updatePreview();
      msgEl.style.color = '#2E8B57';
      msgEl.textContent = `✓ الصورة جاهزة (${sizeKB} KB)`;
    } catch (err) {
      msgEl.style.color = '#CC2229';
      msgEl.textContent = '❌ فشل تحميل الصورة';
      console.error(err);
    }
  };

  // Remove
  document.getElementById('avatar-remove-btn').onclick = () => {
    selected = null;
    uploaded = null;
    updatePreview();
  };

  // Save
  document.getElementById('avatar-save-btn').onclick = async () => {
    const btn = document.getElementById('avatar-save-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="ti ti-loader"></i> جاري الحفظ...';
    try {
      const user = getCurrentUser();
      if (!user) throw new Error('غير مسجّل دخول');
      const finalValue = uploaded || selected || null;
      await updateDoc(doc(db, 'users', user.uid), {
        avatar: finalValue,
        updated_at: serverTimestamp(),
      });
      modal.remove();
      if (onSaved) onSaved(finalValue);
    } catch (err) {
      console.error('avatar save failed:', err);
      btn.disabled = false;
      btn.innerHTML = '<i class="ti ti-check"></i> حفظ';
      alert('فشل حفظ الصورة: ' + err.message);
    }
  };
}

// Compress image: max dimension `maxDim`, JPEG quality `quality`
// Returns base64 data URL string
function compressImage(file, maxDim = 400, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.onerror = reject;
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxDim) {
        height = Math.round(height * (maxDim / width));
        width = maxDim;
      } else if (height > maxDim) {
        width = Math.round(width * (maxDim / height));
        height = maxDim;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}
