"use client";

import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/admin-layout";
import { MarksForm } from "@/components/MarksForm";

export default function CreateMarksPage() {
  const router = useRouter();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold md:text-2xl">
            Add Marks
          </h1>
        </div>

        <MarksForm
          onSubmit={async (data) => {
            await fetch(
              `${process.env.NEXT_PUBLIC_API_BASE_URL || "https://qtech-backend.vercel.app"}/api/marks`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              }
            );
            router.push("/marks");
          }}
        />
      </div>
    </AdminLayout>
  );
}
