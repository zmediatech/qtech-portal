"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://qtech-backend.vercel.app";

const gradeFromPct = (p: number) => {
  if (p >= 90) return "A+";
  if (p >= 80) return "A";
  if (p >= 70) return "B";
  if (p >= 60) return "C";
  if (p >= 50) return "D";
  return "F";
};

export function MarksForm({
  mark,
  onSubmit,
}: {
  mark?: any;
  onSubmit: (data: any) => Promise<void>;
}) {
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);

  const [studentId, setStudentId] = useState(mark?.student?._id || "");
  const [subjectId, setSubjectId] = useState(mark?.subject?._id || "");
  const [examId, setExamId] = useState(mark?.exam?._id || "");
  const [totalMarks, setTotalMarks] = useState(mark?.totalMarks || 100);
  const [obtainedMarks, setObtainedMarks] = useState(mark?.obtainedMarks || 0);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const percentage = useMemo(
    () =>
      totalMarks > 0
        ? +(obtainedMarks * 100 / totalMarks).toFixed(2)
        : 0,
    [obtainedMarks, totalMarks]
  );

  const grade = useMemo(() => gradeFromPct(percentage), [percentage]);

  /* ---------------- Load Students ---------------- */
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/students`);
        const json = await res.json();
        setStudents(json.data || []);
      } catch {
        setError("Failed to load students");
      } finally {
        setLoadingData(false);
      }
    };
    loadStudents();
  }, []);

  /* -------- Load Subjects & Exams by Student -------- */
  useEffect(() => {
    const student = students.find((s) => s._id === studentId);
    if (!student) return;

    fetch(`${API_BASE}/api/subjects?classId=${student.classId}`)
      .then((r) => r.json())
      .then((j) => setSubjects(j.data || []));

    fetch(`${API_BASE}/api/exams?classId=${student.classId}`)
      .then((r) => r.json())
      .then((j) => setExams(j.data || []));
  }, [studentId, students]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !subjectId) {
      alert("Student and subject are required");
      return;
    }

    setLoading(true);
    await onSubmit({
      studentId,
      subjectId,
      examId: examId || undefined,
      totalMarks,
      obtainedMarks,
      percentage,
      grade,
    });
    setLoading(false);
  };

  if (loadingData) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
          <div className="text-muted-foreground">Loading form data…</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mark ? "Edit Marks" : "Add Marks"}</CardTitle>
        <CardDescription>
          Record exam results for a student
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Student *</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.regNo} — {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Subject *</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Exam (optional)</Label>
            <Select value={examId} onValueChange={setExamId}>
              <SelectTrigger>
                <SelectValue placeholder="Select exam" />
              </SelectTrigger>
              <SelectContent>
                {exams.map((e) => (
                  <SelectItem key={e._id} value={e._id}>
                    {e.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Total Marks</Label>
              <Input
                type="number"
                value={totalMarks}
                onChange={(e) => setTotalMarks(+e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Obtained Marks</Label>
              <Input
                type="number"
                value={obtainedMarks}
                onChange={(e) => setObtainedMarks(+e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Percentage</Label>
              <Input value={`${percentage}%`} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Grade</Label>
              <Input value={grade} readOnly />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : mark ? "Update Marks" : "Save Marks"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
