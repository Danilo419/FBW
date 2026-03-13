// src/app/[locale]/shipping-policy/page.tsx
import React from "react";
import { Link } from "@/i18n/navigation";
import {
  Truck,
  PackageCheck,
  PackageOpen,
  Plane,
  Globe,
  MapPin,
  Clock,
  ShieldCheck,
  Undo2,
  AlertTriangle,
  Info,
  Mail,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

/* ---------- meta ---------- */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "shippingPolicyPage.metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

/* ---------- section index ---------- */
async function getSections(locale: string) {
  const t = await getTranslations({ locale, namespace: "shippingPolicyPage" });

  return [
    { id: "intro", label: t("sections.intro.label"), icon: <Info className="h-4 w-4" /> },
    { id: "processing", label: t("sections.processing.label"), icon: <Clock className="h-4 w-4" /> },
    { id: "carriers", label: t("sections.carriers.label"), icon: <Plane className="h-4 w-4" /> },
    { id: "rates", label: t("sections.rates.label"), icon: <Truck className="h-4 w-4" /> },
    { id: "estimates", label: t("sections.estimates.label"), icon: <Globe className="h-4 w-4" /> },
    { id: "tracking", label: t("sections.tracking.label"), icon: <PackageCheck className="h-4 w-4" /> },
    { id: "address", label: t("sections.address.label"), icon: <MapPin className="h-4 w-4" /> },
    { id: "customs", label: t("sections.customs.label"), icon: <ShieldCheck className="h-4 w-4" /> },
    { id: "failed", label: t("sections.failed.label"), icon: <AlertTriangle className="h-4 w-4" /> },
    { id: "lost", label: t("sections.lost.label"), icon: <PackageOpen className="h-4 w-4" /> },
    { id: "split", label: t("sections.split.label"), icon: <PackageCheck className="h-4 w-4" /> },
    { id: "preorders", label: t("sections.preorders.label"), icon: <Clock className="h-4 w-4" /> },
    { id: "holidays", label: t("sections.holidays.label"), icon: <Clock className="h-4 w-4" /> },
    { id: "force", label: t("sections.force.label"), icon: <ShieldCheck className="h-4 w-4" /> },
    { id: "contact", label: t("sections.contact.label"), icon: <Mail className="h-4 w-4" /> },
  ];
}

export default async function ShippingPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "shippingPolicyPage" });
  const sections = await getSections(locale);

  return (
    <main className="container-fw pb-24 pt-16 md:pt-24">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-24 mx-auto h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed right-0 top-72 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl"
      />

      {/* HERO */}
      <section className="relative mb-8 overflow-hidden rounded-3xl border bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-6 shadow-sm md:p-8">
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
            shippingTracking: (chunks) => (
              <Link href="/shipping-tracking" className="text-blue-700 underline">
                {chunks}
              </Link>
            ),
          })}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {sections.slice(0, 6).map((s) => (
            <AnchorPill key={s.id} id={s.id} icon={s.icon}>
              {s.label}
            </AnchorPill>
          ))}
          <AnchorPill id="customs" icon={<ShieldCheck className="h-4 w-4" />}>
            {t("hero.quickLinks.customs")}
          </AnchorPill>
          <AnchorPill id="lost" icon={<PackageOpen className="h-4 w-4" />}>
            {t("hero.quickLinks.lost")}
          </AnchorPill>
        </div>
      </section>

      {/* GRID */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* CONTENT */}
        <div className="grid gap-6">
          <Section id="intro" title={t("sections.intro.title")}>
            <p>{t("sections.intro.body")}</p>
          </Section>

          <Section id="processing" title={t("sections.processing.title")}>
            <List
              items={[
                t("sections.processing.items.0"),
                t("sections.processing.items.1"),
                t("sections.processing.items.2"),
              ]}
            />
            <StatsRow
              stats={[
                {
                  label: t("sections.processing.stats.standard.label"),
                  value: t("sections.processing.stats.standard.value"),
                },
                {
                  label: t("sections.processing.stats.personalized.label"),
                  value: t("sections.processing.stats.personalized.value"),
                },
                {
                  label: t("sections.processing.stats.cutoff.label"),
                  value: t("sections.processing.stats.cutoff.value"),
                },
              ]}
            />
          </Section>

          <Section id="carriers" title={t("sections.carriers.title")}>
            <p>{t("sections.carriers.body")}</p>
          </Section>

          <Section id="rates" title={t("sections.rates.title")}>
            <List
              items={[
                t("sections.rates.items.0"),
                t("sections.rates.items.1"),
                t("sections.rates.items.2"),
              ]}
            />
          </Section>

          <Section id="estimates" title={t("sections.estimates.title")}>
            <p className="text-gray-700">{t("sections.estimates.body")}</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                region={t("sections.estimates.regions.europe.label")}
                days={t("sections.estimates.regions.europe.value")}
              />
              <StatCard
                region={t("sections.estimates.regions.northAmerica.label")}
                days={t("sections.estimates.regions.northAmerica.value")}
              />
              <StatCard
                region={t("sections.estimates.regions.southAmerica.label")}
                days={t("sections.estimates.regions.southAmerica.value")}
              />
              <StatCard
                region={t("sections.estimates.regions.asia.label")}
                days={t("sections.estimates.regions.asia.value")}
              />
              <StatCard
                region={t("sections.estimates.regions.oceania.label")}
                days={t("sections.estimates.regions.oceania.value")}
              />
              <StatCard
                region={t("sections.estimates.regions.middleEast.label")}
                days={t("sections.estimates.regions.middleEast.value")}
              />
            </div>

            <Callout tone="info" icon={<Clock className="h-4 w-4" />}>
              {t("sections.estimates.callout")}
            </Callout>
          </Section>

          <Section id="tracking" title={t("sections.tracking.title")}>
            <p>
              {t.rich("sections.tracking.body", {
                shippingTracking: (chunks) => (
                  <Link href="/shipping-tracking" className="text-blue-700 underline">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </Section>

          <Section id="address" title={t("sections.address.title")}>
            <List
              items={[
                t("sections.address.items.0"),
                t("sections.address.items.1"),
              ]}
            />
          </Section>

          <Section id="customs" title={t("sections.customs.title")}>
            <List
              items={[
                t("sections.customs.items.0"),
                t("sections.customs.items.1"),
                t("sections.customs.items.2"),
              ]}
            />
          </Section>

          <Section id="failed" title={t("sections.failed.title")}>
            <List
              items={[
                t("sections.failed.items.0"),
                t("sections.failed.items.1"),
                t("sections.failed.items.2"),
              ]}
            />
          </Section>

          <Section id="lost" title={t("sections.lost.title")}>
            <List
              items={[
                t("sections.lost.items.0"),
                t("sections.lost.items.1"),
                t("sections.lost.items.2"),
              ]}
            />
          </Section>

          <Section id="split" title={t("sections.split.title")}>
            <p>{t("sections.split.body")}</p>
          </Section>

          <Section id="preorders" title={t("sections.preorders.title")}>
            <p>{t("sections.preorders.body")}</p>
          </Section>

          <Section id="holidays" title={t("sections.holidays.title")}>
            <p>{t("sections.holidays.body")}</p>
          </Section>

          <Section id="force" title={t("sections.force.title")}>
            <p>{t("sections.force.body")}</p>
          </Section>

          <Section id="contact" title={t("sections.contact.title")}>
            <p>
              {t.rich("sections.contact.body", {
                shippingTracking: (chunks) => (
                  <Link href="/shipping-tracking" className="text-blue-700 underline">
                    {chunks}
                  </Link>
                ),
                contactSupport: (chunks) => (
                  <Link href="/contact" className="text-blue-700 underline">
                    {chunks}
                  </Link>
                ),
                email: (chunks) => (
                  <a href="mailto:myfootballworldstore@gmail.com" className="text-blue-700 underline">
                    {chunks}
                  </a>
                ),
              })}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/returns"
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm hover:bg-gray-50"
              >
                <Undo2 className="h-4 w-4" />
                {t("sections.contact.buttons.returns")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/size-guide"
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm hover:bg-gray-50"
              >
                <PackageCheck className="h-4 w-4" />
                {t("sections.contact.buttons.sizeGuide")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Section>
        </div>

        {/* STICKY NAV */}
        <aside className="h-max lg:sticky lg:top-28">
          <div className="rounded-2xl border bg-white/85 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold">{t("sidebar.title")}</h3>
            </div>

            <ul className="mt-3 space-y-1.5 text-sm">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-gray-50"
                  >
                    <span className="text-gray-700">{s.icon}</span>
                    <span className="text-gray-700">{s.label}</span>
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-4 grid gap-2">
              <Link
                href="/shipping-tracking"
                className="inline-flex items-center justify-between rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Plane className="h-4 w-4 text-blue-600" />
                  {t("sidebar.links.shippingTracking")}
                </span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
              <Link
                href="/returns"
                className="inline-flex items-center justify-between rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Undo2 className="h-4 w-4 text-amber-600" />
                  {t("sidebar.links.startReturn")}
                </span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600">
              <StatMini
                label={t("sidebar.stats.production.label")}
                value={t("sidebar.stats.production.value")}
              />
              <StatMini
                label={t("sidebar.stats.worldwide.label")}
                value={t("sidebar.stats.worldwide.value")}
              />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

/* UI helpers */

function AnchorPill({
  id,
  icon,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <a
      href={`#${id}`}
      className="inline-flex items-center gap-2 rounded-full border bg-white/80 px-3 py-1 text-sm hover:bg-white"
    >
      <span className="text-gray-700">{icon}</span>
      {children}
    </a>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rounded-2xl border bg-white/70 p-6 shadow-sm">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-2 space-y-2 text-gray-700">{children}</div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 list-disc pl-5 space-y-1">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

function Callout({
  tone = "info",
  icon,
  children,
}: {
  tone?: "info" | "warn";
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const styles =
    tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-blue-200 bg-blue-50 text-blue-900";

  return (
    <div className={`mt-3 rounded-xl border p-3 text-sm ${styles}`}>
      <div className="flex items-center gap-2">
        {icon}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

function StatCard({ region, days }: { region: string; days: string }) {
  return (
    <div className="rounded-xl border bg-white/70 p-4">
      <div className="text-xs text-gray-600">{region}</div>
      <div className="mt-0.5 text-base font-semibold">{days}</div>
    </div>
  );
}

function StatsRow({
  stats,
}: {
  stats: { label: string; value: string }[];
}) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border bg-white/70 p-3 text-center">
          <div className="text-xs text-gray-600">{s.label}</div>
          <div className="text-base font-semibold">{s.value}</div>
        </div>
      ))}
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border px-3 py-2">
      <div className="text-[11px] text-gray-600">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}