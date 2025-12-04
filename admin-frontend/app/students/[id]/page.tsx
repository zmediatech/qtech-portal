"use client";

import { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, Phone, Mail, MapPin, Calendar, DollarSign, FileText, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StudentForm } from "@/components/student-form";
import { FeePaymentForm } from "@/components/fee-payment-form";
import { toast } from "@/hooks/use-toast";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000";

interface ClassRef {
  _id: string;
  name: string;
}
interface StudentDoc {
  _id: string;
  regNo: string;
  name: string;
  fatherName?: string;
  phone: string;
  email?: string;
  address?: string;
  class: string | ClassRef;
  category: "Free" | "Paid";
  status: "Active" | "Inactive" | "Graduated";
  notes?: string;
  feeStatus: "Paid" | "Unpaid" | "Partial" | "Overdue";
  dateOfBirth?: string;
  admissionDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface FeeRecord {
  _id: string;
  student: string;
  classroom: string;
  regNo: string;
  studentName: string;
  className: string;
  feeType: string;
  amount: number;
  date: string;
  method: string;
  status: "Paid" | "Pending" | "Unpaid";
  referenceNo?: string;
  notes?: string;
  createdAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface StudentDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatDate(d?: string) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
}

// ✅ PKR formatter
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
  }).format(amount || 0);
}

// Convert full ISO → "YYYY-MM-DD" for date inputs
function toYMD(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return iso.slice(0, 10);
  }
}

