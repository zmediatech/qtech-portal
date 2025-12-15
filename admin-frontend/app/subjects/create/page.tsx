import { AdminLayout } from "@/components/admin-layout"
import { SubjectForm } from "@/components/subject-form"

export default function CreateSubjectPage() {
  return (
    <AdminLayout>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Create Subject</h1>
      </div>

      <SubjectForm onSubmit={function (data: { _id?: string; name: string; code: string; linkedClasses: string[] }): Promise<void> {
        throw new Error("Function not implemented.")
      } } />
    </AdminLayout>
  )
}
