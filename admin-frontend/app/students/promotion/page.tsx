import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Users } from "lucide-react"

const mockEligibleStudents = [
  { id: "ST2024001", regNo: "ST2024001", name: "John Doe", currentClass: "Grade 9", performance: "Excellent" },
  { id: "ST2024002", regNo: "ST2024002", name: "Sarah Wilson", currentClass: "Grade 9", performance: "Good" },
  { id: "ST2024003", regNo: "ST2024003", name: "Michael Brown", currentClass: "Grade 9", performance: "Average" },
]

export default function StudentPromotionPage() {
  return (
    <AdminLayout>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Student Promotion</h1>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Promotion Settings</CardTitle>
            <CardDescription>Select source and target classes for student promotion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 md:items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">From Class</label>
                <Select defaultValue="grade-9">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grade-8">Grade 8</SelectItem>
                    <SelectItem value="grade-9">Grade 9</SelectItem>
                    <SelectItem value="grade-10">Grade 10</SelectItem>
                    <SelectItem value="grade-11">Grade 11</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="h-6 w-6 text-muted-foreground" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">To Class</label>
                <Select defaultValue="grade-10">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grade-9">Grade 9</SelectItem>
                    <SelectItem value="grade-10">Grade 10</SelectItem>
                    <SelectItem value="grade-11">Grade 11</SelectItem>
                    <SelectItem value="grade-12">Grade 12</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Eligible Students</CardTitle>
                <CardDescription>Students eligible for promotion from Grade 9 to Grade 10</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{mockEligibleStudents.length} students</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox id="select-all" />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Select All Students
                </label>
              </div>

              <div className="space-y-2">
                {mockEligibleStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <Checkbox id={student.id} defaultChecked />
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {student.regNo} • {student.currentClass}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={
                        student.performance === "Excellent"
                          ? "default"
                          : student.performance === "Good"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {student.performance}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 pt-4">
                <Button className="flex-1">Promote Selected Students</Button>
                <Button variant="outline">Preview Changes</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
