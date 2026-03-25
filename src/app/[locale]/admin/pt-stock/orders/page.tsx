// src/app/[locale]/admin/pt-stock/orders/page.tsx
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatMoneyRight(cents: number) {
  const s = formatMoney(cents);

  let m = s.match(/^-€\s*(.+)$/);
  if (m) return `-${m[1]}€`;

  m = s.match(/^€\s*(.+)$/);
  if (m) return `${m[1]}€`;

  return s;
}

export default async function AdminPtStockOrdersPage() {
  const orders = await prisma.order.findMany({
    where: {
      channel: "PT_STOCK_CTT" as any,
      status: "paid",
    },
    include: {
      items: {
        select: {
          id: true,
          name: true,
          qty: true,
          unitPrice: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">PT Stock • Orders</h1>
          <p className="text-sm text-gray-600">
            Orders placed on the <b>Portugal Delivery (CTT)</b> page.
          </p>
        </div>

        <Link
          href="/pt-stock"
          className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
        >
          View PT Stock page →
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
          <div className="text-sm font-semibold text-gray-900">
            Total orders: <span className="tabular-nums">{orders.length}</span>
          </div>

          <div className="text-xs text-gray-500">
            Only <code>paid</code> orders from <code>PT_STOCK_CTT</code>.
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="p-8 text-sm text-gray-600">
            There are no paid PT Stock orders yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b text-left">
                  <th className="px-4 py-3 font-semibold text-gray-900">Order</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Customer</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Items</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Total</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Created</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => {
                  const total =
                    (order.totalCents ?? 0) ||
                    (order.subtotal ?? 0) + (order.shipping ?? 0) + (order.tax ?? 0);

                  const itemCount = order.items.reduce(
                    (acc, it) => acc + (it.qty ?? 0),
                    0
                  );

                  return (
                    <tr
                      key={order.id}
                      className="border-b last:border-b-0 hover:bg-gray-50/60"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">
                          #{order.id.slice(0, 8)}
                        </div>
                        <div className="text-xs text-emerald-600 font-semibold">
                          paid
                        </div>
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        <div className="font-medium">
                          {order.shippingFullName || "—"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.shippingEmail || "—"}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        <div className="font-medium">{itemCount} items</div>
                        <div className="text-xs text-gray-500">
                          {order.items.slice(0, 2).map((it) => it.name).join(", ")}
                          {order.items.length > 2 ? "…" : ""}
                        </div>
                      </td>

                      <td className="tabular-nums px-4 py-3 font-semibold text-gray-900">
                        {formatMoneyRight(total)}
                      </td>

                      <td className="px-4 py-3">
                        {order.shippingStatus === "DELIVERED" ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                            Delivered
                          </span>
                        ) : order.shippingStatus === "SHIPPED" ? (
                          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
                            Shipped
                          </span>
                        ) : order.shippingStatus === "PROCESSING" ? (
                          <span className="inline-flex items-center rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-800">
                            Processing
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700">
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        <span className="tabular-nums">
                          {new Date(order.createdAt).toLocaleString("en-GB")}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}