"use client";

import { useEffect, useState } from "react";
import MarksForm from "@/components/MarksForm";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type Mark = {
  _id: string;
  regNo: string;
  studentName: string;
  className: string;
  subject: string;
  examTitle?: string;
  examDate?: string;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  grade: string;
  createdAt?: string;
};

const API_ROOT = (process.env.NEXT_PUBLIC_API_URL || "https://qtech-backend.vercel.app").replace(/\/$/, "");
const LIST_URL = `${API_ROOT}/api/marks`;

export default function MarksPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const fetchMarks = async () => {
    setLoading(true);
    try {
      const url = q ? `${LIST_URL}?q=${encodeURIComponent(q)}` : LIST_URL;
      const res = await fetch(url);
      const data = await res.json();

      const items: Mark[] =
        Array.isArray(data) ? data :
        Array.isArray(data?.items) ? data.items :
        Array.isArray(data?.data) ? data.data :
        [];

      setMarks(items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmitted = () => {
    fetchMarks();
  };

  return (
    <div className="flex min-h-screen">
      <AdminSidebar isCollapsed={collapsed} setIsCollapsed={setCollapsed} />

      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Marks</h1>
          <div className="flex gap-2">
            <Input
              placeholder="Search by reg no / name / class / subject"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-[260px]"
            />
            <Button variant="secondary" onClick={fetchMarks}>Search</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add / Update Marks</CardTitle>
          </CardHeader>
          <CardContent>
            <MarksForm onSubmitted={handleSubmitted} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Records</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[420px]">
              <div className="min-w-full">
                <div className="grid grid-cols-8 gap-3 px-4 py-2 text-sm font-medium bg-muted">
                  <div>Reg No</div>
                  <div>Name</div>
                  <div>Class</div>
                  <div>Subject</div>
                  <div>Exam</div>
                  <div className="text-right">Marks</div>
                  <div className="text-right">%</div>
                  <div className="text-center">Grade</div>
                </div>

                {loading ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">Loading…</div>
                ) : marks.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">No records yet.</div>
                ) : (
                  marks.map((m) => (
                    <div key={m._id} className="grid grid-cols-8 gap-3 px-4 py-2 border-t text-sm">
                      <div className="truncate">{m.regNo}</div>
                      <div className="truncate">{m.studentName}</div>
                      <div className="truncate">{m.className}</div>
                      <div className="truncate">{m.subject}</div>
                      <div className="truncate">{m.examTitle || "Exam"}</div>
                      <div className="text-right">{m.obtainedMarks}/{m.totalMarks}</div>
                      <div className="text-right">
                        {typeof m.percentage === "number" ? m.percentage.toFixed(2) : m.percentage}
                      </div>
                      <div className="text-center font-semibold">{m.grade}</div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
