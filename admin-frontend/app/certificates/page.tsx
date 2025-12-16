"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronsUpDown } from "lucide-react";

import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

const FAMILIES = ["Times", "Helvetica", "Courier", "GreatVibes"] as const;
const STYLES = ["normal", "bold", "italic", "boldItalic"] as const;

// A4 in points (same as backend)
const A4_PORTRAIT: [number, number] = [595.28, 841.89];
const A4_LANDSCAPE: [number, number] = [841.89, 595.28];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// canvas font-style helper (approximate)
function canvasFont(fontStyle: string, fontSize: number, fontFamily: string) {
  const weight = fontStyle.includes("bold") ? "bold" : "normal";
  const italic = fontStyle.includes("italic") ? "italic" : "normal";
  return `${italic} ${weight} ${fontSize}px ${fontFamily}`;
}

type Student = {
  _id: string;
  regNo: string;
  name: string;
  className?: string;
};

export default function CertificatesPage() {
  const API_BASE = useMemo(
    () => (process.env.NEXT_PUBLIC_API_BASE_URL || "https://qtech-backend.vercel.app").replace(/\/$/, ""),
    []
  );

  /* ---------------- student dropdown + autofill ---------------- */
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/students`);
        const json = await res.json();

        const list =
          Array.isArray(json) ? json :
          Array.isArray(json?.items) ? json.items :
          Array.isArray(json?.data) ? json.data :
          [];

        setStudents(list);
      } catch (err) {
        console.error("Failed to load students", err);
        setStudents([]);
      }
    };
    fetchStudents();
  }, [API_BASE]);

  /* ---------------- image upload ---------------- */
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const onPick = (f: File | null) => {
    setFile(f);
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return f ? URL.createObjectURL(f) : null;
    });
  };

  /* ---------------- positioning + style controls ---------------- */
  const [useRect, setUseRect] = useState(true);

  // same defaults as your backend example band
  const [rectLeftPercent, setRectLeftPercent] = useState(20);
  const [rectTopPercent, setRectTopPercent] = useState(58); // from image TOP (like backend)
  const [rectWidthPercent, setRectWidthPercent] = useState(60);
  const [rectHeightPercent, setRectHeightPercent] = useState(10);

  // anchor mode
  const [xPercent, setXPercent] = useState(50);
  const [yPercent, setYPercent] = useState(58);

  const [fontFamily, setFontFamily] = useState<(typeof FAMILIES)[number]>("Times");
  const [fontStyle, setFontStyle] = useState<(typeof STYLES)[number]>("bold");
  const [fontSize, setFontSize] = useState(64);
  const [colorHex, setColorHex] = useState("#0f172a");
  const [charSpacing, setCharSpacing] = useState(0);
  const [vOffset, setVOffset] = useState(0);
  const [marginPt, setMarginPt] = useState(18);

  /* ---------------- preview canvas (MUST MATCH BACKEND) ---------------- */
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = imageUrl;

    img.onload = () => {
      // BACKEND: picks A4 orientation based on image aspect
      const pageSize = img.width >= img.height ? A4_LANDSCAPE : A4_PORTRAIT;
      const [pageW, pageH] = pageSize;

      // set canvas to A4 (same "points" idea)
      canvas.width = Math.round(pageW);
      canvas.height = Math.round(pageH);

      // BACKEND: fit image inside margins
      const availW = Math.max(0, pageW - marginPt * 2);
      const availH = Math.max(0, pageH - marginPt * 2);
      const scale = Math.min(availW / img.width, availH / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const imgX = (pageW - drawW) / 2;
      const imgY_pdf = (pageH - drawH) / 2; // this is PDF Y (bottom-left origin)

      // CANVAS origin is top-left, so convert PDF y => canvas y
      const imgY_canvas = pageH - (imgY_pdf + drawH);

      // draw background
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // draw image where backend draws it (converted)
      ctx.drawImage(img, imgX, imgY_canvas, drawW, drawH);

      // draw text like backend (but convert Y)
      const displayName = name?.trim() || "Student Name";
      ctx.fillStyle = colorHex;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.font = canvasFont(fontStyle, fontSize, fontFamily);

      const textWidth = ctx.measureText(displayName).width;
      const textHeight = fontSize; // approximation (good enough for preview)

      let drawX_pdf = 0;
      let drawY_pdf = 0;

      if (useRect && rectWidthPercent > 0 && rectHeightPercent > 0) {
        const rectW = (rectWidthPercent / 100) * drawW;
        const rectH = (rectHeightPercent / 100) * drawH;

        const rectLeft = imgX + (rectLeftPercent / 100) * drawW;

        // backend: rectTopPercent is from image TOP, computed in PDF coords:
        // rectTopGlobal = imgY_pdf + drawH - (rectTopPercent/100)*drawH
        const rectTopGlobal_pdf = imgY_pdf + drawH - (rectTopPercent / 100) * drawH;
        const rectBottom_pdf = rectTopGlobal_pdf - rectH;

        drawX_pdf = rectLeft + (rectW - textWidth) / 2;
        drawY_pdf = rectBottom_pdf + (rectH - textHeight) / 2 + vOffset;
      } else {
        // backend anchor mode in PDF coords:
        const tx_pdf = imgX + (xPercent / 100) * drawW;
        const ty_pdf = imgY_pdf + (yPercent / 100) * drawH;

        drawX_pdf = tx_pdf - textWidth / 2;
        drawY_pdf = ty_pdf - textHeight / 2 + vOffset;
      }

      // convert PDF text y to canvas y
      const drawX_canvas = drawX_pdf;
      const drawY_canvas = pageH - drawY_pdf;

      // move baseline a bit because canvas uses baseline, pdf uses bottom-left
      ctx.fillText(displayName, drawX_canvas, drawY_canvas);
    };
  }, [
    imageUrl,
    name,
    useRect,
    rectLeftPercent,
    rectTopPercent,
    rectWidthPercent,
    rectHeightPercent,
    xPercent,
    yPercent,
    fontFamily,
    fontStyle,
    fontSize,
    colorHex,
    vOffset,
    marginPt,
  ]);

  /* ---------------- generate pdf ---------------- */
  const [loading, setLoading] = useState(false);

  const generatePDF = async () => {
    if (!file) return alert("Please upload a certificate image");
    if (!name.trim()) return alert("Please select a student or enter name");

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("name", name.trim());

      // send EXACT same params preview uses
      fd.append("fontFamily", fontFamily);
      fd.append("fontStyle", fontStyle);
      fd.append("fontSize", String(fontSize));
      fd.append("colorHex", colorHex);
      fd.append("charSpacing", String(charSpacing));
      fd.append("vOffset", String(vOffset));
      fd.append("marginPt", String(marginPt));

      if (useRect) {
        fd.append("rectLeftPercent", String(rectLeftPercent));
        fd.append("rectTopPercent", String(rectTopPercent));
        fd.append("rectWidthPercent", String(rectWidthPercent));
        fd.append("rectHeightPercent", String(rectHeightPercent));
      } else {
        fd.append("xPercent", String(xPercent));
        fd.append("yPercent", String(yPercent));
      }

      const res = await fetch(`${API_BASE}/api/certificates/make`, { method: "POST", body: fd });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Failed to generate PDF");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // download instead of just open (more reliable)
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${name.trim().replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } catch (err: any) {
      alert(err?.message || "Failed to generate PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button size="icon" variant="outline">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Certificates</h1>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* LEFT */}
          <Card>
            <CardHeader>
              <CardTitle>Certificate Details</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* student dropdown */}
              <div className="space-y-2">
                <Label>Student</Label>

                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {selectedStudent ? `${selectedStudent.regNo} — ${selectedStudent.name}` : "Select student"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-[360px] p-0">
                    <Command>
                      <CommandInput placeholder="Search student..." />
                      <CommandEmpty>No student found.</CommandEmpty>
                      <CommandGroup>
                        {students.map((s) => (
                          <CommandItem
                            key={s._id}
                            value={`${s.regNo} ${s.name}`}
                            onSelect={() => {
                              setSelectedStudent(s);
                              setName(s.name); // autofill
                              setOpen(false);
                            }}
                          >
                            <Check className={`mr-2 h-4 w-4 ${selectedStudent?._id === s._id ? "opacity-100" : "opacity-0"}`} />
                            {s.regNo} — {s.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>

                <div className="space-y-1">
                  <Label>Student Name (editable)</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Student name" />
                </div>
              </div>

              {/* image */}
              <div className="space-y-2">
                <Label>Certificate Image</Label>
                <Input type="file" accept="image/png,image/jpeg" onChange={(e) => onPick(e.target.files?.[0] || null)} />
              </div>

              {/* mode */}
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={useRect} onChange={(e) => setUseRect(e.target.checked)} />
                <span className="text-sm">Use rectangle mode (recommended)</span>
              </div>

              {useRect ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Rect Left %</Label>
                    <Input type="number" value={rectLeftPercent} onChange={(e) => setRectLeftPercent(+e.target.value)} />
                  </div>
                  <div>
                    <Label>Rect Top % (from top)</Label>
                    <Input type="number" value={rectTopPercent} onChange={(e) => setRectTopPercent(+e.target.value)} />
                  </div>
                  <div>
                    <Label>Rect Width %</Label>
                    <Input type="number" value={rectWidthPercent} onChange={(e) => setRectWidthPercent(+e.target.value)} />
                  </div>
                  <div>
                    <Label>Rect Height %</Label>
                    <Input type="number" value={rectHeightPercent} onChange={(e) => setRectHeightPercent(+e.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>X %</Label>
                    <Input type="number" value={xPercent} onChange={(e) => setXPercent(+e.target.value)} />
                  </div>
                  <div>
                    <Label>Y % (from bottom)</Label>
                    <Input type="number" value={yPercent} onChange={(e) => setYPercent(+e.target.value)} />
                  </div>
                </div>
              )}

              {/* style */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Font</Label>
                  <select className="w-full border rounded px-2 py-2" value={fontFamily} onChange={(e) => setFontFamily(e.target.value as any)}>
                    {FAMILIES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Style</Label>
                  <select className="w-full border rounded px-2 py-2" value={fontStyle} onChange={(e) => setFontStyle(e.target.value as any)}>
                    {STYLES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Size</Label>
                  <Input type="number" value={fontSize} onChange={(e) => setFontSize(+e.target.value)} />
                </div>
                <div>
                  <Label>Vertical Offset</Label>
                  <Input type="number" value={vOffset} onChange={(e) => setVOffset(+e.target.value)} />
                </div>
                <div>
                  <Label>Margin (pt)</Label>
                  <Input type="number" value={marginPt} onChange={(e) => setMarginPt(+e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Color</Label>
                  <Input type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)} className="h-10 p-1" />
                </div>
                <div>
                  <Label>Char Spacing</Label>
                  <Input type="number" step="0.1" value={charSpacing} onChange={(e) => setCharSpacing(+e.target.value)} />
                </div>
              </div>

              <Button onClick={generatePDF} disabled={loading || !file}>
                {loading ? "Generating…" : "Generate & Download PDF"}
              </Button>
            </CardContent>
          </Card>

          {/* RIGHT */}
          <Card>
            <CardHeader>
              <CardTitle>Live Preview (A4)</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center items-center min-h-[500px] bg-muted/30">
              {imageUrl ? (
                <div className="w-full overflow-auto">
                  <canvas ref={canvasRef} className="max-w-full h-auto border rounded bg-white" />
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">Upload image to preview</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
