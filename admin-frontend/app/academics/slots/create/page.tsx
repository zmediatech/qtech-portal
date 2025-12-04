"use client";

import { useRouter } from "next/navigation";
import { SlotForm } from "@/components/slot-form";
import { AdminLayout } from "@/components/admin-layout";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000";

export default function CreateSlotPage() {
  const router = useRouter();

  const handleSubmit = async (payload: any) => {
    try {
      const res = await fetch(`${API_BASE}/api/timetable-slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to create slot");
      }

      router.push("/academics/slots");
    } catch (err: any) {
      alert(err?.message || "Error creating slot");
    }
  };

  return (
    <AdminLayout>
      <h1 className="text-lg font-semibold md:text-2xl">Create Time Slot</h1>
      <div className="mt-4">
        <SlotForm onSubmit={handleSubmit} />
      </div>
    </AdminLayout>
  );
}
