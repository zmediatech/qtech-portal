"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function MarksTable({
  data,
  loading,
}: {
  data: any[];
  loading: boolean;
}) {
  if (loading) return <div>Loading…</div>;
  if (!data.length) return <div>No records found.</div>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Reg No</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Class</TableHead>
          <TableHead>Subject</TableHead>
          <TableHead>Exam</TableHead>
          <TableHead>Marks</TableHead>
          <TableHead>%</TableHead>
          <TableHead>Grade</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((m) => (
          <TableRow key={m._id}>
            <TableCell>{m.student?.regNo}</TableCell>
            <TableCell>{m.student?.name}</TableCell>
            <TableCell>{m.class?.name}</TableCell>
            <TableCell>{m.subject?.name}</TableCell>
            <TableCell>{m.exam?.title || "—"}</TableCell>
            <TableCell>
              {m.obtainedMarks}/{m.totalMarks}
            </TableCell>
            <TableCell>{m.percentage}%</TableCell>
            <TableCell className="font-semibold">{m.grade}</TableCell>
            <TableCell>
              <Link href={`/marks/${m._id}/edit`}>
                <Button size="sm" variant="outline">
                  Edit
                </Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
