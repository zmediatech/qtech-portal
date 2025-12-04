// import { AdminLayout } from "@/components/admin-layout"
// import { StudentTable } from "@/components/student-table"

// interface CategoryPageProps {
//   params: {
//     filter: "active" | "inactive" | "paid" | "unpaid"
//   }
// }

// const filterConfig = {
//   active: {
//     title: "Active Students",
//     description: "Students currently enrolled and attending classes",
//   },
//   inactive: {
//     title: "Inactive Students",
//     description: "Students who are not currently attending classes",
//   },
//   paid: {
//     title: "Paid Students",
//     description: "Students who have paid their fees",
//   },
//   unpaid: {
//     title: "Unpaid Students",
//     description: "Students with pending fee payments",
//   },
// }

// export default function StudentCategoryPage({ params }: CategoryPageProps) {
//   const config = filterConfig[params.filter]

//   return (
//     <AdminLayout>
//       <div className="flex items-center">
//         <h1 className="text-lg font-semibold md:text-2xl">{config.title}</h1>
//       </div>

//       <StudentTable title={config.title} description={config.description} filter={params.filter} />
//     </AdminLayout>
//   )
// }
