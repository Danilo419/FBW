// src/app/[locale]/return-and-refund-policy/page.tsx
import { Link } from "@/i18n/navigation";
import {
  Undo2,
  RotateCcw,
  BadgeDollarSign,
  ShieldCheck,
  Shirt,
  Package,
  PackageCheck,
  PackageOpen,
  AlertTriangle,
  AlertCircle,
  Clock,
  Gift,
  TicketPercent,
  FileText,
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
  const t = await getTranslations({ locale, namespace: "returnRefundPolicyPage.metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

/* ---------- section index ---------- */
async function getSections(locale: string) {
  const t = await getTranslations({ locale, namespace: "returnRefundPolicyPage" });

  return [
    { id: "intro", label: t("sections.intro.label"), icon: <FileText className="h-4 w-4" /> },
    { id: "window", label: t("sections.window.label"), icon: <Clock className="h-4 w-4" /> },
    { id: "condition", label: t("sections.condition.label"), icon: <Shirt className="h-4 w-4" /> },
    { id: "nonreturn", label: t("sections.nonreturn.label"), icon: <AlertCircle className="h-4 w-4" /> },
    { id: "personalized", label: t("sections.personalized.label"), icon: <ShieldCheck className="h-4 w-4" /> },
    { id: "start", label: t("sections.start.label"), icon: <Undo2 className="h-4 w-4" /> },
    { id: "exchanges", label: t("sections.exchanges.label"), icon: <RotateCcw className="h-4 w-4" /> },
    { id: "refunds", label: t("sections.refunds.label"), icon: <BadgeDollarSign className="h-4 w-4" /> },
    { id: "costs", label: t("sections.costs.label"), icon: <Package className="h-4 w-4" /> },
    { id: "defective", label: t("sections.defective.label"), icon: <PackageOpen className="h-4 w-4" /> },
    { id: "gifts", label: t("sections.gifts.label"), icon: <Gift className="h-4 w-4" /> },
    { id: "promos", label: t("sections.promos.label"), icon: <TicketPercent className="h-4 w-4" /> },
    { id: "contact", label: t("sections.contact.label"), icon: <Mail className="h-4 w-4" /> },
  ];
}

export default async function ReturnRefundPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "returnRefundPolicyPage" });
  const sections = await getSections(locale);

  const lastUpdated = new Intl.DateTimeFormat(t("footer.lastUpdatedLocale"), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

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
            returns: (chunks) => (
              <Link href="/returns" className="text-blue-700 underline">
                {chunks}
              </Link>
            ),
          })}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {sections.slice(0, 7).map((s) => (
            <AnchorPill key={s.id} id={s.id} icon={s.icon}>
              {s.label}
            </AnchorPill>
          ))}
          <AnchorPill id="refunds" icon={<BadgeDollarSign className="h-4 w-4" />}>
            {t("hero.quickLinks.refunds")}
          </AnchorPill>
          <AnchorPill id="defective" icon={<PackageOpen className="h-4 w-4" />}>
            {t("hero.quickLinks.defective")}
          </AnchorPill>
        </div>
      </section>

      {/* GRID */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* CONTENT */}
        <div className="grid gap-6">
          <Section id="intro" title={t("sections.intro.title")}>
            <p>
              {t.rich("sections.intro.body", {
                brand: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
          </Section>

          <Section id="window" title={t("sections.window.title")}>
            <List
              items={[
                t("sections.window.items.0"),
                t("sections.window.items.1"),
                t("sections.window.items.2"),
              ]}
            />
            <Callout tone="info" icon={<Clock className="h-4 w-4" />}>
              {t("sections.window.callout")}
            </Callout>
          </Section>

          <Section id="condition" title={t("sections.condition.title")}>
            <List
              items={[
                t("sections.condition.items.0"),
                t("sections.condition.items.1"),
                t("sections.condition.items.2"),
                t("sections.condition.items.3"),
              ]}
            />
            <Callout tone="warn" icon={<AlertTriangle className="h-4 w-4" />}>
              {t("sections.condition.callout")}
            </Callout>
          </Section>

          <Section id="nonreturn" title={t("sections.nonreturn.title")}>
            <List
              items={[
                t("sections.nonreturn.items.0"),
                t("sections.nonreturn.items.1"),
                t("sections.nonreturn.items.2"),
              ]}
            />
          </Section>

          <Section id="personalized" title={t("sections.personalized.title")}>
            <List
              items={[
                t("sections.personalized.items.0"),
                t("sections.personalized.items.1"),
              ]}
            />
            <Callout tone="info" icon={<ShieldCheck className="h-4 w-4" />}>
              {t("sections.personalized.callout")}
            </Callout>
          </Section>

          <Section id="start" title={t("sections.start.title")}>
            <List
              items={[
                t.rich("sections.start.items.0", {
                  returns: (chunks) => (
                    <Link href="/returns" className="text-blue-700 underline">
                      {chunks}
                    </Link>
                  ),
                }),
                t("sections.start.items.1"),
                t("sections.start.items.2"),
              ]}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/returns"
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm hover:bg-gray-50"
              >
                <Undo2 className="h-4 w-4" />
                {t("sections.start.buttons.return")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm hover:bg-gray-50"
              >
                <Mail className="h-4 w-4" />
                {t("sections.start.buttons.contact")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Section>

          <Section id="exchanges" title={t("sections.exchanges.title")}>
            <List
              items={[
                t("sections.exchanges.items.0"),
                t("sections.exchanges.items.1"),
              ]}
            />
          </Section>

          <Section id="refunds" title={t("sections.refunds.title")}>
            <List
              items={[
                t("sections.refunds.items.0"),
                t("sections.refunds.items.1"),
                t("sections.refunds.items.2"),
                t("sections.refunds.items.3"),
              ]}
            />
          </Section>

          <Section id="costs" title={t("sections.costs.title")}>
            <List
              items={[
                t("sections.costs.items.0"),
                t("sections.costs.items.1"),
                t("sections.costs.items.2"),
              ]}
            />
          </Section>

          <Section id="defective" title={t("sections.defective.title")}>
            <List
              items={[
                t("sections.defective.items.0"),
                t("sections.defective.items.1"),
                t("sections.defective.items.2"),
              ]}
            />
            <Callout tone="info" icon={<PackageCheck className="h-4 w-4" />}>
              {t("sections.defective.callout")}
            </Callout>
          </Section>

          <Section id="gifts" title={t("sections.gifts.title")}>
            <List
              items={[
                t("sections.gifts.items.0"),
                t("sections.gifts.items.1"),
              ]}
            />
          </Section>

          <Section id="promos" title={t("sections.promos.title")}>
            <List
              items={[
                t("sections.promos.items.0"),
                t("sections.promos.items.1"),
              ]}
            />
          </Section>

          <Section id="contact" title={t("sections.contact.title")}>
            <p>
              {t.rich("sections.contact.body", {
                returns: (chunks) => (
                  <Link href="/returns" className="text-blue-700 underline">
                    {chunks}
                  </Link>
                ),
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
          </Section>
        </div>

        {/* STICKY NAV */}
        <aside className="h-max lg:sticky lg:top-28">
          <div className="rounded-2xl border bg-white/85 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-blue-600" />
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
                href="/returns"
                className="inline-flex items-center justify-between rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Undo2 className="h-4 w-4 text-amber-600" />
                  {t("sidebar.links.return")}
                </span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-between rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                  {t("sidebar.links.contact")}
                </span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600">
              <StatMini
                label={t("sidebar.stats.window.label")}
                value={t("sidebar.stats.window.value")}
              />
              <StatMini
                label={t("sidebar.stats.refund.label")}
                value={t("sidebar.stats.refund.value")}
              />
            </div>
          </div>
        </aside>
      </div>

      <p className="mt-8 text-xs text-gray-500">
        {t("footer.lastUpdatedLabel")} {lastUpdated}
      </p>
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

function List({ items }: { items: React.ReactNode[] }) {
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

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border px-3 py-2">
      <div className="text-[11px] text-gray-600">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}