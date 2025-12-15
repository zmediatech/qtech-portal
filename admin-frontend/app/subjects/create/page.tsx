"use client";

import { AdminLayout } from "@/components/admin-layout";
import { SubjectForm } from "@/components/subject-form";
import { useRouter } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://qtech-backend.vercel.app";

export default function CreateSubjectPage() {
  const router = useRouter();

  const handleCreateSubject = async (data: {
    name: string;
    code: string;
    linkedClasses: string[];
  }) => {
    const res = await fetch(`${API_BASE}/api/subjects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Failed to create subject");
    }

    // ✅ After success, redirect to subjects list
    router.push("/subjects");
  };

  return (
    <AdminLayout>
      <div className="flex items-center mb-6">
        <h1 className="text-lg font-semibold md:text-2xl">
          Create Subject
        </h1>
      </div>

      <SubjectForm onSubmit={handleCreateSubject} />
    </AdminLayout>
  );
}
