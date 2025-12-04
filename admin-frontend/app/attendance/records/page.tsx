"use client";

import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { CalendarIcon, Download, Search, Users, TrendingUp, TrendingDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

interface Student {
  _id: string;
  name: string;
  regNo: string;
}

interface Class {
  _id: string;
  name: string;
}

interface AttendanceRecord {
  _id: string;
  date: string;
  class: {
    _id: string;
    name: string;
  };
  totalStudents: number;
  presentStudents: Student[];
  absentStudents: Student[];
  lateStudents: Student[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AttendanceRecordsPage() {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [classes, setClasses] = useState<Class[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch classes on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/classes`)
      .then((res) => res.json())
      .then((json) => setClasses(json?.data || []))
      .catch((err) => console.error("Error fetching classes:", err));
  }, []);

  // Fetch attendance records
  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      let url = `${API_BASE}/api/attendance?`;
      
      if (selectedClass && selectedClass !== "all") {
        url += `classId=${selectedClass}&`;
      }
      
      // Note: For date range filtering, you might need to enhance your backend
      // For now, we'll fetch all and filter on frontend if needed
      
      const res = await fetch(url);
      const json = await res.json();

      if (json.success) {
        let filteredRecords = json.data || [];
        
        // Filter by date range if specified
        if (startDate) {
          filteredRecords = filteredRecords.filter((record: AttendanceRecord) => {
            const recordDate = new Date(record.date);
            return recordDate >= startDate;
          });
        }
        
        if (endDate) {
          filteredRecords = filteredRecords.filter((record: AttendanceRecord) => {
            const recordDate = new Date(record.date);
            return recordDate <= endDate;
          });
        }
        
        setRecords(filteredRecords);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch attendance records",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching records:", error);
      toast({
        title: "Error",
        description: "Failed to fetch attendance records",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch records on component mount and when filters change
  useEffect(() => {
    fetchRecords();
  }, [selectedClass]);

  const handleExport = async () => {
    if (!selectedClass || selectedClass === "all") {
      return toast({
        title: "Error",
        description: "Please select a specific class to export",
        variant: "destructive",
      });
    }

    setIsExporting(true);
    try {
      const dateStr = startDate ? startDate.toISOString().split("T")[0] : "";
      const res = await fetch(
        `${API_BASE}/api/attendance/export?classId=${selectedClass}${dateStr ? `&date=${dateStr}` : ""}`
      );

      if (!res.ok) throw new Error("Failed to fetch report");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-records-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "Report downloaded successfully.",
      });
    } catch (err) {
      console.error("Export error:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Export failed",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const calculateStats = () => {
    if (records.length === 0) {
      return {
        totalRecords: 0,
        avgPresent: 0,
        avgAbsent: 0,
        avgLate: 0,
        attendanceRate: 0,
      };
    }

    const totalPresent = records.reduce((sum, r) => sum + r.presentStudents.length, 0);
    const totalAbsent = records.reduce((sum, r) => sum + r.absentStudents.length, 0);
    const totalLate = records.reduce((sum, r) => sum + r.lateStudents.length, 0);
    const totalStudents = records.reduce((sum, r) => sum + r.totalStudents, 0);

    return {
      totalRecords: records.length,
      avgPresent: Math.round(totalPresent / records.length),
      avgAbsent: Math.round(totalAbsent / records.length),
      avgLate: Math.round(totalLate / records.length),
      attendanceRate: totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0,
    };
  };

  const stats = calculateStats();

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
            <CardDescription>View and export attendance history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {/* Class Filter */}
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="All classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All classes</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Search Button */}
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button onClick={fetchRecords} disabled={isLoading} className="w-full">
                  <Search className="mr-2 h-4 w-4" />
                  {isLoading ? "Searching..." : "Search"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRecords}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Avg Present</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.avgPresent}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Avg Absent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.avgAbsent}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Avg Late</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.avgLate}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{stats.attendanceRate}%</div>
                {stats.attendanceRate >= 80 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Records Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Attendance Records</CardTitle>
                <CardDescription>
                  {records.length} record{records.length !== 1 ? "s" : ""} found
                </CardDescription>
              </div>
              <Button onClick={handleExport} disabled={isExporting || records.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? "Exporting..." : "Export CSV"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No attendance records found. Try adjusting your filters.
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Present</TableHead>
                      <TableHead className="text-center">Absent</TableHead>
                      <TableHead className="text-center">Late</TableHead>
                      <TableHead className="text-center">Rate</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => {
                      const rate = Math.round(
                        (record.presentStudents.length / record.totalStudents) * 100
                      );
                      return (
                        <TableRow key={record._id}>
                          <TableCell className="font-medium">
                            {format(new Date(record.date), "PPP")}
                          </TableCell>
                          <TableCell>{record.class?.name || "N/A"}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{record.totalStudents}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="default">{record.presentStudents.length}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="destructive">{record.absentStudents.length}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{record.lateStudents.length}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={rate >= 80 ? "default" : rate >= 60 ? "secondary" : "destructive"}
                            >
                              {rate}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {record.notes || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}