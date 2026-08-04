"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeCheck, Loader2, ShieldCheck } from "lucide-react";

type CertificateRecord = {
  certificateId: string;
  recipientName: string;
  courseName?: string;
  academyName?: string;
  companyName?: string;
  issueDate?: string;
  verified?: boolean;
  templateId?: string;
};

export default function PublicVerifyPage() {
  const params = useParams<{ certificateId: string }>();
  const certificateId = params?.certificateId || "";
  const API_BASE = useMemo(
    () => (process.env.NEXT_PUBLIC_API_BASE_URL || "https://qtech-backend.vercel.app").replace(/\/$/, ""),
    []
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [record, setRecord] = useState<CertificateRecord | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/certificates/verify/${certificateId}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || "Certificate not found");
        }
        setRecord(json.data || null);
      } catch (err: any) {
        setError(err?.message || "Failed to verify certificate");
      } finally {
        setLoading(false);
      }
    };

    if (certificateId) load();
  }, [API_BASE, certificateId]);

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-600/10 px-4 py-2 text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            Public Certificate Verification
          </div>
          <h1 className="text-3xl font-semibold">Verify Certificate</h1>
          <p className="mt-2 text-sm text-muted-foreground">Certificate ID: {certificateId}</p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Verifying certificate...
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-red-600">{error}</CardContent>
          </Card>
        ) : record ? (
          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Verification Result</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {record.verified ? (
                  <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Verified Certificate
                  </Badge>
                ) : (
                  <Badge variant="secondary">Not Verified</Badge>
                )}

                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Recipient:</span> {record.recipientName}</div>
                  <div><span className="font-medium">Course:</span> {record.courseName || "Not set"}</div>
                  <div><span className="font-medium">Academy:</span> {record.academyName || "-"}</div>
                  <div><span className="font-medium">Company:</span> {record.companyName || "-"}</div>
                  <div><span className="font-medium">Issue Date:</span> {record.issueDate || "-"}</div>
                  <div><span className="font-medium">Certificate ID:</span> {record.certificateId}</div>
                </div>

                <a href={`${API_BASE}/api/certificates/records/${record.certificateId}/pdf`} target="_blank" rel="noreferrer">
                  <Button className="w-full" type="button">Open PDF</Button>
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Certificate Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <iframe
                  title="Verified certificate preview"
                  src={`${API_BASE}/api/certificates/records/${record.certificateId}/pdf`}
                  className="h-[80vh] w-full rounded-md border bg-white"
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">Certificate not found.</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
