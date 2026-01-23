// src/components/analytics/MetricChart.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Metric = "visitors" | "sales" | "profit" | "orders" | "conversion";
type Period = "today" | "7d" | "30d" | "90d" | "custom";

const METRICS: { key: Metric; label: string }[] = [
  { key: "visitors", label: "Visitors" },
  { key: "sales", label: "Sales (€)" },
  { key: "profit", label: "Profit (€)" }, // ✅ NOVO (entre Sales e Orders)
  { key: "orders", label: "Orders" },
  { key: "conversion", label: "Conversion (%)" },
];

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
];

function formatEUR(v: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(v);
}

function formatNumber(v: number) {
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(v);
}

function formatPercent(v: number) {
  return `${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(v)}%`;
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

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    labels: string[];
    series: Record<Metric, number[]>;
    totals: { sales: number; profit: number; orders: number; visitors: number };
  } | null>(null);

  useEffect(() => {
    let ignore = false;

    async function run() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/analytics?period=${period}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load analytics");
        const json = await res.json();
        if (!ignore) setData(json);
      } catch {
        if (!ignore) setData(null);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    run();
    return () => {
      ignore = true;
    };
  }, [period]);

  const labels = data?.labels ?? [];
  const series = data?.series ?? ({} as any);

  const currentSeries = useMemo(() => {
    const s = series?.[metric];
    return Array.isArray(s) ? s : [];
  }, [series, metric]);

  const totalSales = data?.totals?.sales ?? 0;
  const totalProfit = data?.totals?.profit ?? 0;
  const totalOrders = data?.totals?.orders ?? 0;

  const metricLabel = METRICS.find((m) => m.key === metric)?.label ?? metric;

  const lastValue = currentSeries[currentSeries.length - 1] ?? 0;

  const lastFormatted =
    metric === "sales" || metric === "profit"
      ? formatEUR(lastValue)
      : metric === "conversion"
      ? formatPercent(lastValue)
      : formatNumber(lastValue);

  return (
    <div className="rounded-2xl border bg-white p-4 md:p-6 shadow-sm space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
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
                  "px-3 py-1.5 rounded-full text-sm border transition",
                  active
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-300",
                ].join(" ")}
              >
                {m.label}
              </Link>
            );
          })}
        </div>

        <div className="flex gap-2">
          {PERIODS.map((p) => {
            const active = p.key === period;
            return (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={[
                  "px-3 py-1.5 rounded-full text-sm border transition",
                  active
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-300",
                ].join(" ")}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary row: Sales (€) | Profit (€) | Orders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border p-4">
          <div className="text-xs text-gray-500">Sales (€)</div>
          <div className="text-2xl font-extrabold">{formatEUR(totalSales)}</div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="text-xs text-gray-500">Profit (€)</div>
          <div className="text-2xl font-extrabold">{formatEUR(totalProfit)}</div>
          <div className="text-xs text-gray-500 mt-1">
            Paid − supplier item costs − supplier shipping
          </div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="text-xs text-gray-500">Orders</div>
          <div className="text-2xl font-extrabold">{formatNumber(totalOrders)}</div>
        </div>
      </div>

      {/* Lightweight display (não estraga o teu chart se tiveres um) */}
      <div className="rounded-2xl border p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">{metricLabel}</div>
            <div className="text-xs text-gray-500">
              {loading ? "Loading…" : `${labels.length} points`}
            </div>
          </div>

          {!loading && (
            <div className="text-sm font-semibold">
              Last: <span className="font-extrabold">{lastFormatted}</span>
            </div>
          )}
        </div>

        {loading && <div className="mt-3 text-sm text-gray-500">Loading…</div>}
        {!loading && currentSeries.length === 0 && (
          <div className="mt-3 text-sm text-gray-500">No data.</div>
        )}
      </div>
    </div>
  );
}
