// app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardFilters } from "@/components/dashboard-filters";
import { StudentCategoriesChart, IncomeExpenseChart } from "@/components/dashboard-charts";
import {
  Users,
  DollarSign,
  UserCheck,
  UserX,
  CreditCard,
  Receipt,
  AlertCircle,
  Download,
} from "lucide-react";

// ---------- types ----------
type Student = {
  status?: string;
  feeStatus?: string;
};

type FeeRecord = {
  amount?: number;
  status?: string;
};

type Expense = {
  amount?: number;
};

// ---------- helpers ----------
function asArray(json: any): any[] {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.data)) return json.data;
  if (json && Array.isArray(json.results)) return json.results;
  if (json && Array.isArray(json.items)) return json.items;
  return [];
}

function money(n: number) {
  return `Rs ${(n ?? 0).toLocaleString("en-PK")}`;
}

// ----- CSV helpers -----
function csvEscape(val: unknown): string {
  const s = val == null ? "" : String(val);
  const needsWrap = /[",\n\r]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsWrap ? `"${escaped}"` : escaped;
}

function rowsToCsv(rows: Record<string, unknown>[], header?: string[]): string {
  const cols = header?.length ? header : rows.length ? Object.keys(rows[0]) : [];
  const head = cols.join(",");
  const body = rows.map(r => cols.map(c => csvEscape(r[c])).join(",")).join("\r\n");
  return head + (body ? "\r\n" + body : "");
}

function saveBlob(blob: Blob, filename: string, csvTextForFallback?: string) {
  // Old Edge
  // @ts-ignore
  if (navigator.msSaveBlob) {
    // @ts-ignore
    navigator.msSaveBlob(blob, filename);
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);

  a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));

  setTimeout(() => {
    URL.revokeObjectURL(url);
    if (a.parentNode) document.body.removeChild(a);
    if (csvTextForFallback) {
      const dataUrl = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csvTextForFallback);
      window.open(dataUrl, "_blank", "noopener,noreferrer");
    }
  }, 0);
}

function downloadCsv(rows: Record<string, unknown>[], filename: string, header?: string[]) {
  const csv = rowsToCsv(rows, header);
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  saveBlob(blob, filename, csv);
}

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const API_BASE = useMemo(
    () =>
      (process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        "https://qtech-backend.vercel.app"
      ).replace(/\/$/, ""),
    []
  );

  // ---------- auth gate ----------
  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      const user = localStorage.getItem("user");
      if (!token || !user) {
        router.replace("/login");
        setIsAuthenticated(false);
        return;
      }
      JSON.parse(user);
      setIsAuthenticated(true);
    } catch {
      localStorage.clear();
      setIsAuthenticated(false);
      router.replace("/login");
    }
  }, [router]);

  // ---------- load dashboard data ----------
  useEffect(() => {
    if (isAuthenticated !== true) return;

    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);

        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const headers: HeadersInit = token
          ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
          : { "Content-Type": "application/json" };

        const [sRes, fRes, eRes] = await Promise.all([
          fetch(`${API_BASE}/api/students`, { headers }),
          fetch(`${API_BASE}/api/fee-records`, { headers }),
          fetch(`${API_BASE}/api/expenses`, { headers }),
        ]);

        const [sJson, fJson, eJson] = await Promise.all([sRes.json(), fRes.json(), eRes.json()]);
        if (!alive) return;

        setStudents(asArray(sJson) as Student[]);
        setFees(asArray(fJson) as FeeRecord[]);
        setExpenses(asArray(eJson) as Expense[]);
      } catch (err: any) {
        if (!alive) return;
        setLoadError(err?.message || "Failed to load dashboard data");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [API_BASE, isAuthenticated]);

  // ---------- derived ----------
  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.status === "Active").length;
  const inactiveStudents = students.filter((s) => s.status === "Inactive").length;
  const paidStudents = students.filter((s) => s.feeStatus === "Paid").length;
  const unpaidStudents = students.filter((s) => s.feeStatus && s.feeStatus !== "Paid").length;
  const collectedFees = fees.reduce((sum, r) => (r.status === "Paid" ? sum + (Number(r.amount) || 0) : sum), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // ---------- Summary CSV ----------
  const exportSummary = () => {
    const rows = [
      { metric: "Total Students", value: totalStudents },
      { metric: "Active Students", value: activeStudents },
      { metric: "Inactive Students", value: inactiveStudents },
      { metric: "Paid Students", value: paidStudents },
      { metric: "Unpaid Students", value: unpaidStudents },
      { metric: "Collected Fees (PKR)", value: collectedFees },
      { metric: "Total Expenses (PKR)", value: totalExpenses },
    ];
    downloadCsv(rows as any[], "dashboard-summary.csv", ["metric", "value"]);
  };

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-lg font-semibold md:text-2xl">Dashboard</h1>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={exportSummary}
          disabled={loading || !!loadError}
          title="Export KPI summary"
        >
          <Download className="h-4 w-4 mr-2" />
          Summary CSV
        </Button>
      </div>

      <DashboardFilters />

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 7 }).map((_, i) => <Card key={i} className="h-[110px] animate-pulse" />)
        ) : loadError ? (
          <Card className="sm:col-span-2 lg:col-span-4">
            <CardHeader><CardTitle>Dashboard</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-red-600">Error: {loadError}</p></CardContent>
          </Card>
        ) : (
          <>
            <Link href="/students"><Card><CardHeader><CardTitle>Total Students</CardTitle></CardHeader><CardContent><div>{totalStudents}</div></CardContent></Card></Link>
            <Link href="/students/categories/active"><Card><CardHeader><CardTitle>Active Students</CardTitle></CardHeader><CardContent><div>{activeStudents}</div></CardContent></Card></Link>
            <Link href="/students/categories/inactive"><Card><CardHeader><CardTitle>Inactive Students</CardTitle></CardHeader><CardContent><div>{inactiveStudents}</div></CardContent></Card></Link>
            <Link href="/students/categories/paid"><Card><CardHeader><CardTitle>Paid Students</CardTitle></CardHeader><CardContent><div>{paidStudents}</div></CardContent></Card></Link>
            <Link href="/students/categories/unpaid"><Card><CardHeader><CardTitle>Unpaid Students</CardTitle></CardHeader><CardContent><div>{unpaidStudents}</div></CardContent></Card></Link>
            <Link href="/admin/fees"><Card><CardHeader><CardTitle>Collected Fees</CardTitle></CardHeader><CardContent><div>{money(collectedFees)}</div></CardContent></Card></Link>
            <Link href="/admin/expenses"><Card><CardHeader><CardTitle>Total Expenses</CardTitle></CardHeader><CardContent><div>{money(totalExpenses)}</div></CardContent></Card></Link>
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <IncomeExpenseChart />
        <StudentCategoriesChart />
      </div>
    </AdminLayout>
  );
}
