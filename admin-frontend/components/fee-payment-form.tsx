"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Check, Loader2, Search, UserRound } from "lucide-react";

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://qtech-backend.vercel.app";
const API_FEE = `${RAW_BASE.replace(/\/+$/, "")}/api/fee-records`;
const API_CLASSES = `${RAW_BASE.replace(/\/+$/, "")}/api/classes`;
const API_STUDENTS = `${RAW_BASE.replace(/\/+$/, "")}/api/students`;

type Method = "Cash" | "Bank Transfer" | "Online" | "-";
type Status = "Paid" | "Pending" | "Unpaid";
type ClassLite = { _id: string; name: string };
type StudentLite = {
  _id: string;
  regNo?: string;
  name?: string;
  class?: { _id?: string; name?: string } | string | null;
  feeStatus?: string;
};

interface Preset {
  student?: string;
  classroom?: string;
  regNo?: string;
  studentName?: string;
  className?: string;
}

interface FeePaymentFormProps {
  onSuccess?: () => void;
  preset?: Preset;
}

export function FeePaymentForm({ onSuccess, preset }: FeePaymentFormProps) {
  const [classes, setClasses] = useState<ClassLite[]>([]);
  const [students, setStudents] = useState<StudentLite[]>([]);
  const [studentQuery, setStudentQuery] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(preset?.student || null);

  const [form, setForm] = useState({
    regNo: preset?.regNo || "",
    studentName: preset?.studentName || "",
    classroomId: preset?.classroom || "",
    className: preset?.className || "",
    feeType: "",
    amount: "",
    date: "",
    method: "-" as Method,
    status: "Pending" as Status,
  });

  const selectedDate = form.date ? new Date(form.date) : undefined;
  const prettyDate = selectedDate
    ? selectedDate.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "";

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const selectedStudent = useMemo(
    () => students.find((student) => student._id === selectedStudentId) || null,
    [students, selectedStudentId]
  );

  // Load classes on component mount
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        setLoadingClasses(true);
        const res = await fetch(API_CLASSES, { cache: "no-store" });
        const json = await res.json();
        const list: any[] = Array.isArray(json) ? json : json?.data || [];
        const simplified: ClassLite[] = list.map((c: any) => ({ _id: c._id, name: c.name }));
        setClasses(simplified);
      } catch (e: any) {
        console.error("Failed to load classes:", e);
      } finally {
        if (alive) setLoadingClasses(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  // Load students once and keep searchable list locally
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        setLoadingStudents(true);
        const res = await fetch(API_STUDENTS, { cache: "no-store" });
        const json = await res.json();
        const list: any[] = Array.isArray(json) ? json : json?.data || [];
        if (!alive) return;
        setStudents(list);
      } catch (e) {
        console.error("Failed to load students:", e);
        if (alive) setStudents([]);
      } finally {
        if (alive) setLoadingStudents(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!preset?.student && preset?.regNo) return;
    if (selectedStudentId || students.length === 0) return;
    const initial = students.find((student) => student.regNo === preset?.regNo);
    if (initial) {
      setSelectedStudentId(initial._id);
    }
  }, [preset?.regNo, preset?.student, selectedStudentId, students]);

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return students.slice(0, 50);
    return students.filter((student) => {
      const haystack = [student.regNo, student.name, student.class && typeof student.class === "object" ? student.class.name : ""]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    }).slice(0, 50);
  }, [studentQuery, students]);

  const selectStudent = (student: StudentLite) => {
    const classId = typeof student.class === "object" ? student.class?._id || "" : "";
    const className = typeof student.class === "object" ? student.class?.name || "" : "";
    setSelectedStudentId(student._id);
    setForm((current) => ({
      ...current,
      regNo: student.regNo || "",
      studentName: student.name || "",
      classroomId: classId,
      className,
    }));
    setStudentQuery(`${student.regNo || ""} ${student.name || ""}`.trim());
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!selectedStudent) throw new Error("Please search and select a student first.");
      if (!form.regNo.trim()) throw new Error("Reg No is required.");
      if (!form.studentName.trim()) throw new Error("Student Name is required.");
      if (!form.classroomId) throw new Error("Selected student must have a class.");
      if (!form.feeType) throw new Error("Fee Type is required.");
      if (!form.amount || Number(form.amount) <= 0) throw new Error("Amount must be > 0.");
      if (!form.date) throw new Error("Date is required.");

      // Get selected class name
      const selectedClass = classes.find(c => c._id === form.classroomId);
      const className = selectedClass?.name || form.className || preset?.className || "";

      const payload = {
        student: selectedStudent._id,
        classroom: form.classroomId,
        regNo: form.regNo.trim(),
        studentName: form.studentName.trim(),
        className: className,
        feeType: form.feeType,
        amount: Number(form.amount),
        date: new Date(form.date).toISOString(),
        method: form.method,
        status: form.status,
        referenceNo: "",
        notes: "",
      };

      console.log("Sending payload:", payload); // Debug log

      const res = await fetch(API_FEE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Server error:", errorText);
        throw new Error(errorText || `HTTP ${res.status}`);
      }

      const result = await res.json();
      console.log("Success:", result);

      if (onSuccess) {
        onSuccess();
      }

      // Reset form
      setSelectedStudentId(null);
      setStudentQuery("");
      setForm({
        regNo: preset?.regNo || "",
        studentName: preset?.studentName || "",
        classroomId: preset?.classroom || "",
        className: preset?.className || "",
        feeType: "",
        amount: "",
        date: "",
        method: "-",
        status: "Pending",
      });
    } catch (err: any) {
      console.error("Submit error:", err);
      setError(err.message || "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-2 py-2 backdrop-blur-md sm:px-4 sm:py-4">
      <div className="flex w-full max-w-[42rem] flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.35)] max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)]">
        <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-800 px-4 py-4 text-white sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-emerald-200">Fee Management</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">Record Fee Payment</h2>
            </div>
            <Badge className="rounded-full bg-white/10 px-3 py-1 text-white hover:bg-white/10">Professional Form</Badge>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-slate-200">
            Search an existing student, review the linked class, and record a payment without manual duplication.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-3 py-4 sm:px-5 sm:py-5">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">

            {/* Student Search */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <Label className="text-sm font-semibold text-slate-800">Find Student</Label>
                <Badge variant="outline" className="rounded-full">Search first</Badge>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
                <Search className="h-4 w-4 text-slate-400" />
                <Input
                  value={studentQuery}
                  onChange={(e) => setStudentQuery(e.target.value)}
                  placeholder={loadingStudents ? "Loading students..." : "Search by name, reg no, or class"}
                  className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="mt-3 max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white">
                {filteredStudents.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500">
                    {loadingStudents ? "Loading students..." : "No matching students found"}
                  </div>
                ) : (
                  filteredStudents.map((student) => {
                    const classLabel = typeof student.class === "object" ? student.class?.name || "" : "";
                    const isSelected = selectedStudentId === student._id;
                    return (
                      <button
                        key={student._id}
                        type="button"
                        onClick={() => selectStudent(student)}
                        className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-3 text-left text-sm last:border-b-0 ${
                          isSelected ? "bg-emerald-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium text-slate-900">{student.name || "Unnamed Student"}</span>
                            {isSelected && <Check className="h-4 w-4 text-emerald-600" />}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span>{student.regNo || "No reg no"}</span>
                            {classLabel && <span>{classLabel}</span>}
                          </div>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          Select
                        </Badge>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {selectedStudent && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm shadow-sm">
                <div className="flex items-center gap-2 font-semibold text-emerald-900">
                  <UserRound className="h-4 w-4" />
                  Selected Student
                </div>
                <div className="mt-3 grid gap-2 text-emerald-950 sm:grid-cols-3">
                  <div className="rounded-xl bg-white/70 p-3">
                    <div className="text-xs uppercase tracking-wide text-emerald-700">Name</div>
                    <div className="mt-1 font-medium">{selectedStudent.name}</div>
                  </div>
                  <div className="rounded-xl bg-white/70 p-3">
                    <div className="text-xs uppercase tracking-wide text-emerald-700">Reg No</div>
                    <div className="mt-1 font-medium">{selectedStudent.regNo}</div>
                  </div>
                  <div className="rounded-xl bg-white/70 p-3">
                    <div className="text-xs uppercase tracking-wide text-emerald-700">Class</div>
                    <div className="mt-1 font-medium">{form.className || "N/A"}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Reg No">
                <Input value={form.regNo} readOnly placeholder="Select a student first" className="h-11 bg-slate-100" />
              </Field>

              <Field label="Student Name">
                <Input value={form.studentName} readOnly placeholder="Select a student first" className="h-11 bg-slate-100" />
              </Field>

              <Field label="Class">
                <Select value={form.classroomId} onValueChange={(v) => set("classroomId", v)} disabled>
                  <SelectTrigger className="h-11 bg-slate-100">
                    <SelectValue placeholder={loadingClasses ? "Loading classes..." : "Auto-filled from student"} />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Fee Type">
                <Select value={form.feeType} onValueChange={(v) => set("feeType", v)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select fee type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tuition Fee">Tuition Fee</SelectItem>
                    <SelectItem value="Lab Fee">Lab Fee</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Amount">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  placeholder="Enter amount"
                  className="h-11"
                />
              </Field>

              <Field label="Date">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-11 w-full justify-start rounded-xl border-slate-200 bg-white text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {prettyDate || "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(d) =>
                        d &&
                        set(
                          "date",
                          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
                        )
                      }
                    />
                  </PopoverContent>
                </Popover>
              </Field>

              <Field label="Method">
                <Select value={form.method} onValueChange={(v: Method) => set("method", v)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-">-</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Status">
                <Select value={form.status} onValueChange={(v: Status) => set("status", v)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            )}

            {/* Save Payment Button */}
            <div className="pt-2">
              <Button type="submit" disabled={submitting} className="h-12 w-full rounded-full bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-700">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Payment...
                  </>
                ) : (
                  "Save Payment"
                )}
              </Button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      {children}
    </div>
  );
}
