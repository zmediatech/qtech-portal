"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

/* ================= TYPES ================= */

type Class = {
  _id: string;
  name: string;
  code?: string;
};

type SubjectFormData = {
  _id?: string;
  name: string;
  code: string;
  linkedClasses: string[];
};

interface SubjectFormProps {
  subject?: SubjectFormData;
  onSubmit: (data: SubjectFormData) => Promise<void>;
}

/* ================= COMPONENT ================= */

export function SubjectForm({ subject, onSubmit }: SubjectFormProps) {
  const [formData, setFormData] = useState<SubjectFormData>({
    name: "",
    code: "",
    linkedClasses: [],
    ...subject,
  });

  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ================= LOAD CLASSES ================= */

  useEffect(() => {
    const loadClasses = async () => {
      try {
        setLoadingData(true);
        const res = await fetch(`${API_BASE}/api/classes`);
        const data = await res.json();
        setClasses(Array.isArray(data) ? data : data.data || []);
      } catch (err: any) {
        setError("Failed to load classes");
      } finally {
        setLoadingData(false);
      }
    };

    loadClasses();
  }, []);

  /* ================= HANDLERS ================= */

  const toggleClass = (classId: string) => {
    setFormData((prev) => ({
      ...prev,
      linkedClasses: prev.linkedClasses.includes(classId)
        ? prev.linkedClasses.filter((id) => id !== classId)
        : [...prev.linkedClasses, classId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.code.trim()) {
      setError("Name and Code are required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await onSubmit({
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        linkedClasses: formData.linkedClasses,
      });
    } catch (err: any) {
      setError(err.message || "Failed to save subject");
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {subject?._id ? "Edit Subject" : "Create Subject"}
        </CardTitle>
        <CardDescription>
          Manage subject details and linked classes
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Subject Name */}
          <div className="space-y-2">
            <Label>Subject Name *</Label>
            <Input
              placeholder="Mathematics"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          {/* Subject Code */}
          <div className="space-y-2">
            <Label>Subject Code *</Label>
            <Input
              placeholder="MATH101"
              value={formData.code}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  code: e.target.value.toUpperCase(),
                })
              }
            />
          </div>

          {/* Linked Classes */}
          <div className="space-y-2">
            <Label>Linked Classes</Label>

            {loadingData ? (
              <p className="text-sm text-muted-foreground">
                Loading classes...
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {classes.map((cls) => (
                  <label
                    key={cls._id}
                    className="flex items-center gap-2 border rounded-md p-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.linkedClasses.includes(cls._id)}
                      onChange={() => toggleClass(cls._id)}
                    />
                    <span>
                      {cls.code ? `${cls.code} - ` : ""}
                      {cls.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : subject?._id ? (
              "Update Subject"
            ) : (
              "Create Subject"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
