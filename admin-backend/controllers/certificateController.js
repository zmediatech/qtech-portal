// controllers/certificateController.js
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const DEFAULT_CUSTOM_FONT = path.join(__dirname, '..', 'fonts', 'GreatVibes-Regular.ttf');
const CUSTOM_FONT_PATH = process.env.CERT_FONT_PATH || DEFAULT_CUSTOM_FONT;

// A4 in points
const A4_PORTRAIT  = [595.28, 841.89];
const A4_LANDSCAPE = [841.89, 595.28];

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function hexToRgb01(hex) {
  if (!hex) return null;
  const m = hex.replace('#', '').trim();
  if (![3, 6].includes(m.length)) return null;
  const v = m.length === 3 ? m.split('').map(ch => ch + ch).join('') : m;
  const r = parseInt(v.slice(0, 2), 16) / 255;
  const g = parseInt(v.slice(2, 4), 16) / 255;
  const b = parseInt(v.slice(4, 6), 16) / 255;
  if ([r, g, b].some(n => Number.isNaN(n))) return null;
  return { r, g, b };
}

async function loadFont(pdf, family, style) {
  // family: 'Times'|'Helvetica'|'Courier'|'GreatVibes'|'Custom'
  // style : 'normal'|'bold'|'italic'|'boldItalic'
  const fam = (family || 'Times').toString();
  const sty = (style  || 'bold').toString();

  const pickStd = async (obj) => {
    const key = obj[sty] || obj.normal;
    return await pdf.embedFont(key);
  };

  try {
    switch (fam) {
      case 'Helvetica':
        return pickStd({
          normal: StandardFonts.Helvetica,
          bold: StandardFonts.HelveticaBold,
          italic: StandardFonts.HelveticaOblique,
          boldItalic: StandardFonts.HelveticaBoldOblique,
        });
      case 'Courier':
        return pickStd({
          normal: StandardFonts.Courier,
          bold: StandardFonts.CourierBold,
          italic: StandardFonts.CourierOblique,
          boldItalic: StandardFonts.CourierBoldOblique,
        });
      case 'Times':
      default:
        return pickStd({
          normal: StandardFonts.TimesRoman,
          bold: StandardFonts.TimesRomanBold,
          italic: StandardFonts.TimesRomanItalic,
          boldItalic: StandardFonts.TimesRomanBoldItalic,
        });
      case 'GreatVibes':
      case 'Custom': {
        if (fs.existsSync(CUSTOM_FONT_PATH)) {
          const bytes = fs.readFileSync(CUSTOM_FONT_PATH);
          return await pdf.embedFont(bytes);
        }
        // fallback
        return await pdf.embedFont(StandardFonts.TimesRomanBold);
      }
    }
  } catch {
    return await pdf.embedFont(StandardFonts.TimesRomanBold);
  }
}

exports.makeCertificate = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: 'No image uploaded (field "image")' });

    const name = (req.body.name || '').toString().trim();
    if (!name) return res.status(400).json({ success: false, message: 'Student name is required' });

    // ---- Positioning modes -------------------------------------------------
    // Mode A (simple): xPercent/yPercent anchor (0..100 of drawn image area)
    const xPercent = clamp(Number(req.body.xPercent ?? 50), 0, 100);
    const yPercent = clamp(Number(req.body.yPercent ?? 58), 0, 100);

    // Mode B (recommended): center within a rect (left/top/width/height in % of drawn image area)
    // If rectWidthPercent > 0, we'll use the box-centering mode.
    const rectLeftPercent   = clamp(Number(req.body.rectLeftPercent   ?? 25), 0, 100);
    const rectTopPercent    = clamp(Number(req.body.rectTopPercent    ?? 50), 0, 100); // distance from bottom? we'll compute both
    const rectWidthPercent  = clamp(Number(req.body.rectWidthPercent  ?? 50), 0, 100);
    const rectHeightPercent = clamp(Number(req.body.rectHeightPercent ?? 10), 0, 100);

    const fontFamily = (req.body.fontFamily || 'Times').toString();         // 'Times'|'Helvetica'|'Courier'|'GreatVibes'|'Custom'
    const fontStyle  = (req.body.fontStyle  || 'bold').toString();          // 'normal'|'bold'|'italic'|'boldItalic'
    const fontSize   = clamp(Number(req.body.fontSize ?? 64), 8, 200);
    const marginPt   = clamp(Number(req.body.marginPt ?? 18), 0, 72);

    const charSpacing = Number.isFinite(Number(req.body.charSpacing)) ? Number(req.body.charSpacing) : 0; // points
    const vOffset     = Number.isFinite(Number(req.body.vOffset)) ? Number(req.body.vOffset) : 0;         // fine vertical nudge (points)

    // Color: prefer hex (e.g. #0f172a), fallback to r/g/b floats
    const hex = (req.body.colorHex || '').toString();
    const hexRGB = hexToRgb01(hex);
    const color = hexRGB || {
      r: clamp(Number(req.body.r ?? 0), 0, 1),
      g: clamp(Number(req.body.g ?? 0), 0, 1),
      b: clamp(Number(req.body.b ?? 0), 0, 1),
    };

    const pdf = await PDFDocument.create();

    // Embed image (PNG first, then JPG)
    let img;
    try { img = await pdf.embedPng(file.buffer); }
    catch { img = await pdf.embedJpg(file.buffer); }

    const imgW = img.width, imgH = img.height;

    // Choose page orientation to match aspect
    const pageSize = imgW >= imgH ? A4_LANDSCAPE : A4_PORTRAIT;
    const page = pdf.addPage(pageSize);
    const { width: pageW, height: pageH } = page.getSize();

    // Fit image inside margins
    const availW = Math.max(0, pageW - marginPt * 2);
    const availH = Math.max(0, pageH - marginPt * 2);
    const scale = Math.min(availW / imgW, availH / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const imgX = (pageW - drawW) / 2;
    const imgY = (pageH - drawH) / 2;

    page.drawImage(img, { x: imgX, y: imgY, width: drawW, height: drawH });

    // Font & metrics
    const font = await loadFont(pdf, fontFamily, fontStyle);
    const textWidth  = font.widthOfTextAtSize(name, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    // Decide mode: use rect if a sensible width is provided
    const useRectMode = rectWidthPercent > 0 && rectHeightPercent > 0;

    let drawX, drawY;

    if (useRectMode) {
      // rect is defined with left & top in percentages (top from image top, more intuitive)
      const rectW = (rectWidthPercent / 100) * drawW;
      const rectH = (rectHeightPercent / 100) * drawH;

      const rectLeft = imgX + (rectLeftPercent / 100) * drawW;
      const rectTopGlobal = imgY + drawH - (rectTopPercent / 100) * drawH; // convert "top %" to global Y
      const rectBottom = rectTopGlobal - rectH;

      // center text inside this rectangle
      drawX = rectLeft + (rectW - textWidth) / 2;
      drawY = rectBottom + (rectH - textHeight) / 2 + vOffset;
    } else {
      // legacy anchor mode (center around (xPercent,yPercent))
      const tx = imgX + (xPercent / 100) * drawW;
      const ty = imgY + (yPercent / 100) * drawH;
      drawX = tx - textWidth / 2;
      drawY = ty - textHeight / 2 + vOffset;
    }

    page.drawText(name, {
      x: drawX,
      y: drawY,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
      characterSpacing: charSpacing || undefined,
    });

    const bytes = await pdf.save();
    const safe = name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="certificate-${safe}.pdf"`);
    res.send(Buffer.from(bytes));
  } catch (err) {
    console.error('makeCertificate error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
