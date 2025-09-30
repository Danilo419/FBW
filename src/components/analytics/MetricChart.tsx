// src/components/analytics/MetricChart.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Metric = "visitors" | "sales" | "orders" | "conversion";
type Period = "today" | "7d" | "30d" | "90d" | "custom";

type Point = { date: string; value: number };
type Summary = { total?: number; average?: number };
type SeriesResponse = {
  series: Point[];
  total?: number;
  average?: number;
  granularity?: "day" | "hour";
};

export default function MetricChart({
  defaultMetric = "visitors",
  defaultPeriod = "30d",
}: {
  defaultMetric?: Metric;
  defaultPeriod?: Period;
}) {
  const [metric, setMetric] = useState<Metric>(defaultMetric);
  const [period, setPeriod] = useState<Period>(defaultPeriod);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [data, setData] = useState<Point[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary>({});
  const [granularity, setGranularity] = useState<"day" | "hour">("day");

  useEffect(() => {
    const controller = new AbortController();
    const q = new URLSearchParams({ metric, period });
    if (period === "custom" && from && to) {
      q.set("from", from);
      q.set("to", to);
    }
    setLoading(true);
    fetch(`/api/analytics/series?${q.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((json: SeriesResponse) => {
        let series = json.series || [];
        let total = json.total ?? undefined;
        let average = json.average ?? undefined;

        // ✅ Corrige valores de "sales" (centavos -> euros)
        if (metric === "sales") {
          series = series.map((p) => ({ ...p, value: p.value / 100 }));
          if (typeof total === "number") total = total / 100;
          if (typeof average === "number") average = average / 100;
        }

        setData(series);
        setSummary({ total, average });
        setGranularity(json.granularity || "day");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [metric, period, from, to]);

  /* -------------------- formatters -------------------- */
  const unit = useMemo<"" | "€" | "%">(() => {
    if (metric === "sales") return "€";
    if (metric === "conversion") return "%";
    return "";
  }, [metric]);

  const fmtXAxis = (d: string) => {
    if (granularity === "hour") return (d.split("T")[1]?.slice(0, 5) ?? "00:00");
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  };

  const fmtYAxis = (v: number) => {
    if (unit === "€")
      return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(v);
    if (unit === "%") return `${Math.round(v)}%`;
    return `${Math.round(v)}`;
  };

  const fmtTooltipVal = (v: number): string => {
    if (unit === "€")
      return new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" }).format(v);
    if (unit === "%") return `${v.toFixed(2)}%`;
    return v.toLocaleString("en-GB");
  };

  const fmtTooltipLabel = (d: string) => {
    if (granularity === "hour") {
      const hh = d.split("T")[1]?.slice(0, 5) ?? "00:00";
      return `Today, ${hh}`;
    }
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  };

  /* -------------------- X axis ticks (anti-overlap) -------------------- */
  // No máximo ~12 rótulos para períodos longos.
  const xTicks = useMemo(() => {
    const len = data.length;
    if (granularity === "hour") return data.map((p) => p.date);
    if (len <= 14) return data.map((p) => p.date);

    const desired = 12;
    const step = Math.max(1, Math.ceil(len / desired));
    const ticks: string[] = [];
    for (let i = 0; i < len; i += step) ticks.push(data[i].date);
    const last = data[len - 1]?.date;
    if (last && ticks[ticks.length - 1] !== last) ticks.push(last);
    return ticks;
  }, [data, granularity]);

  const xTickStyle = useMemo(
    () => ({
      fontSize: granularity === "hour" || data.length <= 20 ? 12 : 10,
      fill: "#475569",
    }),
    [granularity, data.length]
  );
  const yTickStyle = useMemo(() => ({ fontSize: 11, fill: "#475569" }), []);

  // ⚙️ Rótulos SEM rotação (sempre retos)
  const xAngle = 0 as const;

  const avgLabel =
    metric === "conversion"
      ? granularity === "hour"
        ? "Hourly average"
        : "Daily average"
      : granularity === "hour"
      ? "Day total"
      : "Total";

  return (
    <div className="rounded-2xl bg-white p-4 md:p-5 shadow border">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {(["visitors", "sales", "orders", "conversion"] as Metric[]).map((m) => (
            <button
              key={m}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                metric === m ? "bg-white shadow border" : "text-slate-600"
              }`}
              onClick={() => setMetric(m)}
            >
              {m === "visitors" && "Visitors"}
              {m === "sales" && "Sales (€)"}
              {m === "orders" && "Orders"}
              {m === "conversion" && "Conversion rate"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {(["today", "7d", "30d", "90d"] as Period[]).map((p) => (
            <button
              key={p}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                period === p ? "bg-black text-white" : "bg-white hover:bg-slate-50"
              }`}
              onClick={() => setPeriod(p)}
            >
              {p === "today" ? "Today" : p}
            </button>
          ))}
          <button
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              period === "custom" ? "bg-black text-white" : "bg-white hover:bg-slate-50"
            }`}
            onClick={() => setPeriod("custom")}
          >
            Custom
          </button>
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="border rounded-lg px-2 py-1 text-sm"
              />
              <span className="text-slate-400">→</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="border rounded-lg px-2 py-1 text-sm"
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="rounded-xl bg-slate-50 border p-3">
          <div className="text-xs text-slate-500">{avgLabel}</div>
          <div className="text-xl font-bold">
            {metric === "conversion"
              ? `${(summary.average || 0).toFixed(2)}%`
              : unit === "€"
              ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" }).format(
                  summary.total || 0
                )
              : (summary.total || 0).toLocaleString("en-GB")}
          </div>
        </div>
      </div>

      <div className="mt-4 h-64 md:h-80 relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 8, right: 36, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="4 4" />
            <XAxis
              dataKey="date"
              ticks={xTicks}
              // não forçar todos os rótulos; o 'ticks' já limita
              // interval={0}
              tick={xTickStyle}
              minTickGap={22}
              tickMargin={10}
              padding={{ left: 0, right: 30 }}
              tickFormatter={fmtXAxis}
              angle={xAngle}
              textAnchor="middle"
              tickLine={false}
            />
            <YAxis tick={yTickStyle} tickFormatter={fmtYAxis} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(v: number) =>
                metric === "conversion" ? `${(v as number).toFixed(2)}%` : fmtTooltipVal(v as number)
              }
              labelFormatter={(d: string) => fmtTooltipLabel(d)}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              dot={false}
              strokeWidth={3}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse text-slate-400 text-sm">loading…</div>
          </div>
        )}
      </div>
    </div>
  );
}
