"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://qtech-backend.vercel.app";
const API_BASE = `${RAW_BASE.replace(/\/+$/,"")}/api`;

type Class = { _id: string; name: string };
type Subject = { _id: string; name: string };

export default function CreateExamPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // dynamic options
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingOpts, setLoadingOpts] = useState(true);

  // form fields
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [startAt, setStartAt] = useState("04/09/2025 10:30");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [instructions, setInstructions] = useState("");

  // fetch classes & subjects
  useEffect(() => {
    (async () => {
      try {
        const [cr, sr] = await Promise.all([
          fetch(`${API_BASE}/classes`, { cache: "no-store" }),
          fetch(`${API_BASE}/subjects`, { cache: "no-store" }),
        ]);
        const cjson = await cr.json();
        const sjson = await sr.json();
        const cl: Class[] = Array.isArray(cjson) ? cjson : (cjson.data || []);
        const sb: Subject[] = Array.isArray(sjson) ? sjson : (sjson.data || []);
        setClasses(cl);
        setSubjects(sb);
        if (cl[0]?._id) setClassId(cl[0]._id);
        if (sb[0]?._id) setSubjectId(sb[0]._id);
      } catch (e) {
        console.warn("Failed to load class/subject options", e);
      } finally {
        setLoadingOpts(false);
      }
    })();
  }, []);

  const onSubmit = async () => {
    if (!classId || !subjectId) {
      alert("Please select Class and Subject");
      return;
    }
    setSaving(true);
    try {
      const className = classes.find(c => c._id === classId)?.name || "";
      const subjectName = subjects.find(s => s._id === subjectId)?.name || "";

      const res = await fetch(`${API_BASE}/exams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          classId,
          subjectId,
          className,
          subjectName,
          startAt,
          durationMinutes,
          instructions,
          status: "draft",
          questions: [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Create failed");
      router.push(`/exams/${json.data._id}/edit`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <Card>
        <CardHeader>
          <CardTitle>Create Exam</CardTitle>
          <CardDescription>Fill in your exam details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Exam Title</label>
            <Input
              placeholder="Enter exam title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Class</label>
              <Select value={classId} onValueChange={setClassId} disabled={loadingOpts}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder={loadingOpts ? "Loading..." : "Select class"} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Subject</label>
              <Select value={subjectId} onValueChange={setSubjectId} disabled={loadingOpts}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder={loadingOpts ? "Loading..." : "Select subject"} />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Start Date & Time</label>
            <Input
              placeholder="dd/mm/yyyy hh:mm"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Duration (Minutes)</label>
            <Input
              type="number"
              placeholder="Enter duration in minutes"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(+e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Instructions</label>
            <Textarea
              placeholder="Enter exam instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="mt-1"
            />
          </div>

          <Button onClick={onSubmit} disabled={saving || loadingOpts}>
            {saving ? "Saving..." : "Create Exam"}
          </Button>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
