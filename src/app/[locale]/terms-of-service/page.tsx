// src/app/[locale]/terms-of-service/page.tsx
import { Link } from "@/i18n/navigation";
import {
  FileText,
  ShieldCheck,
  Scale,
  Truck,
  BadgePercent,
  CreditCard,
  Palette,
  PackageCheck,
  Undo2,
  XCircle,
  Clock,
  Globe,
  LockKeyhole,
  Info,
  Gavel,
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
  const t = await getTranslations({ locale, namespace: "termsPage.metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

/* ---------- section index ---------- */
async function getSections(locale: string) {
  const t = await getTranslations({ locale, namespace: "termsPage" });

  return [
    { id: "intro", label: t("sections.intro.label"), icon: <FileText className="h-4 w-4" /> },
    { id: "account", label: t("sections.account.label"), icon: <ShieldCheck className="h-4 w-4" /> },
    { id: "ordering", label: t("sections.ordering.label"), icon: <PackageCheck className="h-4 w-4" /> },
    { id: "pricing", label: t("sections.pricing.label"), icon: <BadgePercent className="h-4 w-4" /> },
    { id: "shipping", label: t("sections.shipping.label"), icon: <Truck className="h-4 w-4" /> },
    { id: "custom", label: t("sections.custom.label"), icon: <Palette className="h-4 w-4" /> },
    { id: "returns", label: t("sections.returns.label"), icon: <Undo2 className="h-4 w-4" /> },
    { id: "cancel", label: t("sections.cancel.label"), icon: <XCircle className="h-4 w-4" /> },
    { id: "product", label: t("sections.product.label"), icon: <Info className="h-4 w-4" /> },
    { id: "payments", label: t("sections.payments.label"), icon: <CreditCard className="h-4 w-4" /> },
    { id: "promos", label: t("sections.promos.label"), icon: <BadgePercent className="h-4 w-4" /> },
    { id: "ip", label: t("sections.ip.label"), icon: <LockKeyhole className="h-4 w-4" /> },
    { id: "acceptable", label: t("sections.acceptable.label"), icon: <ShieldCheck className="h-4 w-4" /> },
    { id: "third", label: t("sections.third.label"), icon: <Globe className="h-4 w-4" /> },
    { id: "warranty", label: t("sections.warranty.label"), icon: <Scale className="h-4 w-4" /> },
    { id: "law", label: t("sections.law.label"), icon: <Gavel className="h-4 w-4" /> },
    { id: "contact", label: t("sections.contact.label"), icon: <FileText className="h-4 w-4" /> },
  ];
}

export default async function TermsOfServicePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "termsPage" });
  const sections = await getSections(locale);

  return (
    <main className="container-fw pb-24 pt-16 md:pt-24">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-20 mx-auto h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed right-0 top-64 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl"
      />

      {/* HERO */}
      <section className="relative mb-8 overflow-hidden rounded-3xl border bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-6 shadow-sm md:p-8">
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full border bg-white/80 px-2.5 py-1">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            {t("hero.badges.clear")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border bg-white/80 px-2.5 py-1">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            {t("hero.badges.updated")}
          </span>
        </div>

        <h1 className="mt-3 bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent md:text-4xl">
          {t("hero.title")}
        </h1>

        <p className="mt-2 max-w-3xl text-gray-600">
          {t.rich("hero.description", {
            privacy: (chunks) => (
              <Link href="/privacy-policy" className="text-blue-700 underline">
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
          <AnchorPill id="returns" icon={<Undo2 className="h-4 w-4" />}>
            {t("hero.quickLinks.returns")}
          </AnchorPill>
          <AnchorPill id="payments" icon={<CreditCard className="h-4 w-4" />}>
            {t("hero.quickLinks.payments")}
          </AnchorPill>
        </div>
      </section>

      {/* GRID */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-6">
          <Section id="intro" title={t("sections.intro.title")}>
            <p>{t("sections.intro.body")}</p>
            <Callout tone="info" icon={<Info className="h-4 w-4" />}>
              {t("sections.intro.callout")}
            </Callout>
          </Section>

          <Section id="account" title={t("sections.account.title")}>
            <List
              items={[
                t("sections.account.items.0"),
                t("sections.account.items.1"),
                t("sections.account.items.2"),
              ]}
            />
          </Section>

          <Section id="ordering" title={t("sections.ordering.title")}>
            <List
              items={[
                t("sections.ordering.items.0"),
                t("sections.ordering.items.1"),
                t("sections.ordering.items.2"),
              ]}
            />
          </Section>

          <Section id="pricing" title={t("sections.pricing.title")}>
            <List
              items={[
                t("sections.pricing.items.0"),
                t("sections.pricing.items.1"),
                t("sections.pricing.items.2"),
              ]}
            />
          </Section>

          <Section id="shipping" title={t("sections.shipping.title")}>
            <p>
              {t.rich("sections.shipping.body", {
                shipping: (chunks) => (
                  <Link href="/shipping-tracking" className="text-blue-700 underline">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Stat
                label={t("sections.shipping.stats.production.label")}
                value={t("sections.shipping.stats.production.value")}
              />
              <Stat
                label={t("sections.shipping.stats.transit.label")}
                value={t("sections.shipping.stats.transit.value")}
              />
              <Stat
                label={t("sections.shipping.stats.coverage.label")}
                value={t("sections.shipping.stats.coverage.value")}
              />
            </div>
          </Section>

          <Section id="custom" title={t("sections.custom.title")}>
            <List
              items={[
                t("sections.custom.items.0"),
                t("sections.custom.items.1"),
              ]}
            />
            <Callout tone="info" icon={<Palette className="h-4 w-4" />}>
              {t.rich("sections.custom.callout", {
                sizeGuide: (chunks) => (
                  <Link href="/size-guide" className="underline">
                    {chunks}
                  </Link>
                ),
              })}
            </Callout>
          </Section>

          <Section id="returns" title={t("sections.returns.title")}>
            <p>
              {t.rich("sections.returns.body", {
                returns: (chunks) => (
                  <Link href="/returns" className="text-blue-700 underline">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </Section>

          <Section id="cancel" title={t("sections.cancel.title")}>
            <List
              items={[
                t("sections.cancel.items.0"),
                t("sections.cancel.items.1"),
              ]}
            />
          </Section>

          <Section id="product" title={t("sections.product.title")}>
            <p>
              {t.rich("sections.product.body", {
                sizeGuide: (chunks) => (
                  <Link href="/size-guide" className="text-blue-700 underline">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </Section>

          <Section id="payments" title={t("sections.payments.title")}>
            <List
              items={[
                t("sections.payments.items.0"),
                t("sections.payments.items.1"),
              ]}
            />
            <Callout tone="info" icon={<LockKeyhole className="h-4 w-4" />}>
              {t("sections.payments.callout")}
            </Callout>
          </Section>

          <Section id="promos" title={t("sections.promos.title")}>
            <List
              items={[
                t("sections.promos.items.0"),
                t("sections.promos.items.1"),
              ]}
            />
          </Section>

          <Section id="ip" title={t("sections.ip.title")}>
            <p>{t("sections.ip.body")}</p>
          </Section>

          <Section id="acceptable" title={t("sections.acceptable.title")}>
            <List
              items={[
                t("sections.acceptable.items.0"),
                t("sections.acceptable.items.1"),
                t("sections.acceptable.items.2"),
              ]}
            />
          </Section>

          <Section id="third" title={t("sections.third.title")}>
            <p>{t("sections.third.body")}</p>
          </Section>

          <Section id="warranty" title={t("sections.warranty.title")}>
            <List
              items={[
                t("sections.warranty.items.0"),
                t("sections.warranty.items.1"),
                t("sections.warranty.items.2"),
              ]}
            />
          </Section>

          <Section id="law" title={t("sections.law.title")}>
            <p>{t("sections.law.body")}</p>
          </Section>

          <Section id="contact" title={t("sections.contact.title")}>
            <p>
              {t.rich("sections.contact.body", {
                contact: (chunks) => (
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
                href="/privacy-policy"
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm hover:bg-gray-50"
              >
                <LockKeyhole className="h-4 w-4" />
                {t("sections.contact.buttons.privacy")}
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/returns"
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm hover:bg-gray-50"
              >
                <Undo2 className="h-4 w-4" />
                {t("sections.contact.buttons.returns")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Section>
        </div>

        {/* STICKY SIDE NAV */}
        <aside className="h-max lg:sticky lg:top-28">
          <div className="rounded-2xl border bg-white/85 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
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
                  <Truck className="h-4 w-4 text-blue-600" />
                  {t("sidebar.links.shipping")}
                </span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>

              <Link
                href="/returns"
                className="inline-flex items-center justify-between rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Undo2 className="h-4 w-4 text-amber-600" />
                  {t("sidebar.links.return")}
                </span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600">
              <StatMini
                label={t("sidebar.stats.reply.label")}
                value={t("sidebar.stats.reply.value")}
              />
              <StatMini
                label={t("sidebar.stats.coverage.label")}
                value={t("sidebar.stats.coverage.value")}
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
    <ul className="mt-2 list-disc space-y-1 pl-5">
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white/70 p-3 text-center">
      <div className="text-xs text-gray-600">{label}</div>
      <div className="text-base font-semibold">{value}</div>
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