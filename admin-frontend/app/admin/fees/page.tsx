"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FeePaymentForm } from "@/components/fee-payment-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MoreHorizontal,
  Plus,
  Search,
  Calendar as CalendarIcon,
  Eye,
  History,
  Trash2,
  AlertTriangle,
  RefreshCw,
  DollarSign,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";

type FeeRecord = {
  _id: string;
  regNo: string;
  studentName: string;
  className: string;
  feeType: string;
  amount: number;
  date: string; // ISO
  method: "Cash" | "Bank Transfer" | "Online" | "-";
  status: "Paid" | "Pending" | "Unpaid";
  referenceNo?: string;
  notes?: string;
  studentExists?: boolean;
};

type FeeListResponse = {
  items: FeeRecord[];
  total: number;
  page: number;
  pages: number;
};

type ClassLite = { _id: string; name: string };

// Unified API base
const RAW_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000";

const API_BASE = `${RAW_BASE.replace(/\/+$/, "")}/api/fee-records`;
const API_CLASSES = `${RAW_BASE.replace(/\/+$/, "")}/api/classes`;
const API_STUDENTS = `${RAW_BASE.replace(/\/+$/, "")}/api/students`;

// ---- Helpers ----
function getStatusBadge(status: string) {
  const variant =
    status === "Paid" ? "default" : status === "Pending" ? "secondary" : status === "Unpaid" ? "destructive" : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}

function getMethodBadge(method: string) {
  if (!method || method === "-") return <span className="text-muted-foreground">-</span>;
  return <Badge variant="outline">{method}</Badge>;
}

const formatPKR = (n: number) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" }).format(n || 0);

