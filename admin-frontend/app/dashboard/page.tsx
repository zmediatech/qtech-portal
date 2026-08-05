"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { apiUrl, authHeaders } from "@/lib/api";
import { getStoredUser, SessionUser } from "@/lib/session";
import { BookOpen, CalendarDays, GraduationCap, Layers3, ShieldCheck, Users2 } from "lucide-react";

type Slot = {
  _id: string;
  day: string;
  startTime: string;
  endTime: string;
  class?: { _id?: string; name?: string };
  subject?: { _id?: string; name?: string; code?: string };
  instructorName?: string;
};

type Course = {
  _id: string;
  title: string;
  description?: string;
  scopeType?: string;
  teacher?: { name?: string; email?: string; role?: string };
  classIds?: Array<{ _id?: string; name?: string }>;
  subjectIds?: Array<{ _id?: string; name?: string; code?: string }>;
  lectures?: Array<{ _id?: string }>;
};

type Enrollment = {
  _id: string;
  course?: Course;
};

type Overview = {
  students?: number;
  users?: number;
  fees?: number;
  expenses?: number;
};

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as any).data)) return (payload as any).data;
  if (payload && typeof payload === "object" && Array.isArray((payload as any).items)) return (payload as any).items;
  return [];
}

function pickLabel(value: unknown): string {
  if (!value) return "All";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const item = value as { name?: string; code?: string };
    return item.code ? `${item.name || "Unnamed"} (${item.code})` : item.name || "Unnamed";
  }
  return "All";
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<Slot[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [overview, setOverview] = useState<Overview>({});
  const [error, setError] = useState<string | null>(null);

  const role = user?.role || "student";

  const roleLabel = useMemo(() => {
    if (!role) return "Portal";
    return role.charAt(0).toUpperCase() + role.slice(1);
  }, [role]);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.replace("/login");
      return;
    }
    setUser(stored);
  }, [router]);

  useEffect(() => {
    if (!user) return;

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [scheduleRes, coursesRes, enrollRes, studentsRes, usersRes, feesRes, expensesRes] = await Promise.all([
          fetch(apiUrl("/api/timetable-slots/me"), { headers: authHeaders(), cache: "no-store" }),
          fetch(apiUrl("/api/lms/courses"), { headers: authHeaders(), cache: "no-store" }),
          fetch(apiUrl("/api/lms/enrollments/me"), { headers: authHeaders(), cache: "no-store" }),
          role === "admin" ? fetch(apiUrl("/api/students"), { headers: authHeaders(), cache: "no-store" }) : Promise.resolve(null),
          role === "admin" ? fetch(apiUrl("/api/users"), { headers: authHeaders(), cache: "no-store" }) : Promise.resolve(null),
          role === "admin" ? fetch(apiUrl("/api/fee-records"), { headers: authHeaders(), cache: "no-store" }) : Promise.resolve(null),
          role === "admin" ? fetch(apiUrl("/api/expenses"), { headers: authHeaders(), cache: "no-store" }) : Promise.resolve(null),
        ]);

        const [scheduleJson, coursesJson, enrollJson, studentsJson, usersJson, feesJson, expensesJson] = await Promise.all([
          scheduleRes.json(),
          coursesRes.json(),
          enrollRes.json(),
          studentsRes ? studentsRes.json() : Promise.resolve(null),
          usersRes ? usersRes.json() : Promise.resolve(null),
          feesRes ? feesRes.json() : Promise.resolve(null),
          expensesRes ? expensesRes.json() : Promise.resolve(null),
        ]);

        if (!alive) return;

        setSchedule(asArray<Slot>(scheduleJson));
        setCourses(asArray<Course>(coursesJson));
        setEnrollments(asArray<Enrollment>(enrollJson));

        if (role === "admin") {
          const students = asArray<any>(studentsJson);
          const users = asArray<any>(usersJson);
          const fees = asArray<any>(feesJson);
          const expenses = asArray<any>(expensesJson);
          setOverview({
            students: students.length,
            users: users.length,
            fees: fees.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
            expenses: expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
          });
        }
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
  }, [user, role]);

  const groupedSchedule = schedule.reduce((acc, slot) => {
    if (!acc[slot.day]) acc[slot.day] = [];
    acc[slot.day].push(slot);
    return acc;
  }, {} as Record<string, Slot[]>);

  for (const day of Object.keys(groupedSchedule)) {
    groupedSchedule[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  const assignedClasses = (user?.assignedClasses || []).map(pickLabel);
  const assignedSubjects = (user?.assignedSubjects || []).map(pickLabel);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-4 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-emerald-600 px-3 py-1 text-white">{roleLabel}</Badge>
              <Badge variant="outline" className="rounded-full">
                {user?.email}
              </Badge>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Welcome, {user?.name || "User"}
            </h1>
            <p className="max-w-2xl text-sm text-slate-600 sm:text-base">
              This view adapts to your account. Teachers see assigned classes and courses, students see enrolled learning paths, and admins see the full school overview.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/schedule"><Button variant="outline" className="rounded-full">My Schedule</Button></Link>
            <Link href="/courses"><Button className="rounded-full">LMS</Button></Link>
            {role === "admin" && (
              <Link href="/users"><Button variant="secondary" className="rounded-full">Manage Users</Button></Link>
            )}
          </div>
        </div>

        {role === "admin" && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Students</CardTitle>
                <Users2 className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{overview.students ?? 0}</CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Users</CardTitle>
                <ShieldCheck className="h-4 w-4 text-sky-600" />
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{overview.users ?? 0}</CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Collected Fees</CardTitle>
                <Layers3 className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent className="text-2xl font-semibold">Rs {(overview.fees ?? 0).toLocaleString("en-PK")}</CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expenses</CardTitle>
                <GraduationCap className="h-4 w-4 text-rose-600" />
              </CardHeader>
              <CardContent className="text-2xl font-semibold">Rs {(overview.expenses ?? 0).toLocaleString("en-PK")}</CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <Card className="min-w-0">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-emerald-600" />
                Schedule
              </CardTitle>
              <CardDescription>
                {role === "teacher"
                  ? "Classes assigned to you"
                  : role === "student"
                    ? "Your class timetable"
                    : role === "parent"
                      ? "Your child's timetable"
                      : "All timetable entries"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                  ))}
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
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-slate-900">
                                  {slot.startTime} - {slot.endTime}
                                </div>
                                <div className="mt-1 text-sm text-slate-600">
                                  {slot.class?.name || "Class"} · {slot.subject?.code ? `${slot.subject.code} - ` : ""}{slot.subject?.name || "Subject"}
                                </div>
                              </div>
                              <Badge variant="secondary">{slot.instructorName || "TBA"}</Badge>
                            </div>
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
                  {role === "teacher"
                    ? "Courses you can manage"
                    : role === "student"
                      ? "Courses you can enroll in"
                      : role === "parent"
                        ? "Courses linked to your child"
                        : "All available courses"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Courses</span>
                  <span className="font-medium">{courses.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">My enrollments</span>
                  <span className="font-medium">{enrollments.length}</span>
                </div>
                <Separator />
                <div className="space-y-2 text-sm text-slate-600">
                  {role === "teacher" ? (
                    <>
                      <p><span className="font-medium text-slate-900">Classes:</span> {assignedClasses.length ? assignedClasses.join(", ") : "None assigned yet"}</p>
                      <p><span className="font-medium text-slate-900">Subjects:</span> {assignedSubjects.length ? assignedSubjects.join(", ") : "None assigned yet"}</p>
                    </>
                  ) : role === "admin" ? (
                    <p>You can create courses, attach lectures, and assign teachers to classes and subjects.</p>
                  ) : (
                    <p>Open the LMS page to browse classwise and subjectwise courses and enroll.</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/courses"><Button className="rounded-full">Open LMS</Button></Link>
                  {role === "teacher" && <Link href="/courses"><Button variant="outline" className="rounded-full">Create Course</Button></Link>}
                </div>
              </CardContent>
            </Card>

            {(role === "teacher" || role === "student" || role === "parent") && (
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
                      {assignedClasses.length ? assignedClasses.map((label) => <Badge key={label} variant="outline">{label}</Badge>) : <span className="text-slate-500">None</span>}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 font-medium text-slate-900">Subjects</div>
                    <div className="flex flex-wrap gap-2">
                      {assignedSubjects.length ? assignedSubjects.map((label) => <Badge key={label} variant="outline">{label}</Badge>) : <span className="text-slate-500">None</span>}
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
