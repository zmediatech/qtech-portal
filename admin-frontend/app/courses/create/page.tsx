import { AdminLayout } from "@/components/admin-layout"
import { CourseForm } from "@/components/course-form"

export default function CreateCoursePage() {
  return (
    <AdminLayout>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Create Course</h1>
      </div>

      <CourseForm />
    </AdminLayout>
  )
}
