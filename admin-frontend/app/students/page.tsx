import Link from "next/link"
import { AdminLayout } from "@/components/admin-layout"
import { Button } from "@/components/ui/button"
import { StudentTable } from "@/components/student-table"
import { Plus } from "lucide-react"

export default function StudentsPage() {
  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Students</h1>
        <Link href="/students/admit">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Admit Student
          </Button>
        </Link>
      </div>

      <StudentTable />
    </AdminLayout>
  )
}
