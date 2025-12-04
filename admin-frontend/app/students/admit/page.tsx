import { AdminLayout } from "@/components/admin-layout"
import { StudentForm } from "@/components/student-form"

export default function AdmitStudentPage() {
  return (
    <AdminLayout>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Admit New Student</h1>
      </div>

      <StudentForm />
    </AdminLayout>
  )
}
