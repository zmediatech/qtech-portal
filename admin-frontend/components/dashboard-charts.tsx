// components/dashboard-charts.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

/* ------------------ Dark mode detector ------------------ */
function useDarkMode() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== "undefined") {
      if (document.documentElement.classList.contains("dark")) return true;
    }
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange = () => {
      const htmlHasDark = document.documentElement.classList.contains("dark");
      setIsDark(htmlHasDark || !!media?.matches);
    };
    media?.addEventListener?.("change", onChange);
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      media?.removeEventListener?.("change", onChange);
      observer.disconnect();
    };
  }, []);

  return isDark;
}

/* ------------------ Colors ------------------ */
const LIGHT_COLORS = {
  GREEN: "#16a34a",
  GREEN_LIGHT: "#22c55e",
  GREEN_DARK: "#15803d",
};
const DARK_COLORS = {
  GREEN: "#34d399",
  GREEN_LIGHT: "#4ade80",
  GREEN_DARK: "#16a34a",
};

/* ------------------ Types ------------------ */
type IncomeExpensePoint = { month: string; income: number; expenses: number };
type StudentCat = { name: string; value: number; fill?: string };

/* ------------------ Income vs Expenses ------------------ */
export function IncomeExpenseChart() {
  const isDark = useDarkMode();
  const palette = isDark ? DARK_COLORS : LIGHT_COLORS;

  const [data, setData] = useState<IncomeExpensePoint[] | null>(null);
  const [loading, setLoading] = useState(true);

  const API_BASE = useMemo(
    () => (process.env.NEXT_PUBLIC_API_BASE_URL || "https://qtech-backend.vercel.app").replace(/\/$/, ""),
    []
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const headers: HeadersInit = token
          ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
          : { "Content-Type": "application/json" };

        const res = await fetch(`${API_BASE}/api/metrics/income-expense?months=6`, { headers });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Failed to load income/expense data");
        if (alive) setData(Array.isArray(json) ? json : []);
      } catch (e) {
        if (alive) setData([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [API_BASE]);

  const chartConfig = useMemo(
    () => ({
      income: { label: "Income", color: palette.GREEN },
      expenses: { label: "Expenses", color: palette.GREEN_LIGHT },
    }),
    [palette]
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Income vs Expenses</CardTitle>
        <CardDescription>Monthly financial overview</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] sm:h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `PKR ${(Number(value) / 1000).toLocaleString()}k`}
              />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-background border border-border/50 rounded-lg px-3 py-2 shadow-xl">
                      <div className="font-medium mb-2">{label}</div>
                      {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="capitalize">{entry.dataKey}:</span>
                          <span className="font-medium">PKR {Number(entry.value).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="income"
                stackId="1"
                stroke={palette.GREEN}
                fill={palette.GREEN}
                fillOpacity={0.6}
                isAnimationActive={loading}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stackId="2"
                stroke={palette.GREEN_LIGHT}
                fill={palette.GREEN_LIGHT}
                fillOpacity={0.6}
                isAnimationActive={loading}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
        {loading && <div className="mt-2 text-xs text-muted-foreground">Loading…</div>}
        {!loading && data?.length === 0 && (
          <div className="mt-2 text-xs text-muted-foreground">No data for selected period.</div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------ Student Categories (Pie) ------------------ */
export function StudentCategoriesChart() {
  const isDark = useDarkMode();
  const palette = isDark ? DARK_COLORS : LIGHT_COLORS;

  const [data, setData] = useState<StudentCat[] | null>(null);
  const [loading, setLoading] = useState(true);

  const API_BASE = useMemo(
    () => (process.env.NEXT_PUBLIC_API_BASE_URL || "https://qtech-backend.vercel.app").replace(/\/$/, ""),
    []
  );

  // Load counts from backend, then apply fills
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const headers: HeadersInit = token
          ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
          : { "Content-Type": "application/json" };

        const res = await fetch(`${API_BASE}/api/metrics/student-categories`, { headers });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Failed to load student categories");

        const arr: StudentCat[] = Array.isArray(json) ? json : [];
        if (alive) setData(arr);
      } catch (e) {
        if (alive) setData([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [API_BASE]);

  // Apply palette colors on render so dark-mode toggles update instantly
  const coloredData = useMemo(() => {
    const byName: Record<string, string> = {
      "Active Paid": palette.GREEN,
      "Active Unpaid": palette.GREEN_LIGHT,
      Inactive: palette.GREEN_DARK,
    };
    return (data || []).map((d) => ({ ...d, fill: byName[d.name] || palette.GREEN }));
  }, [data, palette]);

  const studentChartConfig = useMemo(
    () => ({
      "Active Paid": { label: "Active Paid", color: palette.GREEN },
      "Active Unpaid": { label: "Active Unpaid", color: palette.GREEN_LIGHT },
      Inactive: { label: "Inactive", color: palette.GREEN_DARK },
    }),
    [palette]
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Student Categories</CardTitle>
        <CardDescription>Distribution by status and payment</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={studentChartConfig} className="h-[250px] sm:h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <Pie
                data={coloredData || []}
                cx="50%"
                cy="50%"
                innerRadius="40%"
                outerRadius="70%"
                paddingAngle={5}
                dataKey="value"
                nameKey="name"
                isAnimationActive={loading}
              >
                {(coloredData || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill!} />
                ))}
              </Pie>
              <ChartTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item: any = payload[0]?.payload;
                  if (!item) return null;
                  return (
                    <div className="bg-background border border-border/50 rounded-lg px-3 py-2 shadow-xl">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Students: {item.value}</div>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>

        {loading && <div className="mt-2 text-xs text-muted-foreground">Loading…</div>}
        {!loading && (coloredData?.length ?? 0) === 0 && (
          <div className="mt-2 text-xs text-muted-foreground">No data available.</div>
        )}

        {(coloredData?.length ?? 0) > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:gap-4">
            {coloredData!.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.fill }} />
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {item.name}: {item.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
