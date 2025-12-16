"use client";

import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/admin-layout";
import MarksForm from "@/components/MarksForm";

export default function CreateMarksPage() {
  const router = useRouter();

  return (
    <AdminLayout>
      <h1 className="text-lg font-semibold md:text-2xl mb-4">Add Marks</h1>

      <MarksForm
        onSuccess={() => {
          router.push("/marks");
        }}
      />
    </AdminLayout>
  );
}
