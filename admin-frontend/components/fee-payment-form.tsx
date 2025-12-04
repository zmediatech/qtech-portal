"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
const API_FEE = `${RAW_BASE.replace(/\/+$/, "")}/api/fee-records`;
const API_CLASSES = `${RAW_BASE.replace(/\/+$/, "")}/api/classes`;

type Method = "Cash" | "Bank Transfer" | "Online" | "-";
type Status = "Paid" | "Pending" | "Unpaid";
type ClassLite = { _id: string; name: string };

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
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    regNo: preset?.regNo || "",
    studentName: preset?.studentName || "",
    classroomId: preset?.classroom || "",
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

  // Generate proper MongoDB ObjectId
  const generateObjectId = () => {
    const timestamp = Math.floor(Date.now() / 1000).toString(16);
    return timestamp + 'x'.repeat(16).replace(/[x]/g, () => (Math.random() * 16 | 0).toString(16));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Validation
      if (!form.regNo.trim()) throw new Error("Reg No is required.");
      if (!form.studentName.trim()) throw new Error("Student Name is required.");
      if (!form.classroomId) throw new Error("Please select a Class.");
      if (!form.feeType) throw new Error("Fee Type is required.");
      if (!form.amount || Number(form.amount) <= 0) throw new Error("Amount must be > 0.");
      if (!form.date) throw new Error("Date is required.");

      // Get selected class name
      const selectedClass = classes.find(c => c._id === form.classroomId);
      const className = selectedClass?.name || preset?.className || "";

      const payload = {
        student: generateObjectId(), // Generate a valid 24-character ObjectId
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
      setForm({
        regNo: preset?.regNo || "",
        studentName: preset?.studentName || "",
        classroomId: preset?.classroom || "",
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md" style={{ height: '90vh' }}>
        
        {/* Header - Fixed */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-center text-gray-800">Fee Payment Form</h2>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-4" style={{ height: 'calc(90vh - 80px)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Reg No */}
            <Field label="Reg No">
              <Input 
                value={form.regNo} 
                onChange={(e) => set("regNo", e.target.value)}
                placeholder="Enter registration number"
                className="h-11"
              />
            </Field>

            {/* Student Name */}
            <Field label="Student Name">
              <Input 
                value={form.studentName} 
                onChange={(e) => set("studentName", e.target.value)}
                placeholder="Enter student name"
                className="h-11"
              />
            </Field>

            {/* Class */}
            <Field label="Class">
              <Select value={form.classroomId} onValueChange={(v) => set("classroomId", v)}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={loadingClasses ? "Loading classes..." : "Select a class"} />
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

            {/* Fee Type */}
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

            {/* Amount */}
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

            {/* Date */}
            <Field label="Date">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-11 w-full justify-start">
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

            {/* Method */}
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

            {/* Status */}
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

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Save Payment Button */}
            <div className="pt-4">
              <Button type="submit" disabled={submitting} className="w-full h-12 text-base">
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