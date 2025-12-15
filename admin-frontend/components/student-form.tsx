"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://qtech-backend.vercel.app";

type ClassOption = { _id: string; name: string };

interface StudentFormProps {
  student?: {
    _id?: string;        // ✅ support _id (backend)
    id?: string;         // ✅ also accept id if parent passes this
    regNo: string;
    name: string;
    fatherName?: string;
    phone: string;
    email?: string;
    address?: string;
    class: string; // ObjectId
    category: "Free" | "Paid";
    status: "Active" | "Inactive" | "Graduated";
    notes?: string;
    feeStatus?: "Paid" | "Unpaid" | "Partial" | "Overdue";
    dateOfBirth?: string;   // ISO date (YYYY-MM-DD)
    admissionDate?: string; // ISO date (YYYY-MM-DD)
  };
  onSubmit?: (data: any) => void;
}

function authHeaders(): HeadersInit {
  // If you need token:
  // const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  // return token ? { Authorization: `Bearer ${token}` } : {};
  return {};
}

export function StudentForm({ student, onSubmit }: StudentFormProps) {
  const router = useRouter();

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [formData, setFormData] = useState({
    regNo: student?.regNo || "",
    name: student?.name || "",
    fatherName: student?.fatherName || "",
    phone: student?.phone || "",
    email: student?.email || "",
    address: student?.address || "",
    class: student?.class || "",
    category: (student?.category as "Paid" | "Free") || "Paid",
    status: (student?.status as "Active" | "Inactive" | "Graduated") || "Active",
    feeStatus: (student?.feeStatus as "Paid" | "Unpaid" | "Partial" | "Overdue") || "Unpaid",
    dateOfBirth: student?.dateOfBirth || "",
    admissionDate: student?.admissionDate || "",
    notes: student?.notes || "",
  });

  // ✅ keep form in sync if the parent passes a different `student` later
  useEffect(() => {
    setFormData({
      regNo: student?.regNo || "",
      name: student?.name || "",
      fatherName: student?.fatherName || "",
      phone: student?.phone || "",
      email: student?.email || "",
      address: student?.address || "",
      class: student?.class || "",
      category: (student?.category as "Paid" | "Free") || "Paid",
      status: (student?.status as "Active" | "Inactive" | "Graduated") || "Active",
      feeStatus: (student?.feeStatus as "Paid" | "Unpaid" | "Partial" | "Overdue") || "Unpaid",
      dateOfBirth: student?.dateOfBirth || "",
      admissionDate: student?.admissionDate || "",
      notes: student?.notes || "",
    });
  }, [student?._id, student?.id]); // reinitialize when the loaded record changes

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load class options
  useEffect(() => {
    (async () => {
      try {
        setLoadingClasses(true);
        const u = new URL(`${API_BASE}/api/classes`);
        u.searchParams.set("fields", "_id,name");
        const res = await fetch(u.toString(), { headers: { ...authHeaders() } });
        if (!res.ok) throw new Error(`Failed to load classes: ${res.status}`);
        const json = await res.json();
        // Accept both {data:[]} or raw array
        const list: any[] = Array.isArray(json) ? json : json?.data || [];
        setClasses(list.map((c: any) => ({ _id: c._id, name: c.name })));
      } catch (e: any) {
        toast({
          title: "Failed to load classes",
          description: e?.message || "Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setLoadingClasses(false);
      }
    })();
  }, []);

  const phonePattern = useMemo(() => "^[0-9+\\-\\s()]{7,20}$", []);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        regNo: formData.regNo,
        name: formData.name,
        fatherName: formData.fatherName || undefined,
        phone: formData.phone,
        email: formData.email || undefined,
        address: formData.address || undefined,
        class: formData.class, // ObjectId
        category: formData.category,
        status: formData.status,
        notes: formData.notes || undefined,
        feeStatus: formData.feeStatus,
        dateOfBirth: formData.dateOfBirth || undefined,     // "YYYY-MM-DD"
        admissionDate: formData.admissionDate || undefined, // "YYYY-MM-DD"
      };

      if (onSubmit) {
        await onSubmit(payload);
        setIsSubmitting(false);
        return;
      }

      // ✅ Correctly route PATCH to /api/students/:id (supports _id or id)
      const studentId = student?._id || student?.id;
      const url = studentId
        ? `${API_BASE}/api/students/${studentId}`
        : `${API_BASE}/api/students`;
      const method = studentId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json?.success) {
        // 409 duplicates from backend
        const msg =
          json?.message ||
          (res.status === 409 ? "Duplicate regNo or phone" : "Failed to save student");
        throw new Error(msg);
      }

      const data = json?.data;
      toast({
        title: studentId ? "Student Updated" : "Student Admitted",
        description: `${formData.name} has been ${studentId ? "updated" : "admitted"} successfully.`,
      });

      // Navigate to the detail page after create; after update, stay or redirect (your choice)
      if (!studentId && data?._id) {
        router.push(`/students/${data._id}`);
      } else if (studentId) {
        // optional: go back to detail page after edit
        router.push(`/students/${studentId}`);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{(student?._id || student?.id) ? "Edit Student" : "Admit New Student"}</CardTitle>
        <CardDescription>
          {(student?._id || student?.id)
            ? "Update student information"
            : "Enter student details to admit them to the institute"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="regNo">Registration Number *</Label>
              <Input
                id="regNo"
                value={formData.regNo}
                onChange={(e) => handleInputChange("regNo", e.target.value)}
                placeholder="ST2024001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fatherName">Father&apos;s Name</Label>
              <Input
                id="fatherName"
                value={formData.fatherName}
                onChange={(e) => handleInputChange("fatherName", e.target.value)}
                placeholder="Robert Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                pattern={phonePattern}
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="+92 3xx xxxxxxx"
                required
              />
              <p className="text-xs text-muted-foreground">Digits, spaces, +, -, ( ) • 7–20 chars</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="john.doe@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="class">Class *</Label>
              <Select
                value={formData.class}
                onValueChange={(value) => handleInputChange("class", value)}
                disabled={loadingClasses}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingClasses ? "Loading…" : "Select class"} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="123 Main Street, City, State, ZIP"
              rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(v) => handleInputChange("category", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Free">Free</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => handleInputChange("status", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Graduated">Graduated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Schema fields */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Fee Status</Label>
              <Select value={formData.feeStatus} onValueChange={(v) => handleInputChange("feeStatus", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admissionDate">Admission Date</Label>
              <Input
                id="admissionDate"
                type="date"
                value={formData.admissionDate}
                onChange={(e) => handleInputChange("admissionDate", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Leave empty to use today’s date.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Additional notes about the student…"
              rows={3}
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : (student?._id || student?.id) ? "Update Student" : "Admit Student"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
