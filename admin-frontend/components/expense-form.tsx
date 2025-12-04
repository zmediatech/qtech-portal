"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { toast } from "@/hooks/use-toast"

type BackendExpense = {
  _id?: string
  id?: string
  category: string
  amount: number | string
  date: string | Date
  description?: string
  // timestamps ignored here
}

interface ExpenseFormProps {
  // Accept either your local shape or backend shape (flexible)
  expense?: BackendExpense
  onSubmit?: (data: any) => void
}

const API_BASE =
  (typeof window !== "undefined" &&
    (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000")) ||
  "http://localhost:5000"
const EXPENSES_URL = `${API_BASE.replace(/\/$/, "")}/api/expenses`

// Keep values = human-readable text so they match what you store in DB
const CATEGORY_OPTIONS = [
  "Staff Salaries",
  "Utilities",
  "Maintenance",
  "Office Supplies",
  "Equipment",
  "Transport",
  "Marketing",
  "Insurance",
  "Rent",
  "Other",
] as const

export function ExpenseForm({ expense, onSubmit }: ExpenseFormProps) {
  const router = useRouter()

  // Normalize incoming data for editing
  const initial = useMemo(() => {
    const dateVal =
      expense?.date instanceof Date
        ? expense.date
        : expense?.date
        ? new Date(expense.date)
        : new Date()

    return {
      id: expense?._id || expense?.id || undefined,
      category: expense?.category || "",
      amount: expense?.amount?.toString?.() || "",
      date: isNaN(dateVal.getTime()) ? new Date() : dateVal,
      note: expense?.description || "", // map backend 'description' to local 'note'
    }
  }, [expense])

  const [formData, setFormData] = useState({
    category: initial.category,
    amount: initial.amount,
    date: initial.date,
    note: initial.note,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // If prop changes (e.g., fetched later), sync local state
    setFormData({
      category: initial.category,
      amount: initial.amount,
      date: initial.date,
      note: initial.note,
    })
  }, [initial.category, initial.amount, initial.date, initial.note])

  const isEdit = Boolean(initial.id)

  async function defaultSubmit() {
    const payload = {
      category: formData.category,
      amount: parseFloat(String(formData.amount || 0)),
      date: new Date(formData.date).toISOString(),
      description: formData.note?.trim() || "",
    }

    // Basic front-end guards
    if (!payload.category) throw new Error("Please select a category.")
    if (isNaN(payload.amount) || payload.amount < 0) throw new Error("Enter a valid amount.")
    if (!payload.date) throw new Error("Please pick a date.")

    const url = isEdit ? `${EXPENSES_URL}/${initial.id}` : EXPENSES_URL
    const method = isEdit ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.error || `Failed to ${isEdit ? "update" : "create"} expense`)
    }

    return res.json()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (onSubmit) {
        // If parent wants to control submission, pass normalized payload
        onSubmit({
          category: formData.category,
          amount: parseFloat(String(formData.amount || 0)),
          date: new Date(formData.date).toISOString(),
          description: formData.note?.trim() || "",
          id: initial.id,
        })
      } else {
        await defaultSubmit()
        toast({
          title: isEdit ? "Expense Updated" : "Expense Recorded",
          description: `Expense of $${Number(formData.amount || 0).toFixed(2)} has been ${
            isEdit ? "updated" : "recorded"
          } successfully.`,
        })
        // Go back to list
        router.push("/admin/expenses")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Expense" : "Record New Expense"}</CardTitle>
        <CardDescription>
          {isEdit ? "Update expense information" : "Add a new expense to the records"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData((s) => ({ ...s, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData((s) => ({ ...s, amount: e.target.value }))}
                placeholder="1000.00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? format(formData.date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => setFormData((s) => ({ ...s, date: date || new Date() }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Description/Note *</Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) => setFormData((s) => ({ ...s, note: e.target.value }))}
              placeholder="Describe the expense..."
              rows={4}
              required
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Update Expense" : "Record Expense"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
