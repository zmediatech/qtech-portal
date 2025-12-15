"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"

interface Subject {
  _id: string
  name: string
  code?: string
}

interface ClassFormProps {
  classData?: {
    id?: string
    name: string
    description?: string
    subjectIds: string[]
  }
  onSubmit?: (data: any) => void
}

export function ClassForm({ classData, onSubmit }: ClassFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: classData?.name || "",
    description: classData?.description || "",
    subjectIds: classData?.subjectIds || [],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)

  // 🔹 Fetch subjects from backend API
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await fetch("https://qtech-backend.vercel.app/api/subjects", {
          cache: "no-store",
        })
        const json = await res.json()

        if (res.ok && json.success && Array.isArray(json.data)) {
          setSubjects(json.data)
        } else {
          throw new Error(json.message || "Failed to fetch subjects")
        }
      } catch (err: any) {
        console.error("Error fetching subjects:", err.message)
        toast({
          title: "Error",
          description: "Failed to load subjects from server",
          variant: "destructive",
        })
      } finally {
        setLoadingSubjects(false)
      }
    }

    fetchSubjects()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (onSubmit) {
        onSubmit(formData) // 🔹 send subjectIds with other data
      } else {
        toast({
          title: classData ? "Class Updated" : "Class Created",
          description: `${formData.name} has been ${classData ? "updated" : "created"} successfully.`,
        })
        router.push("/classes")
      }
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubjectToggle = (subjectId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      subjectIds: checked
        ? [...prev.subjectIds, subjectId]
        : prev.subjectIds.filter((id) => id !== subjectId),
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{classData ? "Edit Class" : "Create New Class"}</CardTitle>
        <CardDescription>
          {classData ? "Update class information" : "Add a new class to the academic structure"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Class Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Grade 10-A"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the class..."
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <Label>Subjects</Label>
            {loadingSubjects ? (
              <p className="text-sm text-muted-foreground">Loading subjects…</p>
            ) : subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subjects found</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {subjects.map((subject) => (
                  <div key={subject._id} className="flex items-center space-x-2">
                    <Checkbox
                      id={subject._id}
                      checked={formData.subjectIds.includes(subject._id)}
                      onCheckedChange={(checked) =>
                        handleSubjectToggle(subject._id, checked as boolean)
                      }
                    />
                    <Label htmlFor={subject._id} className="text-sm font-normal">
                      {subject.name} {subject.code ? `(${subject.code})` : ""}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : classData ? "Update Class" : "Create Class"}
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
