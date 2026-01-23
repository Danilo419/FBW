// src/components/analytics/MetricChart.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";

type Metric = "visitors" | "sales" | "profit" | "orders" | "conversion";
type Period = "today" | "7d" | "30d" | "90d" | "custom";

const METRICS: { key: Metric; label: string }[] = [
  { key: "visitors", label: "Visitors" },
  { key: "sales", label: "Sales (€)" },
  { key: "profit", label: "Profit (€)" }, // ✅ entre Sales e Orders
  { key: "orders", label: "Orders" },
  { key: "conversion", label: "Conversion rate" },
];

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "custom", label: "Custom" },
];

function formatEUR(v: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(v);
}

function formatInt(v: number) {
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(v);
}

function formatPercent(v: number) {
  return `${new Intl.NumberFormat("pt-PT", {
    maximumFractionDigits: 2,
  }).format(v)}%`;
}

function parseISOToTs(isoYYYYMMDD: string) {
  const ts = Date.parse(isoYYYYMMDD + "T00:00:00.000Z");
  return Number.isFinite(ts) ? ts : NaN;
}

function formatDateTick(ts: number) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  // Premium: "25 Dec" (limpo e consistente)
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function formatDateTooltip(ts: number) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  // Premium: "Thu, 23 Jan 2026"
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ===========================
   Nice ticks for Y axis
=========================== */
function niceNum(range: number, round: boolean) {
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / Math.pow(10, exponent);
  let niceFraction: number;

  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }

  return niceFraction * Math.pow(10, exponent);
}

function buildNiceTicks(min: number, max: number, maxTicks = 6) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (max === min) {
    const pad = max === 0 ? 10 : Math.abs(max) * 0.2;
    min -= pad;
    max += pad;
  }

  const range = niceNum(max - min, false);
  const step = niceNum(range / (maxTicks - 1), true);

  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  for (let v = niceMin, i = 0; v <= niceMax + step / 2 && i < 200; v += step, i++) {
    ticks.push(Number(v.toFixed(10)));
  }
  return ticks;
}

function eurTickLabel(v: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  const int = Math.round(n);
  const withSep = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(int);
  return `${withSep}€`;
}

/* ===========================
   Premium X ticks: 6 evenly spaced
=========================== */
function buildEvenTimeTicks(minTs: number, maxTs: number, count = 6) {
  if (!Number.isFinite(minTs) || !Number.isFinite(maxTs)) return [];
  if (count <= 1) return [minTs];
  if (maxTs <= minTs) return [minTs];

  const step = (maxTs - minTs) / (count - 1);
  const ticks: number[] = [];
  for (let i = 0; i < count; i++) ticks.push(minTs + step * i);
  return ticks;
}

