"use client";

import { AdminLayout } from "@/components/admin-layout";
import { ClassForm } from "@/components/class-form";
import { useRouter } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://qtech-backend.vercel.app";

export default function CreateClassPage() {
  const router = useRouter();

  const handleCreateClass = async (data: {
    name: string;
    description?: string;
    subjects: string[];
  }) => {
    const res = await fetch(`${API_BASE}/api/classes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error?.message || "Failed to create class");
    }

    router.push("/classes");
  };

  return (
    <AdminLayout>
      <div className="flex items-center mb-6">
        <h1 className="text-lg font-semibold md:text-2xl">
          Create Class
        </h1>
      </div>

      <ClassForm onSubmit={handleCreateClass} />
    </AdminLayout>
  );
}
