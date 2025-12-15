"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Plus, Edit, Trash2, Eye, Users, Loader2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Dynamically import AdminLayout to prevent SSR
const AdminLayout = dynamic(
  () => import("@/components/admin-layout").then(mod => ({ default: mod.AdminLayout })),
  {
    ssr: false,
    loading: () => <div className="min-h-screen bg-background" />
  }
)

interface ClassItem {
  _id: string
  name: string
  description?: string
  subjects?: any[]
  courses?: any[]   // keep type; UI usage commented out below
  students?: any[]
}

function ClassesContent() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<boolean>(false)

  // Fetch classes from API
  const fetchClasses = async () => {
    try {
      setLoading(true)
      const response = await fetch('https://qtech-backend.vercel.app/api/classes')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch classes')
      }

      if (result.success) {
        setClasses(result.data)
        setError(null)
      } else {
        throw new Error(result.message || 'Failed to fetch classes')
      }
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching classes:', err.message)
    } finally {
      setLoading(false)
    }
  }

  // Delete class
  const handleDelete = async (id: string) => {
    try {
      setDeleting(true)
      const response = await fetch(`https://qtech-backend.vercel.app/api/classes/${id}`, {
        method: 'DELETE',
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete class')
      }

      if (result.success) {
        setClasses(classes.filter(cls => cls._id !== id))
        console.log('Class deleted successfully')
      } else {
        throw new Error(result.message || 'Failed to delete class')
      }
    } catch (err: any) {
      console.error('Error deleting class:', err.message)
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  // Load classes on component mount
  useEffect(() => {
    fetchClasses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Classes</h1>
        <Link href="/classes/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Class
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Classes</CardTitle>
          <CardDescription>Manage academic classes and their structure</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading classes...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={fetchClasses} variant="outline">
                Try Again
              </Button>
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No classes found</p>
              <Link href="/classes/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Class
                </Button>
              </Link>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Subjects</TableHead>
                    {/* ---------------------------------------------
                        Courses column hidden (kept for future use)
                        <TableHead>Courses</TableHead>
                       --------------------------------------------- */}
                    <TableHead>Students</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((classItem) => (
                    <TableRow key={classItem._id}>
                      <TableCell className="font-medium">{classItem.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {classItem.description || "No description"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {classItem.subjects?.length || 0} subjects
                        </Badge>
                      </TableCell>

                      {/* ---------------------------------------------------------
                          Courses cell hidden (kept for future use)
                          <TableCell>
                            <Badge variant="secondary">
                              {classItem.courses?.length || 0} courses
                            </Badge>
                          </TableCell>
                         --------------------------------------------------------- */}

                      <TableCell>
                        <Link href={`/students?classId=${classItem._id}`}>
                          <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                            <Users className="mr-1 h-3 w-3" />
                            {classItem.students?.length || 0} students
                          </Badge>
                        </Link>
                      </TableCell>
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
                              <Link href={`/classes/${classItem._id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/classes/${classItem._id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/students?classId=${classItem._id}`}>
                                <Users className="mr-2 h-4 w-4" />
                                View Students
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive cursor-pointer"
                              onClick={() => setDeleteId(classItem._id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold mb-2">Are you sure?</h2>
            <p className="text-muted-foreground mb-4">
              This action cannot be undone. This will permanently delete the class
              and remove all associated data.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteId(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteId!)}
                disabled={deleting}
              >
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ClassesPage() {
  return (
    <AdminLayout>
      <ClassesContent />
    </AdminLayout>
  )
}
