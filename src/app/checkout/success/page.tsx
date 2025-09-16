// src/app/checkout/success/page.tsx
import { prisma } from "@/lib/prisma";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams:
    | { order?: string; provider?: string }
    | Promise<{ order?: string; provider?: string }>;
}) {
  const sp = await searchParams; // 👈 aguarda se vier como Promise
  const orderId = sp.order;

  const order = orderId
    ? await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      })
    : null;

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Thank you for your purchase!</h1>
      {order ? (
        <>
          <p>
            Order #{order.id.slice(-6)} — status: <b>{order.status}</b>
          </p>
          <ul className="divide-y rounded-xl border bg-white">
            {order.items.map((it) => (
              <li
                key={it.id}
                className="p-4 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{it.name}</div>
                  <div className="text-sm opacity-70">Qty: {it.qty}</div>
                </div>
                <div className="font-semibold">
                  € {(it.totalPrice / 100).toFixed(2)}
                </div>
              </li>
            ))}
          </ul>
          <div className="text-right font-bold">
            Total: € {(order.total / 100).toFixed(2)}
          </div>
        </>
      ) : (
        <p>Order processed. You can check the details in your account.</p>
      )}
    </main>
  );
}
