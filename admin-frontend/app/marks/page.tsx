"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MarksTable from "@/components/MarksTable";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://qtech-backend.vercel.app";

export default function MarksPage() {
  const [marks, setMarks] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const loadMarks = async () => {
    setLoading(true);
    const res = await fetch(
      `${API_BASE}/api/marks${q ? `?q=${encodeURIComponent(q)}` : ""}`,
      { cache: "no-store" }
    );
    const json = await res.json();
    setMarks(json.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadMarks();
  }, []);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold md:text-2xl">Marks</h1>
        <Link href="/marks/create">
          <Button>Add Marks</Button>
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Search by reg no / name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-[260px]"
        />
        <Button variant="secondary" onClick={loadMarks}>
          Search
        </Button>
      </div>

      <MarksTable data={marks} loading={loading} />
    </AdminLayout>
  );
}
