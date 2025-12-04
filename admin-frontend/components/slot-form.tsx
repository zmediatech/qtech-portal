// components/slot-form.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000";

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
  instructorId?: string;
  notes?: string;
};

type Class = {
  _id: string;
  name: string;
  code?: string;
};

type Subject = {
  _id: string;
  name: string;
  code?: string;
};

interface SlotFormProps {
  slot?: FormSlot;
  onSubmit: (data: any) => Promise<void>;
}

const DAYS_OF_WEEK = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
];

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
    instructorId: "",
    notes: "",
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
        
        console.log("Loading data from APIs...");
        console.log("API_BASE:", API_BASE);
        
        const [classesRes, subjectsRes] = await Promise.all([
          fetch(`${API_BASE}/api/classes`, {
            method: "GET",
            headers: { 
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            cache: "no-store",
          }),
          fetch(`${API_BASE}/api/subjects`, {
            method: "GET",
            headers: { 
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            cache: "no-store",
          }),
        ]);

        console.log("Classes response status:", classesRes.status);
        console.log("Subjects response status:", subjectsRes.status);

        // Check if responses are ok
        if (!classesRes.ok) {
          throw new Error(`Classes API failed: ${classesRes.status} ${classesRes.statusText}`);
        }
        
        if (!subjectsRes.ok) {
          throw new Error(`Subjects API failed: ${subjectsRes.status} ${subjectsRes.statusText}`);
        }

        const classesJson = await classesRes.json();
        const subjectsJson = await subjectsRes.json();

        console.log("Classes data:", classesJson);
        console.log("Subjects data:", subjectsJson);

        // Handle classes - standard API format with success flag
        if (classesRes.ok && classesJson.success && Array.isArray(classesJson.data)) {
          console.log("Setting classes (API format):", classesJson.data);
          setClasses(classesJson.data);
        } else if (classesRes.ok && Array.isArray(classesJson)) {
          // Direct array format fallback
          console.log("Setting classes (direct array):", classesJson);
          setClasses(classesJson);
        } else {
          console.error("Classes API response invalid:", classesJson);
          setApiError("Failed to load classes: Invalid response format");
        }

        // Handle subjects - direct array format (based on your API)
        if (subjectsRes.ok && Array.isArray(subjectsJson)) {
          // Direct array format (your current API)
          console.log("Setting subjects (direct array):", subjectsJson);
          setSubjects(subjectsJson);
        } else if (subjectsRes.ok && subjectsJson.success && Array.isArray(subjectsJson.data)) {
          // Standard API format fallback
          console.log("Setting subjects (API format):", subjectsJson.data);
          setSubjects(subjectsJson.data);
        } else {
          console.error("Subjects API response invalid:", subjectsJson);
          setApiError("Failed to load subjects: Invalid response format");
        }

      } catch (error: any) {
        console.error("Failed to load data:", error);
        setApiError(error.message || "Failed to load form data");
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.class || !formData.subject || !formData.day || !formData.startTime || !formData.endTime) {
      alert("Please fill in all required fields");
      return;
    }

    // Validate location based on delivery method
    if (formData.delivery === "room" && !formData.location?.room?.trim()) {
      alert("Please provide a room number/location for in-person delivery");
      return;
    }

    if (formData.delivery === "online" && !formData.location?.link?.trim()) {
      alert("Please provide a meeting link for online delivery");
      return;
    }

    try {
      setLoading(true);

      // Prepare the payload
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

      // Add optional fields
      if (formData.instructorId?.trim()) {
        payload.instructorId = formData.instructorId.trim();
      }

      if (formData.notes?.trim()) {
        payload.notes = formData.notes.trim();
      }

      console.log("Submitting payload:", payload);
      await onSubmit(payload);
    } catch (error) {
      console.error("Form submission error:", error);
      alert("Failed to submit form");
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof FormSlot, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateLocation = (field: "room" | "link", value: string) => {
    setFormData((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value,
      },
    }));
  };

  if (loadingData) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <div className="text-muted-foreground">Loading form data...</div>
          <div className="text-sm mt-2 text-muted-foreground">
            Classes: {classes.length} loaded | Subjects: {subjects.length} loaded
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {apiError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{slot?._id ? "Edit" : "Create"} Time Slot</CardTitle>
          <CardDescription>
            {slot?._id ? "Update the time slot details" : "Add a new time slot to the timetable"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Day Selection */}
            <div className="space-y-2">
              <Label htmlFor="day">Day *</Label>
              <Select
                value={formData.day}
                onValueChange={(value) => updateFormData("day", value)}
              >
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
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => updateFormData("startTime", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => updateFormData("endTime", e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Class Selection */}
            <div className="space-y-2">
              <Label htmlFor="class">Class *</Label>
              {classes.length === 0 && !loadingData ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No classes found. Please check your API connection or create classes first.
                  </AlertDescription>
                </Alert>
              ) : null}
              <Select
                value={formData.class}
                onValueChange={(value) => {
                  console.log("Class selected:", value);
                  updateFormData("class", value);
                }}
                disabled={classes.length === 0}
              >
                <SelectTrigger>
                  <SelectValue 
                    placeholder={classes.length === 0 ? "No classes available" : "Select class"} 
                  />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls._id} value={cls._id}>
                      {cls.code ? `${cls.code} - ` : ""}{cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                {classes.length} class{classes.length !== 1 ? 'es' : ''} available
              </div>
            </div>

            {/* Subject Selection */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              {subjects.length === 0 && !loadingData ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No subjects found. Please check your API connection or create subjects first.
                  </AlertDescription>
                </Alert>
              ) : null}
              <Select
                value={formData.subject}
                onValueChange={(value) => {
                  console.log("Subject selected:", value);
                  updateFormData("subject", value);
                }}
                disabled={subjects.length === 0}
              >
                <SelectTrigger>
                  <SelectValue 
                    placeholder={subjects.length === 0 ? "No subjects available" : "Select subject"} 
                  />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject._id} value={subject._id}>
                      {subject.code ? `${subject.code} - ` : ""}{subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                {subjects.length} subject{subjects.length !== 1 ? 's' : ''} available
              </div>
            </div>

            {/* Delivery Method */}
            <div className="space-y-3">
              <Label>Delivery Method</Label>
              <RadioGroup
                value={formData.delivery}
                onValueChange={(value) => updateFormData("delivery", value as "room" | "online")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="room" id="room" />
                  <Label htmlFor="room">In-Person (Room)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="online" id="online" />
                  <Label htmlFor="online">Online</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Location Details */}
            {formData.delivery === "room" ? (
              <div className="space-y-2">
                <Label htmlFor="room">Room Number/Location *</Label>
                <Input
                  id="room"
                  value={formData.location?.room || ""}
                  onChange={(e) => updateLocation("room", e.target.value)}
                  placeholder="e.g., Room 101, Building A"
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="link">Meeting Link *</Label>
                <Input
                  id="link"
                  type="url"
                  value={formData.location?.link || ""}
                  onChange={(e) => updateLocation("link", e.target.value)}
                  placeholder="https://meet.google.com/..."
                  required
                />
              </div>
            )}

            {/* Instructor */}
            <div className="space-y-2">
              <Label htmlFor="instructorName">Instructor Name</Label>
              <Input
                id="instructorName"
                value={formData.instructorName || ""}
                onChange={(e) => updateFormData("instructorName", e.target.value)}
                placeholder="Dr. John Smith"
              />
            </div>

            {/* Instructor ID (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="instructorId">Instructor ID (Optional)</Label>
              <Input
                id="instructorId"
                value={formData.instructorId || ""}
                onChange={(e) => updateFormData("instructorId", e.target.value)}
                placeholder="Enter instructor's system ID"
              />
              <div className="text-xs text-muted-foreground">
                Optional: Link to instructor record in the system
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) => updateFormData("notes", e.target.value)}
                placeholder="Any additional information about this time slot..."
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-2">
              <Button type="submit" disabled={loading || classes.length === 0 || subjects.length === 0}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  slot?._id ? "Update Slot" : "Create Slot"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}