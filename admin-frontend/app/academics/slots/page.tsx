"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Monitor, Plus } from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://qtech-backend.vercel.app";

type PopRef = { _id: string; name?: string; code?: string };

type SlotFromApi = {
  _id: string;
  day: string;
  startTime: string;
  endTime: string;
  location?: { room?: string; link?: string };
  class: string | PopRef;
  subject: string | PopRef;
  instructorName?: string;
};

type ProcessedSlot = {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  delivery: "room" | "online";
  locationText: string;
  locationLink?: string;
  className: string;
  subjectName: string;
  subjectCode: string;
  instructorName: string;
};

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function SlotsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [slots, setSlots] = useState<ProcessedSlot[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErrMsg(null);
        const res = await fetch(`${API_BASE}/api/timetable-slots`, {
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        const json = await res.json();
        if (!alive) return;

        if (!res.ok || !json?.success || !Array.isArray(json?.data)) {
          throw new Error(json?.message || json?.error || `Failed to fetch (status ${res.status})`);
        }

        // Normalize slots
        const processedSlots: ProcessedSlot[] = json.data.map((slot: SlotFromApi) => {
          let delivery: "room" | "online" = "room";
          let locationText = "";
          let locationLink: string | undefined;

          if (slot.location?.link) {
            delivery = "online";
            locationText = slot.location.link;
            locationLink = slot.location.link;
          } else if (slot.location?.room) {
            delivery = "room";
            locationText = slot.location.room;
          } else {
            locationText = "—";
          }

          return {
            id: slot._id,
            day: slot.day || "",
            startTime: slot.startTime || "",
            endTime: slot.endTime || "",
            delivery,
            locationText: typeof locationText === "string" ? locationText : "—",
            locationLink,
            className: typeof slot.class === "string" ? slot.class : (slot.class?.name || "Unknown Class"),
            subjectName: typeof slot.subject === "string" ? slot.subject : (slot.subject?.name || "Unknown Subject"),
            subjectCode: typeof slot.subject === "string" ? "" : (slot.subject?.code || ""),
            instructorName: slot.instructorName || "TBA",
          };
        });

        setSlots(processedSlots);
      } catch (e: any) {
        if (!alive) return;
        setErrMsg(e?.message || "Failed to load time slots");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Group slots by day
  const slotsByDay = slots.reduce((acc, slot) => {
    if (!acc[slot.day]) acc[slot.day] = [];
    acc[slot.day].push(slot);
    return acc;
  }, {} as Record<string, ProcessedSlot[]>);

  Object.keys(slotsByDay).forEach((day) => {
    slotsByDay[day].sort((a, b) => {
      const [hA, mA] = a.startTime.split(":").map(Number);
      const [hB, mB] = b.startTime.split(":").map(Number);
      return hA * 60 + mA - (hB * 60 + mB);
    });
  });

  const formatTime = (time: string) => {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  };

  const isValidUrl = (str: string) => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Time Slots</h1>
        <Button onClick={() => router.push("/academics/slots/create")}>
          <Plus className="mr-2 h-4 w-4" /> Add Time Slot
        </Button>
      </div>

      {loading && (
        <Card className="mt-4">
          <CardContent className="py-10 text-center text-muted-foreground">
            Loading time slots...
          </CardContent>
        </Card>
      )}

      {!loading && errMsg && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Could not load time slots.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-red-600">{errMsg}</div>
          </CardContent>
        </Card>
      )}

      {!loading && !errMsg && (
        <div className="mt-4 space-y-6">
          {slots.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No time slots found</p>
                <Button className="mt-4" onClick={() => router.push("/academics/slots/create")}>
                  <Plus className="mr-2 h-4 w-4" /> Create Time Slot
                </Button>
              </CardContent>
            </Card>
          ) : (
            DAYS_ORDER.filter((day) => slotsByDay[day]?.length > 0).map((day) => (
              <Card key={day}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {day}
                    <Badge variant="secondary" className="ml-auto">
                      {slotsByDay[day].length} slot{slotsByDay[day].length !== 1 ? "s" : ""}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {slotsByDay[day].map((slot) => (
                      <div
                        key={slot.id}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/academics/slots/${slot.id}/edit`)}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div className="font-medium">
                              {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {slot.delivery === "online" ? (
                              <Monitor className="h-4 w-4 text-blue-500" />
                            ) : (
                              <MapPin className="h-4 w-4 text-green-500" />
                            )}
                            <div>
                              <div className="font-medium capitalize">
                                {slot.delivery === "online" ? "Online" : "In-Person"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {slot.delivery === "online" && slot.locationLink && isValidUrl(slot.locationLink) ? (
                                  <a
                                    href={slot.locationLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {slot.locationText}
                                  </a>
                                ) : (
                                  <span>{slot.locationText}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="font-medium">{slot.className}</div>
                            <div className="text-sm text-muted-foreground">
                              {slot.subjectCode ? `${slot.subjectCode} - ` : ""}
                              {slot.subjectName}
                            </div>
                          </div>

                          <div>
                            <div className="font-medium">Instructor</div>
                            <div className="text-sm text-muted-foreground">{slot.instructorName}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </AdminLayout>
  );
}
