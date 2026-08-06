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
import { Search, Filter, ShieldCheck, Clock3, RefreshCw } from "lucide-react";

type AuditLogRow = {
  _id: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  target?: string;
  method?: string;
  statusCode?: number;
  details?: unknown;
  createdAt?: string;
};

export default function AuditLogsPage() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [action, setAction] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const loadLogs = async () => {
    setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.append("q", query.trim());
      if (role !== "all") params.append("actorRole", role);
      if (action !== "all") params.append("action", action);
      if (from) params.append("from", from);
      if (to) params.append("to", to);
      params.append("limit", "50");

      const res = await fetch(apiUrl(`/api/audit-logs?${params.toString()}`), {
        headers: authHeaders(),
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to load audit logs");
      }
      setRows(Array.isArray(json.data) ? json.data : []);
      setTotal(json.total || 0);
    } catch {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actions = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.action))).filter(Boolean);
  }, [rows]);

  const clearFilters = () => {
    setQuery("");
    setRole("all");
    setAction("all");
    setFrom("");
    setTo("");
  };

  return (
    <RoleGate allowedRoles={["superadmin"]} message="Audit logs are reserved for superadmin.">
      <AdminLayout>
        <div className="space-y-6">
          <div className="rounded-3xl border bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-800 p-5 text-white sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <ShieldCheck className="h-4 w-4" />
                  Security & Compliance
                </div>
                <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Audit Logs</h1>
                <p className="mt-2 max-w-3xl text-sm text-white/75">
                  Search and review important system activity, user actions, and configuration changes.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="rounded-full bg-white/10 px-3 py-1 text-white">
                  <Clock3 className="mr-2 h-4 w-4" />
                  {total.toLocaleString()} entries
                </Badge>
                <Button onClick={loadLogs} variant="secondary" className="rounded-full bg-white text-slate-900 hover:bg-slate-100">
                  <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-emerald-600" />
                Filters
              </CardTitle>
              <CardDescription>Use filters to narrow down audit events quickly.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-2 xl:col-span-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search email, action, or target" className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="superadmin">Superadmin</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Action</Label>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    {actions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>From</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </CardContent>
            <CardContent className="flex flex-wrap gap-3 pt-0">
              <Button onClick={loadLogs}>Apply Filters</Button>
              <Button variant="outline" className="bg-transparent" onClick={clearFilters}>
                Reset
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Entries are written automatically when protected system actions succeed.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">Loading audit logs...</div>
              ) : rows.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No audit entries found.</div>
              ) : (
                <div className="space-y-4">
                  {rows.map((row) => (
                    <div key={row._id} className="rounded-2xl border p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="rounded-full capitalize">
                              {row.actorRole || "unknown"}
                            </Badge>
                            <Badge variant="outline" className="rounded-full">
                              {row.method || "GET"}
                            </Badge>
                            <Badge className="rounded-full bg-emerald-600 text-white">
                              {row.statusCode || 200}
                            </Badge>
                          </div>
                          <div className="text-base font-semibold text-slate-900">{row.action}</div>
                          <div className="text-sm text-muted-foreground">
                            {row.actorEmail || "system"} • {row.target || "n/a"}
                          </div>
                        </div>
                        <Badge variant="outline" className="rounded-full">
                          {row.createdAt ? new Date(row.createdAt).toLocaleString() : ""}
                        </Badge>
                      </div>
                      {row.details && (
                        <>
                          <Separator className="my-3" />
                          <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-3 text-xs text-slate-100">
                            {JSON.stringify(row.details, null, 2)}
                          </pre>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </RoleGate>
  );
}
