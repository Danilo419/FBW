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

function prettyDateLabel(isoYYYYMMDD: string) {
  const d = new Date(isoYYYYMMDD + "T00:00:00.000Z");
  if (Number.isNaN(d.getTime())) return isoYYYYMMDD;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

/* ======================================================================================
   Nice ticks for € axis (0€, 50€, 100€ ...)
   Uses "nice number" algorithm (1/2/5 * 10^n).
====================================================================================== */
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
    // cria um range à volta do valor
    const pad = max === 0 ? 10 : Math.abs(max) * 0.2;
    min = min - pad;
    max = max + pad;
  }

  const range = niceNum(max - min, false);
  const step = niceNum(range / (maxTicks - 1), true);

  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  // evita loops infinitos
  const limit = 200;
  let i = 0;

  for (let v = niceMin; v <= niceMax + step / 2; v += step) {
    ticks.push(Number(v.toFixed(10)));
    i++;
    if (i > limit) break;
  }

  return ticks;
}

function eurTickLabel(v: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  // estilo compacto no eixo: "50€"
  // arredonda para inteiro para ficar limpo
  return `${Math.round(n)}€`;
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

  // custom range (YYYY-MM-DD)
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
        const res = await fetch(`/api/admin/analytics?${qs}`, {
          cache: "no-store",
        });
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
    return labels.map((label, i) => ({
      label,
      value: typeof arr[i] === "number" ? arr[i] : 0,
    }));
  }, [labels, series, metric]);

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
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { yDomain: undefined as any, yTicks: undefined as any };
    }

    // Para money, forçar min a 0 (fica mais parecido com o teu gráfico antigo)
    if (metric === "sales" || metric === "profit") {
      min = Math.min(0, min);
      max = Math.max(0, max);
      const ticks = buildNiceTicks(min, max, 6);
      const domain: [number, number] =
        ticks.length >= 2 ? [ticks[0], ticks[ticks.length - 1]] : [min, max];
      return { yDomain: domain, yTicks: ticks };
    }

    // Conversion (%): também ticks “bonitos”
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

  // Total box
  const totalValue = useMemo(() => {
    if (!payload) return 0;

    const totalVisitors = payload.totals?.visitors ?? 0;
    const totalOrders = payload.totals?.orders ?? 0;

    if (metric === "visitors") return totalVisitors;
    if (metric === "orders") return totalOrders;
    if (metric === "sales") return payload.totals?.sales ?? 0;
    if (metric === "profit") return payload.totals?.profit ?? 0;

    // conversion rate overall
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

  const tooltipValueFormatter = useMemo(() => {
    return (val: any) => {
      const n = typeof val === "number" ? val : Number(val);
      if (!Number.isFinite(n)) return ["", "Value"] as any;

      if (metric === "sales" || metric === "profit") return [formatEUR(n), "Value"] as any;
      if (metric === "conversion") return [formatPercent(n), "Value"] as any;

      return [formatInt(n), "Value"] as any;
    };
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

      {/* Total box */}
      <div className="mt-4">
        <div className="w-full md:w-[320px] rounded-xl border p-4">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-2xl font-extrabold">{loading ? "…" : totalText}</div>
          <div className="mt-1 text-xs text-gray-500">{activeMetricLabel}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-3 h-[320px] md:h-[360px]">
        {loading ? (
          <div className="h-full rounded-xl border flex items-center justify-center text-sm text-gray-500">
            Loading…
          </div>
        ) : !payload || chartData.length === 0 ? (
          <div className="h-full rounded-xl border flex items-center justify-center text-sm text-gray-500">
            No data.
          </div>
        ) : (
          <div className="h-full rounded-xl border p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 16, left: 8, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="4 6" />
                <XAxis
                  dataKey="label"
                  tickFormatter={prettyDateLabel}
                  interval="preserveStartEnd"
                  minTickGap={16}
                />
                <YAxis
                  tickFormatter={yTickFormatter as any}
                  domain={yDomain as any}
                  ticks={yTicks as any}
                />
                <Tooltip
                  formatter={tooltipValueFormatter as any}
                  labelFormatter={(label: any) => {
                    const s = String(label ?? "");
                    return s ? s : "Date";
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
