"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminLayout } from "@/components/admin-layout";
import { SlotForm } from "@/components/slot-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://qtech-backend.vercel.app";

type PopRef = { _id: string; name?: string; code?: string };

type ApiSlot = {
  _id: string;
  day: string;
  startTime: string;
  endTime: string;
  location?: { room?: string; link?: string } | null;
  class: string | PopRef | null;
  subject: string | PopRef | null;
  instructorName?: string | null;
};

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

export default function EditSlotPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [slot, setSlot] = useState<ApiSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErrMsg(null);
        const res = await fetch(`${API_BASE}/api/timetable-slots/${id}`, {
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const json = await res.json();
        if (!alive) return;
        
        if (!json?.success || !json?.data) {
          throw new Error(json?.message || `Failed to fetch slot ${id}`);
        }
        
        console.log("Loaded slot data:", json.data);
        setSlot(json.data as ApiSlot);
      } catch (err: any) {
        console.error("Error loading slot:", err);
        if (alive) setErrMsg(err?.message || "Failed to load slot");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  const formSlot: FormSlot | undefined = useMemo(() => {
    if (!slot) return undefined;

    const classId =
      typeof slot.class === "string" ? slot.class : slot.class?._id || "";
    const subjectId =
      typeof slot.subject === "string" ? slot.subject : slot.subject?._id || "";

    return {
      _id: slot._id,
      day: slot.day || "",
      startTime: slot.startTime || "",
      endTime: slot.endTime || "",
      delivery: slot.location?.link ? "online" : "room",
      location: slot.location || undefined,
      class: classId,
      subject: subjectId,
      instructorName: slot.instructorName || "",
    };
  }, [slot]);

  const handleSubmit = async (formData: any) => {
    if (!id) return;
    
    try {
      setSaving(true);
      
      // Transform the form data to match backend expectations
      const payload: any = {
        day: formData.day,
        startTime: formData.startTime,
        endTime: formData.endTime,
        class: formData.class,
        subject: formData.subject,
        instructorName: formData.instructorName || "",
      };

      // Handle location based on delivery type
      if (formData.delivery === "online") {
        payload.location = {
          link: formData.location?.link || formData.locationLink || ""
        };
      } else {
        payload.location = {
          room: formData.location?.room || formData.locationRoom || ""
        };
      }

      console.log("Sending update payload:", payload);

      const res = await fetch(`${API_BASE}/api/timetable-slots/${id}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      console.log("Update response:", json);

      if (!res.ok) {
        throw new Error(json?.message || `HTTP error! status: ${res.status}`);
      }

      if (!json?.success) {
        throw new Error(json?.message || "Failed to update slot");
      }

      // Success - redirect
      router.push("/academics/slots");
    } catch (err: any) {
      console.error("Error updating slot:", err);
      alert(err?.message || "Error updating slot");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm("Are you sure you want to delete this slot?")) return;
    
    try {
      setDeleting(true);
      const res = await fetch(`${API_BASE}/api/timetable-slots/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json = await res.json();
      
      if (!json?.success) {
        throw new Error(json?.message || "Failed to delete slot");
      }
      
      router.push("/academics/slots");
    } catch (err: any) {
      console.error("Error deleting slot:", err);
      alert(err?.message || "Error deleting slot");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Edit Time Slot</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>

      {loading && (
        <Card className="mt-4">
          <CardContent className="py-10 text-center text-muted-foreground">
            Loading slot...
          </CardContent>
        </Card>
      )}

      {!loading && errMsg && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Could not load the slot</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-red-600">{errMsg}</div>
            <Button className="mt-4" onClick={() => router.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !errMsg && formSlot && (
        <div className="mt-4">
          <SlotForm slot={formSlot} onSubmit={handleSubmit} />
          {saving && (
            <div className="mt-2 text-sm text-muted-foreground">
              Saving your changes...
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}