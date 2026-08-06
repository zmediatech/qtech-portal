"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminLayout } from "@/components/admin-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeCheck, Copy, ExternalLink, Loader2, Printer } from "lucide-react";
import { RoleGate } from "@/components/role-gate";

type CertificateRecord = {
  certificateId: string;
  recipientName: string;
  title?: string;
  subtitle?: string;
  bodyLine?: string;
  description?: string;
  academyName?: string;
  companyName?: string;
  courseName?: string;
  leftSignerName?: string;
  leftSignerRole?: string;
  rightSignerName?: string;
  rightSignerRole?: string;
  issueDate?: string;
  verified?: boolean;
  templateId?: string;
  mode?: string;
};

export default function CertificateDetailsPage() {
  const params = useParams<{ certificateId: string }>();
  const certificateId = params?.certificateId || "";
  const API_BASE = useMemo(
    () => (process.env.NEXT_PUBLIC_API_BASE_URL || "https://qtech-backend.vercel.app").replace(/\/$/, ""),
    []
  );

  const getAuthHeaders = () => {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [record, setRecord] = useState<CertificateRecord | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/certificates/records/${certificateId}`, {
          cache: "no-store",
          headers: getAuthHeaders(),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || "Certificate not found");
        }
        setRecord(json.data || null);
      } catch (err: any) {
        setError(err?.message || "Failed to load certificate");
      } finally {
        setLoading(false);
      }
    };

    if (certificateId) load();
  }, [API_BASE, certificateId]);

  const verifyUrl = typeof window !== "undefined" ? `${window.location.origin}/verify/${certificateId}` : "";

  const copyVerifyLink = async () => {
    if (!verifyUrl) return;
    await navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <RoleGate allowedRoles={["superadmin", "admin", "teacher"]} message="Certificates are available to staff only.">
      <AdminLayout>
        <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Certificate Details</h1>
            <p className="text-sm text-muted-foreground">Unique ID: {certificateId}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/certificates/all">
              <Button variant="outline">Back</Button>
            </Link>
            {record ? (
              <a href={`${API_BASE}/api/certificates/records/${record.certificateId}/pdf`} target="_blank" rel="noreferrer">
                <Button className="gap-2" type="button">
                  <Printer className="h-4 w-4" />
                  Open PDF
                </Button>
              </a>
            ) : null}
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading certificate...
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-red-600">{error}</CardContent>
          </Card>
        ) : record ? (
          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Verification Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  {record.verified ? (
                    <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Recipient:</span> {record.recipientName}</div>
                  <div><span className="font-medium">Course:</span> {record.courseName || "Not set"}</div>
                  <div><span className="font-medium">Academy:</span> {record.academyName || "-"}</div>
                  <div><span className="font-medium">Company:</span> {record.companyName || "-"}</div>
                  <div><span className="font-medium">Issue Date:</span> {record.issueDate || "-"}</div>
                  <div><span className="font-medium">Template:</span> {record.templateId || "-"}</div>
                  <div><span className="font-medium">Mode:</span> {record.mode || "-"}</div>
                  <div><span className="font-medium">Certificate ID:</span> {record.certificateId}</div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={copyVerifyLink} className="gap-2">
                    <Copy className="h-4 w-4" />
                    {copied ? "Copied" : "Copy verify link"}
                  </Button>
                  {verifyUrl ? (
                    <Link href={verifyUrl} target="_blank">
                      <Button variant="ghost" className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Open verify page
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Certificate Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <iframe
                  title="Certificate PDF preview"
                  src={`${API_BASE}/api/certificates/records/${record.certificateId}/pdf`}
                  className="h-[80vh] w-full rounded-md border bg-white"
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">Certificate not found.</CardContent>
          </Card>
        )}
        </div>
      </AdminLayout>
    </RoleGate>
  );
}
