"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRoleHomePath, getStoredUser, normalizeRole, type SessionRole } from "@/lib/session";

type RoleGateProps = {
  allowedRoles: SessionRole[];
  children: ReactNode;
  redirectTo?: string;
  message?: string;
};

export function RoleGate({
  allowedRoles,
  children,
  redirectTo,
  message = "Checking access...",
}: RoleGateProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    const role = normalizeRole(user.role);
    if (!allowedRoles.includes(role)) {
      router.replace(redirectTo || getRoleHomePath(role));
      return;
    }

    setReady(true);
  }, [allowedRoles, redirectTo, router]);

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2">
              <Badge variant="secondary" className="rounded-full">Access Control</Badge>
            </div>
            <CardTitle className="text-xl">Q Tech Portal</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            Please wait while we verify your role.
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
