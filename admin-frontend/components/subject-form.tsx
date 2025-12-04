"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

type FormSlot = {
  _id?: string;
  day: string;
  startTime: string;
  endTime: string;
  delivery?: "room" | "online";
  location?: { room?: string; link?: string };
  class: string;
  subject: string;
  instructorName?: string;
};

type Class = { _id: string; name: string; code?: string };
type Subject = { _id: string; name: string; code?: string };

interface SlotFormProps {
  slot?: FormSlot;
  onSubmit: (data: any) => Promise<void>;
}

const DAYS_OF_WEEK = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export function SlotForm({ slot, onSubmit }: SlotFormProps) {
  const [formData, setFormData] = useState<FormSlot>({
    day: "",
    startTime: "",
    endTime: "",
    delivery: "room",
    location: { room: "", link: "" },
    class: "",
    subject: "",
    instructorName: "",
    ...slot,
  });

  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Load classes and subjects
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        setApiError(null);

        const [classesRes, subjectsRes] = await Promise.all([
          fetch(`${API_BASE}/api/classes`),
          fetch(`${API_BASE}/api/subjects`),
        ]);

        const classesJson = await classesRes.json();
        const subjectsJson = await subjectsRes.json();

        if (Array.isArray(classesJson.data)) setClasses(classesJson.data);
        if (Array.isArray(subjectsJson.data)) setSubjects(subjectsJson.data);

      } catch (error: any) {
        setApiError(error.message || "Failed to load form data");
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.class || !formData.subject || !formData.day || !formData.startTime || !formData.endTime) {
      alert("Please fill in all required fields");
      return;
    }

    if (formData.delivery === "room" && !formData.location?.room?.trim()) {
      alert("Please provide a room number");
      return;
    }

    if (formData.delivery === "online" && !formData.location?.link?.trim()) {
      alert("Please provide a meeting link");
      return;
    }

    try {
      setLoading(true);

      const payload: any = {
        day: formData.day,
        startTime: formData.startTime,
        endTime: formData.endTime,
        class: formData.class,
        subject: formData.subject,
        instructorName: formData.instructorName?.trim() || "",
        location: {
          room: formData.delivery === "room" ? (formData.location?.room?.trim() || "") : "",
          link: formData.delivery === "online" ? (formData.location?.link?.trim() || "") : "",
        },
      };

      await onSubmit(payload);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{slot?._id ? "Edit" : "Create"} Time Slot</CardTitle>
        <CardDescription>
          {slot?._id ? "Update the time slot details" : "Add a new time slot to the timetable"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Day */}
          <div className="space-y-2">
            <Label htmlFor="day">Day *</Label>
            <Select value={formData.day} onValueChange={(v) => setFormData({ ...formData, day: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map((day) => (
                  <SelectItem key={day} value={day}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Class */}
          <div>
            <Label htmlFor="class">Class *</Label>
            <Select
              value={formData.class}
              onValueChange={(v) => setFormData({ ...formData, class: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls._id} value={cls._id}>
                    {cls.code ? `${cls.code} - ` : ""}{cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div>
            <Label htmlFor="subject">Subject *</Label>
            <Select
              value={formData.subject}
              onValueChange={(v) => setFormData({ ...formData, subject: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((sub) => (
                  <SelectItem key={sub._id} value={sub._id}>
                    {sub.code ? `${sub.code} - ` : ""}{sub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Delivery Method */}
          <div>
            <Label>Delivery Method</Label>
            <RadioGroup
              value={formData.delivery}
              onValueChange={(v) => setFormData({ ...formData, delivery: v as "room" | "online" })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="room" id="room" />
                <Label htmlFor="room">In-Person</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="online" id="online" />
                <Label htmlFor="online">Online</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Location */}
          {formData.delivery === "room" ? (
            <div>
              <Label htmlFor="room">Room *</Label>
              <Input
                id="room"
                value={formData.location?.room || ""}
                onChange={(e) =>
                  setFormData({ ...formData, location: { ...formData.location, room: e.target.value } })
                }
              />
            </div>
          ) : (
            <div>
              <Label htmlFor="link">Link *</Label>
              <Input
                id="link"
                type="url"
                value={formData.location?.link || ""}
                onChange={(e) =>
                  setFormData({ ...formData, location: { ...formData.location, link: e.target.value } })
                }
              />
            </div>
          )}

          {/* Instructor Name */}
          <div>
            <Label htmlFor="instructorName">Instructor Name</Label>
            <Input
              id="instructorName"
              value={formData.instructorName || ""}
              onChange={(e) => setFormData({ ...formData, instructorName: e.target.value })}
              placeholder="Dr. John Doe"
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : slot?._id ? "Update Slot" : "Create Slot"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
