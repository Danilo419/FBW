// src/app/admin/(panel)/analytics/page.tsx
import MetricChart from "@/components/analytics/MetricChart";
import LiveVisitorsBadge from "@/components/analytics/LiveVisitorsBadge";

export default function AnalyticsPage({
  searchParams,
}: {
  searchParams?: { metric?: string; period?: string };
}) {
  const metric = (searchParams?.metric as any) || "visitors";
  const period = (searchParams?.period as any) || "30d";

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