export default function StudentDetailPage({ params }: StudentDetailPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [student, setStudent] = useState<StudentDoc | null>(null);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFees, setLoadingFees] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // dialogs
  const [editOpen, setEditOpen] = useState(false);
  const [feeFormOpen, setFeeFormOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setErrMsg(null);
      try {
        // Try ObjectId route
        let res = await fetch(`${API_BASE}/api/students/${resolvedParams.id}`);
        let json: ApiResponse<StudentDoc> = await res.json();

        // Fallback: search by regNo
        if (!res.ok || !json.success) {
          res = await fetch(`${API_BASE}/api/students?q=${encodeURIComponent(resolvedParams.id)}&limit=1`);
          const searchJson = await res.json();

          if (res.ok && searchJson?.success) {
            let students: StudentDoc[] = [];
            if (Array.isArray(searchJson.data)) students = searchJson.data;
            else if (searchJson.data && Array.isArray(searchJson.data.items)) students = searchJson.data.items;
            else if (Array.isArray(searchJson.items)) students = searchJson.items;

            const found = students.find((s: StudentDoc) => s.regNo === resolvedParams.id);
            if (found) json = { success: true, data: found };
          }
        }

        if (!alive) return;
        if (!json?.success || !json?.data) {
          setErrMsg(json?.message || json?.error || `Student not found with ID/RegNo: ${resolvedParams.id}`);
          setStudent(null);
        } else {
          setStudent(json.data);
        }
      } catch (e: any) {
        if (!alive) return;
        setErrMsg(e?.message || "Network error");
        setStudent(null);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [resolvedParams.id]);

  // Load fee records for this student
  useEffect(() => {
    if (!student) return;

    const currentStudent = student;
    let alive = true;
    async function loadFees() {
      setLoadingFees(true);
      try {
        const res = await fetch(`${API_BASE}/api/fee-records?q=${encodeURIComponent(currentStudent.regNo)}`);
        const json = await res.json();

        if (!alive) return;

        if (res.ok && json.items) {
          const studentFees = json.items.filter(
            (fee: FeeRecord) => fee.regNo === currentStudent.regNo || fee.student === currentStudent._id
          );
          setFeeRecords(studentFees);
        } else {
          setFeeRecords([]);
        }
      } catch {
        if (!alive) return;
        setFeeRecords([]);
      } finally {
        if (alive) setLoadingFees(false);
      }
    }

    loadFees();
    return () => {
      alive = false;
    };
  }, [student]);

  const initials = useMemo(() => {
    if (!student?.name) return "ST";
    return student.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [student?.name]);

  const feeSummary = useMemo(() => {
    if (loadingFees) {
      return { totalPaid: "Loading...", pending: "Loading...", totalAmount: "Loading...", lastPayment: "-", recordsCount: 0 };
    }

    const paidRecords = feeRecords.filter((fee) => fee.status === "Paid");
    const pendingRecords = feeRecords.filter((fee) => fee.status === "Pending");
    const unpaidRecords = feeRecords.filter((fee) => fee.status === "Unpaid");

    const totalPaid = paidRecords.reduce((sum, fee) => sum + fee.amount, 0);
    const pendingAmount = pendingRecords.reduce((sum, fee) => sum + fee.amount, 0);
    const unpaidAmount = unpaidRecords.reduce((sum, fee) => sum + fee.amount, 0);
    const totalAmount = totalPaid + pendingAmount + unpaidAmount;

    const lastPaymentRecord = paidRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    return {
      // ✅ PKR everywhere (no "$0")
      totalPaid: formatCurrency(totalPaid),
      pending: formatCurrency(pendingAmount + unpaidAmount),
      totalAmount: formatCurrency(totalAmount),
      lastPayment: lastPaymentRecord ? formatDate(lastPaymentRecord.date) : "-",
      recordsCount: feeRecords.length,
    };
  }, [feeRecords, loadingFees]);

  async function handleDelete() {
    if (!student) return;
    if (
      !confirm(
        `Delete ${student.name} (${student.regNo})? This will also delete all associated fee records. This cannot be undone.`
      )
    )
      return;
    try {
      setDeleting(true);

      // Cascade delete endpoint
      const res = await fetch(`${API_BASE}/api/students/${student._id}/cascade`, {
        method: "DELETE",
      });
      const json: ApiResponse<unknown> = await res.json();

      if (!res.ok || !json.success) {
        alert(json.message || json.error || `Failed to delete student (status ${res.status})`);
        return;
      }

      alert("Student and associated fee records deleted successfully.");
      router.push("/students");
    } catch (e: any) {
      console.error("Student deletion error:", e);
      alert(e?.message || "Failed to delete student");
    } finally {
      setDeleting(false);
    }
  }

  // Inline edit: prefilled student for <StudentForm />
  const editStudent = useMemo(() => {
    if (!student) return undefined;
    return {
      _id: student._id,
      id: student._id,
      regNo: student.regNo,
      name: student.name,
      fatherName: student.fatherName || "",
      phone: student.phone,
      email: student.email || "",
      address: student.address || "",
      class: typeof student.class === "string" ? student.class : student.class?._id || "",
      category: student.category,
      status: student.status,
      notes: student.notes || "",
      feeStatus: student.feeStatus,
      dateOfBirth: toYMD(student.dateOfBirth),
      admissionDate: toYMD(student.admissionDate),
    };
  }, [student]);

  // Fee form preset
  const feeFormPreset = useMemo(() => {
    if (!student) return undefined;
    return {
      student: student._id,
      classroom: typeof student.class === "string" ? student.class : student.class?._id || "",
      regNo: student.regNo,
      studentName: student.name,
      className: typeof student.class === "string" ? student.class : student.class?.name || "",
    };
  }, [student]);

  async function handleInlineEditSave(payload: any) {
    if (!student) return;
    try {
      const res = await fetch(`${API_BASE}/api/students/${student._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json: ApiResponse<StudentDoc> = await res.json();
      if (!res.ok || !json?.success || !json?.data) {
        throw new Error(json?.message || json?.error || `Failed to update (status ${res.status})`);
      }
      setStudent(json.data);
      toast({
        title: "Student Updated",
        description: `${json.data.name} has been updated successfully.`,
      });
      setEditOpen(false);
    } catch (e: any) {
      toast({
        title: "Update failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    }
  }

  function handleFeePaymentSuccess() {
    setFeeFormOpen(false);
    if (student) {
      (async () => {
        try {
          const res = await fetch(`${API_BASE}/api/fee-records?q=${encodeURIComponent(student.regNo)}`);
          const json = await res.json();
          if (res.ok && json.items) {
            const studentFees = json.items.filter((fee: FeeRecord) => fee.regNo === student.regNo || fee.student === student._id);
            setFeeRecords(studentFees);
          }
        } catch (e) {
          console.error("Failed to reload fees:", e);
        }
      })();
    }
    toast({
      title: "Payment Recorded",
      description: "Fee payment has been recorded successfully.",
    });
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Student Details</h1>
        <div className="flex gap-2">
          {student && (
            <>
              <Button className="gap-2" onClick={() => setEditOpen(true)}>
                <Edit className="h-4 w-4" />
                Edit Student
              </Button>

              <Button variant="destructive" className="gap-2" onClick={handleDelete} disabled={deleting}>
                <Trash2 className="h-4 w-4" />
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </>
          )}
        </div>
      </div>

      {loading && (
        <Card className="mt-4">
          <CardContent className="py-10 text-center text-muted-foreground">Loading student…</CardContent>
        </Card>
      )}

      {!loading && errMsg && (
        <Card className="mt-4">
          <CardContent className="py-8">
            <div className="text-red-600 font-medium">Error:</div>
            <div className="text-sm">{errMsg}</div>
          </CardContent>
        </Card>
      )}

      {!loading && student && (
        <div className="grid gap-6 mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={`/abstract-geometric-shapes.png?height=80&width=80&query=${encodeURIComponent(student.name || "student")}`}
                  />
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold">{student.name}</h2>
                    <Badge variant={student.status === "Active" ? "default" : "secondary"}>{student.status}</Badge>
                    <Badge variant={student.category === "Paid" ? "default" : "outline"}>{student.category}</Badge>
                    <Badge variant="outline">{student.feeStatus}</Badge>
                  </div>

                  <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Reg No: {student.regNo}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Class: {typeof student.class === "string" ? student.class : student.class?.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {student.phone}
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {student.email || "-"}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="history">Fee History</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Full Name:</span>
                        <span>{student.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Father's Name:</span>
                        <span>{student.fatherName || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date of Birth:</span>
                        <span>{formatDate(student.dateOfBirth)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Admission Date:</span>
                        <span>{formatDate(student.admissionDate)}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <span className="text-sm">{student.address || "-"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Fee Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Paid:</span>
                        <span className="font-semibold text-green-600">{feeSummary.totalPaid}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Pending/Due:</span>
                        <span className="font-semibold text-orange-600">{feeSummary.pending}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Amount:</span>
                        <span className="font-semibold">{feeSummary.totalAmount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Last Payment:</span>
                        <span>{feeSummary.lastPayment}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Records:</span>
                        <span>{feeSummary.recordsCount} entries</span>
                      </div>

                      <Button className="w-full gap-2" size="sm" onClick={() => setFeeFormOpen(true)}>
                        <DollarSign className="h-4 w-4" />
                        Record Payment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Fee Payment History</CardTitle>
                  <CardDescription>All fee records for this student</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingFees ? (
                    <div className="text-center py-8 text-muted-foreground">Loading fee records...</div>
                  ) : feeRecords.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No fee records found</p>
                      <Button variant="outline" className="mt-4" onClick={() => setFeeFormOpen(true)}>
                        Record First Payment
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {feeRecords
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((fee) => (
                          <div key={fee._id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <div className="font-medium">{fee.feeType}</div>
                              <div className="text-sm text-muted-foreground">
                                {formatDate(fee.date)} • {fee.method}
                                {fee.referenceNo && ` • Ref: ${fee.referenceNo}`}
                              </div>
                              {fee.notes && <div className="text-sm text-muted-foreground mt-1">{fee.notes}</div>}
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{formatCurrency(fee.amount)}</div>
                              <Badge
                                variant={
                                  fee.status === "Paid" ? "default" : fee.status === "Pending" ? "secondary" : "destructive"
                                }
                                className="text-xs"
                              >
                                {fee.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>Student documents and attachments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No documents uploaded yet</p>
                    <Button variant="outline" className="mt-4 bg-transparent">
                      Upload Document
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Inline Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>

          {editStudent ? (
            <StudentForm student={editStudent} onSubmit={handleInlineEditSave} />
          ) : (
            <div className="py-6 text-sm text-muted-foreground">Loading…</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Fee Payment Dialog */}
      <Dialog open={feeFormOpen} onOpenChange={setFeeFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Fee Payment</DialogTitle>
          </DialogHeader>

          {feeFormPreset && student ? (
            <FeePaymentForm preset={feeFormPreset} onSuccess={handleFeePaymentSuccess} />
          ) : (
            <div className="p-6 text-sm text-muted-foreground">Loading student data...</div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
