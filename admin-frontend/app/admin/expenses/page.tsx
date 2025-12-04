"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  MoreHorizontal,
  Plus,
  Search,
  Download,
  Calendar as CalendarIcon,
  TrendingDown,
  Edit,
  Trash2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { format } from "date-fns"
import { Label } from "@/components/ui/label"

// ===== Types =====
type Expense = {
  _id: string
  category: string
  amount: number
  date: string // ISO date string
  description?: string
}

type Summary = {
  thisMonth: number
  lastMonth: number
  averageMonthly: number
  ytdTotal: number
}

// ===== Config =====
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000"
const EXPENSES_URL = `${API_BASE}/api/expenses`
const SUMMARY_URL = `${API_BASE}/api/expenses/summary`
const EXPORT_URL = `${API_BASE}/api/expenses/export`

const categoryColors: Record<string, string> = {
  "Staff Salaries": "bg-blue-100 text-blue-800",
  Utilities: "bg-green-100 text-green-800",
  Equipment: "bg-purple-100 text-purple-800",
  Maintenance: "bg-orange-100 text-orange-800",
  "Office Supplies": "bg-gray-100 text-gray-800",
  Transport: "bg-yellow-100 text-yellow-800",
}

// ===== Helpers =====
function qs(params: Record<string, string | number | undefined | null>) {
  const u = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length) u.set(k, String(v))
  })
  const s = u.toString()
  return s ? `?${s}` : ""
}
function currency(n: number) {
  try {
    return n.toLocaleString(undefined, { style: "currency", currency: "PKR" })
  } catch {
    return `$${n.toLocaleString()}`
  }
}
function toYmd(d?: Date) {
  if (!d) return undefined
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export default function ExpensesPage() {
  // filters
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [openCalendar, setOpenCalendar] = useState(false)

  // data
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // edit dialog state
  const [editing, setEditing] = useState<Expense | null>(null)
  const [saving, setSaving] = useState(false)

  // Fetch list (server-side filters that your backend supports)
  async function loadExpenses() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(
        `${EXPENSES_URL}${qs({
          startDate: toYmd(dateRange.from),
          endDate: toYmd(dateRange.to),
          category: categoryFilter !== "all" ? categoryFilter : undefined,
        })}`,
        { cache: "no-store" },
      )
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
      const data: Expense[] = await res.json()
      setExpenses(data)
    } catch (e: any) {
      setError(e?.message || "Failed to load expenses")
    } finally {
      setLoading(false)
    }
  }

  async function loadSummary() {
    try {
      const res = await fetch(SUMMARY_URL, { cache: "no-store" })
      if (!res.ok) throw new Error("Summary failed")
      const s: Summary = await res.json()
      setSummary(s)
    } catch {
      // non-blocking
    }
  }

  useEffect(() => {
    loadExpenses()
  }, [categoryFilter, dateRange.from, dateRange.to])

  useEffect(() => {
    loadSummary()
  }, [])

  // derived
  const categoriesFromData = useMemo(() => {
    const set = new Set(expenses.map((e) => e.category).filter(Boolean))
    return Array.from(set)
  }, [expenses])

  const filteredBySearch = useMemo(() => {
    const s = searchTerm.trim().toLowerCase()
    if (!s) return expenses
    return expenses.filter((e) => {
      const hay = `${e.category} ${e.description ?? ""}`.toLowerCase()
      return hay.includes(s)
    })
  }, [expenses, searchTerm])

  // Actions
  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return
    const res = await fetch(`${EXPENSES_URL}/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      alert(body?.error || "Delete failed")
      return
    }
    setExpenses((prev) => prev.filter((x) => x._id !== id))
  }

  async function handleSaveEdit() {
    if (!editing) return
    setSaving(true)
    try {
      const res = await fetch(`${EXPENSES_URL}/${editing._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: editing.category,
          amount: Number(editing.amount),
          date: editing.date,
          description: editing.description || "",
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || "Update failed")
      }
      const updated: Expense = await res.json()
      setExpenses((prev) => prev.map((x) => (x._id === updated._id ? updated : x)))
      setEditing(null)
    } catch (e: any) {
      alert(e?.message || "Update failed")
    } finally {
      setSaving(false)
    }
  }

  function exportCSV() {
    const url =
      EXPORT_URL +
      qs({
        startDate: toYmd(dateRange.from),
        endDate: toYmd(dateRange.to),
        category: categoryFilter !== "all" ? categoryFilter : undefined,
      })
    // Let the backend stream the file
    window.location.href = url
  }

  function getCategoryBadge(category: string) {
    const colorClass = categoryColors[category] || "bg-gray-100 text-gray-800"
    return <Badge className={colorClass}>{category}</Badge>
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Expense Management</h1>
        <Link href="/admin/expenses/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </Link>
      </div>

      <div className="grid gap-6">
        {/* KPIs (from backend summary) */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <div>
                  <div className="text-sm text-muted-foreground">This Month</div>
                  <div className="text-lg font-semibold text-red-600">
                    {summary ? currency(summary.thisMonth) : "—"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-orange-600" />
                <div>
                  <div className="text-sm text-muted-foreground">Last Month</div>
                  <div className="text-lg font-semibold text-orange-600">
                    {summary ? currency(summary.lastMonth) : "—"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="text-sm text-muted-foreground">Average Monthly</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {summary ? currency(summary.averageMonthly) : "—"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-purple-600" />
                <div>
                  <div className="text-sm text-muted-foreground">YTD Total</div>
                  <div className="text-lg font-semibold text-purple-600">
                    {summary ? currency(summary.ytdTotal) : "—"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Records</CardTitle>
            <CardDescription>Track and manage institute expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
              <div className="flex flex-1 items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search expenses..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Popover open={openCalendar} onOpenChange={setOpenCalendar}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2 bg-transparent">
                      <CalendarIcon className="h-4 w-4" />
                      {dateRange.from && dateRange.to
                        ? `${format(dateRange.from, "LLL d, yyyy")} - ${format(dateRange.to, "LLL d, yyyy")}`
                        : "Date Range"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="range"
                      numberOfMonths={2}
                      selected={dateRange as any}
                      onSelect={(range) => setDateRange(range ?? {})}
                    />
                    <div className="flex justify-end gap-2 p-2 border-t">
                      <Button size="sm" variant="ghost" onClick={() => setDateRange({})}>
                        Clear
                      </Button>
                      <Button size="sm" onClick={() => setOpenCalendar(false)}>
                        Apply
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categoriesFromData.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="outline" className="gap-2 bg-transparent" onClick={exportCSV}>
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>

            <div className="rounded-md border">
              {loading ? (
                <div className="p-6 text-sm text-muted-foreground">Loading expenses…</div>
              ) : error ? (
                <div className="p-6 text-sm text-red-600">Error: {error}</div>
              ) : filteredBySearch.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">No expenses found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[90px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBySearch.map((expense) => (
                      <TableRow key={expense._id}>
                        <TableCell>{getCategoryBadge(expense.category)}</TableCell>
                        <TableCell className="font-medium">{currency(expense.amount)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(expense.date), "yyyy-MM-dd")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {expense.description || "—"}
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
                              <DropdownMenuItem onClick={() => setEditing(expense)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(expense._id)}>
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
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => (o ? null : setEditing(null))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={editing.amount}
                  onChange={(e) => setEditing({ ...editing, amount: Number(e.target.value) })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={format(new Date(editing.date), "yyyy-MM-dd")}
                  onChange={(e) => {
                    const iso = new Date(e.target.value + "T00:00:00").toISOString()
                    setEditing({ ...editing, date: iso })
                  }}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
