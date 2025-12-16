"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface Subject {
  _id: string;
  name: string;
  code?: string;
}

interface ClassFormProps {
  initialData?: {
    name?: string;
    description?: string;
    subjects?: string[];
  };
  onSubmit: (data: {
    name: string;
    description?: string;
    subjects: string[];
  }) => Promise<void>;
}

export function ClassForm({ initialData, onSubmit }: ClassFormProps) {
  const API_BASE = useMemo(
    () =>
      (process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.NEXT_PUBLIC_API_BASE ||
        "https://qtech-backend.vercel.app"
      ).replace(/\/$/, ""),
    []
  );

  // form state
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    initialData?.subjects || []
  );

  // subjects
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  // ui
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialData) return;

    setName(initialData.name || "");
    setDescription(initialData.description || "");
    setSelectedSubjects(initialData.subjects || []);
  }, [initialData]);


  // fetch subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setError(null);
        const res = await fetch(`${API_BASE}/api/subjects`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load subjects");

        const json = await res.json();
        const list = Array.isArray(json) ? json : json?.data ?? [];
        setSubjects(list);
      } catch {
        setError("Failed to load subjects");
      } finally {
        setLoadingSubjects(false);
      }
    };

    fetchSubjects();
  }, [API_BASE]);

  const toggleSubject = (id: string, checked: boolean) => {
    setSelectedSubjects((prev) =>
      checked ? [...prev, id] : prev.filter((sid) => sid !== id)
    );
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setError("Class name is required");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        subjects: selectedSubjects,
      });
    } catch (e: any) {
      setError(e?.message || "Failed to save class");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Class Details</CardTitle>
        <CardDescription>
          Enter class details and assign subjects
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
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

          {/* Description */}
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

          {/* Subjects */}
          <div className="space-y-2">
            <Label>Subjects</Label>

            {loadingSubjects ? (
              <p className="text-sm text-muted-foreground">
                Loading subjects…
              </p>
            ) : subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No subjects found
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {subjects.map((subj) => (
                  <div
                    key={subj._id}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={subj._id}
                      checked={selectedSubjects.includes(subj._id)}
                      onCheckedChange={(checked) =>
                        toggleSubject(subj._id, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={subj._id}
                      className="text-sm font-normal"
                    >
                      {subj.name}
                      {subj.code ? ` (${subj.code})` : ""}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="submit" disabled={saving || loadingSubjects}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
