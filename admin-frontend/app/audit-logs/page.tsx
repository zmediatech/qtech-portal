"use client";

import { useEffect } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStoredUser } from "@/lib/session";
import { RoleGate } from "@/components/role-gate";
import { ScrollText } from "lucide-react";

export default function AuditLogsPage() {
  useEffect(() => {
    const user = getStoredUser();
    if (user?.role !== "superadmin") {
      window.location.href = "/dashboard";
    }
  }, []);

  return (
    <RoleGate allowedRoles={["superadmin"]} message="Audit logs are reserved for superadmin.">
      <AdminLayout>
        <div className="space-y-6">
        <div className="rounded-3xl border bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-800 p-5 text-white sm:p-6">
          <div className="flex items-center gap-3">
            <ScrollText className="h-6 w-6" />
            <div>
              <h1 className="text-2xl font-semibold">Audit Logs</h1>
              <p className="text-sm text-white/75">Track important user and system activity.</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>System Activity</CardTitle>
            <CardDescription>Placeholder view for future audit log integration.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant="secondary">Coming soon</Badge>
            <p className="text-sm text-muted-foreground">
              We can connect this to login events, role changes, LMS updates, fee edits, and other admin actions next.
            </p>
          </CardContent>
        </Card>
        </div>
      </AdminLayout>
    </RoleGate>
  );
}
