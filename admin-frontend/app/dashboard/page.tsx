"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRoleHomePath, getStoredUser, normalizeRole } from "@/lib/session";

export default function DashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    router.replace(getRoleHomePath(normalizeRole(user.role)));
  }, [router]);

  return null;
}
