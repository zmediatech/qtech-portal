// app/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type LoginSuccess = {
  message?: string;
  success?: boolean;
  token: string;
  user: { email: string; name: string; id: string };
};
type LoginError = { message?: string; error?: string; success?: false };
type LoginResp = LoginSuccess | LoginError;

export default function LoginPage() {
  const router = useRouter();

  // 1) Mount gate (do NOT return before other hooks)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 2) Plain constants (no hooks)
  const API_BASE = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://qtech-backend.vercel.app"
  ).replace(/\/$/, "");

  const DASHBOARD_PATH =
    (process.env.NEXT_PUBLIC_DASHBOARD_PATH || "/dashboard").trim() || "/dashboard";

  // 3) Other hooks (always called every render, before any return)
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const hardNavigate = (path: string) => {
    try {
      router.replace(path);
    } catch {}
    setTimeout(() => {
      if (typeof window !== "undefined" && window.location.pathname !== path) {
        window.location.replace(path);
      }
    }, 40);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const url = `${API_BASE}/api/auth/login`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const ct = res.headers.get("content-type") || "";
      const isJson = ct.includes("application/json");
      const data: LoginResp | string = isJson ? await res.json() : await res.text();

      if (!res.ok) {
        let msg = "Login failed";
        if (isJson && typeof data === "object" && data !== null) {
          const obj = data as Record<string, unknown>;
          msg =
            (typeof obj.error === "string" && obj.error) ||
            (typeof obj.message === "string" && obj.message) ||
            msg;
        } else if (typeof data === "string") {
          msg = data;
        }
        throw new Error(msg);
      }

      const payload = data as LoginSuccess;
      if (!payload.token || !payload.user) {
        throw new Error("Login response missing token or user");
      }

      localStorage.setItem("token", payload.token);
      localStorage.setItem("user", JSON.stringify(payload.user));
      hardNavigate(DASHBOARD_PATH);
    } catch (error: any) {
      setErr(error?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // 4) Single return; conditionally render content (no early return)
  return (
    // ⬇️ Only change: force light background/text so dark mode doesn't affect login
    <main className="min-h-screen flex items-center justify-center p-6 bg-white text-gray-900">
      {mounted ? (
        <div className="w-full max-w-md space-y-6 border rounded-2xl p-6 shadow bg-white">
          <h1 className="text-2xl font-semibold text-center">Log in</h1>

          {err && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
              {err}
            </div>
          )}

          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-1">
              <label className="text-sm font-medium">Email</label>
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={onChange}
                className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium">Password</label>
              <input
                name="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={onChange}
                className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-md bg-black text-white px-4 py-2 disabled:opacity-50 hover:bg-gray-800 transition-colors"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>
        </div>
      ) : (
        // simple placeholder to keep SSR/CSR markup stable
        <div style={{ width: 1, height: 1 }} />
      )}
    </main>
  );
}
