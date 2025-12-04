import { AdminLayout } from "@/components/admin-layout"
import { ExpenseForm } from "@/components/expense-form"

export default function CreateExpensePage() {
  return (
    <AdminLayout>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Record New Expense</h1>
      </div>

      <ExpenseForm />
    </AdminLayout>
  )
}
