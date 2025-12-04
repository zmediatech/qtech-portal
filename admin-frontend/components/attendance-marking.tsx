"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin-layout"; // ✅ Sidebar layout
import { Button } from "@/components/ui/button"; // Button component
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Select components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // Card components
import { format } from "date-fns"; // Format date utility
import { CalendarIcon, Save, Download, Users } from "lucide-react"; // Icons
import { Calendar } from "@/components/ui/calendar"; // Calendar component
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Popover component
import { Textarea } from "@/components/ui/textarea"; // Textarea for notes
import { cn } from "@/lib/utils"; // Utility classnames
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label"; // Ensure correct import path
import { Badge } from "@/components/ui/badge"; // Ensure correct import path

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

type AttendanceStatus = "present" | "absent" | "late";
interface Student { _id: string; name: string; regNo: string }
interface Class { _id: string; name: string }
interface AttendanceRecord { studentId: string; status: AttendanceStatus; notes: string }

export default function AttendanceMarkingPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const router = useRouter();

  // ------------------------
  // Fetch CLASSES
  // ------------------------
  useEffect(() => {
    fetch(`${API_BASE}/api/classes`)
      .then((res) => res.json())
      .then((json) => setClasses(json?.data || []))
      .catch((err) => console.error("Error fetching classes:", err));
  }, []);

  // ------------------------
  // Fetch STUDENTS based on selected class
  // ------------------------
  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      return;
    }

    fetch(`${API_BASE}/api/students/class/${selectedClass}`)
      .then((res) => res.json())
      .then((json) => setStudents(json?.data || []))
      .catch((err) => console.error("Error fetching students:", err));
  }, [selectedClass]);

  // ------------------------
  // Fetch ATTENDANCE based on selected class and date
  // ------------------------
  useEffect(() => {
    if (!selectedClass || !selectedDate) return;

    const dateStr = selectedDate.toISOString().split("T")[0]; // Format the date to "YYYY-MM-DD"

    fetch(`${API_BASE}/api/attendance?classId=${selectedClass}&date=${dateStr}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          // You can process the attendance data here if needed
          const attendanceData = json.data[0]; // Assume the data is an array, and the first entry is the attendance record
          if (attendanceData) {
            const formattedAttendance: Record<string, AttendanceRecord> = {};
            attendanceData.presentStudents.forEach((student: any) => {
              formattedAttendance[student._id] = { studentId: student._id, status: "present", notes: "" };
            });
            attendanceData.absentStudents.forEach((student: any) => {
              formattedAttendance[student._id] = { studentId: student._id, status: "absent", notes: "" };
            });
            attendanceData.lateStudents.forEach((student: any) => {
              formattedAttendance[student._id] = { studentId: student._id, status: "late", notes: "" };
            });
            setAttendance(formattedAttendance);
          }
        }
      })
      .catch((err) => console.error("Error fetching attendance:", err));
  }, [selectedClass, selectedDate]);

  // ------------------------
  // Handlers
  // ------------------------
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: { studentId, status, notes: prev[studentId]?.notes || "" },
    }));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: { studentId, status: prev[studentId]?.status || "present", notes },
    }));
  };

  const handleSave = async () => {
    if (!selectedClass) return toast({ title: "Error", description: "Select a class first", variant: "destructive" });

    setIsSaving(true);
    try {
      const presentStudents: string[] = [];
      const absentStudents: string[] = [];
      const lateStudents: string[] = [];

      Object.values(attendance).forEach((record) => {
        if (record.status === "present") presentStudents.push(record.studentId);
        if (record.status === "absent") absentStudents.push(record.studentId);
        if (record.status === "late") lateStudents.push(record.studentId);
      });

      const payload = {
        date: selectedDate.toISOString().split("T")[0], // YYYY-MM-DD
        classId: selectedClass,
        totalStudents: students.length,
        presentStudents,
        absentStudents,
        lateStudents,
        notes: "Attendance recorded", // Optional notes
      };

      const res = await fetch(`${API_BASE}/api/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to save attendance");
      }

      toast({ title: "Attendance Saved", description: "Attendance has been recorded successfully." });
      setAttendance({});
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    if (!selectedClass) {
      return toast({ title: "Error", description: "Select class first", variant: "destructive" });
    }

    setIsExporting(true);
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const res = await fetch(`${API_BASE}/api/attendance/export?classId=${selectedClass}&date=${dateStr}`);
      if (!res.ok) throw new Error("Failed to fetch report");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${dateStr}.csv`; // assume backend sends CSV
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast({ title: "Export Successful", description: "Report downloaded." });
    } catch (err) {
      toast({ title: "Error", description: (err instanceof Error ? err.message : "Export failed"), variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const statusCounts = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, total: students.length };
    Object.values(attendance).forEach((record) => {
      counts[record.status]++;
    });
    return counts;
  }, [attendance, students]);

  // ------------------------
  // Render
  // ------------------------
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Mark Attendance</CardTitle>
            <CardDescription>Record daily attendance for students</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {/* DATE PICKER */}
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* CLASS DROPDOWN */}
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Student Attendance</CardTitle>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{students.length} students</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {students.map((student) => {
                    const record = attendance[student._id];
                    return (
                      <div key={student._id} className="rounded-lg border p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="font-medium">{student.name}</div>
                            <div className="text-sm text-muted-foreground">{student.regNo}</div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={record?.status === "present" ? "default" : "outline"}
                              onClick={() => handleStatusChange(student._id, "present")}
                            >
                              Present
                            </Button>
                            <Button
                              size="sm"
                              variant={record?.status === "absent" ? "destructive" : "outline"}
                              onClick={() => handleStatusChange(student._id, "absent")}
                            >
                              Absent
                            </Button>
                            <Button
                              size="sm"
                              variant={record?.status === "late" ? "secondary" : "outline"}
                              onClick={() => handleStatusChange(student._id, "late")}
                            >
                              Late
                            </Button>
                          </div>
                        </div>

                        {record && (
                          <div className="mt-3">
                            <Textarea
                              placeholder="Add notes (optional)..."
                              value={record.notes}
                              onChange={(e) => handleNotesChange(student._id, e.target.value)}
                              rows={2}
                              className="text-sm"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Present:</span>
                    <Badge variant="default">{statusCounts.present}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Absent:</span>
                    <Badge variant="destructive">{statusCounts.absent}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Late:</span>
                    <Badge variant="secondary">{statusCounts.late}</Badge>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm font-medium">Total:</span>
                    <Badge variant="outline">{statusCounts.total}</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2">
                    <Save className="h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Attendance"}
                  </Button>
                  <Button
                    onClick={handleExport}
                    disabled={isExporting}
                    variant="outline"
                    className="w-full gap-2 bg-transparent"
                  >
                    <Download className="h-4 w-4" />
                    {isExporting ? "Exporting..." : "Export Daily Report"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
