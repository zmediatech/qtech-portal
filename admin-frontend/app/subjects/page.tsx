// app/subjects/page.tsx
'use client'

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Loader2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Subject = {
  _id: string
  name: string
  code: string
  createdAt?: string
  updatedAt?: string
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://qtech-backend.vercel.app"

export default function SubjectsPage() {
  const [mounted, setMounted] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // delete modal state
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchSubjects = async () => {
    try {
      setLoading(true)
      setError(null)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const res = await fetch(`${API_BASE}/api/subjects`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        throw new Error(`Server error ${res.status}`)
      }

      const json = await res.json()
      const list: Subject[] = Array.isArray(json)
        ? json
        : json?.data ?? []

      setSubjects(list)
    } catch (e: any) {
      setError(
        e?.name === "AbortError"
          ? "Request timed out. Please check your server."
          : e?.message || "Failed to load subjects"
      )
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (mounted) fetchSubjects()
  }, [mounted])

  const hasRows = useMemo(() => subjects.length > 0, [subjects])

  const handleRetry = () => fetchSubjects()

  async function confirmDelete() {
    if (!deleteId) return
    try {
      setDeleting(true)

      const res = await fetch(`${API_BASE}/api/subjects/${deleteId}`, {
        method: "DELETE",
      })

      const json = await res.json()

      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to delete subject")
      }

      setSubjects((prev) => prev.filter((s) => s._id !== deleteId))
      setDeleteId(null)
    } catch (e: any) {
      alert(e?.message || "Delete failed")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Subjects</h1>
        <Link href="/subjects/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Subject
          </Button>
        </Link>
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader>
          <CardTitle>All Subjects</CardTitle>
          <CardDescription>
            Manage curriculum subjects
            <span className="block mt-1 text-xs text-muted-foreground">
              API: {API_BASE}
            </span>
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!mounted ? (
            <div className="rounded-md border py-8 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="w-[70px] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        Loading subjects…
                      </TableCell>
                    </TableRow>
                  )}

                  {error && !loading && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center">
                        <div className="mb-2 text-sm text-red-500">
                          {error}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleRetry}
                          className="gap-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Retry
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading && !error && !hasRows && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No subjects found.
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading &&
                    !error &&
                    hasRows &&
                    subjects.map((subject) => (
                      <TableRow key={subject._id}>
                        <TableCell className="font-medium">
                          {subject.name}
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline">{subject.code}</Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-8 w-8 p-0"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>
                                Actions
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/subjects/${subject._id}/edit`}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                  setDeleteId(subject._id)
                                }
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

      {/* Delete confirmation modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-background p-6">
            <h3 className="mb-1 text-lg font-semibold">
              Delete subject?
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              This action cannot be undone.
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
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
