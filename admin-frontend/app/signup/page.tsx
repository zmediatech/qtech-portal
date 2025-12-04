// app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type LoginResp = {
  message: string;
  success: boolean;
  token: string;
  user: { email: string; name: string; id: string };
};

export default function LoginPage() {
  const router = useRouter();

  // API base is editable at runtime and persisted in localStorage
  const [apiBase, setApiBase] = useState<string>("");
  useEffect(() => {
    const fromStorage = localStorage.getItem("apiBase");
    setApiBase(
      (fromStorage && fromStorage.replace(/\/$/, "")) ||
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "")
    );
  }, []);
  const loginUrl = useMemo(() => (apiBase ? `${apiBase}/api/auth/login` : ""), [apiBase]);

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showApiSettings, setShowApiSettings] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const saveApiBase = () => {
    const cleaned = (apiBase || "").trim().replace(/\/$/, "");
    localStorage.setItem("apiBase", cleaned);
    setApiBase(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!loginUrl) {
      setErr("API base is not set. Set it in the API Settings panel.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const contentType = res.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const data: any = isJson ? await res.json() : await res.text();

      if (!res.ok) {
        const msg =
          (isJson && (data?.error || data?.message)) ||
          (typeof data === "string" ? data : "Login failed");
        throw new Error(msg);
      }

      const payload = data as LoginResp;
      // persist session
      localStorage.setItem("token", payload.token);
      localStorage.setItem("user", JSON.stringify(payload.user));

      router.push("/dashboard");
    } catch (error: any) {
      setErr(error?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 border rounded-2xl p-6 shadow">
        <h1 className="text-2xl font-semibold">Log in</h1>

        {/* Debug/visibility for API target */}
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="truncate">
            API:&nbsp;
            {loginUrl ? (
              <span title={loginUrl} className="text-gray-800">
                {loginUrl}
              </span>
            ) : (
              <span className="text-red-600">NOT SET</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowApiSettings((s) => !s)}
            className="underline"
          >
            {showApiSettings ? "Hide" : "API Settings"}
          </button>
        </div>

        {showApiSettings && (
          <div className="grid gap-2 border rounded-lg p-3 bg-gray-50">
            <label className="text-xs font-medium">API Base (no trailing slash)</label>
            <input
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              placeholder="http://localhost:5000"
              className="border rounded px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={saveApiBase}
              className="self-start bg-black text-white rounded px-3 py-2 text-sm"
            >
              Save API Base
            </button>
          </div>
        )}

        {err && <p className="text-sm text-red-600">{err}</p>}

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1">
            <label className="text-sm">Email</label>
            <input
              name="email"
              type="email"
              placeholder="john@example.com"
              value={form.email}
              onChange={handleChange}
              className="border rounded px-3 py-2"
              required
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm">Password</label>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              className="border rounded px-3 py-2"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-md bg-black text-white px-4 py-2 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
      </div>
    </main>
  );
}
