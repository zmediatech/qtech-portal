// app/subjects/page.tsx
'use client'

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Plus, Edit, Trash2, Eye, RefreshCw, Loader2 } from "lucide-react"
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
  linkedClasses?: any[]
  createdAt?: string
  updatedAt?: string
  __v?: number
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"

export default function SubjectsPage() {
  const [mounted, setMounted] = useState(false)
  const [subjects, setSubjects] = useState<Subject[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // delete dialog state
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { setMounted(true) }, [])

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

      if (!res.ok) throw new Error(`Server responded with ${res.status}: ${res.statusText}`)

      const json = await res.json()
      const list: Subject[] = Array.isArray(json) ? json : (json?.data ?? [])
      setSubjects(list)
    } catch (e: any) {
      setError(e?.name === "AbortError" ? "Request timed out. Please check if your server is running." : (e?.message || "Failed to load subjects"))
      console.error("Error fetching subjects:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (mounted) fetchSubjects() }, [mounted])

  const hasRows = useMemo(() => (subjects?.length ?? 0) > 0, [subjects])

  const handleRetry = () => fetchSubjects()

  async function confirmDelete() {
    if (!deleteId) return
    try {
      setDeleting(true)
      const res = await fetch(`${API_BASE}/api/subjects/${deleteId}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || `Failed to delete (status ${res.status})`)
      }
      // Optimistic update
      setSubjects(prev => (prev || []).filter(s => s._id !== deleteId))
      setDeleteId(null)
    } catch (e: any) {
      alert(e?.message || "Failed to delete subject")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Subjects</h1>
        <Link href="/subjects/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Subject
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Subjects</CardTitle>
          <CardDescription>
            Manage curriculum subjects and their associations
            {API_BASE && (
              <span className="block text-xs text-muted-foreground mt-1">API: {API_BASE}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!mounted ? (
            <div className="rounded-md border">
              <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    {/* <TableHead>Linked Classes</TableHead> */}
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        Loading subjects…
                      </TableCell>
                    </TableRow>
                  )}

                  {error && !loading && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center">
                        <div className="text-sm text-red-500 mb-2">{error}</div>
                        <Button variant="outline" size="sm" onClick={handleRetry} className="gap-2">
                          <RefreshCw className="h-4 w-4" />
                          Retry
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading && !error && !hasRows && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        No subjects found.
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading && !error && hasRows && subjects!.map((subject) => (
                    <TableRow key={subject._id}>
                      <TableCell className="font-medium">{subject.name}</TableCell>
                      <TableCell><Badge variant="outline">{subject.code}</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{subject.linkedClasses?.length ?? 0} classes</Badge></TableCell>
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
                            {/* <DropdownMenuItem asChild>
                              <Link href={`/subjects/${subject._id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem> */}
                            <DropdownMenuItem asChild>
                              <Link href={`/subjects/${subject._id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(subject._id)}
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
            <h3 className="text-lg font-semibold mb-1">Delete subject?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
