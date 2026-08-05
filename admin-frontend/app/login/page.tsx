"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { getApiBase } from "@/lib/session";

type LoginSuccess = {
  message?: string;
  success?: boolean;
  token: string;
  user: { email: string; name: string; id: string };
};

type LoginError = {
  message?: string;
  error?: string;
  success?: false;
};

type LoginResp = LoginSuccess | LoginError;

function isLoginError(value: LoginResp): value is LoginError {
  return "error" in value || "message" in value;
}

export default function LoginPage() {
  const router = useRouter();

  const API_BASE = getApiBase();

  const DASHBOARD_PATH =
    (process.env.NEXT_PUBLIC_DASHBOARD_PATH || "/dashboard").trim() ||
    "/dashboard";

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const navigateToDashboard = () => {
    router.replace(DASHBOARD_PATH);

    setTimeout(() => {
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== DASHBOARD_PATH
      ) {
        window.location.replace(DASHBOARD_PATH);
      }
    }, 50);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const data: LoginResp | string = isJson
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        let message = "Login failed";

        if (typeof data === "string") {
          message = data || message;
        } else if (isLoginError(data)) {
          message = data.error || data.message || message;
        }

        throw new Error(message);
      }

      const payload = data as LoginSuccess;

      if (!payload.token || !payload.user) {
        throw new Error("Login response is missing token or user details");
      }

      localStorage.setItem("token", payload.token);
      localStorage.setItem("user", JSON.stringify(payload.user));
      navigateToDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#e9eff3] p-3 text-slate-900 sm:p-4 lg:p-6">
      <section className="relative mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[1520px] overflow-hidden rounded-[24px] bg-white sm:min-h-[calc(100vh-2rem)] lg:rounded-[38px]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-[44%] bg-[linear-gradient(160deg,#07563f_0%,#0a7c5f_48%,#0d926f_100%)]" />
          <div className="absolute left-[33%] top-[-12%] h-[124%] w-[40%] rounded-full bg-white" />
          <div className="absolute right-0 top-0 h-[24%] w-[14%] rounded-bl-[100%] bg-[linear-gradient(180deg,#17ad84_0%,#12926f_100%)]" />
          <div className="absolute left-0 top-[20%] grid grid-cols-4 gap-3 opacity-30">
            {Array.from({ length: 16 }).map((_, index) => (
              <span key={index} className="h-2 w-2 rounded-full bg-emerald-100/70" />
            ))}
          </div>
          <div className="absolute bottom-[-12%] left-[-8%] h-[44%] w-[44%] rounded-full bg-[radial-gradient(circle_at_35%_35%,rgba(255,255,255,0.12),rgba(255,255,255,0.04)_58%,rgba(255,255,255,0)_74%)]" />
        </div>

        <div className="relative z-10 grid min-h-0 flex-1 lg:grid-cols-[44.5%_55.5%]">
          <aside className="relative hidden min-h-0 flex-col justify-between overflow-hidden px-4 py-6 text-white lg:flex lg:px-12 lg:py-10">
            <div className="flex flex-col items-center gap-2 text-center lg:items-start lg:text-left">
              <div className="flex h-[3rem] w-[3rem] items-center justify-center lg:h-[4.1rem] lg:w-[4.1rem]">
                <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-[0_10px_20px_rgba(0,0,0,0.14)]" aria-label="Q Tech logo">
                  <polygon points="50,10 83,30 83,70 50,90 17,70 17,30" fill="rgba(255,255,255,0.98)" />
                  <polygon points="50,25 69,36 69,64 50,75 31,64 31,36" fill="#0a6d53" />
                  <path d="M61 62 L82 82" stroke="rgba(255,255,255,0.98)" strokeWidth="10" strokeLinecap="round" />
                </svg>
              </div>

              <div className="space-y-1">
                <div className="text-[1.05rem] font-extrabold tracking-tight text-white sm:text-[1.25rem] lg:text-[1.75rem]">
                  Q TECH
                </div>
                <div className="text-[0.5rem] font-medium tracking-[0.5em] text-white/85 sm:text-[0.56rem] lg:text-[0.64rem]">
                  PORTAL
                </div>
              </div>
            </div>

            <div className="relative z-10 max-w-xl pb-2 pl-0 lg:pb-6 lg:pl-2">
              <h1 className="text-[1.2rem] font-extrabold tracking-tight text-white sm:text-[1.45rem] lg:text-[2rem]">
                Welcome Back!
              </h1>
              <p className="mt-3 max-w-md text-[0.68rem] leading-5 text-white/90 sm:text-[0.75rem] lg:text-[0.86rem]">
                Please log in to access your account and continue.
              </p>
            </div>
          </aside>

          <section className="relative flex min-h-0 items-center justify-center px-4 py-6 sm:px-6 sm:py-7 lg:px-16 lg:py-8">
            <div className="relative z-10 w-full max-w-[460px]">
              <div className="mb-5 text-center lg:mb-8">
                <div className="mb-4 flex justify-center lg:hidden">
                  <div className="flex h-11 w-11 items-center justify-center">
                    <svg viewBox="0 0 100 100" className="h-full w-full" aria-label="Q Tech logo">
                      <polygon points="50,10 83,30 83,70 50,90 17,70 17,30" fill="#0a7c5f" />
                      <polygon points="50,25 69,36 69,64 50,75 31,64 31,36" fill="white" />
                      <path d="M61 62 L82 82" stroke="#0a7c5f" strokeWidth="10" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-[1.45rem] font-extrabold tracking-tight text-[#0a2d2a] sm:text-[1.7rem] lg:text-[2rem]">
                  Log in
                </h2>
                <p className="mt-2 text-[0.72rem] text-slate-500 sm:text-[0.8rem] lg:text-[0.9rem]">
                  Enter your credentials to continue
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-[0.74rem] font-semibold text-slate-900 sm:text-[0.82rem] lg:text-[0.9rem]">
                    Email
                  </label>
                  <div className="flex h-[42px] items-center gap-2.5 rounded-[14px] border border-emerald-100 bg-[#edf6f2] px-3.5 transition focus-within:border-emerald-300 sm:h-[46px] sm:rounded-[15px] sm:px-4">
                    <Mail className="h-4 w-4 shrink-0 text-slate-700" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={onChange}
                      placeholder="Enter your email"
                      autoComplete="email"
                      required
                      className="h-full w-full bg-transparent text-[0.76rem] text-slate-800 outline-none placeholder:text-slate-400 sm:text-[0.84rem] lg:text-[0.9rem]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="block text-[0.74rem] font-semibold text-slate-900 sm:text-[0.82rem] lg:text-[0.9rem]">
                    Password
                  </label>
                  <div className="flex h-[42px] items-center gap-2.5 rounded-[14px] border border-emerald-100 bg-[#edf6f2] px-3.5 transition focus-within:border-emerald-300 sm:h-[46px] sm:rounded-[15px] sm:px-4">
                    <Lock className="h-4 w-4 shrink-0 text-slate-700" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={onChange}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      minLength={6}
                      className="h-full w-full bg-transparent text-[0.76rem] text-slate-800 outline-none placeholder:text-slate-400 sm:text-[0.84rem] lg:text-[0.9rem]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-700 transition hover:bg-white/70"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-[14px] border border-red-200 bg-red-50 px-3.5 py-2 text-[0.72rem] text-red-700 sm:text-[0.8rem] lg:text-[0.85rem]">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 flex h-[44px] w-full items-center justify-center rounded-[14px] bg-[linear-gradient(90deg,#17a57b_0%,#16916e_45%,#0d7b5f_100%)] text-[0.78rem] font-semibold text-white shadow-[0_14px_28px_rgba(15,127,97,0.18)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70 sm:h-[48px] sm:text-[0.86rem] lg:h-[50px] lg:text-[0.92rem]"
                >
                  {loading ? "Logging in..." : "Log in"}
                </button>
              </form>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
