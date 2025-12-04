"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Plus, Search, Filter, MoreHorizontal, Eye, Edit, Trash2, Calendar, FileText, Download } from "lucide-react";

declare global {
  interface Window {
    html2pdf?: any;
  }
}

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
const API_BASE = `${RAW_BASE.replace(/\/+$/,"")}/api`;

type QuestionType = "multiple-choice" | "short-answer" | "essay";

type Question = {
  type?: QuestionType;
  text: string;
  options?: string[];              // MCQ
  correctOptionIndex?: number;     // MCQ
  correctAnswerText?: string;      // Short / Essay (legacy per-type)
  answerText?: string;             // NEW: universal answer key (MCQ/Short/Essay)
  marks?: number;
  explanation?: string;
  order?: number;
};

type Exam = {
  _id: string;
  title: string;
  classId: string;
  subjectId: string;
  className?: string;
  subjectName?: string;
  startAt: string; // ISO from API
  durationMinutes: number;
  instructions?: string;
  status: "draft" | "published" | "archived";
  questions: Question[];
  createdAt?: string;
  updatedAt?: string;
};

type Klass = { _id: string; name: string };
type Subject = { _id: string; name: string };

function formatDateTime(dt: string | Date) {
  const d = typeof dt === "string" ? new Date(dt) : dt;
  return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "published":
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "draft":
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    default:
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
  }
};

/** Try two CDNs for html2pdf; no popups */
async function loadHtml2Pdf(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.html2pdf) return;

  const sources = [
    "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js",
    "https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js",
  ];

  for (const src of sources) {
    try {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.crossOrigin = "anonymous";
        s.referrerPolicy = "no-referrer";
        const timer = setTimeout(() => reject(new Error("load timeout")), 8000);
        s.onload = () => { clearTimeout(timer); resolve(); };
        s.onerror = () => { clearTimeout(timer); reject(new Error("load error")); };
        document.body.appendChild(s);
      });
      if (window.html2pdf) return;
    } catch {
      // try next
    }
  }
  throw new Error("Could not load PDF library from CDN");
}

