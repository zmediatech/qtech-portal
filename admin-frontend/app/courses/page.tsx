"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { apiUrl, authHeaders } from "@/lib/api";
import { getStoredUser, SessionUser } from "@/lib/session";
import { BookOpen, Upload, Plus, PlayCircle } from "lucide-react";

type ClassItem = { _id: string; name: string };
type SubjectItem = { _id: string; name: string; code?: string };
type Lecture = {
  _id: string;
  title: string;
  description?: string;
  order?: number;
  resourceUrl?: string;
  fileName?: string;
  mimeType?: string;
};
type Course = {
  _id: string;
  title: string;
  description?: string;
  scopeType?: "general" | "classwise" | "subjectwise" | "both";
  status?: string;
  teacher?: { _id?: string; name?: string; email?: string; role?: string };
  classIds?: ClassItem[];
  subjectIds?: SubjectItem[];
  lectures?: Lecture[];
  enrollmentCount?: number;
};
type Enrollment = { _id: string; course?: { _id?: string } };

const SCOPE_OPTIONS = [
  { value: "general", label: "General" },
  { value: "classwise", label: "Classwise" },
  { value: "subjectwise", label: "Subjectwise" },
  { value: "both", label: "Class + Subject" },
] as const;

function tokenHeader(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as any).data)) return (payload as any).data;
  return [];
}

