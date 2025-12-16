const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

/* ------------------------------------------------------------------ */
/* Fonts */
/* ------------------------------------------------------------------ */
const DEFAULT_CUSTOM_FONT = path.join(
  __dirname,
  "..",
  "fonts",
  "GreatVibes-Regular.ttf"
);
const CUSTOM_FONT_PATH =
  process.env.CERT_FONT_PATH || DEFAULT_CUSTOM_FONT;

/* ------------------------------------------------------------------ */
/* Page sizes (A4 in points) */
/* ------------------------------------------------------------------ */
const A4_PORTRAIT = [595.28, 841.89];
const A4_LANDSCAPE = [841.89, 595.28];

/* ------------------------------------------------------------------ */
/* Helpers */
/* ------------------------------------------------------------------ */
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function hexToRgb01(hex) {
  if (!hex) return null;
  const m = hex.replace("#", "").trim();
  if (![3, 6].includes(m.length)) return null;
  const v =
    m.length === 3
      ? m
          .split("")
          .map((c) => c + c)
          .join("")
      : m;
  const r = parseInt(v.slice(0, 2), 16) / 255;
  const g = parseInt(v.slice(2, 4), 16) / 255;
  const b = parseInt(v.slice(4, 6), 16) / 255;
  if ([r, g, b].some((x) => Number.isNaN(x))) return null;
  return { r, g, b };
}

/* ------------------------------------------------------------------ */
/* Font loader */
/* ------------------------------------------------------------------ */
async function loadFont(pdf, family, style) {
  const fam = (family || "Times").toString();
  const sty = (style || "bold").toString();

  const pickStd = async (map) => {
    const key = map[sty] || map.normal;
    return pdf.embedFont(key);
  };

  try {
    switch (fam) {
      case "Helvetica":
        return pickStd({
          normal: StandardFonts.Helvetica,
          bold: StandardFonts.HelveticaBold,
          italic: StandardFonts.HelveticaOblique,
          boldItalic: StandardFonts.HelveticaBoldOblique,
        });

      case "Courier":
        return pickStd({
          normal: StandardFonts.Courier,
          bold: StandardFonts.CourierBold,
          italic: StandardFonts.CourierOblique,
          boldItalic: StandardFonts.CourierBoldOblique,
        });

      case "GreatVibes":
      case "Custom":
        if (fs.existsSync(CUSTOM_FONT_PATH)) {
          const bytes = fs.readFileSync(CUSTOM_FONT_PATH);
          return pdf.embedFont(bytes);
        }
        return pdf.embedFont(StandardFonts.TimesRomanBold);

      case "Times":
      default:
        return pickStd({
          normal: StandardFonts.TimesRoman,
          bold: StandardFonts.TimesRomanBold,
          italic: StandardFonts.TimesRomanItalic,
          boldItalic: StandardFonts.TimesRomanBoldItalic,
        });
    }
  } catch {
    return pdf.embedFont(StandardFonts.TimesRomanBold);
  }
}

/* ------------------------------------------------------------------ */
/* Controller */
/* ------------------------------------------------------------------ */
exports.makeCertificate = async (req, res) => {
  try {
    /* ---------------- image ---------------- */
    const file = req.file;
    if (!file) {
      return res
        .status(400)
        .json({ success: false, message: 'No image uploaded (field "image")' });
    }

    /* ---------------- text ---------------- */
    const name = (req.body.name || "").toString().trim();
    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Student name is required" });
    }

    /* ---------------- positioning ---------------- */
    const xPercent = clamp(Number(req.body.xPercent ?? 50), 0, 100);
    const yPercent = clamp(Number(req.body.yPercent ?? 58), 0, 100);

    const rectLeftPercent = clamp(
      Number(req.body.rectLeftPercent ?? 20),
      0,
      100
    );
    const rectTopPercent = clamp(
      Number(req.body.rectTopPercent ?? 58),
      0,
      100
    );
    const rectWidthPercent = clamp(
      Number(req.body.rectWidthPercent ?? 60),
      0,
      100
    );
    const rectHeightPercent = clamp(
      Number(req.body.rectHeightPercent ?? 10),
      0,
      100
    );

    const useRect =
      String(req.body.useRect) === "true" &&
      rectWidthPercent > 0 &&
      rectHeightPercent > 0;

    /* ---------------- style ---------------- */
    const fontFamily = (req.body.fontFamily || "Times").toString();
    const fontStyle = (req.body.fontStyle || "bold").toString();
    const fontSize = clamp(Number(req.body.fontSize ?? 64), 8, 200);
    const marginPt = clamp(Number(req.body.marginPt ?? 18), 0, 72);
    const charSpacing = Number(req.body.charSpacing || 0);
    const vOffset = Number(req.body.vOffset || 0);

    const hexRGB = hexToRgb01(req.body.colorHex);
    const color = hexRGB || { r: 0, g: 0, b: 0 };

    /* ---------------- pdf setup ---------------- */
    const pdf = await PDFDocument.create();

    let img;
    try {
      img = await pdf.embedPng(file.buffer);
    } catch {
      img = await pdf.embedJpg(file.buffer);
    }

    const imgW = img.width;
    const imgH = img.height;

    const pageSize = imgW >= imgH ? A4_LANDSCAPE : A4_PORTRAIT;
    const page = pdf.addPage(pageSize);
    const { width: pageW, height: pageH } = page.getSize();

    const availW = pageW - marginPt * 2;
    const availH = pageH - marginPt * 2;
    const scale = Math.min(availW / imgW, availH / imgH);

    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const imgX = (pageW - drawW) / 2;
    const imgY = (pageH - drawH) / 2;

    page.drawImage(img, {
      x: imgX,
      y: imgY,
      width: drawW,
      height: drawH,
    });

    /* ---------------- text metrics ---------------- */
    const font = await loadFont(pdf, fontFamily, fontStyle);
    const textWidth = font.widthOfTextAtSize(name, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    let drawX, drawY;

    if (useRect) {
      const rectW = (rectWidthPercent / 100) * drawW;
      const rectH = (rectHeightPercent / 100) * drawH;

      const rectLeft = imgX + (rectLeftPercent / 100) * drawW;
      const rectTop = imgY + drawH - (rectTopPercent / 100) * drawH;
      const rectBottom = rectTop - rectH;

      drawX = rectLeft + (rectW - textWidth) / 2;
      drawY = rectBottom + (rectH - textHeight) / 2 + vOffset;
    } else {
      const cx = imgX + (xPercent / 100) * drawW;
      const cy = imgY + (yPercent / 100) * drawH;
      drawX = cx - textWidth / 2;
      drawY = cy - textHeight / 2 + vOffset;
    }

    page.drawText(name, {
      x: drawX,
      y: drawY,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
      characterSpacing: charSpacing || undefined,
    });

    /* ---------------- response ---------------- */
    const bytes = await pdf.save();
    const safe = name.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="certificate-${safe}.pdf"`
    );
    res.send(Buffer.from(bytes));
  } catch (err) {
    console.error("makeCertificate error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};
