
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  UserCheck,
  UserX,
  CreditCard,
  AlertCircle,
  DollarSign,
  Receipt,
} from "lucide-react";

// Helpers
function asArray(json: any): any[] {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.data)) return json.data;
  // common fallbacks
  if (json && Array.isArray(json.results)) return json.results;
  if (json && Array.isArray(json.items)) return json.items;
  return [];
}

function money(n: number) {
  return `$${(n ?? 0).toLocaleString()}`;
}

type Student = {
  status?: string;       // "Active" | "Inactive" | ...
  feeStatus?: string;    // "Paid" | "Unpaid" | "Partial" | "Overdue" | "Pending"
};

type FeeRecord = {
  amount?: number;
  status?: string;       // expect "Paid" to count as collected
};

type Expense = {
  amount?: number;
};

export default function DashboardKpisSimple() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = useMemo(
    () => (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(/\/$/, ""),
    []
  );

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setError(null);
        setLoading(true);

        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const [sRes, fRes, eRes] = await Promise.all([
          fetch(`${API_BASE}/api/students`, { headers }),
          fetch(`${API_BASE}/api/fee-records`, { headers }),
          fetch(`${API_BASE}/api/expenses`, { headers }),
        ]);

        const [sJson, fJson, eJson] = await Promise.all([sRes.json(), fRes.json(), eRes.json()]);

        const sArr = asArray(sJson) as Student[];
        const fArr = asArray(fJson) as FeeRecord[];
        const eArr = asArray(eJson) as Expense[];

        if (!alive) return;

        setStudents(sArr);
        setFees(fArr);
        setExpenses(eArr);
      } catch (err: any) {
        if (!alive) return;
        setError(err?.message || "Failed to load dashboard data");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [API_BASE]);

  // Derive simple values (NO percentages)
  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.status === "Active").length;
  const inactiveStudents = students.filter((s) => s.status === "Inactive").length;
  const paidStudents = students.filter((s) => s.feeStatus === "Paid").length;
  const unpaidStudents = students.filter(
    (s) => s.feeStatus && s.feeStatus !== "Paid"
  ).length;

  const collectedFees = fees.reduce((sum, r) => {
    const amt = Number(r.amount) || 0;
    // If you want *all* fee records sum, remove the status check below
    return r.status === "Paid" ? sum + amt : sum;
  }, 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Cards config (keep your original links & icons)
  const cards = [
    { title: "Total Students", value: totalStudents.toLocaleString(), icon: Users, href: "/students", color: "text-chart-1" },
    { title: "Active Students", value: activeStudents.toLocaleString(), icon: UserCheck, href: "/students/categories/active", color: "text-chart-1" },
    { title: "Inactive Students", value: inactiveStudents.toLocaleString(), icon: UserX, href: "/students/categories/inactive", color: "text-chart-3" },
    { title: "Paid Students", value: paidStudents.toLocaleString(), icon: CreditCard, href: "/students/categories/paid", color: "text-chart-1" },
    { title: "Unpaid Students", value: unpaidStudents.toLocaleString(), icon: AlertCircle, href: "/students/categories/unpaid", color: "text-chart-3" },
    { title: "Collected Fees", value: money(collectedFees), icon: DollarSign, href: "/admin/fees", color: "text-chart-1" },
    { title: "Total Expenses", value: money(totalExpenses), icon: Receipt, href: "/admin/expenses", color: "text-chart-2" },
    // If you DON'T want derived numbers, leave Monthly Profit out. If you do:
    // { title: "Monthly Profit", value: money(collectedFees - totalExpenses), icon: TrendingUp, href: "/reports", color: "text-chart-1" },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: cards.length }).map((_, i) => (
          <Card key={i} className="h-[110px] animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="sm:col-span-2 lg:col-span-4">
          <CardHeader>
            <CardTitle>Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">Error: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Link key={card.title} href={card.href}>
          <Card className="cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              {/* No percentage/change line */}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
