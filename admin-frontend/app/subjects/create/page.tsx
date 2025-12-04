import { AdminLayout } from "@/components/admin-layout"
import { SubjectForm } from "@/components/subject-form"

export default function CreateSubjectPage() {
  return (
    <AdminLayout>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Create Subject</h1>
      </div>

      <SubjectForm />
    </AdminLayout>
  )
}
