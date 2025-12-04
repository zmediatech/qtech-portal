"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type GeneratorStyle = {
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor?: string;
  title: { x: number; y: number; fontSize: number; fontWeight?: number; align?: "left" | "center" | "right"; color?: string };
  name: { x: number; y: number; fontSize: number; fontWeight?: number; align?: "left" | "center" | "right"; color?: string };
  info: { x: number; y: number; fontSize: number; fontWeight?: number; align?: "left" | "center" | "right"; color?: string };
  description: { x: number; y: number; fontSize: number; fontWeight?: number; align?: "left" | "center" | "right"; color?: string; maxWidth?: number };
  footer: { x: number; y: number; fontSize: number; fontWeight?: number; align?: "left" | "center" | "right"; color?: string };
};

export type GeneratorPayload = {
  template: "image" | "plain";
  uploadedImageUrl?: string;   // now set from local file via Object URL or Data URL
  title: string;
  description: string;
  issueDate: string;
  customText?: string;
  style: GeneratorStyle;
};

type Props = {
  onGenerate: (payload: GeneratorPayload & { students: Array<{ name: string; regNo: string; class: string }> }) => void;
  onCancel: () => void;
};

export function CertificateGenerator({ onGenerate, onCancel }: Props) {
  const [template, setTemplate] = useState<"image" | "plain">("plain");

  // We’ll store an Object URL for the uploaded image (fast & memory-light)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | undefined>();
  const lastObjectUrlRef = useRef<string | null>(null);

  // Basic fields
  const [title, setTitle] = useState("Certificate of Achievement");
  const [description, setDescription] = useState("For outstanding performance and dedication.");
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [customText, setCustomText] = useState<string>("");

  // Students input
  const [studentsText, setStudentsText] = useState(`John Doe, ST2024-001, Class A
Jane Smith, ST2024-002, Class A
Mike Johnson, ST2024-003, Class B`);

  // Canvas & color config
  const [canvasWidth, setCanvasWidth] = useState(1600);
  const [canvasHeight, setCanvasHeight] = useState(1131);
  const [backgroundColor, setBackgroundColor] = useState<string>("#ffffff");

  const [colorTitle, setColorTitle] = useState("#111827");
  const [colorName, setColorName] = useState("#0f172a");
  const [colorInfo, setColorInfo] = useState("#334155");
  const [colorDesc, setColorDesc] = useState("#111827");
  const [colorFooter, setColorFooter] = useState("#475569");

  // Parse students: "Name, RegNo, Class"
  const parsedStudents = useMemo(() => {
    const arr: Array<{ name: string; regNo: string; class: string }> = [];
    for (const line of studentsText.split("\n")) {
      const t = line.trim();
      if (!t) continue;
      const [name, regNo, cl] = t.split(",").map((s) => (s || "").trim());
      if (!name || !regNo || !cl) continue;
      arr.push({ name, regNo, class: cl });
    }
    return arr;
  }, [studentsText]);

  const style: GeneratorStyle = useMemo(
    () => ({
      canvasWidth,
      canvasHeight,
      backgroundColor,
      title: { x: canvasWidth / 2, y: 180, fontSize: 56, fontWeight: 700, align: "center", color: colorTitle },
      name: { x: canvasWidth / 2, y: 360, fontSize: 64, fontWeight: 800, align: "center", color: colorName },
      info: { x: canvasWidth / 2, y: 430, fontSize: 28, fontWeight: 500, align: "center", color: colorInfo },
      description: {
        x: canvasWidth / 2,
        y: 560,
        fontSize: 28,
        fontWeight: 500,
        align: "center",
        color: colorDesc,
        maxWidth: Math.floor(canvasWidth * 0.75),
      },
      footer: { x: canvasWidth / 2, y: canvasHeight - 120, fontSize: 20, fontWeight: 500, align: "center", color: colorFooter },
    }),
    [canvasWidth, canvasHeight, backgroundColor, colorTitle, colorName, colorInfo, colorDesc, colorFooter]
  );

  // Cleanup previous Object URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (lastObjectUrlRef.current) {
        URL.revokeObjectURL(lastObjectUrlRef.current);
        lastObjectUrlRef.current = null;
      }
    };
  }, []);

  // File input handler: create an Object URL
  const onPickImage = (file?: File) => {
    if (!file) return;
    // Revoke previous URL if any
    if (lastObjectUrlRef.current) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
      lastObjectUrlRef.current = null;
    }
    const objectUrl = URL.createObjectURL(file);
    lastObjectUrlRef.current = objectUrl;
    setUploadedImageUrl(objectUrl);
  };

  const doGenerate = () => {
    const payload: GeneratorPayload & { students: Array<{ name: string; regNo: string; class: string }> } = {
      template,
      uploadedImageUrl: template === "image" ? uploadedImageUrl : undefined, // now from local file
      title,
      description,
      issueDate,
      customText,
      style,
      students: parsedStudents,
    };
    onGenerate(payload);
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Template</Label>
            <Select value={template} onValueChange={(v: "image" | "plain") => setTemplate(v)}>
              <SelectTrigger><SelectValue placeholder="Choose template" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="plain">Plain (background color)</SelectItem>
                <SelectItem value="image">Image background (upload)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {template === "image" ? (
            <>
              <div className="grid gap-2 md:col-span-2">
                <Label>Background Image (from your computer)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPickImage(e.target.files?.[0])}
                />
                {uploadedImageUrl && (
                  <div className="text-xs text-muted-foreground">
                    Selected image ready for preview/export.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="grid gap-2">
              <Label>Background Color</Label>
              <Input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />
            </div>
          )}

          <div className="grid gap-2">
            <Label>Certificate Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Certificate of Achievement" />
          </div>

          <div className="grid gap-2">
            <Label>Issue Date</Label>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>

          <div className="md:col-span-2 grid gap-2">
            <Label>Description</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="md:col-span-2 grid gap-2">
            <Label>Footer Extra (optional)</Label>
            <Input placeholder="Authorized by Principal" value={customText} onChange={(e) => setCustomText(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>List (Name, RegNo, Class) — one per line</Label>
            <Textarea rows={5} value={studentsText} onChange={(e) => setStudentsText(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            Parsed: {Array.isArray(parsedStudents) ? parsedStudents.length : 0} students
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Canvas & Colors</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label>Canvas Width (px)</Label>
            <Input type="number" value={canvasWidth} onChange={(e) => setCanvasWidth(Number(e.target.value || 0))} />
          </div>
          <div className="grid gap-2">
            <Label>Canvas Height (px)</Label>
            <Input type="number" value={canvasHeight} onChange={(e) => setCanvasHeight(Number(e.target.value || 0))} />
          </div>
          <div className="grid gap-2">
            <Label>—</Label>
            <div className="text-sm text-muted-foreground mt-2">Use ~1600×1131 for A4-like landscape ratio.</div>
          </div>

          <div className="grid gap-2">
            <Label>Title Color</Label>
            <Input type="color" value={colorTitle} onChange={(e) => setColorTitle(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Name Color</Label>
            <Input type="color" value={colorName} onChange={(e) => setColorName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Info Color</Label>
            <Input type="color" value={colorInfo} onChange={(e) => setColorInfo(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Description Color</Label>
            <Input type="color" value={colorDesc} onChange={(e) => setColorDesc(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Footer Color</Label>
            <Input type="color" value={colorFooter} onChange={(e) => setColorFooter(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={doGenerate} disabled={template === "image" && !uploadedImageUrl}>
          Generate
        </Button>
      </div>
    </div>
  );
}
