"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils"; // optional; remove if you don't use cn()

const FAMILIES = ["Times", "Helvetica", "Courier", "GreatVibes"] as const;
const STYLES   = ["normal", "bold", "italic", "boldItalic"] as const;

export default function CertificatesPage() {
  const API_BASE = useMemo(
    () => (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(/\/$/, ""),
    []
  );

  const [name, setName] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const onPick = (f: File | null) => {
    setFile(f);
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return f ? URL.createObjectURL(f) : null;
    });
  };

  // Default to RECT MODE for your template band
  const [useRect, setUseRect] = useState(true);

  // Rectangle in % of drawn image area — defaults place text in the “presented to” band
  const [rectLeftPercent, setRectLeftPercent]     = useState(20);
  const [rectTopPercent, setRectTopPercent]       = useState(58); // % from image TOP
  const [rectWidthPercent, setRectWidthPercent]   = useState(60);
  const [rectHeightPercent, setRectHeightPercent] = useState(10);

  // Legacy anchor (unused when useRect=true)
  const [xPercent, setXPercent] = useState(50);
  const [yPercent, setYPercent] = useState(58);

  // Style controls
  const [fontFamily, setFontFamily] = useState<(typeof FAMILIES)[number]>("Times");
  const [fontStyle, setFontStyle]   = useState<(typeof STYLES)[number]>("bold");
  const [fontSize, setFontSize]     = useState(64);
  const [colorHex, setColorHex]     = useState("#0f172a");
  const [charSpacing, setCharSpacing] = useState(0);
  const [vOffset, setVOffset] = useState(0); // small vertical nudge in points

  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Select a PNG/JPG certificate image");
    if (!name.trim()) return alert("Enter student name");

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("name", name.trim());

      if (useRect) {
        fd.append("rectLeftPercent",   String(rectLeftPercent));
        fd.append("rectTopPercent",    String(rectTopPercent));
        fd.append("rectWidthPercent",  String(rectWidthPercent));
        fd.append("rectHeightPercent", String(rectHeightPercent));
      } else {
        fd.append("xPercent", String(xPercent));
        fd.append("yPercent", String(yPercent));
      }

      fd.append("fontFamily", fontFamily);
      fd.append("fontStyle", fontStyle);
      fd.append("fontSize", String(fontSize));
      fd.append("colorHex", colorHex);
      fd.append("charSpacing", String(charSpacing));
      fd.append("vOffset", String(vOffset));
      fd.append("marginPt", "18");

      const res = await fetch(`${API_BASE}/api/certificates/make`, { method: "POST", body: fd });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Failed to create PDF");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err: any) {
      alert(err?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6">
      {/* Top-left, icon-only back button */}
      <div className="mb-4 flex items-center justify-start">
        <Link
          href="/dashboard"
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-md border",
            "hover:bg-accent hover:text-accent-foreground"
          )}
          aria-label="Back to dashboard"
          title="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      <h1 className="text-xl font-semibold mb-4">Certificates</h1>

      <form onSubmit={onSubmit} className="grid gap-4 w-full max-w-3xl border rounded-xl p-4">
        <div className="grid gap-1">
          <label className="text-sm font-medium">Student Name</label>
          <input
            className="border rounded px-3 py-2"
            placeholder="e.g. Ayesha Khan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="grid gap-1">
          <label className="text-sm font-medium">Certificate Image (PNG/JPG)</label>
          <input type="file" accept="image/png,image/jpeg" onChange={(e) => onPick(e.target.files?.[0] || null)} required />
        </div>

        <label className="flex items-center gap-2 mt-2">
          <input type="checkbox" checked={useRect} onChange={(e) => setUseRect(e.target.checked)} />
          <span className="text-sm">Use centered rectangle (recommended)</span>
        </label>

        {useRect ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs">Rect Left %</label>
              <input
                type="number"
                min={0}
                max={100}
                className="border rounded px-2 py-1 w-full"
                value={rectLeftPercent}
                onChange={(e) => setRectLeftPercent(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs">Rect Top %</label>
              <input
                type="number"
                min={0}
                max={100}
                className="border rounded px-2 py-1 w-full"
                value={rectTopPercent}
                onChange={(e) => setRectTopPercent(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs">Rect Width %</label>
              <input
                type="number"
                min={0}
                max={100}
                className="border rounded px-2 py-1 w-full"
                value={rectWidthPercent}
                onChange={(e) => setRectWidthPercent(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs">Rect Height %</label>
              <input
                type="number"
                min={0}
                max={100}
                className="border rounded px-2 py-1 w-full"
                value={rectHeightPercent}
                onChange={(e) => setRectHeightPercent(Number(e.target.value))}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs">X %</label>
              <input
                type="number"
                min={0}
                max={100}
                className="border rounded px-2 py-1 w-full"
                value={xPercent}
                onChange={(e) => setXPercent(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs">Y %</label>
              <input
                type="number"
                min={0}
                max={100}
                className="border rounded px-2 py-1 w-full"
                value={yPercent}
                onChange={(e) => setYPercent(Number(e.target.value))}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs">Font Family</label>
            <select
              className="border rounded px-2 py-1 w-full"
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value as any)}
            >
              {FAMILIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs">Style</label>
            <select
              className="border rounded px-2 py-1 w-full"
              value={fontStyle}
              onChange={(e) => setFontStyle(e.target.value as any)}
            >
              {STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs">Font Size (pt)</label>
            <input
              type="number"
              min={8}
              max={200}
              className="border rounded px-2 py-1 w-full"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs">Color</label>
            <input
              type="color"
              className="border rounded px-2 py-1 w-full h-9"
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs">Char Spacing (pt)</label>
            <input
              type="number"
              step="0.1"
              className="border rounded px-2 py-1 w-full"
              value={charSpacing}
              onChange={(e) => setCharSpacing(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs">Vertical Offset (pt)</label>
            <input
              type="number"
              step="0.5"
              className="border rounded px-2 py-1 w-full"
              value={vOffset}
              onChange={(e) => setVOffset(Number(e.target.value))}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate PDF"}
        </button>
      </form>

      {imageUrl && (
        <div className="mt-6 w-full max-w-4xl h-[70vh] border rounded overflow-hidden bg-muted/20 flex items-center justify-center">
          <img src={imageUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </main>
  );
}
