"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminLayout } from "@/components/admin-layout";
import { MarksForm } from "@/components/MarksForm";
import { Loader2 } from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://qtech-backend.vercel.app";

export default function EditMarksPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [mark, setMark] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/marks/${id}`)
      .then((r) => r.json())
      .then((j) => setMark(j.data));
  }, [id]);

  if (!mark) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-lg font-semibold md:text-2xl">
          Edit Marks
        </h1>

        <MarksForm
          mark={mark}
          onSubmit={async (data) => {
            await fetch(`${API_BASE}/api/marks/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            router.push("/marks");
          }}
        />
      </div>
    </AdminLayout>
  );
}
