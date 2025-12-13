'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Loader2,
  Package,
  BadgeCheck,
  Hash,
  Euro,
  Tag,
} from 'lucide-react';

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function fmtMoneyFromCents(cents: number, currency = 'eur') {
  const c = (currency || 'eur').toUpperCase();
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: c }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${c}`;
  }
}

type OrderItemDTO = {
  id: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
  name: string;
  image?: string | null;
  snapshotJson?: any;
  product: {
    id: string;
    name: string;
    imageUrls: string[];
    badges: string[];
  };
};

type OrderDetailsDTO = {
  id: string;
  createdAt: string;
  status: string;
  currency: string;
  subtotal: number;
  shipping: number;
  tax: number;
  totalCents: number;
  items: OrderItemDTO[];
};

export default function OrderDetailsClient({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetailsDTO | null>(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch(`/api/account/orders/${encodeURIComponent(orderId)}`, { method: 'GET' });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || 'Failed to load order details');
        if (!alive) return;
        setOrder(j?.order ?? null);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? 'Something went wrong');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [orderId]);

  const itemsSubtotal = useMemo(() => {
    if (!order) return 0;
    return order.items.reduce((acc, it) => acc + it.totalPrice, 0);
  }, [order]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/account" className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 hover:bg-gray-50">
          <ChevronLeft className="h-4 w-4" />
          Back to Account
        </Link>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
        {loading && (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading order…
          </div>
        )}

        {!loading && err && (
          <div className="rounded-2xl border p-4 bg-red-50 text-red-700 text-sm">{err}</div>
        )}

        {!loading && !err && !order && (
          <div className="rounded-2xl border p-6 bg-white/70 text-center">
            <Package className="h-6 w-6 mx-auto text-gray-400" />
            <div className="mt-2 font-semibold">Order not found</div>
          </div>
        )}

        {!loading && !err && order && (
          <>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold">{`Order #${order.id.slice(0, 8).toUpperCase()}`}</h1>
                <div className="text-sm text-gray-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Placed: {formatDate(order.createdAt)}</span>
                  <span className="inline-flex items-center gap-1">
                    <BadgeCheck className="h-4 w-4" /> {order.status}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border p-4 bg-white/70 min-w-[260px]">
                <div className="text-xs text-gray-500">Summary</div>

                <div className="mt-2 text-sm text-gray-700 flex items-center justify-between">
                  <span>Items subtotal</span>
                  <span className="font-semibold">{fmtMoneyFromCents(itemsSubtotal, order.currency)}</span>
                </div>

                <div className="mt-2 text-sm text-gray-700 flex items-center justify-between">
                  <span>Shipping</span>
                  <span className="font-semibold">{fmtMoneyFromCents(order.shipping, order.currency)}</span>
                </div>

                <div className="mt-2 text-sm text-gray-700 flex items-center justify-between">
                  <span>Tax</span>
                  <span className="font-semibold">{fmtMoneyFromCents(order.tax, order.currency)}</span>
                </div>

                <div className="mt-3 pt-3 border-t text-sm text-gray-700 flex items-center justify-between">
                  <span>Total</span>
                  <span className="font-semibold">{fmtMoneyFromCents(order.totalCents, order.currency)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              {order.items.map((it) => {
                const img = it.image || it.product.imageUrls?.[0] || null;
                const title = it.name || it.product.name;

                return (
                  <div key={it.id} className="rounded-2xl border p-4 bg-white/70 flex gap-4">
                    <div className="h-20 w-20 rounded-2xl border bg-white overflow-hidden flex items-center justify-center shrink-0">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={title} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-6 w-6 text-gray-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{title}</div>

                          <div className="mt-1 text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                            <span className="inline-flex items-center gap-1">
                              <Hash className="h-4 w-4" />
                              Qty: {it.qty}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Euro className="h-4 w-4" />
                              {fmtMoneyFromCents(it.unitPrice, order.currency)} each
                            </span>
                          </div>
                        </div>

                        <div className="font-semibold whitespace-nowrap">
                          {fmtMoneyFromCents(it.totalPrice, order.currency)}
                        </div>
                      </div>

                      {it.product.badges?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {it.product.badges.map((b, idx) => (
                            <span key={`${b}-${idx}`} className="text-xs px-2 py-1 rounded-full border bg-white">
                              {b}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Se depois quiseres mostrar opções do snapshotJson, dá para renderizar aqui */}
                      {/* Ex.: personalization, selected options, etc. */}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
