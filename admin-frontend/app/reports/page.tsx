"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { RoleGate } from "@/components/role-gate";
import { apiUrl, authHeaders } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpRight, Download, RefreshCw, Users2, BookOpen, Receipt, Clock3, ShieldCheck } from "lucide-react";

type ReportSummary = {
  counts: Record<string, number>;
  studentBreakdown: Array<{ name: string; value: number }>;
  incomeExpense: Array<{ month: string; income: number; expenses: number }>;
  recentCourses: Array<{
    _id: string;
    title: string;
    scopeType?: string;
    teacher?: { name?: string; email?: string };
    classIds?: Array<{ _id: string; name?: string }>;
    subjectIds?: Array<{ _id: string; name?: string; code?: string }>;
  }>;
  recentLogs: Array<{
    _id: string;
    action: string;
    actorEmail?: string;
    actorRole?: string;
    target?: string;
    createdAt?: string;
  }>;
  attendance: {
    overallAttendance: number;
    present: number;
    absent: number;
    late: number;
    total: number;
  };
};

const STAT_CARDS = [
  { key: "students", label: "Students", icon: Users2 },
  { key: "courses", label: "Courses", icon: BookOpen },
  { key: "feeRecords", label: "Fee Records", icon: Receipt },
  { key: "auditLogs", label: "Audit Logs", icon: ShieldCheck },
];

export default function ReportsPage() {
  const [months, setMonths] = useState("6");
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadSummary = async () => {
    setError(null);
    setRefreshing(true);
    try {
      const res = await fetch(apiUrl(`/api/reports/summary?months=${encodeURIComponent(months)}`), {
        headers: authHeaders(),
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to load report summary");
      }
      setSummary(json.data as ReportSummary);
    } catch (err: any) {
      setError(err?.message || "Failed to load report summary");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months]);

  const topMetrics = useMemo(() => {
    if (!summary) return [];
    return STAT_CARDS.map((card) => ({
      ...card,
      value: summary.counts?.[card.key] ?? 0,
    }));
  }, [summary]);

  return (
    <RoleGate allowedRoles={["superadmin"]} message="Reports are reserved for superadmin.">
      <AdminLayout>
        <div className="space-y-6">
          <div className="rounded-3xl border bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-800 p-5 text-white sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <ArrowUpRight className="h-4 w-4" />
                  Superadmin Reporting
                </div>
                <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Reports & Analytics</h1>
                <p className="mt-2 max-w-3xl text-sm text-white/75">
                  Live summary of students, courses, finance, attendance, and recent system activity.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="rounded-full bg-white/10 px-3 py-1 text-white">
                  <Clock3 className="mr-2 h-4 w-4" />
                  Last {months} months
                </Badge>
                <Button onClick={loadSummary} variant="secondary" className="rounded-full bg-white text-slate-900 hover:bg-slate-100">
                  <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Report Filters</CardTitle>
              <CardDescription>Control how much history is shown in the financial report.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <div className="space-y-2 max-w-xs">
                <Label>Months</Label>
                <Select value={months} onValueChange={setMonths}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">Last 3 months</SelectItem>
                    <SelectItem value="6">Last 6 months</SelectItem>
                    <SelectItem value="12">Last 12 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" className="bg-transparent" onClick={loadSummary}>
                <Download className="mr-2 h-4 w-4" />
                Export-ready data
              </Button>
            </CardContent>
          </Card>

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-4 text-sm text-red-700">{error}</CardContent>
            </Card>
          )}

          {loading && !summary ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">Loading report summary...</CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {topMetrics.map((metric) => (
                  <Card key={metric.key}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                      <metric.icon className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{metric.value.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Live portal count</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Financial Trend</CardTitle>
                    <CardDescription>Income vs expenses over the selected period.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(summary?.incomeExpense || []).map((row) => (
                      <div key={row.month} className="rounded-2xl border p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="font-medium">{row.month}</div>
                          <Badge variant={row.income >= row.expenses ? "default" : "secondary"} className="rounded-full">
                            Net {(row.income - row.expenses).toLocaleString()}
                          </Badge>
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                          <div className="rounded-xl bg-emerald-50 p-3">
                            <div className="text-xs uppercase text-emerald-700">Income</div>
                            <div className="text-lg font-semibold text-emerald-900">{row.income.toLocaleString()}</div>
                          </div>
                          <div className="rounded-xl bg-rose-50 p-3">
                            <div className="text-xs uppercase text-rose-700">Expenses</div>
                            <div className="text-lg font-semibold text-rose-900">{row.expenses.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Attendance Snapshot</CardTitle>
                    <CardDescription>Overall attendance calculated from live records.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-2xl border bg-slate-50 p-4 text-center">
                      <div className="text-4xl font-bold text-emerald-700">{summary?.attendance.overallAttendance ?? 0}%</div>
                      <div className="text-sm text-muted-foreground">Overall attendance</div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border p-3 text-center">
                        <div className="text-2xl font-bold text-emerald-700">{summary?.attendance.present ?? 0}</div>
                        <div className="text-xs text-muted-foreground">Present</div>
                      </div>
                      <div className="rounded-2xl border p-3 text-center">
                        <div className="text-2xl font-bold text-amber-600">{summary?.attendance.late ?? 0}</div>
                        <div className="text-xs text-muted-foreground">Late</div>
                      </div>
                      <div className="rounded-2xl border p-3 text-center">
                        <div className="text-2xl font-bold text-rose-600">{summary?.attendance.absent ?? 0}</div>
                        <div className="text-xs text-muted-foreground">Absent</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="students" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="students">Students</TabsTrigger>
                  <TabsTrigger value="courses">Courses</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="students">
                  <Card>
                    <CardHeader>
                      <CardTitle>Student Distribution</CardTitle>
                      <CardDescription>Status and fee breakdown from live data.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-3">
                      {(summary?.studentBreakdown || []).map((item) => (
                        <div key={item.name} className="rounded-2xl border p-4">
                          <div className="text-sm text-muted-foreground">{item.name}</div>
                          <div className="mt-2 text-3xl font-bold">{item.value.toLocaleString()}</div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="courses">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Courses</CardTitle>
                      <CardDescription>Newest courses and their current scope.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(summary?.recentCourses || []).map((course) => (
                        <div key={course._id} className="rounded-2xl border p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="font-semibold">{course.title}</div>
                              <div className="text-sm text-muted-foreground">
                                {course.teacher?.name || course.teacher?.email || "Teacher"} • {course.scopeType || "general"}
                              </div>
                            </div>
                            <Badge variant="secondary" className="capitalize">{course.scopeType || "general"}</Badge>
                          </div>
                          <Separator className="my-3" />
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {course.classIds?.map((classItem) => (
                              <Badge key={classItem._id} variant="outline">{classItem.name}</Badge>
                            ))}
                            {course.subjectIds?.map((subject) => (
                              <Badge key={subject._id} variant="outline">
                                {subject.code ? `${subject.code} - ` : ""}
                                {subject.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="activity">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Activity</CardTitle>
                      <CardDescription>Latest audit trail entries available to superadmin.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(summary?.recentLogs || []).map((log) => (
                        <div key={log._id} className="rounded-2xl border p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="font-medium">{log.action}</div>
                              <div className="text-sm text-muted-foreground">
                                {log.actorEmail || "system"} • {log.actorRole || "unknown"} • {log.target || "n/a"}
                              </div>
                            </div>
                            <Badge variant="outline" className="rounded-full">
                              {log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </AdminLayout>
    </RoleGate>
  );
}
