import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Copy, RotateCcw, Trash2, Download } from "lucide-react"

const mockPins = [
  { code: "PIN001", label: "Student Registration", status: "Active", createdAt: "2024-01-15", usedBy: null },
  { code: "PIN002", label: "Fee Payment", status: "Used", createdAt: "2024-01-14", usedBy: "John Doe" },
  { code: "PIN003", label: "Course Enrollment", status: "Active", createdAt: "2024-01-13", usedBy: null },
  { code: "PIN004", label: "Exam Registration", status: "Revoked", createdAt: "2024-01-12", usedBy: null },
  { code: "PIN005", label: "Certificate Request", status: "Used", createdAt: "2024-01-11", usedBy: "Sarah Wilson" },
]

export default function PinsPage() {
  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">PIN Management</h1>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Generate PINs
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby="pin-dialog-description">
              <DialogHeader>
                <DialogTitle>Generate New PINs</DialogTitle>
                <DialogDescription id="pin-dialog-description">
                  Create new PINs for various institute operations
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="pin-count">Number of PINs</Label>
                  <Input id="pin-count" type="number" placeholder="1" min="1" max="100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pin-label">Label/Purpose</Label>
                  <Input id="pin-label" placeholder="e.g., Student Registration" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pin-type">PIN Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select PIN type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="registration">Student Registration</SelectItem>
                      <SelectItem value="payment">Fee Payment</SelectItem>
                      <SelectItem value="enrollment">Course Enrollment</SelectItem>
                      <SelectItem value="exam">Exam Registration</SelectItem>
                      <SelectItem value="certificate">Certificate Request</SelectItem>
                      <SelectItem value="general">General Purpose</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Generate PINs</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total PINs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">All time generated</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active PINs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">89</div>
            <p className="text-xs text-muted-foreground">Ready to use</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Used PINs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">52</div>
            <p className="text-xs text-muted-foreground">Successfully used</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revoked PINs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">15</div>
            <p className="text-xs text-muted-foreground">Deactivated</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter PINs</CardTitle>
          <CardDescription>Search and filter PIN records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input id="search" placeholder="Search by code or label..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="used">Used</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-from">Date From</Label>
              <Input id="date-from" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to">Date To</Label>
              <Input id="date-to" type="date" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PIN Records</CardTitle>
          <CardDescription>Manage and track all generated PINs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Used By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockPins.map((pin, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono font-medium">{pin.code}</TableCell>
                    <TableCell>{pin.label}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          pin.status === "Active" ? "default" : pin.status === "Used" ? "secondary" : "destructive"
                        }
                      >
                        {pin.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{pin.createdAt}</TableCell>
                    <TableCell>{pin.usedBy || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-transparent">
                          <Copy className="h-3 w-3" />
                        </Button>
                        {pin.status === "Active" && (
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-transparent">
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-destructive bg-transparent">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  )
}
