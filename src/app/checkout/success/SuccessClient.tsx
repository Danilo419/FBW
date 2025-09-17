// src/app/checkout/success/SuccessClient.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type OrderItem = {
  id: string;
  name: string;
  qty: number;
  totalPrice: number; // cents
  image?: string | null;
};

type Order = {
  id: string;
  status: string;
  subtotal?: number | null; // cents
  shipping?: number | null; // cents
  tax?: number | null; // cents
  total?: number | null; // float (legacy)
  totalCents?: number | null; // cents (preferred)
  items: OrderItem[];
};

type ApiResponse =
  | { order: Order }
  | { data: { order: Order } }
  | { error: string }
  | Record<string, any>;

function moneyCents(cents: number | null | undefined) {
  const n = typeof cents === 'number' ? cents : 0;
  return (n / 100).toLocaleString(undefined, { style: 'currency', currency: 'EUR' });
}

export default function SuccessClient() {
  const params = useSearchParams();
  const router = useRouter();

  const { orderId, provider } = useMemo(() => {
    const id = params.get('order') || '';
    const prov = params.get('provider') || '';
    return { orderId: id, provider: prov };
  }, [params]);

  const [loading, setLoading] = useState<boolean>(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch order details from your API (adjust the endpoint to your project)
  useEffect(() => {
    let alive = true;

    async function fetchOrder() {
      if (!orderId) {
        setLoading(false);
        setOrder(null);
        return;
      }
      setLoading(true);
      setError(null);

      try {
        // Try RESTful pattern first: /api/orders/:id
        let res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
          method: 'GET',
          cache: 'no-store',
        });

        // Fallback to /api/orders?id=
        if (!res.ok) {
          res = await fetch(`/api/orders?id=${encodeURIComponent(orderId)}`, {
            method: 'GET',
            cache: 'no-store',
          });
        }

        const json: ApiResponse = await res.json().catch(() => ({} as ApiResponse));

        if (!alive) return;

        if (!res.ok) {
          const msg =
            (json as any)?.error ||
            'Could not load the order. Please check again in your account.';
          setError(msg);
          setOrder(null);
        } else {
          const o: Order | undefined =
            (json as any)?.order ?? (json as any)?.data?.order;
          if (o && o.id) {
            setOrder(o);
          } else {
            setError('Order not found.');
            setOrder(null);
          }
        }
      } catch {
        if (!alive) return;
        setError('Network error while loading the order.');
        setOrder(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchOrder();
    return () => {
      alive = false;
    };
  }, [orderId]);

  // Compute total
  const computedTotalCents = useMemo(() => {
    if (!order) return 0;
    // Prefer explicit cents fields if present
    if (typeof order.totalCents === 'number') return order.totalCents;
    if (typeof order.total === 'number') return Math.round(order.total * 100);

    const itemsSum = order.items?.reduce((acc, it) => acc + (it.totalPrice || 0), 0) || 0;
    const shipping = order.shipping || 0;
    const tax = order.tax || 0;
    return itemsSum + shipping + tax;
  }, [order]);

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-5 text-center">Loading your order…</div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border bg-white p-5 space-y-4">
        <p className="text-sm text-red-700 rounded-md border border-red-200 bg-red-50 px-3 py-2">
          {error}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => router.replace('/account')}
            className="w-full rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50"
          >
            Go to my account
          </button>
          <button
            onClick={() => router.replace('/')}
            className="w-full rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50"
          >
            Continue shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-5 space-y-4">
      <p className="text-sm text-gray-800">
        Your payment was successful{provider ? ` via ${provider}` : ''}.
      </p>

      {order ? (
        <>
          <div className="text-sm">
            <div className="text-gray-500">Order</div>
            <div className="font-mono">{order.id}</div>
            <div className="mt-1 text-gray-500">Status</div>
            <div className="font-semibold">{order.status}</div>
          </div>

          <ul className="divide-y rounded-xl border">
            {order.items?.map((it) => (
              <li key={it.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium truncate">{it.name}</div>
                  <div className="text-sm opacity-70">Qty: {it.qty}</div>
                </div>
                <div className="font-semibold shrink-0">
                  {moneyCents(it.totalPrice)}
                </div>
              </li>
            ))}
          </ul>

          <div className="text-right font-bold">
            Total: {moneyCents(computedTotalCents)}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.replace(`/orders/${encodeURIComponent(order.id)}`)}
              className="w-full rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50"
            >
              View order
            </button>
            <button
              onClick={() => router.replace('/')}
              className="w-full rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50"
            >
              Continue shopping
            </button>
          </div>
        </>
      ) : (
        <>
          <p>Order processed. You can check the details in your account.</p>
          <div className="flex gap-2">
            <button
              onClick={() => router.replace('/account')}
              className="w-full rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50"
            >
              Go to my account
            </button>
            <button
              onClick={() => router.replace('/')}
              className="w-full rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50"
            >
              Home
            </button>
          </div>
        </>
      )}
    </div>
  );
}
