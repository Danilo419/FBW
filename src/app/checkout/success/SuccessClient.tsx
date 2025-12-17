// src/app/checkout/success/SuccessClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

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
  const n = typeof cents === "number" ? cents : 0;
  return (n / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "EUR",
  });
}

const FINAL_STATUSES = new Set(["paid", "shipped", "delivered"]);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------- image helpers ------------------------------- */
function isExternalUrl(u: string) {
  return /^https?:\/\//i.test(u) || u.startsWith("//");
}
function normalizeUrl(u: string) {
  if (!u) return "";
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}
function getItemImageUrl(it: OrderItem) {
  const raw = typeof it.image === "string" ? it.image : "";
  const u = normalizeUrl(raw.trim());
  return u || "/placeholder.png";
}

/**
 * External images: we use <img> to avoid Next remotePatterns issues,
 * BUT we do fallback without passing `onError` as a prop from a server context.
 * (Even though this file is client, this pattern is safer and avoids the runtime error you got.)
 */
function ExternalImg({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [current, setCurrent] = useState(src || "/placeholder.png");

  useEffect(() => {
    setCurrent(src || "/placeholder.png");
  }, [src]);

  return (
    <img
      src={current}
      alt={alt}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      // We still attach onError here (inside a client component),
      // so it is never passed through Server Component props.
      onError={() => {
        setCurrent((prev) => (prev === "/placeholder.png" ? prev : "/placeholder.png"));
      }}
    />
  );
}

function ItemThumb({ src, alt }: { src: string; alt: string }) {
  const external = isExternalUrl(src);

  if (external) {
    return (
      <div className="relative h-14 w-14 overflow-hidden rounded-xl border bg-gray-50 shrink-0">
        <ExternalImg src={src} alt={alt} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="relative h-14 w-14 overflow-hidden rounded-xl border bg-gray-50 shrink-0">
      <Image src={src} alt={alt} fill className="object-cover" sizes="56px" />
    </div>
  );
}

export default function SuccessClient() {
  const params = useSearchParams();
  const router = useRouter();
  const confirmingRef = useRef(false);

  const { orderId, provider, sessionId } = useMemo(() => {
    const id = params.get("order") || "";
    const prov = params.get("provider") || "";
    const sess = params.get("session_id") || "";
    return { orderId: id, provider: prov, sessionId: sess };
  }, [params]);

  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMsg, setLoadingMsg] = useState<string>("Loading your order…");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Confirma Stripe no servidor usando o session_id devolvido pelo Checkout */
  const confirmStripe = async (oid: string, sid: string) => {
    if (!oid || !sid || confirmingRef.current) return;
    confirmingRef.current = true;
    setLoading(true);
    setLoadingMsg("Finalizing your payment…");

    const MAX_TRIES = 6;
    for (let i = 0; i < MAX_TRIES; i++) {
      try {
        const res = await fetch(
          `/api/checkout/stripe/confirm?order=${encodeURIComponent(
            oid
          )}&session_id=${encodeURIComponent(sid)}`,
          { method: "POST" }
        );

        const json: any = await res.json().catch(() => ({}));

        if (res.ok && json?.ok) return;

        if (res.status === 202 || json?.status === "processing") {
          await wait(1500);
          continue;
        }

        setError(json?.error || "Could not confirm the payment.");
        break;
      } catch {
        await wait(1200);
      }
    }
  };

  /** Carrega a encomenda do backend */
  const fetchOrder = async (oid: string) => {
    if (!oid) {
      setLoading(false);
      setOrder(null);
      return;
    }

    setLoading(true);
    setLoadingMsg("Loading your order…");
    setError(null);

    try {
      let res = await fetch(`/api/orders/${encodeURIComponent(oid)}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        res = await fetch(`/api/orders?id=${encodeURIComponent(oid)}`, {
          method: "GET",
          cache: "no-store",
        });
      }

      const json: ApiResponse = await res.json().catch(() => ({} as ApiResponse));

      if (!res.ok) {
        const msg =
          (json as any)?.error ||
          "Could not load the order. Please check again in your account.";
        setError(msg);
        setOrder(null);
      } else {
        const o: Order | undefined = (json as any)?.order ?? (json as any)?.data?.order;

        if (o && o.id) {
          setOrder(o);

          if (!FINAL_STATUSES.has((o.status || "").toLowerCase())) {
            for (let i = 0; i < 2; i++) {
              await wait(1500);
              const again = await fetch(`/api/orders/${encodeURIComponent(oid)}`, {
                cache: "no-store",
              }).then((r) => r.json().catch(() => ({})));

              const updated: Order | undefined =
                (again as any)?.order ?? (again as any)?.data?.order;

              if (updated?.id) {
                setOrder(updated);
                if (FINAL_STATUSES.has((updated.status || "").toLowerCase())) break;
              }
            }
          }
        } else {
          setError("Order not found.");
          setOrder(null);
        }
      }
    } catch {
      setError("Network error while loading the order.");
      setOrder(null);
    } finally {
      setLoading(false);
      setLoadingMsg("Loading your order…");
    }
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      if (provider === "stripe" && sessionId) {
        await confirmStripe(orderId, sessionId);
      }

      if (!alive) return;
      await fetchOrder(orderId);
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, provider, sessionId]);

  const computedTotalCents = useMemo(() => {
    if (!order) return 0;
    if (typeof order.totalCents === "number") return order.totalCents;
    if (typeof order.total === "number") return Math.round(order.total * 100);

    const itemsSum =
      order.items?.reduce((acc, it) => acc + (it.totalPrice || 0), 0) || 0;

    const shipping = order.shipping || 0;
    const tax = order.tax || 0;
    return itemsSum + shipping + tax;
  }, [order]);

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-5 text-center">
        {loadingMsg}
      </div>
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
            onClick={() => router.replace("/account")}
            className="w-full rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50"
          >
            Go to my account
          </button>
          <button
            onClick={() => router.replace("/")}
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
        Your payment was successful{provider ? ` via ${provider}` : ""}.
      </p>

      {order ? (
        <>
          <div className="text-sm">
            <div className="text-gray-500">Order</div>
            <div className="font-mono break-all">{order.id}</div>
            <div className="mt-1 text-gray-500">Status</div>
            <div className="font-semibold capitalize">{order.status}</div>
          </div>

          <ul className="divide-y rounded-xl border">
            {order.items?.map((it) => {
              const img = getItemImageUrl(it);
              return (
                <li
                  key={it.id}
                  className="p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ItemThumb src={img} alt={it.name} />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{it.name}</div>
                      <div className="text-sm opacity-70">Qty: {it.qty}</div>
                    </div>
                  </div>

                  <div className="font-semibold shrink-0">
                    {moneyCents(it.totalPrice)}
                  </div>
                </li>
              );
            })}
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
              onClick={() => router.replace("/")}
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
              onClick={() => router.replace("/account")}
              className="w-full rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50"
            >
              Go to my account
            </button>
            <button
              onClick={() => router.replace("/")}
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
