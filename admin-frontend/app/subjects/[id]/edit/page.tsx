"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminLayout } from "@/components/admin-layout";
import { SubjectForm } from "@/components/subject-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000";

type SubjectFromApi = {
  _id: string;
  name: string;
  code: string;
  description?: string;
  credits?: number;
  department?: string;
};

export default function EditSubjectPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [apiSubject, setApiSubject] = useState<SubjectFromApi | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErrMsg(null);
        const res = await fetch(`${API_BASE}/api/subjects/${id}`, {
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        const json = await res.json();
        if (!alive) return;
        if (!res.ok || !json?.success || !json?.data) {
          throw new Error(json?.message || json?.error || `Failed to fetch (status ${res.status})`);
        }
        setApiSubject(json.data as SubjectFromApi);
      } catch (e: any) {
        if (!alive) return;
        setErrMsg(e?.message || "Failed to load subject");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const formSubject = useMemo(() => {
    if (!apiSubject) return undefined;
    return {
      id: apiSubject._id,
      name: apiSubject.name || "",
      code: apiSubject.code || "",
      description: apiSubject.description || "",
      credits: apiSubject.credits || 0,
      department: apiSubject.department || "",
    };
  }, [apiSubject]);

  const handleSubmit = async (payload: any) => {
    if (!id) return;
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/subjects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json?.success || !json?.data) {
        throw new Error(json?.message || json?.error || `Failed to update (status ${res.status})`);
      }
      router.push("/subjects");
    } catch (e: any) {
      alert(e?.message || "Failed to update subject");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm("Delete this subject? This cannot be undone.")) return;
    try {
      setDeleting(true);
      const res = await fetch(`${API_BASE}/api/subjects/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || `Failed to delete (status ${res.status})`);
      }
      router.push("/subjects");
    } catch (e: any) {
      alert(e?.message || "Failed to delete subject");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Edit Subject</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>

      {loading && (
        <Card className="mt-4">
          <CardContent className="py-10 text-center text-muted-foreground">Loading…</CardContent>
        </Card>
      )}

      {!loading && errMsg && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Could not load the subject.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-red-600">{errMsg}</div>
          </CardContent>
        </Card>
      )}

      {!loading && !errMsg && formSubject && (
        <div className="mt-4">
          <SubjectForm subject={formSubject} onSubmit={handleSubmit} />
          {saving && <div className="mt-2 text-sm text-muted-foreground">Saving your changes…</div>}
        </div>
      )}
    </AdminLayout>
  );
}
