"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BadgeCheck, ExternalLink } from "lucide-react";

type CertificateRecord = {
  _id: string;
  certificateId: string;
  recipientName: string;
  courseName?: string;
  academyName?: string;
  companyName?: string;
  issueDate?: string;
  verified?: boolean;
  createdAt?: string;
};

export default function CertificatesAllPage() {
  const API_BASE = useMemo(
    () => (process.env.NEXT_PUBLIC_API_BASE_URL || "https://qtech-backend.vercel.app").replace(/\/$/, ""),
    []
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [records, setRecords] = useState<CertificateRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${API_BASE}/api/certificates/records`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || "Failed to load certificates");
        }
        setRecords(Array.isArray(json.data) ? json.data : []);
      } catch (err: any) {
        setError(err?.message || "Failed to load certificates");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [API_BASE]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">All Certificates</h1>
            <p className="text-sm text-muted-foreground">Review issued certificates and open each details page.</p>
          </div>
          <Link href="/certificates">
            <Button>Create Certificate</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Issued Certificates</CardTitle>
            <CardDescription>Each certificate has a unique verification ID.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading certificates...
              </div>
            ) : error ? (
              <div className="space-y-3 py-8 text-center">
                <div className="text-sm text-red-600">{error}</div>
                <Button onClick={() => window.location.reload()} variant="outline">Try Again</Button>
              </div>
            ) : records.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No certificates found yet.</div>
            ) : (
              <div className="grid gap-4">
                {records.map((record) => (
                  <div key={record._id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold">{record.recipientName}</h3>
                          {record.verified ? (
                            <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
                              <BadgeCheck className="h-3.5 w-3.5" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {record.courseName || "Course not set"} · ID: <span className="font-medium text-foreground">{record.certificateId}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {record.academyName || "Academy Name"}
                          {record.companyName ? ` · ${record.companyName}` : ""}
                          {record.issueDate ? ` · ${record.issueDate}` : ""}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link href={`/certificates/all/${record.certificateId}`}>
                          <Button variant="outline">View Details</Button>
                        </Link>
                        <Link href={`/verify/${record.certificateId}`} target="_blank">
                          <Button variant="ghost" className="gap-2">
                            Verify Link
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
