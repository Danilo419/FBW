// src/components/LiveStats.tsx
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Pusher from "pusher-js";
import { Globe2, Stars, Truck, Users2 } from "lucide-react";

type CardKey = "rating" | "community" | "orders" | "countries";

type Props = {
  initialOrders?: number;
  initialCountries?: number;
  initialCommunity?: number;
  initialAverage?: number;
  initialRatingsCount?: number;
  cardOrder?: CardKey[];
};

export default function LiveStats({
  initialOrders = 0,
  initialCountries = 0,
  initialCommunity = 0,
  initialAverage = 0,
  initialRatingsCount = 0,
  cardOrder,
}: Props) {
  const [orders, setOrders] = useState(initialOrders);
  const [countries, setCountries] = useState(initialCountries);
  const [community, setCommunity] = useState(initialCommunity);
  const [avgRating, setAvgRating] = useState(initialAverage);
  const [ratingsCount, setRatingsCount] = useState(initialRatingsCount);

  // fetch average/count if not provided by SSR
  useEffect(() => {
    if (initialAverage > 0 || initialRatingsCount > 0) return;
    (async () => {
      try {
        const res = await fetch("/api/reviews", { cache: "no-store" });
        const data = await res.json();
        setAvgRating(Number(data.avg ?? data.average ?? 0));
        setRatingsCount(Number(data.count ?? data.total ?? 0));
      } catch {
        /* ignore network errors */
      }
    })();
  }, [initialAverage, initialRatingsCount]);

  // Realtime updates
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster) return;

    const pusher = new Pusher(key, { cluster });
    const ch = pusher.subscribe("stats");

    ch.bind("metric:update", (payload: any) => {
      const v = Number(payload?.value || 0);
      if (payload?.metric === "orders") setOrders((x) => x + v);
      if (payload?.metric === "users") setCommunity((x) => x + v);
      if (payload?.metric === "countries" || payload?.metric === "countriesMaybeChanged") {
        setCountries((x) => x + (v || 1));
      }
    });

    ch.bind("rating:update", (data: { avg: number; count: number } | any) => {
      if (typeof data?.avg === "number") setAvgRating(data.avg);
      if (typeof data?.count === "number") setRatingsCount(data.count);
    });

    return () => {
      ch.unbind_all();
      pusher.unsubscribe("stats");
      pusher.disconnect();
    };
  }, []);

  const order: CardKey[] = useMemo(
    () => cardOrder ?? ["rating", "community", "orders", "countries"],
    [cardOrder]
  );

  const cards: Record<CardKey, ReactNode> = {
    rating: (
      <Stat
        key="rating"
        icon={<Stars className="h-5 w-5 text-amber-600" />}
        label="Average rating"
        value={`${avgRating.toFixed(1)}/5`}
        sub={`(${formatInt(ratingsCount)})`}
      />
    ),
    community: (
      <Stat
        key="community"
        icon={<Users2 className="h-5 w-5 text-purple-600" />}
        label="Community"
        value={formatInt(community)}
      />
    ),
    orders: (
      <Stat
        key="orders"
        icon={<Truck className="h-5 w-5 text-cyan-600" />}
        label="Orders shipped"
        value={formatInt(orders)}
      />
    ),
    countries: (
      <Stat
        key="countries"
        icon={<Globe2 className="h-5 w-5 text-blue-600" />}
        label="Countries served"
        value={formatInt(countries)}
      />
    ),
  };

  return (
    <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {order.map((k) => cards[k])}
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border bg-white/80 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight">{value}</div>
      {sub ? <div className="text-xs text-gray-500">{sub}</div> : null}
    </div>
  );
}

/** Inteiro com separador de milhares usando ponto (ex.: 1.000, 25.430). */
function formatInt(n: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(n);
}
