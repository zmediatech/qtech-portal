"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarksTable } from "@/components/MarksTable";
import { Search, RefreshCw } from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://qtech-backend.vercel.app";

export default function MarksPage() {
  const [marks, setMarks] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchMarks = async () => {
    setLoading(true);
    const res = await fetch(
      `${API_BASE}/api/marks${search ? `?q=${encodeURIComponent(search)}` : ""}`,
      { cache: "no-store" }
    );
    const json = await res.json();
    setMarks(json.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMarks();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold md:text-2xl">
            Marks
          </h1>
          <Link href="/marks/create">
            <Button>Add Marks</Button>
          </Link>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative w-[280px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search by reg no or name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Button
            variant="outline"
            onClick={fetchMarks}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Search
          </Button>
        </div>

        {/* Table */}
        <MarksTable data={marks} loading={loading} />
      </div>
    </AdminLayout>
  );
}
