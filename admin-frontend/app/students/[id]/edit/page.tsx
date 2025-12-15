"use client";

import { useEffect, useMemo, useState, use } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/admin-layout";
import { StudentForm } from "@/components/student-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://qtech-backend.vercel.app";

interface EditStudentPageProps {
  params: Promise<{ id: string }>; // ✅ params is a Promise now
}

type ClassRef = { _id: string; name?: string };

type StudentFromApi = {
  _id: string;
  regNo: string;
  name: string;
  fatherName?: string;
  phone: string;
  email?: string;
  address?: string;
  class: string | ClassRef;
  category: "Free" | "Paid";
  status: "Active" | "Inactive" | "Graduated";
  notes?: string;
  feeStatus?: "Paid" | "Unpaid" | "Partial" | "Overdue";
  dateOfBirth?: string;
  admissionDate?: string;
};

function toYMD(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return iso.slice(0, 10);
  }
}

export default function EditStudentPage({ params }: EditStudentPageProps) {
  // ✅ unwrap params promise safely
  const { id } = use(params);

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [apiStudent, setApiStudent] = useState<StudentFromApi | null>(null);
  const [saving, setSaving] = useState(false);

  // Load existing student
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErrMsg(null);
        const res = await fetch(`${API_BASE}/api/students/${id}`, {
          headers: { "Content-Type": "application/json" },
        });
        const json = await res.json();
        if (!alive) return;
        if (!res.ok || !json?.success || !json?.data) {
          throw new Error(json?.message || json?.error || `Failed to fetch (status ${res.status})`);
        }
        setApiStudent(json.data as StudentFromApi);
      } catch (e: any) {
        if (!alive) return;
        setErrMsg(e?.message || "Failed to load student");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  // Map API → StudentForm shape
  const formStudent = useMemo(() => {
    if (!apiStudent) return undefined;
    return {
      id: apiStudent._id,
      regNo: apiStudent.regNo || "",
      name: apiStudent.name || "",
      fatherName: apiStudent.fatherName || "",
      phone: apiStudent.phone || "",
      email: apiStudent.email || "",
      address: apiStudent.address || "",
      class: typeof apiStudent.class === "string" ? apiStudent.class : apiStudent.class?._id || "",
      category: apiStudent.category,
      status: apiStudent.status,
      notes: apiStudent.notes || "",
      feeStatus: (apiStudent.feeStatus as any) || "Unpaid",
      dateOfBirth: toYMD(apiStudent.dateOfBirth),
      admissionDate: toYMD(apiStudent.admissionDate),
    };
  }, [apiStudent]);

  const handleSubmit = async (payload: any) => {
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json?.success || !json?.data) {
        throw new Error(json?.message || json?.error || `Failed to update (status ${res.status})`);
      }
      router.push(`/students/${id}`);
    } catch (e: any) {
      alert(e?.message || "Failed to update student");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Edit Student</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      {loading && (
        <Card className="mt-4">
          <CardContent className="py-10 text-center text-muted-foreground">Loading…</CardContent>
        </Card>
      )}

      {!loading && errMsg && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Could not load the student record.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-red-600">{errMsg}</div>
          </CardContent>
        </Card>
      )}

      {!loading && !errMsg && formStudent && (
        <div className="mt-4">
          <StudentForm student={formStudent} onSubmit={handleSubmit} />
          {saving && <div className="mt-2 text-sm text-muted-foreground">Saving your changes…</div>}
        </div>
      )}
    </AdminLayout>
  );
}