export default function FeesPage() {
  const [records, setRecords] = useState<FeeRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"All" | "Paid" | "Pending" | "Unpaid">("All");
  const [classId, setClassId] = useState<string | "All">("All");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [limit] = useState(20);
  const [showOrphaned, setShowOrphaned] = useState(false);
  const [orphanedCount, setOrphanedCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [checkingOrphaned, setCheckingOrphaned] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Payment history dialog state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRegNo, setHistoryRegNo] = useState<string | null>(null);
  const [historyStudentName, setHistoryStudentName] = useState<string>("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<FeeRecord[]>([]);

  // Classes for the top filter
  const [classes, setClasses] = useState<ClassLite[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(API_CLASSES, { cache: "no-store" });
        const json = await res.json();
        const list: any[] = Array.isArray(json) ? json : json?.data || [];
        const simplified: ClassLite[] = list.map((c: any) => ({ _id: c._id, name: c.name }));
        setClasses(simplified);
      } catch {
        setClasses([]);
      }
    })();
  }, []);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (status !== "All") p.set("status", status);
    if (classId !== "All") p.set("classId", String(classId));
    if (dateRange.from) p.set("from", dateRange.from.toISOString().slice(0, 10));
    if (dateRange.to) p.set("to", dateRange.to.toISOString().slice(0, 10));
    p.set("page", String(page));
    p.set("limit", String(limit));
    p.set("sort", "date:desc");
    return p.toString();
  }, [q, status, classId, dateRange.from, dateRange.to, page, limit]);

  // Check student existence via search (by regNo)
  const checkStudentExists = async (regNo: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_STUDENTS}?q=${encodeURIComponent(regNo)}&limit=1`, { cache: "no-store" });
      if (!res.ok) return false;
      const data = await res.json();

      const arr =
        Array.isArray(data?.data) ? data.data :
        Array.isArray(data?.items) ? data.items :
        Array.isArray(data) ? data : [];

      return arr.some((s: any) => s?.regNo === regNo);
    } catch {
      return false;
    }
  };

  // Orphaned count
  const fetchOrphanedCount = async () => {
    try {
      const response = await fetch(`${API_BASE}/orphaned-count`, { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setOrphanedCount(data.orphanedCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch orphaned count:", error);
    }
  };

  async function fetchRecords() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${API_BASE}?${queryString}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: FeeListResponse = await res.json();

      // mark existence
      setCheckingOrphaned(true);
      const recordsWithValidation = await Promise.all(
        (data.items || []).map(async (record) => {
          const studentExists = await checkStudentExists(record.regNo);
          return { ...record, studentExists };
        })
      );
      setCheckingOrphaned(false);

      setRecords(recordsWithValidation);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setPages(data.pages || 1);

      fetchOrphanedCount();
    } catch (e: any) {
      setErr(e?.message || "Failed to fetch");
      setCheckingOrphaned(false);
    } finally {
      setLoading(false);
    }
  }

  // Payment history loader (open dialog, then separate effect fetches)
  const openPaymentHistory = async (regNo: string, studentName: string) => {
    setHistoryRegNo(regNo);
    setHistoryStudentName(studentName || regNo);
    setHistoryOpen(true);
  };

  useEffect(() => {
    const loadHistory = async () => {
      if (!historyOpen || !historyRegNo) return;
      setHistoryLoading(true);
      try {
        const res = await fetch(`${API_BASE}?q=${encodeURIComponent(historyRegNo)}&limit=200`, { cache: "no-store" });
        const json = await res.json();
        const items: FeeRecord[] = Array.isArray(json?.items) ? json.items : [];
        const onlyThisStudent = items.filter((f) => f.regNo === historyRegNo);
        onlyThisStudent.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setHistoryItems(onlyThisStudent);
      } catch {
        setHistoryItems([]);
      } finally {
        setHistoryLoading(false);
      }
    };
    loadHistory();
  }, [historyOpen, historyRegNo]);

  // Cleanup orphaned records
  const cleanupOrphanedRecords = async () => {
    if (!confirm("Are you sure you want to delete all orphaned fee records? This action cannot be undone.")) {
      return;
    }
    setCleanupLoading(true);
    try {
      const response = await fetch(`${API_BASE}/cleanup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Cleanup failed");
      const result = await response.json();
      alert(`Successfully cleaned up ${result.deletedCount} orphaned records`);
      fetchRecords();
    } catch (error: any) {
      alert("Cleanup failed: " + (error.message || "Unknown error"));
    } finally {
      setCleanupLoading(false);
    }
  };

  // Delete single orphaned
  const deleteOrphanedRecord = async (recordId: string) => {
    if (!confirm("Are you sure you want to delete this fee record?")) return;
    try {
      const response = await fetch(`${API_BASE}/${recordId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete record");
      const result = await response.json();
      alert(result.message || "Record deleted successfully");
      fetchRecords();
    } catch (error: any) {
      alert("Delete failed: " + (error.message || "Unknown error"));
    }
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  useEffect(() => {
    fetchOrphanedCount();
  }, []);

  const handleCreated = () => {
    setPage(1);
    fetchRecords();
  };

  const prettyFrom =
    dateRange.from && dateRange.from.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  const prettyTo =
    dateRange.to && dateRange.to.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  // Only exclude when we are SURE it’s orphaned
  const filteredRecords = showOrphaned ? records : records.filter((r) => r.studentExists !== false);
  const currentPageOrphanedCount = records.filter((r) => r.studentExists === false).length;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Fee Management</h1>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchOrphanedCount} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>

          {orphanedCount > 0 && (
            <Button
              variant="outline"
              onClick={cleanupOrphanedRecords}
              disabled={cleanupLoading}
              className="gap-2 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
            >
              <Trash2 className="h-4 w-4" />
              {cleanupLoading ? "Cleaning..." : `Clean Up (${orphanedCount})`}
            </Button>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Record Payment
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[600px] sm:max-w-[600px]">
              <SheetHeader>
                <SheetTitle>Record Fee Payment</SheetTitle>
                <SheetDescription>Add a new fee payment record to the system</SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <FeePaymentForm onSuccess={handleCreated} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {orphanedCount > 0 && (
        <Alert className="mt-4 border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Found {orphanedCount} fee record(s) for deleted students.
            <Button
              variant="link"
              className="p-0 h-auto text-amber-800 underline ml-1"
              onClick={() => setShowOrphaned(!showOrphaned)}
            >
              {showOrphaned ? "Hide" : "Show"} orphaned records
            </Button>
            {showOrphaned && currentPageOrphanedCount > 0 && (
              <span className="ml-2 text-sm">({currentPageOrphanedCount} on this page)</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {checkingOrphaned && (
        <Alert className="mt-4 border-blue-200 bg-blue-50">
          <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
          <AlertDescription className="text-blue-800">Checking for orphaned records...</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card className="mt-4">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or reg no…"
                value={q}
                onChange={(e) => {
                  setPage(1);
                  setQ(e.target.value);
                }}
              />
            </div>

            {/* Status */}
            <Select
              value={status}
              onValueChange={(v: "All" | "Paid" | "Pending" | "Unpaid") => {
                setPage(1);
                setStatus(v);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>

            {/* Class filter */}
            <Select
              value={classId}
              onValueChange={(v: string) => {
                setPage(1);
                setClassId(v as any);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date range */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {prettyFrom || prettyTo ? `${prettyFrom || "—"} to ${prettyTo || "—"}` : "Date Range"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="p-3">
                <div className="space-y-2">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to } as any}
                    onSelect={(r: any) => {
                      setPage(1);
                      setDateRange({ from: r?.from, to: r?.to });
                    }}
                    numberOfMonths={2}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setDateRange({})}>
                      Clear
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Fee Records</CardTitle>
          <CardDescription>Track and manage student fee payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            {err ? (
              <div className="p-6 text-sm text-red-600">Failed to load: {err}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reg No</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Fee Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[90px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                        No records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((r) => (
                      <TableRow key={r._id} className={r.studentExists === false ? "bg-red-50 opacity-75" : ""}>
                        <TableCell className="font-medium">
                          {r.regNo}
                          {r.studentExists === false && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Orphaned
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {r.studentName}
                          {r.studentExists === false && <div className="text-xs text-red-600">Student deleted</div>}
                        </TableCell>
                        <TableCell>{r.className}</TableCell>
                        <TableCell>{r.feeType}</TableCell>
                        <TableCell>{formatPKR(r.amount)}</TableCell>
                        <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                        <TableCell>{getMethodBadge(r.method)}</TableCell>
                        <TableCell>{getStatusBadge(r.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end">
                            <MoreMenu
                              regNo={r.regNo}
                              studentName={r.studentName}
                              recordId={r._id}
                              isOrphaned={r.studentExists === false}
                              onDeleteOrphaned={() => deleteOrphanedRecord(r._id)}
                              onViewHistory={() => openPaymentHistory(r.regNo, r.studentName)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} records
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className="w-8 h-8"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {pages > 5 && (
                    <>
                      <span className="text-muted-foreground">...</span>
                      <Button
                        variant={page === pages ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pages)}
                        className="w-8 h-8"
                      >
                        {pages}
                      </Button>
                    </>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= pages}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Payment History {historyStudentName ? `— ${historyStudentName}` : ""}
            </DialogTitle>
          </DialogHeader>

          {historyLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading history…</div>
          ) : historyItems.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-50" />
              No payments found for {historyRegNo}
            </div>
          ) : (
            <div className="space-y-4">
              {/* quick summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <SummaryTile
                  label="Total Paid"
                  value={new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" }).format(
                    historyItems.filter((i) => i.status === "Paid").reduce((s, r) => s + r.amount, 0)
                  )}
                />
                <SummaryTile
                  label="Pending"
                  value={new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" }).format(
                    historyItems.filter((i) => i.status !== "Paid").reduce((s, r) => s + r.amount, 0)
                  )}
                />
                <SummaryTile label="Records" value={String(historyItems.length)} />
                <SummaryTile
                  label="Last Payment"
                  value={(() => {
                    const paid = historyItems.filter((i) => i.status === "Paid");
                    if (paid.length === 0) return "-";
                    const last = paid.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                    return new Date(last.date).toLocaleDateString();
                  })()}
                />
              </div>

              {/* list */}
              <div className="max-h-[60vh] overflow-auto rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyItems.map((fee) => (
                      <TableRow key={fee._id}>
                        <TableCell>{new Date(fee.date).toLocaleDateString()}</TableCell>
                        <TableCell>{fee.feeType}</TableCell>
                        <TableCell>{getMethodBadge(fee.method)}</TableCell>
                        <TableCell>{getStatusBadge(fee.status)}</TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" }).format(fee.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}

function MoreMenu({
  regNo,
  studentName,
  recordId,
  isOrphaned,
  onDeleteOrphaned,
  onViewHistory,
}: {
  regNo: string;
  studentName: string;
  recordId: string;
  isOrphaned?: boolean;
  onDeleteOrphaned: () => void;
  onViewHistory: () => void;
}) {
  return (
    <div className="relative">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-52 p-2">
          <div className="flex flex-col">
            {!isOrphaned ? (
              <>
                <Link href={`/students/${regNo}`} className="flex items-center gap-2 px-2 py-2 hover:bg-muted rounded-md">
                  <Eye className="h-4 w-4" />
                  <span>View Student</span>
                </Link>
                <button
                  type="button"
                  onClick={onViewHistory}
                  className="flex items-center gap-2 px-2 py-2 hover:bg-muted rounded-md text-left"
                >
                  <History className="h-4 w-4" />
                  <span>Payment History</span>
                </button>
              </>
            ) : (
              <div
                className="flex items-center gap-2 px-2 py-2 hover:bg-muted rounded-md cursor-pointer text-red-600"
                onClick={onDeleteOrphaned}
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Record</span>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
