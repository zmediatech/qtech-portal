import { AdminLayout } from "@/components/admin-layout"
import { StudentTable } from "@/components/student-table"

export default function GraduatedStudentsPage() {
  return (
    <AdminLayout>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Graduated Students</h1>
      </div>

      <StudentTable
        title="Graduated Students"
        description="Students who have completed their education"
        filter="graduated"
      />
    </AdminLayout>
  )
}
