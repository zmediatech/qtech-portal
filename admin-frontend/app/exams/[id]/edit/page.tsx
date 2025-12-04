"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminLayout } from "@/components/admin-layout";
import { ExamForm } from "@/components/exam-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
function withApiBase(base: string) {
  const clean = base.replace(/\/+$/, "");
  return /\/api$/i.test(clean) ? clean : `${clean}/api`;
}
const API_BASE = withApiBase(RAW_BASE);

type QuestionType = "multiple-choice" | "short-answer" | "essay";

type UIQuestion = {
  id?: string;
  question: string;
  type: QuestionType;
  options?: string[];
  correctOptionIndex?: number;
  correctAnswerText?: string;
  answerText?: string;
  points?: number;
};

type UIExam = {
  id: string;
  title: string;
  class: string;
  subject: string;
  date: string;
  duration: number;
  instructions?: string;
  questions: UIQuestion[];
  classId?: string;
  subjectId?: string;
  fullPaperText?: string; // ✅ NEW
};

type ServerQuestion = {
  order?: number;
  type?: QuestionType;
  text: string;
  options?: string[];
  correctOptionIndex?: number;
  correctAnswerText?: string;
  answerText?: string;
  marks?: number;
  explanation?: string;
};

type ServerExam = {
  _id: string;
  title: string;
  classId: string;
  subjectId: string;
  className?: string;
  subjectName?: string;
  startAt: string;
  durationMinutes: number;
  instructions?: string;
  status: "draft" | "published" | "archived";
  questions: ServerQuestion[];
  fullPaperText?: string; // ✅ NEW
};

type Class = { _id: string; name: string };
type Subject = { _id: string; name: string };

function toUILocalDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
function toServerDDMMYYYY_HHMM(input: string) {
  const d = new Date(input);
  if (isNaN(d.getTime())) return input;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
function mapServerToUI(ex: ServerExam): UIExam {
  return {
    id: ex._id,
    title: ex.title,
    class: ex.className ?? "",
    subject: ex.subjectName ?? "",
    date: toUILocalDateTime(ex.startAt),
    duration: ex.durationMinutes,
    instructions: ex.instructions || "",
    classId: ex.classId,
    subjectId: ex.subjectId,
    fullPaperText: ex.fullPaperText || "", // ✅
    questions: (ex.questions || []).map((q, idx) => ({
      id: String(idx + 1),
      question: q.text,
      type:
        q.type ??
        (Array.isArray(q.options) && q.options.length ? "multiple-choice" : "short-answer"),
      options: q.options ?? [],
      correctOptionIndex:
        typeof q.correctOptionIndex === "number" ? q.correctOptionIndex : undefined,
      correctAnswerText: q.correctAnswerText ?? "",
      answerText: q.answerText ?? "",
      points: typeof q.marks === "number" ? q.marks : 1,
    })),
  };
}

export default function EditExamPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [serverExam, setServerExam] = useState<ServerExam | null>(null);
  const [uiExam, setUiExam] = useState<UIExam | null>(null);

  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const [er, cr, sr] = await Promise.all([
          fetch(`${API_BASE}/exams/${id}`, { cache: "no-store" }),
          fetch(`${API_BASE}/classes`, { cache: "no-store" }),
          fetch(`${API_BASE}/subjects`, { cache: "no-store" }),
        ]);
        const [ej, cj, sj] = await Promise.all([er.json(), cr.json(), sr.json()]);
        if (!er.ok) throw new Error(ej?.error || "Failed to load exam");

        const ex = ej.data as ServerExam;
        setServerExam(ex);
        setUiExam(mapServerToUI(ex));

        setClasses(Array.isArray(cj) ? cj : cj.data || []);
        setSubjects(Array.isArray(sj) ? sj : sj.data || []);
      } catch (e: any) {
        alert(e.message || "Load failed");
        router.push("/exams");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  const handleSubmit = async (formData: Partial<UIExam>) => {
    if (!serverExam || !id) return;
    try {
      const merged: UIExam = { ...(uiExam as UIExam), ...(formData || {}) };

      const classIdToSend = (merged as any).classId || serverExam.classId;
      const subjectIdToSend = (merged as any).subjectId || serverExam.subjectId;

      const className =
        classes.find((c) => c._id === classIdToSend)?.name ??
        merged.class ??
        serverExam.className ??
        "";

      const subjectName =
        subjects.find((s) => s._id === subjectIdToSend)?.name ??
        merged.subject ??
        serverExam.subjectName ??
        "";

      const mergedQuestions = (merged.questions || []).map(
        (q, idx): ServerQuestion => {
          const prev = serverExam.questions?.[idx];
          const type: QuestionType = q.type ?? prev?.type ?? "short-answer";

          const options =
            type === "multiple-choice"
              ? q.options ?? prev?.options ?? []
              : undefined;
          const correctOptionIndex =
            type === "multiple-choice"
              ? typeof q.correctOptionIndex === "number"
                ? q.correctOptionIndex
                : typeof prev?.correctOptionIndex === "number"
                ? prev.correctOptionIndex
                : undefined
              : undefined;

          const correctAnswerText =
            type !== "multiple-choice"
              ? q.correctAnswerText ?? prev?.correctAnswerText ?? ""
              : undefined;

          return {
            order: prev?.order ?? idx + 1,
            type,
            text: q.question,
            options,
            correctOptionIndex,
            correctAnswerText,
            answerText: q.answerText ?? prev?.answerText ?? "",
            marks: typeof q.points === "number" ? q.points : prev?.marks ?? 1,
            explanation: prev?.explanation,
          };
        }
      );

      const payload: Partial<ServerExam> = {
        title: merged.title,
        classId: classIdToSend,
        subjectId: subjectIdToSend,
        className,
        subjectName,
        startAt: toServerDDMMYYYY_HHMM(merged.date),
        durationMinutes: merged.duration,
        instructions: merged.instructions || "",
        fullPaperText: merged.fullPaperText || "", // ✅ include full paper
        questions: mergedQuestions,
      };

      const res = await fetch(`${API_BASE}/exams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Update failed");

      router.push(`/exams/${id}`);
    } catch (e: any) {
      alert(e.message || "Update failed");
    }
  };

  const handleCancel = () => {
    if (id) router.push(`/exams/${id}`);
    else router.push("/exams");
  };

  const handleDownloadPDF = () => {
    if (!uiExam?.fullPaperText) {
      alert("No paper content available");
      return;
    }
    const doc = new jsPDF();
    doc.setFont("times", "normal");
    doc.text(uiExam.fullPaperText, 10, 10, { maxWidth: 180 });
    doc.save(`${uiExam.title || "exam"}.pdf`);
  };

  if (!id || loading || !uiExam) {
    return (
      <AdminLayout>
        <div>Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold md:text-2xl">Edit Exam</h1>
          <p className="text-muted-foreground">
            Update exam details and questions
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exam Details</CardTitle>
          <CardDescription>
            Modify the exam information and questions as needed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* ✅ New textarea for full paper */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Full Paper Content
            </label>
            <textarea
              className="w-full rounded border p-2 text-sm"
              rows={10}
              value={uiExam.fullPaperText || ""}
              onChange={(e) =>
                setUiExam({ ...(uiExam as UIExam), fullPaperText: e.target.value })
              }
              placeholder="Paste or write the complete paper here..."
            />
            <Button className="mt-2" onClick={handleDownloadPDF}>
              Download Paper as PDF
            </Button>
          </div>

          {/* Existing exam form */}
          <ExamForm
            exam={{
              ...uiExam,
              instructions: uiExam.instructions ?? "",
              questions: uiExam.questions.map((q, idx) => ({
                ...q,
                id: q.id ?? String(idx + 1),
                points: q.points ?? 1,
                type: q.type ?? "short-answer",
                options: q.type === "multiple-choice" ? q.options ?? [] : [],
                correctOptionIndex:
                  q.type === "multiple-choice" &&
                  typeof q.correctOptionIndex === "number"
                    ? q.correctOptionIndex
                    : undefined,
                correctAnswerText:
                  q.type !== "multiple-choice" ? q.correctAnswerText ?? "" : undefined,
                answerText: q.answerText ?? "",
              })),
            }}
            // @ts-ignore
            classOptions={classes}
            // @ts-ignore
            subjectOptions={subjects}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