export default function CoursesPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = user?.role || "student";
  const canManage = role === "admin" || role === "teacher";

  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    scopeType: "general",
    status: "published",
    coverImageUrl: "",
    classIds: [] as string[],
    subjectIds: [] as string[],
  });

  const [lectureForm, setLectureForm] = useState({
    title: "",
    description: "",
    order: "1",
    resourceUrl: "",
    file: null as File | null,
  });

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      window.location.href = "/login";
      return;
    }
    setUser(stored);
  }, []);

  useEffect(() => {
    if (!user) return;

    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [classesRes, subjectsRes, coursesRes, enrollRes] = await Promise.all([
          fetch(apiUrl("/api/classes"), { headers: { ...authHeaders() }, cache: "no-store" }),
          fetch(apiUrl("/api/subjects"), { headers: { ...authHeaders() }, cache: "no-store" }),
          fetch(apiUrl("/api/lms/courses"), { headers: { ...authHeaders() }, cache: "no-store" }),
          fetch(apiUrl("/api/lms/enrollments/me"), { headers: { ...authHeaders() }, cache: "no-store" }),
        ]);

        const [classesJson, subjectsJson, coursesJson, enrollJson] = await Promise.all([
          classesRes.json(),
          subjectsRes.json(),
          coursesRes.json(),
          enrollRes.json(),
        ]);

        if (!alive) return;

        setClasses(asArray<ClassItem>(classesJson));
        setSubjects(asArray<SubjectItem>(subjectsJson));
        const fetchedCourses = asArray<Course>(coursesJson);
        setCourses(fetchedCourses);
        setEnrollments(asArray<Enrollment>(enrollJson));
        setSelectedCourse((current) => current ?? fetchedCourses[0] ?? null);
      } catch (err: any) {
        if (!alive) return;
        setError(err?.message || "Unable to load LMS");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [user]);

  useEffect(() => {
    if (!selectedCourse?._id) return;

    let alive = true;
    (async () => {
      try {
        const res = await fetch(apiUrl(`/api/lms/courses/${selectedCourse._id}`), {
          headers: { ...authHeaders() },
          cache: "no-store",
        });
        const json = await res.json();
        if (!alive) return;
        if (res.ok && json?.success && json?.data) {
          setSelectedCourse(json.data);
        }
      } catch {
        // keep list view usable even if detail fetch fails
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedCourse?._id]);

  const enrolledCourseIds = useMemo(
    () => new Set(enrollments.map((enrollment) => enrollment.course?._id).filter(Boolean) as string[]),
    [enrollments]
  );

  const createCourse = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(apiUrl("/api/lms/courses"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          title: courseForm.title,
          description: courseForm.description,
          scopeType: courseForm.scopeType,
          status: courseForm.status,
          coverImageUrl: courseForm.coverImageUrl,
          classIds: courseForm.classIds,
          subjectIds: courseForm.subjectIds,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Course creation failed");
      }

      const nextCourse = json.data as Course;
      setCourses((current) => [nextCourse, ...current]);
      setSelectedCourse(nextCourse);
      setCourseForm({
        title: "",
        description: "",
        scopeType: "general",
        status: "published",
        coverImageUrl: "",
        classIds: [],
        subjectIds: [],
      });
    } catch (err: any) {
      setError(err?.message || "Course creation failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleSelection = (value: string, field: "classIds" | "subjectIds") => {
    setCourseForm((current) => {
      const exists = current[field].includes(value);
      return {
        ...current,
        [field]: exists ? current[field].filter((id) => id !== value) : [...current[field], value],
      };
    });
  };

  const enroll = async (courseId: string) => {
    setBusy(true);
    try {
      const response = await fetch(apiUrl(`/api/lms/courses/${courseId}/enroll`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
      });
      const json = await response.json();
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Enrollment failed");
      }
      setEnrollments((current) => [...current.filter((item) => item.course?._id !== courseId), json.data]);
    } catch (err: any) {
      setError(err?.message || "Enrollment failed");
    } finally {
      setBusy(false);
    }
  };

  const addLecture = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCourse?._id) return;

    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("title", lectureForm.title);
      formData.append("description", lectureForm.description);
      formData.append("order", lectureForm.order);
      formData.append("resourceUrl", lectureForm.resourceUrl);
      if (lectureForm.file) formData.append("file", lectureForm.file);

      const response = await fetch(apiUrl(`/api/lms/courses/${selectedCourse._id}/lectures`), {
        method: "POST",
        headers: {
          ...tokenHeader(),
        },
        body: formData,
      });
      const json = await response.json();
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Lecture upload failed");
      }

      setLectureForm({ title: "", description: "", order: "1", resourceUrl: "", file: null });
      const refreshed = await fetch(apiUrl(`/api/lms/courses/${selectedCourse._id}`), {
        headers: { ...authHeaders() },
        cache: "no-store",
      });
      const refreshedJson = await refreshed.json();
      if (refreshed.ok && refreshedJson?.success) {
        setSelectedCourse(refreshedJson.data);
      }
    } catch (err: any) {
      setError(err?.message || "Lecture upload failed");
    } finally {
      setBusy(false);
    }
  };

  const lectures = selectedCourse?.lectures || [];
  const isSelectedOwnedByUser =
    canManage && (role === "admin" || selectedCourse?.teacher?._id === user?.id);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 rounded-3xl border bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-800 p-5 text-white sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <BookOpen className="h-4 w-4" />
              Learning Management System
            </div>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Courses, lectures, and enrollment</h1>
            <p className="mt-2 max-w-3xl text-sm text-white/75">
              Teachers can publish courses and upload lectures. Students can enroll in classwise or subjectwise courses. Admins can manage everything.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-full bg-white/10 px-3 py-1 text-white">{courses.length} courses</Badge>
            <Badge className="rounded-full bg-white/10 px-3 py-1 text-white">{enrollments.length} enrollments</Badge>
          </div>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-4 text-sm text-red-700">{error}</CardContent>
          </Card>
        )}

        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-600" />
                Create Course
              </CardTitle>
              <CardDescription>Publish a course that can be classwise, subjectwise, or both.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createCourse} className="grid gap-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={courseForm.title}
                      onChange={(e) => setCourseForm((current) => ({ ...current, title: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scopeType">Scope</Label>
                    <Select
                      value={courseForm.scopeType}
                      onValueChange={(value) => setCourseForm((current) => ({ ...current, scopeType: value }))}
                    >
                      <SelectTrigger id="scopeType">
                        <SelectValue placeholder="Select scope" />
                      </SelectTrigger>
                      <SelectContent>
                        {SCOPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={courseForm.description}
                      onChange={(e) => setCourseForm((current) => ({ ...current, description: e.target.value }))}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coverImageUrl">Cover image or intro video URL</Label>
                    <Input
                      id="coverImageUrl"
                      value={courseForm.coverImageUrl}
                      onChange={(e) => setCourseForm((current) => ({ ...current, coverImageUrl: e.target.value }))}
                      placeholder="https://..."
                    />
                    <div className="space-y-2 pt-2">
                      <Label>Availability</Label>
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {classes.map((classItem) => (
                          <label key={classItem._id} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
                            <input
                              type="checkbox"
                              checked={courseForm.classIds.includes(classItem._id)}
                              onChange={() => toggleSelection(classItem._id, "classIds")}
                            />
                            <span>{classItem.name}</span>
                          </label>
                        ))}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {subjects.map((subject) => (
                          <label key={subject._id} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
                            <input
                              type="checkbox"
                              checked={courseForm.subjectIds.includes(subject._id)}
                              onChange={() => toggleSelection(subject._id, "subjectIds")}
                            />
                            <span>{subject.code ? `${subject.code} - ` : ""}{subject.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button disabled={busy} type="submit" className="rounded-full">
                    {busy ? "Saving..." : "Create Course"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() =>
                      setCourseForm({
                        title: "",
                        description: "",
                        scopeType: "general",
                        status: "published",
                        coverImageUrl: "",
                        classIds: [],
                        subjectIds: [],
                      })
                    }
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Available Courses</CardTitle>
              <CardDescription>Select a course to manage lectures or enroll.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
                  ))}
                </div>
              ) : courses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No courses available.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {courses.map((course) => {
                    const isEnrolled = enrolledCourseIds.has(course._id);
                    const ownedByUser = role === "admin" || course.teacher?._id === user?.id;

                    return (
                      <button
                        key={course._id}
                        type="button"
                        onClick={() => setSelectedCourse(course)}
                        className={`rounded-2xl border p-4 text-left transition hover:border-emerald-300 ${
                          selectedCourse?._id === course._id ? "border-emerald-500 bg-emerald-50" : "bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-base font-semibold text-slate-900">{course.title}</div>
                            <div className="mt-1 text-sm text-slate-600 line-clamp-2">
                              {course.description || "No description"}
                            </div>
                          </div>
                          <Badge variant="secondary" className="capitalize">
                            {course.scopeType || "general"}
                          </Badge>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {course.classIds?.map((item) => (
                            <Badge key={item._id} variant="outline">
                              {item.name}
                            </Badge>
                          ))}
                          {course.subjectIds?.map((item) => (
                            <Badge key={item._id} variant="outline">
                              {item.code ? `${item.code} - ` : ""}
                              {item.name}
                            </Badge>
                          ))}
                        </div>

                        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                          <span>{course.teacher?.name || "Teacher"}</span>
                          <span>{course.lectures?.length || 0} lectures</span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {role === "student" && !isEnrolled && (
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                enroll(course._id);
                              }}
                              disabled={busy}
                            >
                              Enroll
                            </Button>
                          )}
                          {role === "student" && isEnrolled && (
                            <Badge className="rounded-full bg-emerald-600 text-white">Enrolled</Badge>
                          )}
                          {ownedByUser && (
                            <Badge variant="secondary" className="rounded-full">
                              Manageable
                            </Badge>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-sky-600" />
                Course Detail
              </CardTitle>
              <CardDescription>Lectures and enrollment tools for the selected course.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedCourse ? (
                <p className="text-sm text-muted-foreground">Choose a course from the list.</p>
              ) : (
                <>
                  <div>
                    <div className="text-lg font-semibold text-slate-900">{selectedCourse.title}</div>
                    <div className="mt-1 text-sm text-slate-600">{selectedCourse.description || "No description"}</div>
                  </div>

                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <div className="rounded-2xl border p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Teacher</div>
                      <div className="mt-1 font-medium">{selectedCourse.teacher?.name || "TBA"}</div>
                    </div>
                    <div className="rounded-2xl border p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Audience</div>
                      <div className="mt-1 font-medium capitalize">{selectedCourse.scopeType || "general"}</div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Lectures</h3>
                      <Badge variant="outline">{lectures.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {lectures.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No lectures uploaded yet.</p>
                      ) : (
                        lectures.map((lecture) => (
                          <div key={lecture._id} className="rounded-2xl border p-3">
                            <div className="text-sm font-medium text-slate-900">{lecture.title}</div>
                            <div className="text-xs text-slate-500">{lecture.description || "Lecture resource"}</div>
                            {lecture.resourceUrl && (
                              <a
                                href={lecture.resourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex text-xs font-medium text-emerald-700 underline"
                              >
                                Open resource
                              </a>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {role === "student" && !enrolledCourseIds.has(selectedCourse._id) && (
                    <Button
                      type="button"
                      className="rounded-full"
                      onClick={() => enroll(selectedCourse._id)}
                      disabled={busy}
                    >
                      Enroll in this course
                    </Button>
                  )}

                  {isSelectedOwnedByUser && (
                    <>
                      <Separator />
                      <form onSubmit={addLecture} className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Upload className="h-4 w-4 text-emerald-600" />
                          Upload Lecture
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lecture-title">Title</Label>
                          <Input
                            id="lecture-title"
                            value={lectureForm.title}
                            onChange={(e) => setLectureForm((current) => ({ ...current, title: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lecture-description">Description</Label>
                          <Textarea
                            id="lecture-description"
                            value={lectureForm.description}
                            onChange={(e) => setLectureForm((current) => ({ ...current, description: e.target.value }))}
                            rows={3}
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="lecture-order">Order</Label>
                            <Input
                              id="lecture-order"
                              type="number"
                              value={lectureForm.order}
                              onChange={(e) => setLectureForm((current) => ({ ...current, order: e.target.value }))}
                              min="1"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lecture-resource">Resource URL</Label>
                            <Input
                              id="lecture-resource"
                              value={lectureForm.resourceUrl}
                              onChange={(e) => setLectureForm((current) => ({ ...current, resourceUrl: e.target.value }))}
                              placeholder="Optional web link"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lecture-file">Upload file</Label>
                          <Input
                            id="lecture-file"
                            type="file"
                            onChange={(e) => setLectureForm((current) => ({ ...current, file: e.target.files?.[0] || null }))}
                          />
                        </div>
                        <Button type="submit" disabled={busy} className="rounded-full">
                          Save Lecture
                        </Button>
                      </form>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span>
            Need the admin-only class assignment tools?
          </span>
          <a href="/users" className="font-medium text-emerald-700 underline">
            Open Users & Roles
          </a>
        </div>
      </div>
    </AdminLayout>
  );
}
