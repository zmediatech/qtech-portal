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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FAMILIES = ["Times", "Helvetica", "Courier", "GreatVibes"] as const;
const STYLES = ["normal", "bold", "italic", "boldItalic"] as const;
const CERTIFICATE_MODES = ["upload", "template"] as const;
const TEMPLATE_IDS = ["classic-maroon-gold"] as const;

const A4_PORTRAIT: [number, number] = [595.28, 841.89];
const A4_LANDSCAPE: [number, number] = [841.89, 595.28];

function wrapText(text: string, maxChars: number) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) current = next;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

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

  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [name, setName] = useState("");

  const [mode, setMode] = useState<(typeof CERTIFICATE_MODES)[number]>("upload");
  const [templateId, setTemplateId] = useState<(typeof TEMPLATE_IDS)[number]>("classic-maroon-gold");

  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [useRect, setUseRect] = useState(true);
  const [rectLeftPercent, setRectLeftPercent] = useState(20);
  const [rectTopPercent, setRectTopPercent] = useState(58);
  const [rectWidthPercent, setRectWidthPercent] = useState(60);
  const [rectHeightPercent, setRectHeightPercent] = useState(10);
  const [xPercent, setXPercent] = useState(50);
  const [yPercent, setYPercent] = useState(58);
  const [fontFamily, setFontFamily] = useState<(typeof FAMILIES)[number]>("Times");
  const [fontStyle, setFontStyle] = useState<(typeof STYLES)[number]>("bold");
  const [fontSize, setFontSize] = useState(64);
  const [colorHex, setColorHex] = useState("#0f172a");
  const [charSpacing, setCharSpacing] = useState(0);
  const [vOffset, setVOffset] = useState(0);
  const [marginPt, setMarginPt] = useState(18);

  const [certificateTitle, setCertificateTitle] = useState("Certificate");
  const [certificateSubtitle, setCertificateSubtitle] = useState("OF APPRECIATION");
  const [bodyLine, setBodyLine] = useState("THIS CERTIFICATE IS PROUDLY PRESENTED TO");
  const [description, setDescription] = useState("For outstanding dedication, achievement, and contribution to the institution.");
  const [academyName, setAcademyName] = useState("Academy Name");
  const [companyName, setCompanyName] = useState("Company Name");
  const [leftSignerName, setLeftSignerName] = useState("Principal Name");
  const [leftSignerRole, setLeftSignerRole] = useState("Principal");
  const [rightSignerName, setRightSignerName] = useState("Director Name");
  const [rightSignerRole, setRightSignerRole] = useState("Director");
  const [sealText, setSealText] = useState("AWARD");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));

  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const previewDescriptionLines = useMemo(() => wrapText(description, 72), [description]);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/students`);
        const json = await res.json();
        const list = Array.isArray(json)
          ? json
          : Array.isArray(json?.items)
            ? json.items
            : Array.isArray(json?.data)
              ? json.data
              : [];
        setStudents(list);
      } catch (err) {
        console.error("Failed to load students", err);
        setStudents([]);
      }
    };
    fetchStudents();
  }, [API_BASE]);

  const onPick = (f: File | null) => {
    setFile(f);
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return f ? URL.createObjectURL(f) : null;
    });
  };

  useEffect(() => {
    if (mode !== "upload" || !imageUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = imageUrl;

    img.onload = () => {
      const pageSize = img.width >= img.height ? A4_LANDSCAPE : A4_PORTRAIT;
      const [pageW, pageH] = pageSize;
      canvas.width = Math.round(pageW);
      canvas.height = Math.round(pageH);

      const availW = Math.max(0, pageW - marginPt * 2);
      const availH = Math.max(0, pageH - marginPt * 2);
      const scale = Math.min(availW / img.width, availH / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const imgX = (pageW - drawW) / 2;
      const imgY_pdf = (pageH - drawH) / 2;
      const imgY_canvas = pageH - (imgY_pdf + drawH);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, imgX, imgY_canvas, drawW, drawH);

      const displayName = name?.trim() || "Student Name";
      ctx.fillStyle = colorHex;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.font = canvasFont(fontStyle, fontSize, fontFamily);

      const textWidth = ctx.measureText(displayName).width;
      const textHeight = fontSize;

      let drawX_pdf = 0;
      let drawY_pdf = 0;
      if (useRect && rectWidthPercent > 0 && rectHeightPercent > 0) {
        const rectW = (rectWidthPercent / 100) * drawW;
        const rectH = (rectHeightPercent / 100) * drawH;
        const rectLeft = imgX + (rectLeftPercent / 100) * drawW;
        const rectTopGlobal_pdf = imgY_pdf + drawH - (rectTopPercent / 100) * drawH;
        const rectBottom_pdf = rectTopGlobal_pdf - rectH;
        drawX_pdf = rectLeft + (rectW - textWidth) / 2;
        drawY_pdf = rectBottom_pdf + (rectH - textHeight) / 2 + vOffset;
      } else {
        const tx_pdf = imgX + (xPercent / 100) * drawW;
        const ty_pdf = imgY_pdf + (yPercent / 100) * drawH;
        drawX_pdf = tx_pdf - textWidth / 2;
        drawY_pdf = ty_pdf - textHeight / 2 + vOffset;
      }

      ctx.fillText(displayName, drawX_pdf, pageH - drawY_pdf);
    };
  }, [
    mode,
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

  const generatePDF = async () => {
    if (!name.trim()) return alert("Please select a student or enter a name");
    if (mode === "upload" && !file) return alert("Please upload a certificate image or switch to template mode");

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("mode", mode);
      fd.append("templateId", templateId);
      fd.append("name", name.trim());
      fd.append("title", certificateTitle.trim());
      fd.append("subtitle", certificateSubtitle.trim());
      fd.append("bodyLine", bodyLine.trim());
      fd.append("description", description.trim());
      fd.append("academyName", academyName.trim());
      fd.append("companyName", companyName.trim());
      fd.append("leftSignerName", leftSignerName.trim());
      fd.append("leftSignerRole", leftSignerRole.trim());
      fd.append("rightSignerName", rightSignerName.trim());
      fd.append("rightSignerRole", rightSignerRole.trim());
      fd.append("sealText", sealText.trim());
      fd.append("issueDate", issueDate);

      if (mode === "upload" && file) {
        fd.append("image", file);
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
      }

      const res = await fetch(`${API_BASE}/api/certificates/make`, { method: "POST", body: fd });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Failed to generate PDF");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
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
          <Card>
            <CardHeader>
              <CardTitle>Certificate Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Certificate Mode</Label>
                  <Select value={mode} onValueChange={(v) => setMode(v as (typeof CERTIFICATE_MODES)[number])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upload">Upload image template</SelectItem>
                      <SelectItem value="template">Use built-in template</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {mode === "template" && (
                  <div className="space-y-2">
                    <Label>Template Style</Label>
                    <Select value={templateId} onValueChange={(v) => setTemplateId(v as (typeof TEMPLATE_IDS)[number])}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="classic-maroon-gold">Classic Maroon & Gold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

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
                              setName(s.name);
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

              {mode === "upload" ? (
                <>
                  <div className="space-y-2">
                    <Label>Certificate Image</Label>
                    <Input type="file" accept="image/png,image/jpeg" onChange={(e) => onPick(e.target.files?.[0] || null)} />
                    <div className="text-xs text-muted-foreground">
                      Upload your own certificate background, or switch to the built-in template mode.
                    </div>
                  </div>

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
                </>
              ) : (
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Certificate Title</Label>
                      <Input value={certificateTitle} onChange={(e) => setCertificateTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Subtitle</Label>
                      <Input value={certificateSubtitle} onChange={(e) => setCertificateSubtitle(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Body Line</Label>
                    <Input value={bodyLine} onChange={(e) => setBodyLine(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Academy Name</Label>
                      <Input value={academyName} onChange={(e) => setAcademyName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Company / Organization</Label>
                      <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Left Signer Name</Label>
                      <Input value={leftSignerName} onChange={(e) => setLeftSignerName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Left Signer Role</Label>
                      <Input value={leftSignerRole} onChange={(e) => setLeftSignerRole(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Right Signer Name</Label>
                      <Input value={rightSignerName} onChange={(e) => setRightSignerName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Right Signer Role</Label>
                      <Input value={rightSignerRole} onChange={(e) => setRightSignerRole(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Seal Text</Label>
                      <Input value={sealText} onChange={(e) => setSealText(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Issue Date</Label>
                      <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={generatePDF} disabled={loading || (mode === "upload" && !file)}>
                {loading ? "Generating…" : "Generate & Download PDF"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Live Preview (A4)</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center items-center min-h-[500px] bg-muted/30">
              {mode === "upload" ? (
                imageUrl ? (
                  <div className="w-full overflow-auto">
                    <canvas ref={canvasRef} className="max-w-full h-auto border rounded bg-white" />
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">Upload image to preview</div>
                )
              ) : (
                <div className="w-full overflow-auto">
                  <div
                    className="relative mx-auto border shadow-sm"
                    style={{
                      width: 841,
                      height: 595,
                      background: "linear-gradient(135deg, #f8ecd5 0%, #fff8eb 45%, #f1d7a3 100%)",
                    }}
                  >
                    <div className="absolute inset-[48px]" />
                    <div className="absolute left-[48px] right-[48px] top-[48px] h-7 bg-[#7d0f14]" />
                    <div className="absolute left-[48px] right-[48px] bottom-[48px] h-[18px] bg-[#7d0f14]" />
                    <div className="absolute left-[46px] top-[48px] h-[95px] w-[14px] bg-[#c28f2c]" />
                    <div className="absolute left-[60px] top-[48px] h-[95px] w-[4px] bg-[#efd37a]" />
                    <div className="absolute left-[90px] top-[18px] h-[92px] w-[9px] rotate-[-32deg] bg-[#fff8eb]" />
                    <div className="absolute left-[78px] top-[20px] h-[108px] w-[10px] rotate-[-32deg] bg-[#efd37a]" />
                    <div className="absolute left-[94px] top-[20px] h-[108px] w-[6px] rotate-[-32deg] bg-[#c28f2c]" />
                    <div className="absolute right-[102px] bottom-[2px] h-[92px] w-[9px] rotate-[-32deg] bg-[#fff8eb]" />
                    <div className="absolute right-[68px] bottom-[8px] h-[108px] w-[10px] rotate-[-32deg] bg-[#efd37a]" />
                    <div className="absolute right-[84px] bottom-[8px] h-[108px] w-[6px] rotate-[-32deg] bg-[#c28f2c]" />
                    <div className="absolute right-[48px] top-[48px] h-[16px] w-[58px] bg-[#c28f2c]" />
                    <div className="absolute right-[66px] top-[48px] h-[40px] w-[40px] rounded-full border-[5px] border-[#d2b05b] bg-[#d7b15b]" />
                    <div className="absolute right-[78px] top-[60px] flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[#8c1f1f] bg-[#b55d21] text-[6px] font-bold uppercase text-white shadow-sm">
                      {sealText}
                    </div>
                    <div className="absolute right-[58px] top-[104px] h-[44px] w-[24px] bg-[#d7b15b]" />

                    <div className="absolute left-[10px] right-[10px] top-[114px] text-center">
                      <div className="text-[46px] font-bold text-[#7d0f14]" style={{ fontFamily: "Times New Roman, serif" }}>
                        {certificateTitle}
                      </div>
                      <div className="mt-1 text-[13px] font-semibold text-[#8f3b3b] tracking-[0.3em]">
                        {certificateSubtitle}
                      </div>
                      <div className="mx-auto mt-2 h-px w-[112px] bg-[#c8a24a]" />
                      <div className="mt-7 text-[10.5px] tracking-[0.24em] text-[#5c5c5c]">{bodyLine}</div>
                      <div className="mt-9 text-[35px] italic text-[#7d0f14]" style={{ fontFamily: "Georgia, serif" }}>
                        {name || "Recipient Name"}
                      </div>
                      <div className="mt-5 text-[15px] font-semibold text-[#5c5c5c]">{academyName}</div>
                      <div className="mx-auto mt-6 max-w-[470px] text-[10px] leading-[15px] text-[#5c5c5c]">
                        {previewDescriptionLines.map((line) => (
                          <div key={line}>{line}</div>
                        ))}
                      </div>
                    </div>

                    <div className="absolute bottom-[142px] left-[150px] text-center">
                      <div className="text-[15px] italic text-[#4b4b4b]" style={{ fontFamily: "cursive" }}>
                        Signature
                      </div>
                      <div className="mt-2 h-px w-[120px] bg-[#7d0f14]" />
                      <div className="mt-2 text-[11px] font-semibold text-[#7d0f14]">{leftSignerName}</div>
                      <div className="mt-1 text-[9px] font-semibold uppercase text-gray-600">{leftSignerRole}</div>
                    </div>

                    <div className="absolute bottom-[142px] right-[150px] text-center">
                      <div className="text-[15px] italic text-[#4b4b4b]" style={{ fontFamily: "cursive" }}>
                        Signature
                      </div>
                      <div className="mt-2 h-px w-[120px] bg-[#7d0f14]" />
                      <div className="mt-2 text-[11px] font-semibold text-[#7d0f14]">{rightSignerName}</div>
                      <div className="mt-1 text-[9px] font-semibold uppercase text-gray-600">{rightSignerRole}</div>
                    </div>

                    <div className="absolute left-[64px] bottom-[56px] text-[9px] font-semibold text-[#7d0f14]">{companyName}</div>
                    <div className="absolute left-1/2 bottom-[52px] -translate-x-1/2 text-[9px] uppercase tracking-[0.3em] text-gray-500">
                      {issueDate}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
