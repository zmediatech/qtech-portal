"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"

const mockSubjects = [
  { id: "1", name: "Mathematics" },
  { id: "2", name: "English" },
  { id: "3", name: "Science" },
  { id: "4", name: "History" },
]

const mockClasses = [
  { id: "1", name: "Grade 9" },
  { id: "2", name: "Grade 10" },
  { id: "3", name: "Grade 11" },
  { id: "4", name: "Grade 12" },
]

interface CourseFormProps {
  course?: {
    id?: string
    title: string
    description?: string
    subjectId: string
    classIds: string[]
    duration?: string
    difficulty: "Beginner" | "Intermediate" | "Advanced"
  }
  onSubmit?: (data: any) => void
}

export function CourseForm({ course, onSubmit }: CourseFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: course?.title || "",
    description: course?.description || "",
    subjectId: course?.subjectId || "",
    classIds: course?.classIds || [],
    duration: course?.duration || "",
    difficulty: course?.difficulty || "Beginner",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (onSubmit) {
        onSubmit(formData)
      } else {
        toast({
          title: course ? "Course Updated" : "Course Created",
          description: `${formData.title} has been ${course ? "updated" : "created"} successfully.`,
        })
        router.push("/courses")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClassToggle = (classId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      classIds: checked ? [...prev.classIds, classId] : prev.classIds.filter((id) => id !== classId),
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{course ? "Edit Course" : "Create New Course"}</CardTitle>
        <CardDescription>
          {course ? "Update course information" : "Add a new course to the learning management system"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Course Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Advanced Mathematics"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="12 weeks"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Course description and objectives..."
              rows={4}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Select
                value={formData.subjectId}
                onValueChange={(value) => setFormData({ ...formData, subjectId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {mockSubjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Difficulty Level</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value) => setFormData({ ...formData, difficulty: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Available for Classes</Label>
            <div className="grid gap-3 md:grid-cols-2">
              {mockClasses.map((classItem) => (
                <div key={classItem.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={classItem.id}
                    checked={formData.classIds.includes(classItem.id)}
                    onCheckedChange={(checked) => handleClassToggle(classItem.id, checked as boolean)}
                  />
                  <Label htmlFor={classItem.id} className="text-sm font-normal">
                    {classItem.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : course ? "Update Course" : "Create Course"}
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
