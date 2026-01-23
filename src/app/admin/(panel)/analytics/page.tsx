// src/app/admin/(panel)/analytics/page.tsx
import MetricChart from "@/components/analytics/MetricChart";
import LiveVisitorsBadge from "@/components/analytics/LiveVisitorsBadge";

// Tipos iguais aos usados dentro do MetricChart (não exportados de lá)
type Metric = "visitors" | "sales" | "profit" | "orders" | "conversion";
type Period = "today" | "7d" | "30d" | "90d" | "custom";

type SP = Record<string, string | string[]>;

const METRICS = ["visitors", "sales", "profit", "orders", "conversion"] as const;
const PERIODS = ["today", "7d", "30d", "90d", "custom"] as const;

function toMetric(value: unknown, fallback: Metric): Metric {
  const v = Array.isArray(value) ? value[0] : value;
  return METRICS.includes(v as any) ? (v as Metric) : fallback;
}

function toPeriod(value: unknown, fallback: Period): Period {
  const v = Array.isArray(value) ? value[0] : value;
  return PERIODS.includes(v as any) ? (v as Period) : fallback;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<SP>;
}) {
  const sp = (await searchParams) ?? {};

  const metric: Metric = toMetric(sp.metric, "visitors");
  const period: Period = toPeriod(sp.period, "30d");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold">Analytics</h1>
          <p className="text-sm text-gray-500">Traffic and sales trends.</p>
        </div>
        <LiveVisitorsBadge />
      </div>

      <MetricChart defaultMetric={metric} defaultPeriod={period} />
    </div>
  );
}
