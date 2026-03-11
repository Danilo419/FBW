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
import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/prisma";
import LiveStats from "@/components/LiveStats";

export async function generateMetadata() {
  const t = await getTranslations("aboutPage.metadata");

  return {
    title: t("title"),
    description: t("description"),
  };
}

export const revalidate = 0;

/* ---------- carrega estatísticas no servidor ---------- */
async function loadInitialStats() {
  const [usersCount, reviewAgg] = await Promise.all([
    prisma.user.count(),
    prisma.review.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
  ]);

  return {
    initialCommunity: usersCount,
    initialOrders: 0,
    initialCountries: 0,
    initialAverage: Number(reviewAgg._avg.rating ?? 0),
    initialRatingsCount: Number(reviewAgg._count._all ?? 0),
  };
}

export default async function AboutPage() {
  const t = await getTranslations("aboutPage");
  const s = await loadInitialStats();

  return (
    <main className="container-fw pb-24 pt-16 md:pt-24">
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
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-6 shadow-sm md:p-8">
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full border bg-white/80 px-2.5 py-1">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            {t("hero.badge")}
          </span>
        </div>

        <h1 className="mt-3 bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent md:text-4xl">
          {t("hero.title")}
        </h1>

        <p className="mt-2 max-w-3xl text-gray-600">
          {t.rich("hero.description", {
            authentic: (chunks) => <strong>{chunks}</strong>,
            concept: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>

        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          <Pill icon={<ShieldCheck className="h-3.5 w-3.5 text-green-600" />}>
            {t("hero.pills.secure")}
          </Pill>
          <Pill icon={<Truck className="h-3.5 w-3.5 text-blue-600" />}>
            {t("hero.pills.shipping")}
          </Pill>
          <Pill icon={<BadgePercent className="h-3.5 w-3.5 text-amber-600" />}>
            {t("hero.pills.pricing")}
          </Pill>
          <Pill icon={<Globe2 className="h-3.5 w-3.5 text-indigo-600" />}>
            {t("hero.pills.worldwide")}
          </Pill>
        </div>
      </section>

      {/* STATS */}
      <LiveStats
        initialOrders={s.initialOrders}
        initialCountries={s.initialCountries}
        initialCommunity={s.initialCommunity}
        initialAverage={s.initialAverage}
        initialRatingsCount={s.initialRatingsCount}
        cardOrder={["rating", "community"]}
      />

      {/* WHAT WE DO */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2">
            <Shirt className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold">{t("whatWeDo.make.title")}</h2>
          </div>
          <p className="mt-2 text-gray-700">{t("whatWeDo.make.description")}</p>
          <ul className="mt-3 grid gap-2 text-sm text-gray-700">
            <li className="rounded-xl border px-3 py-2">
              {t("whatWeDo.make.items.0")}
            </li>
            <li className="rounded-xl border px-3 py-2">
              {t("whatWeDo.make.items.1")}
            </li>
            <li className="rounded-xl border px-3 py-2">
              {t("whatWeDo.make.items.2")}
            </li>
          </ul>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-pink-600" />
            <h2 className="font-semibold">{t("whatWeDo.build.title")}</h2>
          </div>
          <p className="mt-2 text-gray-700">
            {t.rich("whatWeDo.build.description", {
              design: (chunks) => <strong>{chunks}</strong>,
              craft: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <Mini
              icon={<Ruler className="h-4 w-4" />}
              label={t("whatWeDo.build.mini.0")}
            />
            <Mini
              icon={<Factory className="h-4 w-4" />}
              label={t("whatWeDo.build.mini.1")}
            />
            <Mini
              icon={<ShieldCheck className="h-4 w-4" />}
              label={t("whatWeDo.build.mini.2")}
            />
          </div>
        </Card>
      </section>

      {/* VALUES */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold">{t("values.title")}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Value
            icon={<ShieldCheck className="h-5 w-5 text-green-600" />}
            title={t("values.items.0.title")}
            desc={t("values.items.0.desc")}
          />
          <Value
            icon={<HeartHandshake className="h-5 w-5 text-rose-600" />}
            title={t("values.items.1.title")}
            desc={t("values.items.1.desc")}
          />
          <Value
            icon={<BadgePercent className="h-5 w-5 text-amber-600" />}
            title={t("values.items.2.title")}
            desc={t("values.items.2.desc")}
          />
          <Value
            icon={<Trophy className="h-5 w-5 text-indigo-600" />}
            title={t("values.items.3.title")}
            desc={t("values.items.3.desc")}
          />
        </div>
      </section>

      {/* SUSTAINABILITY */}
      <section className="mt-8 rounded-2xl border bg-gradient-to-br from-emerald-50 via-white to-emerald-50 p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-emerald-600" />
          <h2 className="font-semibold">{t("sustainability.title")}</h2>
        </div>
        <p className="mt-2 text-gray-700">
          {t.rich("sustainability.description", {
            madeToOrder: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <BadgeItem icon={<Recycle className="h-4 w-4 text-emerald-700" />}>
            {t("sustainability.items.0")}
          </BadgeItem>
          <BadgeItem icon={<Globe2 className="h-4 w-4 text-emerald-700" />}>
            {t("sustainability.items.1")}
          </BadgeItem>
          <BadgeItem icon={<ShieldCheck className="h-4 w-4 text-emerald-700" />}>
            {t("sustainability.items.2")}
          </BadgeItem>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold">{t("timeline.title")}</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-2">
          <Step
            icon={<Trophy className="h-5 w-5 text-blue-700" />}
            title={t("timeline.items.0.title")}
            desc={t("timeline.items.0.desc")}
          />
          <Step
            icon={<Palette className="h-5 w-5 text-pink-700" />}
            title={t("timeline.items.1.title")}
            desc={t("timeline.items.1.desc")}
          />
          <Step
            icon={<Globe2 className="h-5 w-5 text-emerald-700" />}
            title={t("timeline.items.2.title")}
            desc={t("timeline.items.2.desc")}
          />
          <Step
            icon={<Rocket className="h-5 w-5 text-amber-700" />}
            title={t("timeline.items.3.title")}
            desc={t("timeline.items.3.desc")}
          />
        </ol>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-2xl bg-gradient-to-r from-blue-500/30 to-cyan-400/30 p-[1px]">
        <div className="flex flex-col gap-4 rounded-2xl bg-white/90 p-6 backdrop-blur sm:flex-row sm:items-center sm:justify-between md:p-7">
          <div>
            <h3 className="text-lg font-semibold">{t("cta.title")}</h3>
            <p className="text-sm text-gray-600">{t("cta.description")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/clubs"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-medium text-white shadow-md hover:brightness-110"
            >
              {t("cta.buttons.shop")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm hover:bg-gray-50"
            >
              {t("cta.buttons.contact")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <p className="mt-8 text-xs text-gray-500">
        {t("footer.copyright", { year: new Date().getFullYear() })}
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
    <div className="rounded-2xl border bg-white/80 p-5 shadow-sm transition hover:shadow-md">
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