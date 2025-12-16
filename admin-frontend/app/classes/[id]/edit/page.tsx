"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { AdminLayout } from "@/components/admin-layout";
import { ClassForm } from "@/components/class-form";

interface ClassResponse {
  _id: string;
  name: string;
  description?: string;
  subjects: { _id: string }[];
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://qtech-backend.vercel.app";

export default function EditClassPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [initialData, setInitialData] = useState<{
    name: string;
    description?: string;
    subjects: string[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // fetch class
  useEffect(() => {
    const fetchClass = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/classes/${id}`, {
          cache: "no-store",
        });

        if (!res.ok) throw new Error("Failed to load class");

        const json = await res.json();
        const data: ClassResponse = json.data;

        setInitialData({
          name: data.name,
          description: data.description,
          subjects: data.subjects?.map((s) => s._id) || [],
        });
      } catch (e: any) {
        setError(e.message || "Failed to load class");
      } finally {
        setLoading(false);
      }
    };

    fetchClass();
  }, [id]);

  const handleUpdateClass = async (data: {
    name: string;
    description?: string;
    subjects: string[];
  }) => {
    const res = await fetch(`${API_BASE}/api/classes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error?.message || "Failed to update class");
    }

    router.push("/classes");
  };

  if (loading) {
    return (
      <AdminLayout>
        <p className="text-sm text-muted-foreground">Loading class…</p>
      </AdminLayout>
    );
  }

  if (error || !initialData) {
    return (
      <AdminLayout>
        <p className="text-sm text-red-600">{error || "Not found"}</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center mb-6">
        <h1 className="text-lg font-semibold md:text-2xl">
          Edit Class
        </h1>
      </div>

      <ClassForm
        initialData={initialData}
        onSubmit={handleUpdateClass}
      />
    </AdminLayout>
  );
}
