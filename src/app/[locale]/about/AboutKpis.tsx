// src/app/about/AboutKpis.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { getOrdersShippedCount, getCountriesServedCount } from "@/lib/kpis";

export default async function AboutKpis() {
  const [ordersShipped, countriesServed] = await Promise.all([
    getOrdersShippedCount(),
    getCountriesServedCount(),
  ]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Orders shipped */}
      <div className="rounded-2xl border bg-white p-5">
        <div className="text-sm text-gray-600 mb-1">Orders shipped</div>
        <div className="text-3xl font-extrabold">{ordersShipped}</div>
        <div className="text-xs text-gray-500 mt-1">Total shipped</div>
      </div>

      {/* Countries served */}
      <div className="rounded-2xl border bg-white p-5">
        <div className="text-sm text-gray-600 mb-1">Countries served</div>
        <div className="text-3xl font-extrabold">{countriesServed}</div>
        <div className="text-xs text-gray-500 mt-1">Distinct countries</div>
      </div>
    </div>
  );
}
