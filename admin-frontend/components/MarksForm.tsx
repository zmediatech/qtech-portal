"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://qtech-backend.vercel.app";

function gradeFromPct(p: number) {
  if (p >= 90) return "A+";
  if (p >= 80) return "A";
  if (p >= 70) return "B";
  if (p >= 60) return "C";
  if (p >= 50) return "D";
  return "F";
}

export default function MarksForm({
  initialData,
  onSuccess,
}: {
  initialData?: any;
  onSuccess: () => void;
}) {
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);

  const [studentId, setStudentId] = useState(initialData?.student?._id || "");
  const [subjectId, setSubjectId] = useState(initialData?.subject?._id || "");
  const [examId, setExamId] = useState(initialData?.exam?._id || "");

  const [totalMarks, setTotalMarks] = useState(initialData?.totalMarks || 100);
  const [obtainedMarks, setObtainedMarks] = useState(
    initialData?.obtainedMarks || 0
  );

  const percentage = useMemo(
    () => +(obtainedMarks * 100 / totalMarks).toFixed(2),
    [obtainedMarks, totalMarks]
  );

  const grade = useMemo(() => gradeFromPct(percentage), [percentage]);

  // Load students
  useEffect(() => {
    fetch(`${API_BASE}/api/students`)
      .then((r) => r.json())
      .then((j) => setStudents(j.data || []));
  }, []);

  // Load subjects + exams when student changes
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

  const onSubmit = async () => {
    const payload = {
      studentId,
      subjectId,
      examId: examId || undefined,
      totalMarks,
      obtainedMarks,
      percentage,
      grade,
    };

    const method = initialData ? "PATCH" : "POST";
    const url = initialData
      ? `${API_BASE}/api/marks/${initialData._id}`
      : `${API_BASE}/api/marks`;

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    onSuccess();
  };

  return (
    <div className="grid gap-4 max-w-xl">
      {/* Student */}
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

      {/* Subject */}
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

      {/* Exam */}
      <Select value={examId} onValueChange={setExamId}>
        <SelectTrigger>
          <SelectValue placeholder="Select exam (optional)" />
        </SelectTrigger>
        <SelectContent>
          {exams.map((e) => (
            <SelectItem key={e._id} value={e._id}>
              {e.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="number"
        value={totalMarks}
        onChange={(e) => setTotalMarks(+e.target.value)}
        placeholder="Total marks"
      />

      <Input
        type="number"
        value={obtainedMarks}
        onChange={(e) => setObtainedMarks(+e.target.value)}
        placeholder="Obtained marks"
      />

      <Input value={`${percentage}%`} readOnly />
      <Input value={grade} readOnly />

      <Button onClick={onSubmit}>
        {initialData ? "Update Marks" : "Save Marks"}
      </Button>
    </div>
  );
}
