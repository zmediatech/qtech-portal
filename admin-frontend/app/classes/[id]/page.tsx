// app/classes/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

type ClassDoc = {
  _id: string;
  name: string;
  description?: string;
};

function asArray(json: any): any[] {
  if (Array.isArray(json)) return json;
  if (json?.data && Array.isArray(json.data)) return json.data;
  if (json?.items && Array.isArray(json.items)) return json.items;
  if (json?.results && Array.isArray(json.results)) return json.results;
  return [];
}

export default function ClassesListPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<ClassDoc[]>([]);

  const API_BASE = useMemo(
    () =>
      (process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.NEXT_PUBLIC_API_BASE ||
        "http://localhost:5000"
      ).replace(/\/$/, ""),
    []
  );

  async function load() {
    try {
      setLoading(true);
      setErr(null);

      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers: HeadersInit = token
        ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
        : { "Content-Type": "application/json" };

      // 👇 cache: "no-store" guarantees fresh data
      const res = await fetch(`${API_BASE}/api/classes`, { headers, cache: "no-store" });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || json?.error || `Failed to load (status ${res.status})`);
      }

      // accept {success, data:[...]}, {items:[...]}, or [...]
      const list = asArray(json);
      setRows(list as ClassDoc[]);
    } catch (e: any) {
      setErr(e?.message || "Failed to load classes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Classes</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}>Refresh</Button>
          <Link href="/classes/new">
            <Button>New Class</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <Card className="mt-4">
          <CardContent className="py-10 text-center text-muted-foreground">Loading…</CardContent>
        </Card>
      ) : err ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Could not load classes.</CardDescription>
          </CardHeader>
          <CardContent><div className="text-sm text-red-600">{err}</div></CardContent>
        </Card>
      ) : (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>All Classes</CardTitle>
            <CardDescription>Total: {rows.length}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[160px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => (
                    <TableRow key={c._id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.description || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Link href={`/classes/${c._id}/edit`}>
                            <Button size="sm" variant="secondary">Edit</Button>
                          </Link>
                          {/* If you have a detail page */}
                          <Link href={`/classes/${c._id}`}>
                            <Button size="sm" variant="outline">View</Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!rows.length && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No classes found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
}
