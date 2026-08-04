// controllers/certificateController.js
const { PDFDocument, StandardFonts, rgb, degrees } = require('pdf-lib');
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

function drawCenteredText(page, text, y, font, size, color, pageW) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (pageW - width) / 2,
    y,
    size,
    font,
    color,
  });
}

function wrapLines(text, maxChars) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function drawWrappedCentered(page, text, centerX, topY, font, size, color, maxWidth, lineGap = 6) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  const totalHeight = lines.length * size + Math.max(0, lines.length - 1) * lineGap;
  let y = topY;
  for (const line of lines) {
    const width = font.widthOfTextAtSize(line, size);
    page.drawText(line, {
      x: centerX - width / 2,
      y,
      size,
      font,
      color,
    });
    y -= size + lineGap;
  }

  return totalHeight;
}

async function renderPresetCertificate(pdf, payload) {
  const {
    recipientName,
    title = 'Certificate',
    subtitle = 'OF APPRECIATION',
    bodyLine = 'THIS CERTIFICATE IS PROUDLY PRESENTED TO',
    description = 'In recognition of dedication, effort, and achievement.',
    academyName = 'Academy Name',
    companyName = 'Company Name',
    leftSignerName = 'Principal Name',
    leftSignerRole = 'Principal',
    rightSignerName = 'Director Name',
    rightSignerRole = 'Director',
    sealText = 'AWARD',
    issueDate = '',
  } = payload;

  const page = pdf.addPage(A4_LANDSCAPE);
  const { width: pageW, height: pageH } = page.getSize();

  const cream = rgb(0.98, 0.93, 0.84);
  const deepMaroon = rgb(0.55, 0.02, 0.06);
  const accentGold = rgb(0.82, 0.67, 0.34);
  const softGold = rgb(0.95, 0.86, 0.64);
  const paper = rgb(1, 1, 1);
  const softGray = rgb(0.43, 0.43, 0.43);
  const mutedGray = rgb(0.28, 0.28, 0.28);

  const serif = await loadFont(pdf, 'Times', 'bold');
  const serifItalic = await loadFont(pdf, 'Times', 'italic');
  const script = await loadFont(pdf, 'GreatVibes', 'normal');
  const bodyFont = await loadFont(pdf, 'Helvetica', 'normal');
  const bodyBold = await loadFont(pdf, 'Helvetica', 'bold');

  // Background
  const inner = 48;
  const left = inner;
  const right = pageW - inner;
  const top = pageH - inner;
  const bottom = inner;
  page.drawRectangle({ x: 0, y: 0, width: pageW, height: pageH, color: cream });

  // Decorative maroon bands
  page.drawRectangle({ x: left, y: top - 28, width: right - left, height: 28, color: deepMaroon });
  page.drawRectangle({ x: left, y: bottom, width: right - left, height: 18, color: deepMaroon });

  // Gold accents
  page.drawRectangle({ x: left - 2, y: top - 115, width: 14, height: 95, color: accentGold });
  page.drawRectangle({ x: left + 12, y: top - 115, width: 4, height: 95, color: softGold });
  page.drawRectangle({ x: right - 14, y: bottom + 30, width: 4, height: 100, color: softGold });
  page.drawRectangle({ x: right - 18, y: bottom + 30, width: 14, height: 100, color: accentGold });
  page.drawRectangle({ x: left + 38, y: top - 18, width: 10, height: 108, color: softGold, rotate: degrees(-32) });
  page.drawRectangle({ x: left + 54, y: top - 18, width: 6, height: 108, color: accentGold, rotate: degrees(-32) });
  page.drawRectangle({ x: right - 68, y: bottom + 8, width: 10, height: 108, color: softGold, rotate: degrees(-32) });
  page.drawRectangle({ x: right - 84, y: bottom + 8, width: 6, height: 108, color: accentGold, rotate: degrees(-32) });
  page.drawRectangle({ x: right - 92, y: top - 48, width: 58, height: 16, color: accentGold });
  page.drawCircle({
    x: right - 46,
    y: top - 54,
    size: 36,
    borderColor: accentGold,
    borderWidth: 5,
    color: rgb(0.85, 0.72, 0.41),
  });
  page.drawCircle({
    x: right - 46,
    y: top - 54,
    size: 22,
    borderColor: deepMaroon,
    borderWidth: 1.5,
    color: rgb(0.74, 0.33, 0.16),
  });
  page.drawRectangle({ x: right - 58, y: top - 100, width: 24, height: 46, color: accentGold });

  const contentCenterX = pageW / 2;
  drawCenteredText(page, title, top - 116, serif, 46, deepMaroon, pageW);
  drawCenteredText(page, subtitle, top - 150, bodyBold, 13, deepMaroon, pageW);
  page.drawLine({
    start: { x: contentCenterX - 56, y: top - 158 },
    end: { x: contentCenterX + 56, y: top - 158 },
    thickness: 1.4,
    color: softGold,
  });

  drawCenteredText(page, academyName, top - 186, bodyBold, 15, mutedGray, pageW);
  drawCenteredText(page, bodyLine, top - 232, bodyFont, 10.5, mutedGray, pageW);

  const nameFont = script;
  const nameSize = 35;
  const nameWidth = nameFont.widthOfTextAtSize(recipientName, nameSize);
  page.drawText(recipientName, {
    x: (pageW - nameWidth) / 2,
    y: top - 284,
    size: nameSize,
    font: nameFont,
    color: deepMaroon,
  });

  drawWrappedCentered(page, description, contentCenterX, top - 330, bodyFont, 10.0, mutedGray, 470, 2);

  // Signature areas
  const sigLineY = bottom + 72;
  const leftSigX = left + 118;
  const rightSigX = right - 118;
  page.drawText('Signature', {
    x: leftSigX - script.widthOfTextAtSize('Signature', 16) / 2,
    y: sigLineY + 22,
    size: 16,
    font: script,
    color: softGray,
  });
  page.drawText('Signature', {
    x: rightSigX - script.widthOfTextAtSize('Signature', 16) / 2,
    y: sigLineY + 22,
    size: 16,
    font: script,
    color: softGray,
  });
  page.drawLine({ start: { x: leftSigX - 64, y: sigLineY }, end: { x: leftSigX + 64, y: sigLineY }, thickness: 1.1, color: deepMaroon });
  page.drawLine({ start: { x: rightSigX - 64, y: sigLineY }, end: { x: rightSigX + 64, y: sigLineY }, thickness: 1.1, color: deepMaroon });

  page.drawText(leftSignerName, {
    x: leftSigX - bodyBold.widthOfTextAtSize(leftSignerName, 12) / 2,
    y: sigLineY - 10,
    size: 11,
    font: bodyBold,
    color: deepMaroon,
  });
  page.drawText(leftSignerRole, {
    x: leftSigX - bodyFont.widthOfTextAtSize(leftSignerRole, 8) / 2,
    y: sigLineY - 24,
    size: 9,
    font: bodyFont,
    color: softGray,
  });

  const rightNameWidth = bodyBold.widthOfTextAtSize(rightSignerName, 12);
  page.drawText(rightSignerName, {
    x: rightSigX - rightNameWidth / 2,
    y: sigLineY - 10,
    size: 11,
    font: bodyBold,
    color: deepMaroon,
  });
  page.drawText(rightSignerRole, {
    x: rightSigX - bodyFont.widthOfTextAtSize(rightSignerRole, 8) / 2,
    y: sigLineY - 24,
    size: 9,
    font: bodyFont,
    color: softGray,
  });

  page.drawCircle({
    x: right - 74,
    y: top - 50,
    size: 32,
    color: rgb(0.63, 0.28, 0.11),
    borderColor: accentGold,
    borderWidth: 4,
  });
  page.drawText(sealText, {
    x: right - 92,
    y: top - 55,
    size: 8,
    font: bodyBold,
    color: paper,
  });

  if (issueDate) {
    page.drawText(issueDate, {
      x: pageW / 2 - 26,
      y: bottom + 12,
      size: 9.5,
      font: bodyFont,
      color: softGray,
    });
  }

  page.drawText(companyName, {
    x: left + 16,
    y: bottom + 12,
    size: 9.5,
    font: bodyBold,
    color: deepMaroon,
  });

  return page;
}

