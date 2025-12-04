"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { MoreHorizontal, Search, Download, Eye, Edit, Trash2, Loader2, RefreshCw } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Interface matching your MongoDB schema
interface Student {
  _id: string
  regNo: string
  name: string
  fatherName?: string
  phone: string
  email?: string
  address?: string
  class: {
    _id: string
    name: string
  }
  category: "Free" | "Paid"
  status: "Active" | "Inactive" | "Graduated"
  feeStatus: "Paid" | "Unpaid" | "Partial" | "Overdue"
  notes?: string
  dateOfBirth?: string
  admissionDate?: string
  createdAt: string
  updatedAt: string
}

interface StudentTableProps {
  title?: string
  description?: string
  filter?: "all" | "active" | "inactive" | "paid" | "unpaid" | "graduated"
}

export function StudentTable({
  title = "All Students",
  description = "Manage student information",
  filter = "all",
}: StudentTableProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState( // ★ CHANGED
    filter === "graduated" ? "Graduated" : "all"
  )
  const [feeStatusFilter, setFeeStatusFilter] = useState("all") // ★ ADDED
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])

  // Fetch students from your API
  const fetchStudents = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Build query parameters for your API
      const params = new URLSearchParams()
      if (searchTerm.trim()) params.append('q', searchTerm.trim())

      // status -> backend
      if (filter === "graduated") {
        params.append("status", "Graduated")
      } else if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }

      // ★ ADDED: category -> backend
      if (categoryFilter !== "all") {
        params.append("category", categoryFilter)
      }

      // ★ ADDED: feeStatus -> backend
      if (feeStatusFilter !== "all") {
        params.append("feeStatus", feeStatusFilter)
      }

      const url = `http://localhost:5000/api/students${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`)
      
      const result = await response.json()
      if (result.success) {
        setStudents(result.data || [])
      } else {
        throw new Error(result.message || 'Failed to fetch students')
      }
    } catch (err) {
      console.error('Error fetching students:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch students')
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  // Delete student function
  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return
    try {
      const response = await fetch(`http://localhost:5000/api/students/${studentId}`, { method: 'DELETE' })
      const result = await response.json()
      if (response.ok && result.success) {
        setStudents(prev => prev.filter(s => s._id !== studentId))
        setSelectedStudents(prev => prev.filter(id => id !== studentId))
      } else {
        alert(result.message || 'Failed to delete student')
      }
    } catch (err) {
      console.error('Error deleting student:', err)
      alert('Error deleting student')
    }
  }

  // Fetch students on component mount
  useEffect(() => {
    fetchStudents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced search - refetch when search term changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchStudents()
    }, 500)
    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  // Refetch when filters change
  useEffect(() => { fetchStudents() }, [statusFilter])        // ★ ADDED
  useEffect(() => { fetchStudents() }, [categoryFilter])      // ★ ADDED
  useEffect(() => { fetchStudents() }, [feeStatusFilter])     // ★ ADDED

  // Filter students based on props and local filters (client-side filtering)
  const filteredStudents = students.filter((student) => {
    const matchesClass = classFilter === "all" || student.class?.name === classFilter
    const matchesCategory = categoryFilter === "all" || student.category === categoryFilter
    const matchesStatus = statusFilter === "all" || student.status === statusFilter
    const matchesFeeStatus = feeStatusFilter === "all" || student.feeStatus === feeStatusFilter // ★ ADDED

    // Apply prop-based filter
    let matchesFilter = true
    if (filter === "active") matchesFilter = student.status === "Active"
    if (filter === "inactive") matchesFilter = student.status === "Inactive"
    if (filter === "graduated") matchesFilter = student.status === "Graduated"
    if (filter === "paid") matchesFilter = student.feeStatus === "Paid"
    if (filter === "unpaid") matchesFilter = student.feeStatus === "Unpaid"

    return matchesClass && matchesCategory && matchesStatus && matchesFeeStatus && matchesFilter // ★ CHANGED
  })

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedStudents(filteredStudents.map((s) => s._id))
    else setSelectedStudents([])
  }

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    if (checked) setSelectedStudents((prev) => [...prev, studentId])
    else setSelectedStudents((prev) => prev.filter((id) => id !== studentId))
  }

  const getStatusBadge = (status: string) => {
    const variant = status === "Active" ? "default" : status === "Graduated" ? "secondary" : "secondary"
    return <Badge variant={variant}>{status}</Badge>
  }

  const getCategoryBadge = (category: string) => {
    return <Badge variant={category === "Paid" ? "default" : "outline"}>{category}</Badge>
  }

  const getFeeStatusBadge = (feeStatus: string) => {
    const variant =
      feeStatus === "Paid"
        ? "default"
        : feeStatus === "Unpaid" || feeStatus === "Overdue"
          ? "destructive"
          : feeStatus === "Partial"
            ? "secondary"
            : "outline"
    return <Badge variant={variant}>{feeStatus}</Badge>
  }

  // Get unique class names for filter dropdown
  const uniqueClasses = [...new Set(students.map(s => s.class?.name).filter(Boolean))]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button onClick={fetchStudents} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {uniqueClasses.map((className) => (
                  <SelectItem key={className} value={className}>
                    {className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Free">Free</SelectItem>
              </SelectContent>
            </Select>

            {/* Status (locked if this page is for Graduated) */}
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
              disabled={filter === "graduated"}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {filter === "graduated" ? (
                  <SelectItem value="Graduated">Graduated</SelectItem>
                ) : (
                  <>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Graduated">Graduated</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>

            {/* ★ ADDED: Fee Status filter */}
            <Select value={feeStatusFilter} onValueChange={setFeeStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Fee Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fees</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Unpaid">Unpaid</SelectItem>
                <SelectItem value="Partial">Partial</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="gap-2 bg-transparent">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {selectedStudents.length > 0 && (
          <div className="flex items-center gap-2 rounded-md bg-muted p-2">
            <span className="text-sm text-muted-foreground">{selectedStudents.length} student(s) selected</span>
            <Button size="sm" variant="outline">
              Bulk Actions
            </Button>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive mb-4">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                    onCheckedChange={handleSelectAll}
                    disabled={loading}
                  />
                </TableHead>
                <TableHead>Reg No</TableHead>
                <TableHead>Name</TableHead>
                {/* <TableHead>Father Name</TableHead>
                <TableHead>Class</TableHead> */}
                <TableHead>Phone</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fee Status</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-muted-foreground">Loading students...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center">
                      <p className="text-muted-foreground text-lg">No students found</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {error ? "Please check your connection and try again" : "Try adjusting your search or filters"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => (
                  <TableRow key={student._id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedStudents.includes(student._id)}
                        onCheckedChange={(checked) => handleSelectStudent(student._id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{student.regNo}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    {/* <TableCell>{student.fatherName || "-"}</TableCell>
                    <TableCell>{student.class?.name || "-"}</TableCell> */}
                    <TableCell>{student.phone}</TableCell>
                    <TableCell>{getCategoryBadge(student.category)}</TableCell>
                    <TableCell>{getStatusBadge(student.status)}</TableCell>
                    <TableCell>{getFeeStatusBadge(student.feeStatus)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/students/${student._id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/students/${student._id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDeleteStudent(student._id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!loading && !error && (
          <div className="flex items-center justify-between px-2 py-4 text-sm text-muted-foreground">
            <div>
              Showing <span className="font-medium">{filteredStudents.length}</span> of{" "}
              <span className="font-medium">{students.length}</span> students
            </div>
            {students.length > 0 && (
              <div>
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