/* ===========================
   Premium tooltip
=========================== */
function TooltipCard({
  active,
  payload,
  label,
  metric,
}: {
  active?: boolean;
  payload?: any[];
  label?: any;
  metric: Metric;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const ts = Number(label);
  const v = Number(payload?.[0]?.value);

  const valueText =
    metric === "sales" || metric === "profit"
      ? formatEUR(Number.isFinite(v) ? v : 0)
      : metric === "conversion"
        ? formatPercent(Number.isFinite(v) ? v : 0)
        : formatInt(Number.isFinite(v) ? v : 0);

  const title =
    metric === "sales"
      ? "Sales"
      : metric === "profit"
        ? "Profit"
        : metric === "orders"
          ? "Orders"
          : metric === "conversion"
            ? "Conversion"
            : "Visitors";

  return (
    <div className="rounded-xl border border-gray-200 bg-white/95 shadow-lg backdrop-blur px-3 py-2">
      <div className="text-[11px] text-gray-500">{formatDateTooltip(ts)}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-sm font-semibold text-gray-900">{valueText}</div>
        <div className="text-[11px] text-gray-500">{title}</div>
      </div>
    </div>
  );
}

export default function MetricChart({
  defaultMetric,
  defaultPeriod,
}: {
  defaultMetric: Metric;
  defaultPeriod: Period;
}) {
  const [metric, setMetric] = useState<Metric>(defaultMetric);
  const [period, setPeriod] = useState<Period>(defaultPeriod);

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<{
    labels: string[];
    series: Record<Metric, number[]>;
    totals: {
      sales: number;
      profit: number;
      orders: number;
      visitors: number;
    };
    range?: { from: string; to: string };
  } | null>(null);

  const qs = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("period", period);
    if (period === "custom") {
      if (from) sp.set("from", from);
      if (to) sp.set("to", to);
    }
    return sp.toString();
  }, [period, from, to]);

  useEffect(() => {
    let ignore = false;

    async function run() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/analytics?${qs}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load analytics");
        const json = await res.json();
        if (!ignore) setPayload(json);
      } catch {
        if (!ignore) setPayload(null);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    run();
    return () => {
      ignore = true;
    };
  }, [qs]);

  const labels = payload?.labels ?? [];
  const series = payload?.series ?? ({} as any);

  const chartData = useMemo(() => {
    const s = series?.[metric];
    const arr = Array.isArray(s) ? s : [];
    return labels
      .map((label, i) => ({
        label,
        ts: parseISOToTs(label),
        value: typeof arr[i] === "number" ? arr[i] : 0,
      }))
      .filter((p) => Number.isFinite(p.ts))
      .sort((a, b) => a.ts - b.ts);
  }, [labels, series, metric]);

  const xTicks = useMemo(() => {
    if (chartData.length === 0) return undefined as any;
    const minTs = chartData[0].ts;
    const maxTs = chartData[chartData.length - 1].ts;
    if (!Number.isFinite(minTs) || !Number.isFinite(maxTs)) return undefined as any;
    if (maxTs <= minTs) return [minTs];
    return buildEvenTimeTicks(minTs, maxTs, 6);
  }, [chartData]);

  const { yDomain, yTicks } = useMemo(() => {
    if (!(metric === "sales" || metric === "profit" || metric === "conversion")) {
      return { yDomain: undefined as any, yTicks: undefined as any };
    }
    if (chartData.length === 0) return { yDomain: undefined as any, yTicks: undefined as any };

    let min = Infinity;
    let max = -Infinity;
    for (const p of chartData) {
      const v = Number(p.value);
      if (!Number.isFinite(v)) continue;
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { yDomain: undefined as any, yTicks: undefined as any };
    }

    // Premium: money sempre com baseline 0 visível
    if (metric === "sales" || metric === "profit") {
      min = Math.min(0, min);
      max = Math.max(0, max);
      const ticks = buildNiceTicks(min, max, 6);
      const domain: [number, number] =
        ticks.length >= 2 ? [ticks[0], ticks[ticks.length - 1]] : [min, max];
      return { yDomain: domain, yTicks: ticks };
    }

    // Conversion %
    if (metric === "conversion") {
      min = Math.min(0, min);
      max = Math.max(0, max);
      const ticks = buildNiceTicks(min, max, 6);
      const domain: [number, number] =
        ticks.length >= 2 ? [ticks[0], ticks[ticks.length - 1]] : [min, max];
      return { yDomain: domain, yTicks: ticks };
    }

    return { yDomain: undefined as any, yTicks: undefined as any };
  }, [chartData, metric]);

  const totalValue = useMemo(() => {
    if (!payload) return 0;

    const totalVisitors = payload.totals?.visitors ?? 0;
    const totalOrders = payload.totals?.orders ?? 0;

    if (metric === "visitors") return totalVisitors;
    if (metric === "orders") return totalOrders;
    if (metric === "sales") return payload.totals?.sales ?? 0;
    if (metric === "profit") return payload.totals?.profit ?? 0;

    if (metric === "conversion") {
      if (totalVisitors <= 0) return 0;
      return (totalOrders / totalVisitors) * 100;
    }

    return 0;
  }, [payload, metric]);

  const totalText = useMemo(() => {
    if (metric === "sales" || metric === "profit") return formatEUR(totalValue);
    if (metric === "conversion") return formatPercent(totalValue);
    return formatInt(totalValue);
  }, [metric, totalValue]);

  const activeMetricLabel =
    METRICS.find((m) => m.key === metric)?.label ?? metric;

  const yTickFormatter = useMemo(() => {
    if (metric === "sales" || metric === "profit") return (v: number) => eurTickLabel(v);
    if (metric === "conversion") return (v: number) => `${Math.round(Number(v) || 0)}%`;
    return (v: number) => formatInt(Number(v) || 0);
  }, [metric]);

  return (
    <div className="rounded-2xl border bg-white p-4 md:p-6 shadow-sm">
      {/* Tabs + Periods */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="inline-flex flex-wrap gap-2 rounded-xl bg-gray-50 p-2">
          {METRICS.map((m) => {
            const active = m.key === metric;
            return (
              <Link
                key={m.key}
                href={`?metric=${m.key}&period=${period}`}
                onClick={(e) => {
                  e.preventDefault();
                  setMetric(m.key);
                }}
                className={[
                  "px-4 py-2 text-sm rounded-lg border transition",
                  active
                    ? "bg-white border-gray-300 shadow-sm font-semibold"
                    : "bg-transparent border-transparent text-gray-600 hover:text-gray-900",
                ].join(" ")}
              >
                {m.label}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 justify-start md:justify-end">
          {PERIODS.map((p) => {
            const active = p.key === period;
            return (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={[
                  "px-4 py-2 text-sm rounded-lg border transition",
                  active
                    ? "bg-black text-white border-black font-semibold"
                    : "bg-white text-gray-800 border-gray-300 hover:border-gray-400",
                ].join(" ")}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom */}
      {period === "custom" && (
        <div className="mt-3 flex flex-col md:flex-row gap-2 md:items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">From</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">To</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="text-xs text-gray-500">
            (Depois de mudar datas, o gráfico atualiza automaticamente.)
          </div>
        </div>
      )}

      {/* Total box (premium spacing) */}
      <div className="mt-4">
        <div className="w-full md:w-[360px] rounded-2xl border p-4 shadow-sm">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-2xl font-extrabold tracking-tight">
            {loading ? "…" : totalText}
          </div>
          <div className="mt-1 text-xs text-gray-500">{activeMetricLabel}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-3 h-[320px] md:h-[380px]">
        {loading ? (
          <div className="h-full rounded-2xl border flex items-center justify-center text-sm text-gray-500">
            Loading…
          </div>
        ) : !payload || chartData.length === 0 ? (
          <div className="h-full rounded-2xl border flex items-center justify-center text-sm text-gray-500">
            No data.
          </div>
        ) : (
          <div className="h-full rounded-2xl border p-2 md:p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 16, right: 20, left: 22, bottom: 22 }}
              >
                {/* premium: line gradient */}
                <defs>
                  <linearGradient id="fwLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.95} />
                  </linearGradient>
                </defs>

                {/* premium grid */}
                <CartesianGrid strokeDasharray="4 8" stroke="#e5e7eb" />

                {/* premium x axis: 6 evenly spaced ticks, equal distances */}
                <XAxis
                  dataKey="ts"
                  type="number"
                  scale="time"
                  domain={["dataMin", "dataMax"]}
                  ticks={xTicks as any}
                  tickFormatter={(ts: any) => formatDateTick(Number(ts))}
                  height={34}
                  tickMargin={12}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                />

                {/* premium y axis */}
                <YAxis
                  tickFormatter={yTickFormatter as any}
                  domain={yDomain as any}
                  ticks={yTicks as any}
                  width={72}
                  tickMargin={12}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                />

                {/* premium: baseline 0 para Profit/Sales */}
                {(metric === "profit" || metric === "sales") && (
                  <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1} />
                )}

                {/* premium tooltip */}
                <Tooltip
                  cursor={{ stroke: "#cbd5e1", strokeDasharray: "6 6" }}
                  content={(props: any) => <TooltipCard {...props} metric={metric} />}
                  labelFormatter={(label: any) => formatDateTooltip(Number(label))}
                />

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="url(#fwLine)"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5 }}
                  isAnimationActive
                  animationDuration={450}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