exports.makeCertificate = async (req, res) => {
  try {
    const file = req.file;
    const name = (req.body.name || '').toString().trim();
    if (!name) return res.status(400).json({ success: false, message: 'Student name is required' });

    const mode = (req.body.mode || 'upload').toString();
    const templateId = (req.body.templateId || 'classic-maroon-gold').toString();

    if (mode === 'template' || !file) {
      const pdf = await PDFDocument.create();
      await renderPresetCertificate(pdf, {
        recipientName: name,
        title: (req.body.title || 'Certificate').toString(),
        subtitle: (req.body.subtitle || 'OF APPRECIATION').toString(),
        bodyLine: (req.body.bodyLine || 'THIS CERTIFICATE IS PROUDLY PRESENTED TO').toString(),
        description: (req.body.description || 'In recognition of dedication, effort, and achievement.').toString(),
        academyName: (req.body.academyName || 'Academy Name').toString(),
        companyName: (req.body.companyName || 'Company Name').toString(),
        leftSignerName: (req.body.leftSignerName || 'Principal Name').toString(),
        leftSignerRole: (req.body.leftSignerRole || 'Principal').toString(),
        rightSignerName: (req.body.rightSignerName || 'Director Name').toString(),
        rightSignerRole: (req.body.rightSignerRole || 'Director').toString(),
        sealText: (req.body.sealText || 'AWARD').toString(),
        issueDate: (req.body.issueDate || '').toString(),
        templateId,
      });

      const bytes = await pdf.save();
      const safe = name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="certificate-${safe}.pdf"`);
      return res.send(Buffer.from(bytes));
    }

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
