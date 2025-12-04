// lib/exportToPdf.ts
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type PdfOptions = {
  /** portrait | landscape (default: "l") */
  orientation?: "p" | "l";
  /** paper size (default: "a4") */
  format?: "a4" | "letter";
  /** html2canvas scale factor (default: 2) */
  scale?: number;
  /** page margin in millimeters (default: 8) */
  marginMm?: number;
};

/**
 * Renders a DOM node to a PDF and triggers download.
 * - Forces safe (hex/rgb) colors to avoid html2canvas failing on `oklch()`.
 * - Scales image to fit the chosen page with margins while preserving aspect ratio.
 */
export async function exportNodeToPdf(
  node: HTMLElement,
  filename: string,
  opts: PdfOptions = {}
) {
  const {
    orientation = "l",
    format = "a4",
    scale = 2,
    marginMm = 8,
  } = opts;

  // Render DOM to canvas
  const canvas = await html2canvas(node, {
    // ✅ Use a safe background so html2canvas doesn't try to parse oklch()
    backgroundColor: "#ffffff",
    scale,
    useCORS: true,
    logging: false,
    /**
     * Inject safe CSS variable values into the cloned document so any Tailwind/shadcn
     * colors that might resolve to `oklch()` are overridden with hex/rgb.
     */
    onclone(cloneDoc) {
      const style = cloneDoc.createElement("style");
      style.setAttribute("data-export-pdf-safe", "true");
      style.textContent = `
        :root, .dark {
          --background: #ffffff;
          --foreground: #0b0b0b;

          --muted: #f3f4f6;
          --muted-foreground: #6b7280;

          --card: #ffffff;
          --card-foreground: #0b0b0b;

          --popover: #ffffff;
          --popover-foreground: #0b0b0b;

          --primary: #111827;
          --primary-foreground: #ffffff;

          --secondary: #e5e7eb;
          --secondary-foreground: #111827;

          --accent: #e5e7eb;
          --accent-foreground: #111827;

          --border: #e5e7eb;
          --input: #e5e7eb;
          --ring: #111827;
        }
      `;
      cloneDoc.head.appendChild(style);
    },
  });

  const imgData = canvas.toDataURL("image/png");

  // Create PDF
  const pdf = new jsPDF({ orientation, unit: "mm", format });

  // Page metrics
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Available drawing area (with margins)
  const availW = pageWidth - marginMm * 2;
  const availH = pageHeight - marginMm * 2;

  // Image metrics
  const imgW = canvas.width;
  const imgH = canvas.height;

  // Fit image into page while preserving aspect ratio
  const ratio = Math.min(availW / imgW, availH / imgH);
  const renderW = imgW * ratio;
  const renderH = imgH * ratio;

  const x = (pageWidth - renderW) / 2;
  const y = (pageHeight - renderH) / 2;

  pdf.addImage(imgData, "PNG", x, y, renderW, renderH, undefined, "FAST");
  pdf.save(`${filename}.pdf`);
}
