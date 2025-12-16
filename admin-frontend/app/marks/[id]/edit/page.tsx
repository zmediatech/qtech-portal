"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminLayout } from "@/components/admin-layout";
import MarksForm from "@/components/MarksForm";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://qtech-backend.vercel.app";

export default function EditMarksPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [initialData, setInitialData] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/marks/${id}`)
      .then((r) => r.json())
      .then((j) => setInitialData(j.data));
  }, [id]);

  if (!initialData) return <AdminLayout>Loading…</AdminLayout>;

  return (
    <AdminLayout>
      <h1 className="text-lg font-semibold md:text-2xl mb-4">Edit Marks</h1>

      <MarksForm
        initialData={initialData}
        onSuccess={() => router.push("/marks")}
      />
    </AdminLayout>
  );
}