/** ANSWERS PDF — shows correct answers only (MCQ ✓ and Short/Essay text answer) + NEW universal answerText */
function buildAnswerHTML(exam: Exam) {
  const safe = (t?: string) => (t ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const dateStr = formatDateTime(exam.startAt);

  const rows = (exam.questions || []).map((q, i) => {
    const type: QuestionType = q.type ?? (q.options?.length ? "multiple-choice" : "short-answer");

    // MCQ: highlight only the correct option; if answerText exists, show it below
    if (type === "multiple-choice") {
      const opts = (q.options || []).map((opt, idx) => {
        const letter = String.fromCharCode(65 + idx);
        const isCorrect = typeof q.correctOptionIndex === "number" && idx === q.correctOptionIndex;
        return `
          <li class="opt${isCorrect ? " correct" : ""}">
            <span class="opt-bullet">${letter}.</span>
            <span>${safe(opt)}</span>
            ${isCorrect ? `<span class="tick">✓</span>` : ``}
          </li>
        `;
      }).join("");

      const extra = (q.answerText ?? "").trim();

      return `
        <div class="q">
          <div class="q-head">
            <div class="q-title"><span class="q-num">${i + 1}.</span> ${safe(q.text)}</div>
            <div class="q-meta">${q.marks ?? 1} mark${(q.marks ?? 1) === 1 ? "" : "s"}</div>
          </div>
          ${opts ? `<ol class="opts">${opts}</ol>` : ``}
          ${extra ? `<div class="answer"><strong>Answer:</strong> ${safe(extra)}</div>` : ``}
        </div>
      `;
    }

    // Short / Essay: prefer answerText; fallback to correctAnswerText; show optional explanation
    const label = type === "essay" ? "Model Answer" : "Answer";
    const answerKey = (q.answerText ?? "").trim() || (q.correctAnswerText ?? "").trim() || "—";
    const expl = (q.explanation ?? "").trim();

    return `
      <div class="q">
        <div class="q-head">
          <div class="q-title"><span class="q-num">${i + 1}.</span> ${safe(q.text)}</div>
          <div class="q-meta">${q.marks ?? 1} mark${(q.marks ?? 1) === 1 ? "" : "s"}</div>
        </div>
        <div class="answer"><strong>${label}:</strong> ${safe(answerKey)}</div>
        ${expl ? `<div class="explain"><strong>Explanation:</strong> ${safe(expl)}</div>` : ``}
      </div>
    `;
  }).join("");

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${safe(exam.title)} — Answers</title>
<style>
  html, body { margin:0; padding:0; background:#ffffff; }
  * { box-sizing:border-box; color:inherit; background:transparent; }
  :root { color-scheme: light; }

  body { font-family: Arial, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", sans-serif; color:#111111; padding:24px; }
  .doc { max-width:800px; margin:0 auto; }

  .header { text-align:center; margin-bottom:16px; }
  .title { font-size:24px; font-weight:700; margin:0 0 6px; color:#111111; }
  .subtitle { font-size:14px; color:#444; margin:0; }

  .grid { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:8px 16px; margin:14px 0; }
  .label { color:#555555; font-size:12px; }
  .val { font-weight:600; color:#222222; }

  .q { border:1px solid #eeeeee; border-radius:8px; padding:10px 12px; margin-bottom:10px; background:#ffffff; }
  .q-head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .q-title { font-weight:600; color:#222222; }
  .q-num { color:#666666; margin-right:6px; }
  .q-meta { font-size:12px; color:#555555; }
  .answer { margin-top:8px; font-size:14px; color:#222; }
  .explain { margin-top:6px; font-size:13px; color:#333; }

  .opts { list-style:none; padding:0; margin:8px 0 0; }
  .opt { display:flex; align-items:center; gap:8px; padding:4px 0; color:#222222; }
  .opt-bullet { width:18px; font-weight:600; color:#444444; }
  .tick { margin-left:auto; color:#0a7f2e; font-weight:700; }
  .opt.correct { background:#f3fff6; border-radius:6px; padding-left:6px; }

  @media print {
    body { padding:0; }
    .q { break-inside:avoid; page-break-inside:avoid; }
  }
</style>
</head>
<body>
  <div class="doc">
    <div class="header">
      <h1 class="title">${safe(exam.title)} — Answers</h1>
      <p class="subtitle">Answer Key / Model Solutions</p>
    </div>

    <div class="grid">
      <div><div class="label">Date & Time</div><div class="val">${safe(dateStr)}</div></div>
      <div><div class="label">Duration</div><div class="val">${exam.durationMinutes} min</div></div>
      <div><div class="label">Class</div><div class="val">${safe(exam.className || "—")}</div></div>
      <div><div class="label">Subject</div><div class="val">${safe(exam.subjectName || "—")}</div></div>
    </div>

    ${rows || `<div>No questions.</div>`}
  </div>
</body>
</html>
  `;
}

/** QUESTIONS PDF — never shows the answers */
function buildExamHTML(exam: Exam) {
  const safe = (t?: string) => (t ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const dateStr = formatDateTime(exam.startAt);

  const rows = (exam.questions || []).map((q, i) => {
    const type: QuestionType = q.type ?? (q.options?.length ? "multiple-choice" : "short-answer");
    const marks = q.marks ?? 1;

    if (type === "multiple-choice") {
      const opts = (q.options || []).map((opt, idx) => {
        const letter = String.fromCharCode(65 + idx);
        return `
          <li class="opt">
            <span class="opt-bullet">${letter}.</span>
            <span>${safe(opt)}</span>
          </li>
        `;
      }).join("");

      return `
        <div class="q">
          <div class="q-head">
            <div class="q-title"><span class="q-num">${i + 1}.</span> ${safe(q.text)}</div>
            <div class="q-meta">${marks} mark${marks === 1 ? "" : "s"}</div>
          </div>
          ${opts ? `<ol class="opts">${opts}</ol>` : ``}
        </div>
      `;
    }

    // Short/Essay: provide blank lines / area for writing
    const lines = type === "essay"
      ? `<div class="writearea"></div>`
      : `<div class="lines">
           <div class="line"></div>
           <div class="line"></div>
           <div class="line"></div>
         </div>`;

    return `
      <div class="q">
        <div class="q-head">
          <div class="q-title"><span class="q-num">${i + 1}.</span> ${safe(q.text)}</div>
          <div class="q-meta">${marks} mark${marks === 1 ? "" : "s"}</div>
        </div>
        ${lines}
      </div>
    `;
  }).join("");

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${safe(exam.title)}</title>
<style>
  html, body { margin:0; padding:0; background:#ffffff; }
  * { box-sizing:border-box; color:inherit; background:transparent; }
  :root { color-scheme: light; }

  body { font-family: Arial, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", sans-serif; color:#111111; padding:24px; }
  .doc { max-width:800px; margin:0 auto; }

  .header { text-align:center; margin-bottom:12px; }
  .title { font-size:24px; font-weight:700; margin:0 0 6px; color:#111111; }

  .student-info { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:10px 24px; margin:8px 0 4px; }
  .writein { display:flex; align-items:flex-end; gap:8px; font-size:14px; }
  .writein .wlabel { color:#555555; width:max-content; }
  .writein .line { flex:1; border-bottom:1px solid #999999; height:22px; }

  .grid { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:8px 16px; margin:14px 0; }
  .label { color:#555555; font-size:12px; }
  .val { font-weight:600; color:#222222; }

  .q { border:1px solid #eeeeee; border-radius:8px; padding:10px 12px; margin-bottom:10px; background:#ffffff; }
  .q-head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .q-title { font-weight:600; color:#222222; }
  .q-num { color:#666666; margin-right:6px; }
  .q-meta { font-size:12px; color:#555555; }

  .opts { list-style:none; padding:0; margin:8px 0 0; }
  .opt { display:flex; align-items:center; gap:8px; padding:4px 0; color:#222222; }
  .opt-bullet { width:18px; font-weight:600; color:#444444; }

  .lines { display:flex; flex-direction:column; gap:10px; margin-top:12px; }
  .lines .line { border-bottom:1px dashed #999999; height:20px; }
  .writearea { margin-top:12px; height:220px; border:1px dashed #bbbbbb; border-radius:6px; }

  @media print {
    body { padding:0; }
    .q { break-inside:avoid; page-break-inside:avoid; }
  }
</style>
</head>
<body>
  <div class="doc">
    <div class="header">
      <h1 class="title">${safe(exam.title)}</h1>
    </div>

    <div class="student-info">
      <div class="writein"><span class="wlabel">Student Name:</span><span class="line"></span></div>
      <div class="writein"><span class="wlabel">Reg. No.:</span><span class="line"></span></div>
    </div>

    <div class="grid">
      <div><div class="label">Date & Time</div><div class="val">${safe(dateStr)}</div></div>
      <div><div class="label">Duration</div><div class="val">${exam.durationMinutes} min</div></div>
      <div><div class="label">Class</div><div class="val">${safe(exam.className || "—")}</div></div>
      <div><div class="label">Subject</div><div class="val">${safe(exam.subjectName || "—")}</div></div>
    </div>

    ${exam.instructions ? `<div class="section"><div class="label">Instructions</div><div>${safe(exam.instructions)}</div></div>` : ``}

    ${rows || `<div>No questions.</div>`}
  </div>
</body>
</html>
  `;
}

export default function ExamsPage() {
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [total, setTotal] = useState(0);

  const [classes, setClasses] = useState<Klass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [q, setQ] = useState("");
  const [classId, setClassId] = useState<string>("all");
  const [subjectId, setSubjectId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  useEffect(() => {
    (async () => {
      try {
        const [cr, sr] = await Promise.all([
          fetch(`${API_BASE}/classes`, { cache: "no-store" }),
          fetch(`${API_BASE}/subjects`, { cache: "no-store" }),
        ]);
        const cjson = await cr.json();
        const sjson = await sr.json();
        setClasses(Array.isArray(cjson) ? cjson : (cjson.data || []));
        setSubjects(Array.isArray(sjson) ? sjson : (sjson.data || []));
      } catch (e) {
        console.warn("Failed to load classes/subjects", e);
      }
    })();
  }, []);

  const queryObj = useMemo(() => {
    const p: Record<string, string> = { page: "1", limit: "20", sort: "startAt:asc,createdAt:desc" };
    if (q) p.q = q;
    if (classId !== "all") p.classId = classId;
    if (subjectId !== "all") p.subjectId = subjectId;
    if (status !== "all") p.status = status;
    return p;
  }, [q, classId, subjectId, status]);

  async function listExams() {
    setLoading(true);
    try {
      const sp = new URLSearchParams(queryObj).toString();
      const res = await fetch(`${API_BASE}/exams${sp ? `?${sp}` : ""}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load");
      setExams(json.data || []);
      setTotal(json.meta?.total || 0);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    listExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => listExams();

  const onDelete = async (id: string) => {
    if (!confirm("Delete this exam?")) return;
    try {
      const res = await fetch(`${API_BASE}/exams/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Delete failed");
      await listExams();
    } catch (e: any) {
      alert(e.message);
    }
  };

  /** Export Questions-only PDF */
  const onDownload = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/exams/${id}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load exam");
      const exam: Exam = json.data;

      const html = buildExamHTML(exam);

      const iframe = document.createElement("iframe");
      iframe.setAttribute("sandbox", "allow-same-origin allow-modals");
      iframe.style.position = "fixed";
      iframe.style.left = "-10000px";
      iframe.style.top = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) throw new Error("Could not create isolated document");

      doc.open();
      doc.write(html);
      doc.close();

      await new Promise((r) => requestAnimationFrame(() => r(undefined)));

      try {
        await loadHtml2Pdf();
        const target = (doc.querySelector(".doc") as HTMLElement) || doc.body;
        const filename = `Exam_${(exam.title || "Untitled").replace(/[^\w\-]+/g, "_")}.pdf`;

        await window
          .html2pdf()
          .from(target)
          .set({
            margin: 10,
            filename,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          })
          .save();
      } catch (err) {
        const w = iframe.contentWindow;
        if (!w) throw err;
        w.focus();
        w.print();
      } finally {
        iframe.remove();
      }
    } catch (e: any) {
      alert(e.message || "PDF export failed");
    }
  };

  /** Export Answers-only PDF */
  const onAnswerDownload = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/exams/${id}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load exam");
      const exam: Exam = json.data;

      const html = buildAnswerHTML(exam);

      const iframe = document.createElement("iframe");
      iframe.setAttribute("sandbox", "allow-same-origin allow-modals");
      iframe.style.position = "fixed";
      iframe.style.left = "-10000px";
      iframe.style.top = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) throw new Error("Could not create isolated document");

      doc.open();
      doc.write(html);
      doc.close();

      await new Promise((r) => requestAnimationFrame(() => r(undefined)));

      try {
        await loadHtml2Pdf();
        const target = (doc.querySelector(".doc") as HTMLElement) || doc.body;
        const filename = `Answers_${(exam.title || "Untitled").replace(/[^\w\-]+/g, "_")}.pdf`;

        await window
          .html2pdf()
          .from(target)
          .set({
            margin: 10,
            filename,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          })
          .save();
      } catch (err) {
        const w = iframe.contentWindow;
        if (!w) throw err;
        w.focus();
        w.print();
      } finally {
        iframe.remove();
      }
    } catch (e: any) {
      alert(e.message || "PDF export failed");
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold md:text-2xl">Exams</h1>
          <p className="text-muted-foreground">Manage exams and assessments</p>
        </div>
        <Link href="/exams/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Exam
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter exams by class, subject, or status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search exams..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </div>

            <Select value={classId} onValueChange={(v) => setClassId(v)}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={subjectId} onValueChange={(v) => setSubjectId(v)}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={(v) => setStatus(v)}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={applyFilters} disabled={loading}>
              <Filter className="h-4 w-4 mr-2" />
              {loading ? "Loading..." : "Apply"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Exams</CardTitle>
          <CardDescription>{total} exams found</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[110px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.map((e) => (
                <TableRow key={e._id}>
                  <TableCell>
                    <Link href={`/exams/${e._id}`} className="font-medium hover:underline">
                      {e.title}
                    </Link>
                  </TableCell>
                  <TableCell>{e.className ?? "—"}</TableCell>
                  <TableCell>{e.subjectName ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDateTime(e.startAt)}
                    </div>
                  </TableCell>
                  <TableCell>{e.durationMinutes} min</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {e.questions?.length ?? 0}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={getStatusColor(e.status)}>{e.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/exams/${e._id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/exams/${e._id}/edit`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAnswerDownload(e._id)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download Answers
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDownload(e._id)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download Exam
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(e._id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!exams.length && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No exams found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
