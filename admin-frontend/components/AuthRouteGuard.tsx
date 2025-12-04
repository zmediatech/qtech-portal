"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState<boolean | null>(null);
  const redirecting = useRef(false);
  const LOGIN_PATH = (process.env.NEXT_PUBLIC_LOGIN_PATH || "/").trim() || "/";

  useEffect(() => {
    if (redirecting.current) return;

    try {
      const token = localStorage.getItem("token");
      const user = localStorage.getItem("user");

      if (!token || !user) {
        redirecting.current = true;
        router.replace(LOGIN_PATH);
        setTimeout(() => {
          if (typeof window !== "undefined" && window.location.pathname !== LOGIN_PATH) {
            window.location.replace(LOGIN_PATH);
          }
        }, 30);
        setOk(false);
        return;
      }

      try {
        JSON.parse(user);
        setOk(true);
      } catch {
        localStorage.clear();
        redirecting.current = true;
        router.replace(LOGIN_PATH);
        setTimeout(() => {
          if (typeof window !== "undefined" && window.location.pathname !== LOGIN_PATH) {
            window.location.replace(LOGIN_PATH);
          }
        }, 30);
        setOk(false);
      }
    } catch {
      redirecting.current = true;
      router.replace(LOGIN_PATH);
      setTimeout(() => {
        if (typeof window !== "undefined" && window.location.pathname !== LOGIN_PATH) {
          window.location.replace(LOGIN_PATH);
        }
      }, 30);
      setOk(false);
    }
  }, [router, LOGIN_PATH]);

  if (ok === null) return null; // optional spinner place
  if (!ok) return null;
  return <>{children}</>;
}
