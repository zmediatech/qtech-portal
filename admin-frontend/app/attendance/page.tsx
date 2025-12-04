"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { CalendarIcon, Save, Download, Users } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

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
  const [hasExistingRecord, setHasExistingRecord] = useState(false);

  const router = useRouter();

  // Fetch CLASSES
  useEffect(() => {
    fetch(`${API_BASE}/api/classes`)
      .then((res) => res.json())
      .then((json) => setClasses(json?.data || []))
      .catch((err) => console.error("Error fetching classes:", err));
  }, []);

  // Fetch STUDENTS based on selected class
  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      setAttendance({});
      return;
    }

    fetch(`${API_BASE}/api/students/class/${selectedClass}`)
      .then((res) => res.json())
      .then((json) => {
        const studentData = json?.data || [];
        setStudents(studentData);
        
        // Initialize attendance for all students as "present" by default
        const initialAttendance: Record<string, AttendanceRecord> = {};
        studentData.forEach((student: Student) => {
          initialAttendance[student._id] = {
            studentId: student._id,
            status: "present",
            notes: ""
          };
        });
        setAttendance(initialAttendance);
      })
      .catch((err) => console.error("Error fetching students:", err));
  }, [selectedClass]);

  // Fetch ATTENDANCE based on selected class and date
  useEffect(() => {
    if (!selectedClass || !selectedDate || students.length === 0) return;

    const dateStr = selectedDate.toISOString().split("T")[0];

    fetch(`${API_BASE}/api/attendance?classId=${selectedClass}&date=${dateStr}`)
      .then((res) => res.json())
      .then((json) => {
        console.log("Fetched attendance:", json); // Debug log
        
        if (json.success && json.data && json.data.length > 0) {
          const attendanceData = json.data[0];
          const formattedAttendance: Record<string, AttendanceRecord> = {};
          
          // Initialize all students as unmarked first
          students.forEach((student) => {
            formattedAttendance[student._id] = {
              studentId: student._id,
              status: "present", // Default fallback
              notes: ""
            };
          });

          // Mark present students
          if (attendanceData.presentStudents && attendanceData.presentStudents.length > 0) {
            attendanceData.presentStudents.forEach((student: any) => {
              const studentId = typeof student === 'string' ? student : student._id;
              if (formattedAttendance[studentId]) {
                formattedAttendance[studentId].status = "present";
              }
            });
          }

          // Mark absent students
          if (attendanceData.absentStudents && attendanceData.absentStudents.length > 0) {
            attendanceData.absentStudents.forEach((student: any) => {
              const studentId = typeof student === 'string' ? student : student._id;
              if (formattedAttendance[studentId]) {
                formattedAttendance[studentId].status = "absent";
              }
            });
          }

          // Mark late students
          if (attendanceData.lateStudents && attendanceData.lateStudents.length > 0) {
            attendanceData.lateStudents.forEach((student: any) => {
              const studentId = typeof student === 'string' ? student : student._id;
              if (formattedAttendance[studentId]) {
                formattedAttendance[studentId].status = "late";
              }
            });
          }

          console.log("Formatted attendance:", formattedAttendance); // Debug log
          setAttendance(formattedAttendance);
          
          toast({
            title: "Attendance Loaded",
            description: `Previous attendance record found for ${format(selectedDate, "PPP")}`,
          });
        } else {
          // No attendance record exists, initialize all as present
          console.log("No existing attendance, initializing defaults");
          const initialAttendance: Record<string, AttendanceRecord> = {};
          students.forEach((student) => {
            initialAttendance[student._id] = {
              studentId: student._id,
              status: "present",
              notes: ""
            };
          });
          setAttendance(initialAttendance);
        }
      })
      .catch((err) => {
        console.error("Error fetching attendance:", err);
        // On error, initialize all as present
        const initialAttendance: Record<string, AttendanceRecord> = {};
        students.forEach((student) => {
          initialAttendance[student._id] = {
            studentId: student._id,
            status: "present",
            notes: ""
          };
        });
        setAttendance(initialAttendance);
      });
  }, [selectedClass, selectedDate, students]);

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
    if (!selectedClass) {
      return toast({ title: "Error", description: "Select a class first", variant: "destructive" });
    }

    if (students.length === 0) {
      return toast({ title: "Error", description: "No students found in this class", variant: "destructive" });
    }

    setIsSaving(true);
    try {
      const presentStudents: string[] = [];
      const absentStudents: string[] = [];
      const lateStudents: string[] = [];

      // Categorize all students based on their attendance status
      students.forEach((student) => {
        const record = attendance[student._id];
        const status = record?.status || "present"; // Default to present if not marked
        
        if (status === "present") presentStudents.push(student._id);
        else if (status === "absent") absentStudents.push(student._id);
        else if (status === "late") lateStudents.push(student._id);
      });

      const payload = {
        date: selectedDate.toISOString().split("T")[0],
        class: selectedClass, // Backend expects "class", not "classId"
        totalStudents: students.length,
        presentStudents,
        absentStudents,
        lateStudents,
        notes: "Attendance recorded",
      };

      console.log("Sending payload:", payload); // Debug log

      // First, try to POST (create new)
      let res = await fetch(`${API_BASE}/api/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      let json = await res.json();

      // If attendance already exists (409 conflict), try to update it with PUT
      if (res.status === 409) {
        console.log("Attendance exists (409), attempting to update with PUT...");
        
        res = await fetch(`${API_BASE}/api/attendance`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        
        json = await res.json();
        console.log("PUT response:", json);
      }

      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to save attendance");
      }

      toast({ 
        title: "Attendance Saved", 
        description: `Successfully recorded attendance for ${students.length} students.` 
      });
      
      // Don't clear attendance state - keep it visible
      // setAttendance({});
    } catch (error: any) {
      console.error("Save error:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save attendance", 
        variant: "destructive" 
      });
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
      a.download = `attendance-${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast({ title: "Export Successful", description: "Report downloaded." });
    } catch (err) {
      console.error("Export error:", err);
      toast({ 
        title: "Error", 
        description: (err instanceof Error ? err.message : "Export failed"), 
        variant: "destructive" 
      });
    } finally {
      setIsExporting(false);
    }
  };

  const statusCounts = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, total: students.length };
    
    students.forEach((student) => {
      const record = attendance[student._id];
      const status = record?.status || "present";
      counts[status]++;
    });
    
    return counts;
  }, [attendance, students]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Mark Attendance</CardTitle>
            <CardDescription>Record daily attendance for students</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
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
                    <span className="text-sm text-muted-foreground">
                      {students.length} students
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {selectedClass 
                      ? "No students found in this class" 
                      : "Please select a class to view students"}
                  </div>
                ) : (
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
                )}
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
                  <Button 
                    onClick={handleSave} 
                    disabled={isSaving || students.length === 0} 
                    className="w-full gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Attendance"}
                  </Button>
                  <Button
                    onClick={handleExport}
                    disabled={isExporting || students.length === 0}
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