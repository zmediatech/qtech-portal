"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    regNo: z.string().min(1, "Registration No is required"),
    studentName: z.string().min(1, "Student name is required"),
    className: z.string().min(1, "Class name is required"),
    subject: z.string().min(1, "Subject is required"),
    examTitle: z.string().default("Exam"),
    examDate: z.string().optional(), // YYYY-MM-DD
    totalMarks: z
      .number({ invalid_type_error: "Total marks must be a number" })
      .min(1, "Total marks must be at least 1"),
    obtainedMarks: z
      .number({ invalid_type_error: "Obtained marks must be a number" })
      .min(0, "Obtained marks cannot be negative"),
  })
  .refine((v) => v.obtainedMarks <= v.totalMarks, {
    message: "Obtained marks cannot exceed total marks",
    path: ["obtainedMarks"],
  });

export type MarksFormValues = z.infer<typeof schema> & {
  percentage?: number;
  grade?: string;
};

function getGrade(pct: number): string {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
}

export default function MarksForm({
  className,
  onSubmitted,
  initialValues,
}: {
  className?: string;
  onSubmitted?: (created: any) => void;
  initialValues?: Partial<MarksFormValues>;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MarksFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      regNo: "",
      studentName: "",
      className: "",
      subject: "",
      examTitle: "Exam",
      examDate: "",
      totalMarks: 100,
      obtainedMarks: 0,
      ...initialValues,
    },
  });

  const totalMarks = watch("totalMarks");
  const obtainedMarks = watch("obtainedMarks");

  const { percentage, grade } = useMemo(() => {
    const t = Number(totalMarks) || 0;
    const o = Number(obtainedMarks) || 0;
    if (t <= 0) return { percentage: 0, grade: "F" };
    const pct = Math.max(0, Math.min(100, +(o * 100 / t).toFixed(2)));
    return { percentage: pct, grade: getGrade(pct) };
  }, [totalMarks, obtainedMarks]);

  useEffect(() => {
    setValue("percentage", percentage as any);
    setValue("grade", grade as any);
  }, [percentage, grade, setValue]);

  const onSubmit = async (values: MarksFormValues) => {
    const payload = {
      regNo: values.regNo.trim(),
      studentName: values.studentName.trim(),
      className: values.className.trim(),
      subject: values.subject.trim(),
      examTitle: (values.examTitle || "Exam").trim(),
      examDate: values.examDate ? new Date(values.examDate) : undefined,
      totalMarks: Number(values.totalMarks),
      obtainedMarks: Number(values.obtainedMarks),
      percentage,
      grade,
    };

    // Always call your backend directly (port 5000), with env override if present
    const API_ROOT = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");
    const url = `${API_ROOT}/api/marks`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();

    if (!res.ok) {
      let msg = `Failed to create mark record (HTTP ${res.status}).`;
      if (contentType.includes("application/json")) {
        try {
          const j = JSON.parse(text);
          msg = j?.error || j?.message || msg;
        } catch {}
      } else if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
        msg += " Received HTML instead of JSON. Check the URL (should be http://localhost:5000/api/marks).";
      } else if (text) {
        msg = text;
      }
      throw new Error(msg);
    }

    if (!contentType.includes("application/json")) {
      throw new Error("Server did not return JSON. Make sure Express returns JSON on /api/marks.");
    }

    const data = JSON.parse(text);
    const created = (data && (data.data || data)) ?? data;

    onSubmitted?.(created);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn("grid gap-4 sm:grid-cols-2", className)}>
      {/* Student Info */}
      <div className="sm:col-span-2 grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="regNo">Registration No</Label>
          <Input id="regNo" placeholder="e.g. R-2025-001" {...register("regNo")} />
          {errors.regNo && <p className="text-sm text-red-600 mt-1">{errors.regNo.message}</p>}
        </div>
        <div>
          <Label htmlFor="studentName">Student Name</Label>
          <Input id="studentName" placeholder="e.g. Ali Khan" {...register("studentName")} />
          {errors.studentName && <p className="text-sm text-red-600 mt-1">{errors.studentName.message}</p>}
        </div>
        <div>
          <Label htmlFor="className">Class</Label>
          <Input id="className" placeholder="e.g. Grade 10-A" {...register("className")} />
          {errors.className && <p className="text-sm text-red-600 mt-1">{errors.className.message}</p>}
        </div>
      </div>

      {/* Exam Info */}
      <div>
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" placeholder="e.g. Mathematics" {...register("subject")} />
        {errors.subject && <p className="text-sm text-red-600 mt-1">{errors.subject.message}</p>}
      </div>
      <div>
        <Label htmlFor="examTitle">Exam Title</Label>
        <Input id="examTitle" placeholder="e.g. Mid Term" {...register("examTitle")} />
        {errors.examTitle && <p className="text-sm text-red-600 mt-1">{(errors as any).examTitle?.message as string}</p>}
      </div>
      <div>
        <Label htmlFor="examDate">Exam Date</Label>
        <Input id="examDate" type="date" {...register("examDate")} />
      </div>

      {/* Marks */}
      <div>
        <Label htmlFor="totalMarks">Total Marks</Label>
        <Input id="totalMarks" type="number" step="1" min={1} {...register("totalMarks", { valueAsNumber: true })} />
        {errors.totalMarks && <p className="text-sm text-red-600 mt-1">{errors.totalMarks.message}</p>}
      </div>
      <div>
        <Label htmlFor="obtainedMarks">Obtained Marks</Label>
        <Input id="obtainedMarks" type="number" step="1" min={0} {...register("obtainedMarks", { valueAsNumber: true })} />
        {errors.obtainedMarks && <p className="text-sm text-red-600 mt-1">{errors.obtainedMarks.message}</p>}
      </div>

      {/* Computed */}
      <div>
        <Label>Percentage</Label>
        <Input value={percentage} readOnly />
      </div>
      <div>
        <Label>Grade</Label>
        <Input value={grade} readOnly />
      </div>

      <div className="sm:col-span-2">
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? "Saving..." : "Save Marks"}
        </Button>
      </div>
    </form>
  );
}
