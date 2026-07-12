// ─────────────────────────────────────────────
// FILE UTILITIES
// Convert files to Base64 and merge PDFs
// ─────────────────────────────────────────────

/**
 * Convert a File object to Base64 string
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert Base64 string back to Uint8Array for pdf-lib
 */
export function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert HTML element to PDF bytes using html2canvas + jsPDF
 */
export async function htmlToPdfBytes(htmlContent) {
  const { jsPDF } = window.jspdf;

  // Create hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:900px;height:auto;border:none;';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Tajawal',sans-serif; direction:rtl; background:white; padding:20px; }
      </style>
    </head>
    <body>${htmlContent}</body>
    </html>
  `);
  iframeDoc.close();

  // Wait for fonts to load
  await new Promise(r => setTimeout(r, 1500));

  const canvas = await window.html2canvas(iframe.contentDocument.body, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    windowWidth: 900,
  });

  document.body.removeChild(iframe);

  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = (canvas.height * pdfW) / canvas.width;

  let posY = 0;
  const pageH = pdf.internal.pageSize.getHeight();

  while (posY < pdfH) {
    if (posY > 0) pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, -posY, pdfW, pdfH);
    posY += pageH;
  }

  return pdf.output('arraybuffer');
}

/**
 * Merge multiple PDFs into one using pdf-lib
 * @param {Array} pdfSources - Array of {type:'base64'|'arraybuffer', data}
 * @returns {Uint8Array} merged PDF bytes
 */
export async function mergePDFs(pdfSources) {
  const { PDFDocument } = window.PDFLib;
  const merged = await PDFDocument.create();

  for (const source of pdfSources) {
    if (!source?.data) continue;
    try {
      let bytes;
      if (source.type === 'base64') {
        bytes = base64ToUint8Array(source.data);
      } else {
        bytes = new Uint8Array(source.data);
      }
      const pdf  = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = await merged.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(p => merged.addPage(p));
    } catch(e) {
      console.warn('Skipped a PDF due to error:', e.message);
    }
  }

  return await merged.save();
}

/**
 * Download bytes as a file
 */
export function downloadBytes(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
