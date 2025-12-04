"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Plus, Trash2, GripVertical, CheckCircle2 } from "lucide-react";

type QuestionType = "multiple-choice" | "short-answer" | "essay";

type UIQuestion = {
  id?: string;
  question: string;
  type: QuestionType;
  options?: string[];              // MCQ
  correctOptionIndex?: number;     // MCQ
  correctAnswerText?: string;      // Short / Essay (legacy)
  answerText?: string;             // NEW: answer key only (all types)
  points?: number;
};

type UIExam = {
  id?: string;
  title: string;
  class: string;
  subject: string;
  date: string;            // "YYYY-MM-DDTHH:mm"
  duration: number;
  instructions?: string;
  questions: UIQuestion[];
  classId?: string;
  subjectId?: string;
};

type Class = { _id: string; name: string };
type Subject = { _id: string; name: string };

type Props = {
  exam: UIExam;
  classOptions?: Class[];
  subjectOptions?: Subject[];
  onSubmit: (examPartial: Partial<UIExam>) => void | Promise<void>;
  onCancel?: () => void;
};

export function ExamForm({
  exam,
  classOptions = [],
  subjectOptions = [],
  onSubmit,
  onCancel,
}: Props) {
  const [form, setForm] = useState<UIExam>(() => ({
    ...exam,
    questions: (exam.questions || []).map((q, i) => ({
      id: q.id ?? String(i + 1),
      question: q.question ?? "",
      type: q.type ?? "short-answer",
      options: Array.isArray(q.options) ? q.options : [],
      correctOptionIndex:
        typeof q.correctOptionIndex === "number" ? q.correctOptionIndex : undefined,
      correctAnswerText: q.correctAnswerText ?? "",
      answerText: q.answerText ?? "", // NEW
      points: typeof q.points === "number" ? q.points : 1,
    })),
  }));
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof UIExam>(key: K, val: UIExam[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const updateQ = (idx: number, patch: Partial<UIQuestion>) =>
    setForm((f) => {
      const qs = [...f.questions];
      qs[idx] = { ...qs[idx], ...patch };
      if (patch.type) {
        if (patch.type === "multiple-choice") {
          qs[idx].correctAnswerText = undefined; // legacy per-type
          qs[idx].options = (qs[idx].options ?? []).slice(0, 4);
          if (!qs[idx].options.length) qs[idx].options = ["", ""];
          if (typeof qs[idx].correctOptionIndex !== "number") qs[idx].correctOptionIndex = 0;
        } else {
          qs[idx].options = [];
          qs[idx].correctOptionIndex = undefined;
          qs[idx].correctAnswerText = qs[idx].correctAnswerText ?? "";
        }
      }
      return { ...f, questions: qs };
    });

  const addQuestion = (type: QuestionType = "short-answer") =>
    setForm((f) => ({
      ...f,
      questions: [
        ...f.questions,
        {
          id: String((f.questions?.length ?? 0) + 1),
          question: "",
          type,
          options: type === "multiple-choice" ? ["", ""] : [],
          points: 1,
          correctOptionIndex: type === "multiple-choice" ? 0 : undefined,
          correctAnswerText: type === "multiple-choice" ? undefined : "",
          answerText: "", // NEW default
        },
      ],
    }));

  const removeQuestion = (idx: number) =>
    setForm((f) => ({
      ...f,
      questions: f.questions.filter((_, i) => i !== idx).map((q, i) => ({ ...q, id: String(i + 1) })),
    }));

  const moveQuestion = (idx: number, dir: -1 | 1) =>
    setForm((f) => {
      const qs = [...f.questions];
      const j = idx + dir;
      if (j < 0 || j >= qs.length) return f;
      [qs[idx], qs[j]] = [qs[j], qs[idx]];
      return { ...f, questions: qs.map((q, i) => ({ ...q, id: String(i + 1) })) };
    });

  const setMCQOption = (qIndex: number, optIndex: number, value: string) =>
    setForm((f) => {
      const qs = [...f.questions];
      const q = { ...qs[qIndex] };
      const opts = (q.options ?? []).slice();
      while (optIndex >= opts.length) opts.push("");
      opts[optIndex] = value;
      q.options = opts;
      qs[qIndex] = q;
      return { ...f, questions: qs };
    });

  const addMCQOption = (qIndex: number) =>
    setForm((f) => {
      const qs = [...f.questions];
      const q = { ...qs[qIndex] };
      const opts = (q.options ?? []).slice();
      if (opts.length >= 8) return f;
      opts.push("");
      q.options = opts;
      qs[qIndex] = q;
      return { ...f, questions: qs };
    });

  const removeMCQOption = (qIndex: number, optIndex: number) =>
    setForm((f) => {
      const qs = [...f.questions];
      const q = { ...qs[qIndex] };
      const opts = (q.options ?? []).slice();
      opts.splice(optIndex, 1);
      q.options = opts;
      if (
        typeof q.correctOptionIndex === "number" &&
        (q.correctOptionIndex < 0 || q.correctOptionIndex >= opts.length)
      ) {
        q.correctOptionIndex = opts.length ? 0 : undefined;
      }
      qs[qIndex] = q;
      return { ...f, questions: qs };
    });

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanedQuestions: UIQuestion[] = form.questions.map((q) => {
        const base: UIQuestion = {
          id: q.id,
          question: q.question?.trim() ?? "",
          type: q.type ?? "short-answer",
          points: typeof q.points === "number" ? q.points : 1,
          answerText: (q.answerText ?? "").trim(), // NEW
        };

        if (base.type === "multiple-choice") {
          const options = (q.options ?? []).map((s) => (s ?? "").trim()).filter(Boolean);
          let ci =
            typeof q.correctOptionIndex === "number" &&
            q.correctOptionIndex >= 0 &&
            q.correctOptionIndex < options.length
              ? q.correctOptionIndex
              : undefined;
          if (ci == null && options.length >= 2) ci = 0;
          return {
            ...base,
            options,
            correctOptionIndex: ci,
          };
        } else {
          return {
            ...base,
            correctAnswerText: (q.correctAnswerText ?? "").trim(),
          };
        }
      });

      await onSubmit({
        ...form,
        questions: cleanedQuestions,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top fields */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Title</label>
          <Input
            placeholder="Exam title"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Date & Time</label>
          <Input
            type="datetime-local"
            value={form.date}
            onChange={(e) => setField("date", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Class</label>
          <Select
            value={form.classId}
            onValueChange={(v) => setField("classId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classOptions.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Subject</label>
          <Select
            value={form.subjectId}
            onValueChange={(v) => setField("subjectId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {subjectOptions.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Duration (minutes)</label>
          <Input
            type="number"
            min={1}
            value={form.duration}
            onChange={(e) => setField("duration", Number(e.target.value || 0))}
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <label className="text-sm font-medium">Instructions</label>
          <Textarea
            placeholder="General instructions for students"
            value={form.instructions ?? ""}
            onChange={(e) => setField("instructions", e.target.value)}
          />
        </div>
      </div>

      {/* Questions */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-medium">Questions ({form.questions.length})</div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => addQuestion("multiple-choice")}>
                  Multiple Choice
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addQuestion("short-answer")}>
                  Short Answer
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addQuestion("essay")}>
                  Essay
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-4">
            {form.questions.map((q, i) => (
              <div key={q.id ?? i} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm font-medium">Q{i + 1}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => moveQuestion(i, -1)} disabled={i === 0}>
                      ↑
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => moveQuestion(i, +1)} disabled={i === form.questions.length - 1}>
                      ↓
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => removeQuestion(i)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>

                <div className="grid md:grid-cols-6 gap-3">
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-sm font-medium">Question</label>
                    <Input
                      placeholder="Type the question statement"
                      value={q.question}
                      onChange={(e) => updateQ(i, { question: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-sm font-medium">Type</label>
                    <Select
                      value={q.type}
                      onValueChange={(v: QuestionType) => updateQ(i, { type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pick a type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                        <SelectItem value="short-answer">Short Answer</SelectItem>
                        <SelectItem value="essay">Essay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-1 space-y-1.5">
                    <label className="text-sm font-medium">Points</label>
                    <Input
                      type="number"
                      min={0}
                      value={q.points ?? 1}
                      onChange={(e) => updateQ(i, { points: Number(e.target.value || 0) })}
                    />
                  </div>
                </div>

                {/* MCQ block */}
                {q.type === "multiple-choice" && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Options</div>
                    <div className="grid md:grid-cols-2 gap-2">
                      {(q.options ?? []).map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="icon"
                            variant={q.correctOptionIndex === idx ? "default" : "outline"}
                            className="h-8 w-8"
                            onClick={() => updateQ(i, { correctOptionIndex: idx })}
                            title="Mark as correct"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Input
                            placeholder={`Option ${idx + 1}`}
                            value={opt}
                            onChange={(e) => setMCQOption(i, idx, e.target.value)}
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => removeMCQOption(i, idx)}
                            disabled={(q.options ?? []).length <= 2}
                            title="Remove option"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addMCQOption(i)}
                        disabled={(q.options ?? []).length >= 8}
                      >
                        Add Option
                      </Button>
                      <div className="text-sm text-muted-foreground">
                        Click the circle to pick the <strong>correct option</strong>.
                      </div>
                    </div>
                  </div>
                )}

                {/* Short / Essay per-type "correct answer" (legacy) */}
                {q.type !== "multiple-choice" && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      {q.type === "essay" ? "Model Answer (legacy)" : "Answer (legacy)"}
                    </label>
                    <Textarea
                      placeholder={q.type === "essay" ? "Model answer / key points…" : "Correct short answer…"}
                      value={q.correctAnswerText ?? ""}
                      onChange={(e) => updateQ(i, { correctAnswerText: e.target.value })}
                      rows={q.type === "essay" ? 6 : 3}
                    />
                  </div>
                )}

                {/* NEW: universal Answer (answer key only, shown only in Answers PDF) */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Answer (answer key only)</label>
                  <Textarea
                    placeholder="Optional text to include in the Answers PDF only (works for MCQ/Short/Essay)"
                    value={q.answerText ?? ""}
                    onChange={(e) => updateQ(i, { answerText: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
