"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { apiUrl, authHeaders } from "@/lib/api";
import { getStoredUser, normalizeRole, SessionRole, SessionUser } from "@/lib/session";
import { BookOpen, CalendarDays, Layers3, ShieldCheck, Users2 } from "lucide-react";

type Slot = {
  _id: string;
  day: string;
  startTime: string;
  endTime: string;
  class?: { name?: string };
  subject?: { name?: string; code?: string };
  instructorName?: string;
};

type Course = {
  _id: string;
  title: string;
  description?: string;
  scopeType?: string;
  teacher?: { name?: string };
};

function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as any).data)) return (payload as any).data;
  return [];
}

function label(value: unknown) {
  if (!value) return "None";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const item = value as { name?: string; code?: string };
    return item.code ? `${item.name || "Unnamed"} (${item.code})` : item.name || "Unnamed";
  }
  return "None";
}

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function RoleDashboard({ role }: { role: SessionRole }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [schedule, setSchedule] = useState<Slot[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const normalizedRole = normalizeRole(role || user?.role);
  const isAdmin = normalizedRole === "admin";
  const isTeacher = normalizedRole === "teacher";
  const isParent = normalizedRole === "parent";
  const isStudent = normalizedRole === "student";

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    if (!user) return;

    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [scheduleRes, coursesRes] = await Promise.all([
          fetch(apiUrl("/api/timetable-slots/me"), { headers: authHeaders(), cache: "no-store" }),
          fetch(apiUrl("/api/lms/courses"), { headers: authHeaders(), cache: "no-store" }),
        ]);

        const [scheduleJson, coursesJson] = await Promise.all([scheduleRes.json(), coursesRes.json()]);
        if (!alive) return;

        setSchedule(asArray<Slot>(scheduleJson));
        setCourses(asArray<Course>(coursesJson));
      } catch (err: any) {
        if (!alive) return;
        setError(err?.message || "Unable to load dashboard");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [user]);

  const groupedSchedule = schedule.reduce((acc, slot) => {
    if (!acc[slot.day]) acc[slot.day] = [];
    acc[slot.day].push(slot);
    return acc;
  }, {} as Record<string, Slot[]>);

  for (const day of Object.keys(groupedSchedule)) {
    groupedSchedule[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  const assignedClasses = (user?.assignedClasses || []).map(label);
  const assignedSubjects = (user?.assignedSubjects || []).map(label);
  const childClass = label(user?.studentClass);

  const title = isAdmin
    ? "Admin Workspace"
    : isTeacher
      ? "Teacher Workspace"
      : isParent
        ? "Parent Workspace"
        : "Student Workspace";

  const subtitle = isAdmin
    ? "Create users, assign roles, manage schedules, and control LMS content."
    : isTeacher
      ? "See assigned classes and author classwise or subjectwise courses."
      : isParent
        ? "Track your linked students, schedules, and learning activity."
        : "View your timetable and enroll in classwise or subjectwise courses.";

  const scheduleLabel = isTeacher
    ? "Classes assigned to you"
    : isParent
      ? "Your linked students schedule"
      : isStudent
        ? "Your class timetable"
        : "All timetable entries";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-4 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-emerald-600 px-3 py-1 text-white capitalize">{normalizedRole}</Badge>
              <Badge variant="outline" className="rounded-full">{user?.email}</Badge>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
            <p className="max-w-2xl text-sm text-slate-600 sm:text-base">{subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/schedule"><Button variant="outline" className="rounded-full">My Schedule</Button></Link>
            <Link href="/courses"><Button className="rounded-full">LMS</Button></Link>
            {isAdmin && <Link href="/users"><Button variant="secondary" className="rounded-full">Users & Roles</Button></Link>}
          </div>
        </div>

        {isAdmin && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">User Admin</CardTitle><ShieldCheck className="h-4 w-4 text-emerald-600" /></CardHeader><CardContent className="text-sm text-slate-600">Create teachers, students, and parents.</CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Schedules</CardTitle><CalendarDays className="h-4 w-4 text-sky-600" /></CardHeader><CardContent className="text-sm text-slate-600">Assign teachers to class schedules.</CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">LMS</CardTitle><BookOpen className="h-4 w-4 text-amber-600" /></CardHeader><CardContent className="text-sm text-slate-600">Manage courses and lecture content.</CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Students</CardTitle><Users2 className="h-4 w-4 text-rose-600" /></CardHeader><CardContent className="text-sm text-slate-600">Monitor classes, progress, and assignments.</CardContent></Card>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-emerald-600" />
                Schedule
              </CardTitle>
              <CardDescription>{scheduleLabel}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, idx) => <div key={idx} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}
                </div>
              ) : error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : schedule.length === 0 ? (
                <p className="text-sm text-slate-500">No schedule found for this account.</p>
              ) : (
                <div className="space-y-4">
                  {DAYS_ORDER.filter((day) => groupedSchedule[day]?.length).map((day) => (
                    <div key={day} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{day}</h3>
                        <Badge variant="outline">{groupedSchedule[day].length} slots</Badge>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {groupedSchedule[day].map((slot) => (
                          <div key={slot._id} className="rounded-2xl border bg-white p-4 shadow-sm">
                            <div className="text-sm font-semibold text-slate-900">{slot.startTime} - {slot.endTime}</div>
                            <div className="mt-1 text-sm text-slate-600">
                              {slot.class?.name || "Class"} - {slot.subject?.code ? `${slot.subject.code} - ` : ""}
                              {slot.subject?.name || "Subject"}
                            </div>
                            <div className="mt-2 text-xs text-slate-500">{slot.instructorName || "TBA"}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-sky-600" />
                  LMS Snapshot
                </CardTitle>
                <CardDescription>
                  {isTeacher ? "Courses you can manage" : isAdmin ? "Admin LMS tools" : "Courses available to you"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Courses</span>
                  <span className="font-medium">{courses.length}</span>
                </div>
                <Separator />
                {isTeacher && (
                  <>
                    <div className="space-y-2 text-sm text-slate-600">
                      <p><span className="font-medium text-slate-900">Classes:</span> {assignedClasses.length ? assignedClasses.join(", ") : "None assigned yet"}</p>
                      <p><span className="font-medium text-slate-900">Subjects:</span> {assignedSubjects.length ? assignedSubjects.join(", ") : "None assigned yet"}</p>
                    </div>
                    <Link href="/courses"><Button className="rounded-full">Create / Manage Courses</Button></Link>
                  </>
                )}
                {isAdmin && (
                  <>
                    <p className="text-sm text-slate-600">Create courses, add lectures, and assign teachers to classwise or subjectwise learning paths.</p>
                    <Link href="/users"><Button className="rounded-full">Assign Staff</Button></Link>
                  </>
                )}
                {isStudent && (
                  <>
                    <p className="text-sm text-slate-600">Enroll in courses that match your class or subject.</p>
                    <Link href="/courses"><Button className="rounded-full">Browse Courses</Button></Link>
                  </>
                )}
                {isParent && (
                  <>
                    <p className="text-sm text-slate-600">Use LMS to view your linked student learning content.</p>
                    <p className="text-sm text-slate-600"><span className="font-medium text-slate-900">Linked class:</span> {childClass}</p>
                    <Link href="/courses"><Button className="rounded-full">View LMS</Button></Link>
                  </>
                )}
              </CardContent>
            </Card>

            {(isTeacher || isStudent || isParent) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers3 className="h-5 w-5 text-emerald-600" />
                    Assignments
                  </CardTitle>
                  <CardDescription>Class and subject mapping tied to your login</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <div className="mb-1 font-medium text-slate-900">Classes</div>
                    <div className="flex flex-wrap gap-2">
                      {assignedClasses.length ? assignedClasses.map((value) => <Badge key={value} variant="outline">{value}</Badge>) : <span className="text-slate-500">None</span>}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 font-medium text-slate-900">Subjects</div>
                    <div className="flex flex-wrap gap-2">
                      {assignedSubjects.length ? assignedSubjects.map((value) => <Badge key={value} variant="outline">{value}</Badge>) : <span className="text-slate-500">None</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
