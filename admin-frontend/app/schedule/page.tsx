"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiUrl, authHeaders } from "@/lib/api";
import { getStoredUser } from "@/lib/session";
import { CalendarDays, Clock } from "lucide-react";

type Slot = {
  _id: string;
  day: string;
  startTime: string;
  endTime: string;
  class?: { name?: string };
  subject?: { name?: string; code?: string };
  instructorName?: string;
};

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function SchedulePage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = getStoredUser();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(apiUrl("/api/timetable-slots/me"), {
          headers: authHeaders(),
          cache: "no-store",
        });
        const json = await res.json();
        if (!alive) return;
        if (!res.ok || !json?.success) throw new Error(json?.message || "Failed to load schedule");
        setSlots(Array.isArray(json?.data?.slots) ? json.data.slots : []);
      } catch (err: any) {
        if (!alive) return;
        setError(err?.message || "Unable to load schedule");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const grouped = slots.reduce((acc, slot) => {
    if (!acc[slot.day]) acc[slot.day] = [];
    acc[slot.day].push(slot);
    return acc;
  }, {} as Record<string, Slot[]>);

  for (const day of Object.keys(grouped)) {
    grouped[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="rounded-3xl border bg-gradient-to-r from-slate-950 via-slate-800 to-emerald-800 p-5 text-white sm:p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">My Schedule</h1>
              <p className="text-sm text-white/75">
                {user?.role === "teacher"
                  ? "Classes assigned to you"
                  : user?.role === "student"
                    ? "Your class schedule"
                    : user?.role === "parent"
                      ? "Your child's schedule"
                      : "School timetable"}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">Loading schedule...</CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardHeader>
              <CardTitle>Unable to load schedule</CardTitle>
              <CardDescription>Please try again in a moment.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-red-600">{error}</CardContent>
          </Card>
        ) : slots.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">No schedule available.</CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {DAYS_ORDER.filter((day) => grouped[day]?.length).map((day) => (
              <Card key={day}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span>{day}</span>
                    <Badge variant="secondary">{grouped[day].length} slots</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {grouped[day].map((slot) => (
                    <div key={slot._id} className="rounded-2xl border bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Clock className="h-4 w-4 text-emerald-600" />
                        {slot.startTime} - {slot.endTime}
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        {slot.class?.name || "Class"}
                      </div>
                      <div className="text-sm text-slate-600">
                        {slot.subject?.code ? `${slot.subject.code} - ` : ""}
                        {slot.subject?.name || "Subject"}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {slot.instructorName || "Instructor TBA"}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
