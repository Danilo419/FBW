// src/app/about/page.tsx
import Link from "next/link";
import {
  Sparkles,
  ShieldCheck,
  Globe2,
  Truck,
  Shirt,
  Palette,
  Ruler,
  Factory,
  HeartHandshake,
  BadgePercent,
  Leaf,
  Recycle,
  Trophy,
  ArrowRight,
  Rocket,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import LiveStats from "@/components/LiveStats";

export const metadata = {
  title: "About Us — FootballWorld",
  description:
    "Learn who we are, how we craft concept & authentic football jerseys, and what we stand for at FootballWorld.",
};

export const revalidate = 0; // sem cache

/* ---------- carrega estatísticas no servidor ---------- */
async function loadInitialStats() {
  // Orders shipped = encomendas pagas
  const shippedOrders = await prisma.order.count({
    where: {
      OR: [
        { paidAt: { not: null } },
        { status: { in: ["paid", "shipped", "delivered"] } as any },
      ],
    },
  });

  // Countries served = países distintos (shippingCountry) em encomendas pagas
  const paidRows = await prisma.order.findMany({
    where: {
      OR: [
        { paidAt: { not: null } },
        { status: { in: ["paid", "shipped", "delivered"] } as any },
      ],
      shippingCountry: { not: null },
    },
    select: { shippingCountry: true },
  });
  const distinctCountries = new Set(
    paidRows
      .map((r) => (r.shippingCountry ?? "").trim().toLowerCase())
      .filter(Boolean)
  ).size;

  // Community e rating médio
  const [usersCount, reviewAgg] = await Promise.all([
    prisma.user.count(),
    prisma.review.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
  ]);

  return {
    initialCommunity: usersCount,
    initialOrders: shippedOrders,
    initialCountries: distinctCountries,
    initialAverage: Number(reviewAgg._avg.rating ?? 0),
    initialRatingsCount: Number(reviewAgg._count._all ?? 0),
  };
}

export default async function AboutPage() {
  const s = await loadInitialStats();

  return (
    <main className="container-fw pt-16 md:pt-24 pb-24">
      {/* Ambient glows */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-28 mx-auto h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed right-0 top-60 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl"
      />

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full border bg-white/80 px-2.5 py-1">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            Designed with passion since 2024
          </span>
        </div>

        <h1 className="mt-3 bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent text-3xl md:text-4xl font-extrabold tracking-tight">
          About FootballWorld
        </h1>
        <p className="mt-2 max-w-3xl text-gray-600">
          We’re a small, design-first studio crafting <strong>authentic</strong> and{" "}
          <strong>concept</strong> football jerseys. Made-to-order quality, fair pricing, and
          reliable worldwide shipping — so you can wear the game your way.
        </p>

        {/* trust badges */}
        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          <Pill icon={<ShieldCheck className="h-3.5 w-3.5 text-green-600" />}>
            Secure checkout
          </Pill>
          <Pill icon={<Truck className="h-3.5 w-3.5 text-blue-600" />}>
            Tracked shipping
          </Pill>
          <Pill icon={<BadgePercent className="h-3.5 w-3.5 text-amber-600" />}>
            Fair pricing
          </Pill>
          <Pill icon={<Globe2 className="h-3.5 w-3.5 text-indigo-600" />}>
            Ships worldwide
          </Pill>
        </div>
      </section>

      {/* STATS – ordem: Rating, Community, Orders, Countries */}
      <LiveStats
        initialOrders={s.initialOrders}
        initialCountries={s.initialCountries}
        initialCommunity={s.initialCommunity}
        initialAverage={s.initialAverage}
        initialRatingsCount={s.initialRatingsCount}
        cardOrder={["rating", "community", "orders", "countries"]}
      />

      {/* WHAT WE DO */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2">
            <Shirt className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold">What we make</h2>
          </div>
          <p className="mt-2 text-gray-700">
            From elite club classics to bold concept drops, every jersey is built with premium
            fabrics, pro-level stitching and vibrant color accuracy. Personalization? Absolutely —
            names, numbers and badges in club-correct styles.
          </p>
          <ul className="mt-3 grid gap-2 text-sm text-gray-700">
            <li className="rounded-xl border px-3 py-2">Authentic jerseys</li>
            <li className="rounded-xl border px-3 py-2">Concept jerseys</li>
            <li className="rounded-xl border px-3 py-2">Name & number personalization</li>
          </ul>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-pink-600" />
            <h2 className="font-semibold">How we build</h2>
          </div>
          <p className="mt-2 text-gray-700">
            Our studio combines <strong>design</strong> and <strong>craft</strong>. Patterns are cut
            with precision, panels are stitched for movement, and prints are applied using durable
            techniques — all made to order to reduce waste.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <Mini icon={<Ruler className="h-4 w-4" />} label="Tailored cuts" />
            <Mini icon={<Factory className="h-4 w-4" />} label="Pro stitching" />
            <Mini icon={<ShieldCheck className="h-4 w-4" />} label="QC checked" />
          </div>
        </Card>
      </section>

      {/* VALUES */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold">What we stand for</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Value
            icon={<ShieldCheck className="h-5 w-5 text-green-600" />}
            title="Quality first"
            desc="Materials, fit and finish that feel great on and off the pitch."
          />
          <Value
            icon={<HeartHandshake className="h-5 w-5 text-rose-600" />}
            title="Customer care"
            desc="Helpful, human support with 24–48h average reply times."
          />
          <Value
            icon={<BadgePercent className="h-5 w-5 text-amber-600" />}
            title="Fair pricing"
            desc="Direct-to-fan model keeps prices honest and transparent."
          />
          <Value
            icon={<Trophy className="h-5 w-5 text-indigo-600" />}
            title="Design culture"
            desc="Original concepts with bold aesthetics and club lore."
          />
        </div>
      </section>

      {/* SUSTAINABILITY */}
      <section className="mt-8 rounded-2xl border bg-gradient-to-br from-emerald-50 via-white to-emerald-50 p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-emerald-600" />
          <h2 className="font-semibold">Sustainability, thoughtfully</h2>
        </div>
        <p className="mt-2 text-gray-700">
          We operate mostly on a <strong>made-to-order</strong> basis, which helps avoid overstock
          and reduces waste. We’re continually refining our packaging and production partners to
          minimize impact.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
          <BadgeItem icon={<Recycle className="h-4 w-4 text-emerald-700" />}>
            Reduced overproduction
          </BadgeItem>
          <BadgeItem icon={<Globe2 className="h-4 w-4 text-emerald-700" />}>
            Global carriers with consolidated routes
          </BadgeItem>
          <BadgeItem icon={<ShieldCheck className="h-4 w-4 text-emerald-700" />}>
            Durable prints & long wear
          </BadgeItem>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Our Story – Quick Timeline</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-2">
          <Step
            icon={<Trophy className="h-5 w-5 text-blue-700" />}
            title="September 2025 Kick-Off"
            desc="FootBallWorld officially launches, offering football fans the best of both worlds: official football shirts and exclusive concept kits designed by us."
          />
          <Step
            icon={<Palette className="h-5 w-5 text-pink-700" />}
            title="The First Products Arrive"
            desc="Our very first shirts became available online, a mix of official football shirts and creative concept kits, made for true fans."
          />
          <Step
            icon={<Globe2 className="h-5 w-5 text-emerald-700" />}
            title="Today — Built for the Fans"
            desc="From day one, FootBallWorld was made for football lovers who want something different, whether it’s a shirt they know or a design they’ve never seen before."
          />
          <Step
            icon={<Rocket className="h-5 w-5 text-amber-700" />}
            title="Future — More to Come"
            desc="This is only the beginning. New products, fresh concept kits, and more ways to celebrate football are on the horizon."
          />
        </ol>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-2xl border p-[1px] bg-gradient-to-r from-blue-500/30 to-cyan-400/30">
        <div className="rounded-2xl bg-white/90 backdrop-blur p-6 md:p-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Ready to find your next jersey?</h3>
            <p className="text-sm text-gray-600">
              Browse products or reach our support team — we’re happy to help.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-medium text-white shadow-md hover:brightness-110"
            >
              Shop products
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm hover:bg-gray-50"
            >
              Contact us
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <p className="mt-8 text-xs text-gray-500">
        © {new Date().getFullYear()} FootballWorld — Built by fans, for fans.
      </p>
    </main>
  );
}

/* ========================== UI Bits ========================== */

function Pill({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-white/80 px-2.5 py-1">
      {icon}
      {children}
    </span>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border bg-white/70 p-6 shadow-sm">{children}</div>;
}

function Mini({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="rounded-xl border bg-white/70 px-2.5 py-2 text-center">
      <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-md bg-blue-50">
        {icon}
      </div>
      <div className="text-[11px] text-gray-700">{label}</div>
    </div>
  );
}

function Value({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border bg-white/80 p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-gray-700">{desc}</p>
    </div>
  );
}

function BadgeItem({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl border bg-white/80 px-3 py-2">
      {icon}
      {children}
    </span>
  );
}

function Step({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <li className="rounded-2xl border bg-white/70 p-5 shadow-sm">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-gray-700">{desc}</p>
    </li>
  );
}
