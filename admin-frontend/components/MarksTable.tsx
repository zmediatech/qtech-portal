"use client";

import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Edit } from "lucide-react";

export function MarksTable({
  data,
  loading,
}: {
  data: any[];
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Marks</CardTitle>
        <CardDescription>
          Student exam results
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reg No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Exam</TableHead>
                <TableHead>Marks</TableHead>
                <TableHead>%</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead className="w-[70px]" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading marks…
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No marks found
                  </TableCell>
                </TableRow>
              ) : (
                data.map((m) => (
                  <TableRow key={m._id}>
                    <TableCell>{m.student?.regNo}</TableCell>
                    <TableCell>{m.student?.name}</TableCell>
                    <TableCell>{m.subject?.name}</TableCell>
                    <TableCell>{m.exam?.title || "—"}</TableCell>
                    <TableCell>
                      {m.obtainedMarks}/{m.totalMarks}
                    </TableCell>
                    <TableCell>{m.percentage}%</TableCell>
                    <TableCell>
                      <Badge>{m.grade}</Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/marks/${m._id}/edit`}>
                        <Button size="icon" variant="ghost">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
