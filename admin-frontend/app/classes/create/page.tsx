"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface Subject {
  _id: string;
  name: string;
  code?: string;
}

export default function CreateClassPage() {
  const router = useRouter();

  const API_BASE = useMemo(
    () =>
      (process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.NEXT_PUBLIC_API_BASE ||
        "http://localhost:5000"
      ).replace(/\/$/, ""),
    []
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 🔹 Fetch subjects from backend
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/subjects`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed with status ${res.status}`);

        const json = await res.json();
        if (Array.isArray(json)) {
          setSubjects(json);
        } else if (json.data) {
          setSubjects(json.data);
        } else {
          throw new Error("Unexpected response format");
        }
      } catch (error: any) {
        console.error("Error fetching subjects:", error.message);
        setErr("Failed to load subjects");
      } finally {
        setLoadingSubjects(false);
      }
    };

    fetchSubjects();
  }, [API_BASE]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErr("Name is required");
      return;
    }
    try {
      setSaving(true);
      setErr(null);

      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers: HeadersInit = token
        ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
        : { "Content-Type": "application/json" };

      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        subjectIds: selectedSubjects,
      };

      const res = await fetch(`${API_BASE}/api/classes`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || json?.error || `Failed (status ${res.status})`);
      }

      // ✅ redirect to class list if it exists
      router.push("/classes"); 
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed to create class");
    } finally {
      setSaving(false);
    }
  }

  const toggleSubject = (id: string, checked: boolean) => {
    setSelectedSubjects((prev) =>
      checked ? [...prev, id] : prev.filter((sid) => sid !== id)
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Create Class</h1>
        <Link href="/classes">
          <Button variant="outline">Back</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Class</CardTitle>
          <CardDescription>Enter details and save</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Grade 10 - A"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>

            {/* 🔹 Subjects Section */}
            <div className="space-y-2">
              <Label>Subjects</Label>
              {loadingSubjects ? (
                <p className="text-sm text-muted-foreground">Loading subjects…</p>
              ) : subjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subjects found</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {subjects.map((subj) => (
                    <div key={subj._id} className="flex items-center space-x-2">
                      <Checkbox
                        id={subj._id}
                        checked={selectedSubjects.includes(subj._id)}
                        onCheckedChange={(checked) => toggleSubject(subj._id, checked as boolean)}
                      />
                      <Label htmlFor={subj._id} className="text-sm font-normal">
                        {subj.name} {subj.code ? `(${subj.code})` : ""}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {err && <div className="text-sm text-red-600">{err}</div>}

            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Create"}
              </Button>
              <Link href="/classes">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
