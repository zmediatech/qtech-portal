"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

/** Blocks all routes except the login route. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const redirecting = useRef(false);

  const LOGIN_PATH = useMemo(
    () => (process.env.NEXT_PUBLIC_LOGIN_PATH || "/login").trim() || "/login",
    []
  );

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (redirecting.current) return;

    // Allow the login page itself
    if (pathname === LOGIN_PATH) {
      setReady(true);
      return;
    }

    // Skip Next.js internals
    if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
      setReady(true);
      return;
    }

    const goLogin = () => {
      redirecting.current = true;
      // SPA replace first
      router.replace(LOGIN_PATH);
      // Hard fallback in dev/HMR
      setTimeout(() => {
        if (typeof window !== "undefined" && window.location.pathname !== LOGIN_PATH) {
          window.location.replace(LOGIN_PATH);
        }
      }, 30);
    };

    try {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");
      if (!token || !userStr) {
        goLogin();
        return;
      }
      try {
        JSON.parse(userStr);
        setReady(true);
      } catch {
        localStorage.clear();
        sessionStorage.clear();
        goLogin();
      }
    } catch {
      goLogin();
    }
  }, [pathname, router, LOGIN_PATH]);

  if (!ready && pathname !== LOGIN_PATH) return null;
  return <>{children}</>;
}
