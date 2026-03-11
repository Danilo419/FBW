// src/app/privacy-policy/PrivacyClient.tsx
"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Shield,
  FileCheck2,
  Database,
  Cookie,
  CreditCard,
  Truck,
  Globe2,
  Lock,
  ShieldCheck,
  UserCheck,
  RefreshCw,
  Mail,
} from "lucide-react";

export default function PrivacyClient() {
  const t = useTranslations("privacyPolicyPage");
  const search = useSearchParams();
  const section = search.get("section");

  const sections = useMemo(
    () => [
      { id: "intro", label: t("sections.intro.label"), Icon: Shield },
      { id: "data", label: t("sections.data.label"), Icon: Database },
      { id: "use", label: t("sections.use.label"), Icon: FileCheck2 },
      { id: "legal", label: t("sections.legal.label"), Icon: ShieldCheck },
      { id: "sharing", label: t("sections.sharing.label"), Icon: Globe2 },
      { id: "payments", label: t("sections.payments.label"), Icon: CreditCard },
      { id: "shipping", label: t("sections.shipping.label"), Icon: Truck },
      { id: "cookies", label: t("sections.cookies.label"), Icon: Cookie },
      { id: "retention", label: t("sections.retention.label"), Icon: Lock },
      { id: "rights", label: t("sections.rights.label"), Icon: UserCheck },
      { id: "security", label: t("sections.security.label"), Icon: Shield },
      { id: "transfers", label: t("sections.transfers.label"), Icon: Globe2 },
      { id: "children", label: t("sections.children.label"), Icon: RefreshCw },
      { id: "changes", label: t("sections.changes.label"), Icon: FileCheck2 },
      { id: "contact", label: t("sections.contact.label"), Icon: Mail },
    ],
    [t]
  );

  useEffect(() => {
    if (!section) return;
    const el = document.getElementById(section);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [section]);

  return (
    <main className="min-h-screen bg-white">
      <div className="container-fw pb-24 pt-20 md:pt-28">
        {/* ======= HERO ======= */}
        <section className="relative overflow-hidden rounded-3xl border bg-white px-4 sm:px-6 md:px-8">
          <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full bg-cyan-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-12 h-64 w-64 rounded-full bg-blue-200/40 blur-3xl" />

          <div className="relative grid gap-6 py-6 sm:py-8 md:py-10">
            <div className="flex flex-col sm:flex-row sm:items-start sm:gap-4">
              <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg sm:mb-0">
                <Shield className="h-6 w-6" />
              </span>

              <div>
                <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                  {t("hero.title")}
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                  {t("hero.lastUpdated")}
                </p>
                <p className="mt-3 max-w-prose text-gray-700">
                  {t("hero.description")}
                </p>
              </div>
            </div>

            {/* Mobile TOC */}
            <nav
              aria-label={t("mobileNav.ariaLabel")}
              className="supports-[backdrop-filter]:bg-white/60 lg:hidden -mb-2 overflow-x-auto rounded-2xl border bg-white/80 backdrop-blur"
            >
              <ul className="flex min-w-max gap-2 p-2 text-sm">
                {sections.map(({ id, label }) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 hover:bg-gray-50"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </section>

        {/* ======= CONTENT + STICKY SIDEBAR ======= */}
        <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          {/* Main content */}
          <div className="grid gap-6">
            <PolicyCard
              id="intro"
              icon={<Shield className="h-4 w-4" />}
              title={t("sections.intro.title")}
            >
              <p>
                {t.rich("sections.intro.body", {
                  brand: (chunks) => <strong>{chunks}</strong>,
                })}
              </p>
            </PolicyCard>

            <PolicyCard
              id="data"
              icon={<Database className="h-4 w-4" />}
              title={t("sections.data.title")}
            >
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>{t("sections.data.items.account.title")}</strong>{" "}
                  {t("sections.data.items.account.text")}
                </li>
                <li>
                  <strong>{t("sections.data.items.payment.title")}</strong>{" "}
                  {t("sections.data.items.payment.text")}
                </li>
                <li>
                  <strong>{t("sections.data.items.support.title")}</strong>{" "}
                  {t("sections.data.items.support.text")}
                </li>
                <li>
                  <strong>{t("sections.data.items.usage.title")}</strong>{" "}
                  {t("sections.data.items.usage.text")}
                </li>
                <li>
                  <strong>{t("sections.data.items.cookies.title")}</strong>{" "}
                  {t("sections.data.items.cookies.text")}
                </li>
              </ul>
            </PolicyCard>

            <PolicyCard
              id="use"
              icon={<FileCheck2 className="h-4 w-4" />}
              title={t("sections.use.title")}
            >
              <ul className="list-disc space-y-1 pl-5">
                <li>{t("sections.use.items.0")}</li>
                <li>{t("sections.use.items.1")}</li>
                <li>{t("sections.use.items.2")}</li>
                <li>{t("sections.use.items.3")}</li>
                <li>{t("sections.use.items.4")}</li>
                <li>{t("sections.use.items.5")}</li>
              </ul>
            </PolicyCard>

            <PolicyCard
              id="legal"
              icon={<ShieldCheck className="h-4 w-4" />}
              title={t("sections.legal.title")}
            >
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>{t("sections.legal.items.contract.title")}</strong>{" "}
                  {t("sections.legal.items.contract.text")}
                </li>
                <li>
                  <strong>
                    {t("sections.legal.items.legitimateInterests.title")}
                  </strong>{" "}
                  {t("sections.legal.items.legitimateInterests.text")}
                </li>
                <li>
                  <strong>{t("sections.legal.items.consent.title")}</strong>{" "}
                  {t("sections.legal.items.consent.text")}
                </li>
                <li>
                  <strong>
                    {t("sections.legal.items.legalObligation.title")}
                  </strong>{" "}
                  {t("sections.legal.items.legalObligation.text")}
                </li>
              </ul>
            </PolicyCard>

            <PolicyCard
              id="sharing"
              icon={<Globe2 className="h-4 w-4" />}
              title={t("sections.sharing.title")}
            >
              <p>{t("sections.sharing.intro")}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  <strong>{t("sections.sharing.items.payments.title")}</strong>{" "}
                  {t("sections.sharing.items.payments.text")}
                </li>
                <li>
                  <strong>{t("sections.sharing.items.shipping.title")}</strong>{" "}
                  {t("sections.sharing.items.shipping.text")}
                </li>
                <li>
                  <strong>{t("sections.sharing.items.analytics.title")}</strong>{" "}
                  {t("sections.sharing.items.analytics.text")}
                </li>
                <li>
                  <strong>
                    {t("sections.sharing.items.infrastructure.title")}
                  </strong>{" "}
                  {t("sections.sharing.items.infrastructure.text")}
                </li>
              </ul>
              <p className="mt-2">{t("sections.sharing.outro")}</p>
            </PolicyCard>

            <PolicyCard
              id="payments"
              icon={<CreditCard className="h-4 w-4" />}
              title={t("sections.payments.title")}
            >
              <p>{t("sections.payments.body")}</p>
            </PolicyCard>

            <PolicyCard
              id="shipping"
              icon={<Truck className="h-4 w-4" />}
              title={t("sections.shipping.title")}
            >
              <p>
                {t.rich("sections.shipping.body", {
                  shippingLink: (chunks) => (
                    <Link
                      href="/shipping-tracking"
                      className="text-blue-700 underline"
                    >
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </PolicyCard>

            <PolicyCard
              id="cookies"
              icon={<Cookie className="h-4 w-4" />}
              title={t("sections.cookies.title")}
            >
              <p>{t("sections.cookies.intro")}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  <strong>{t("sections.cookies.items.essential.title")}</strong>{" "}
                  {t("sections.cookies.items.essential.text")}
                </li>
                <li>
                  <strong>{t("sections.cookies.items.analytics.title")}</strong>{" "}
                  {t("sections.cookies.items.analytics.text")}
                </li>
                <li>
                  <strong>{t("sections.cookies.items.marketing.title")}</strong>{" "}
                  {t("sections.cookies.items.marketing.text")}
                </li>
              </ul>
            </PolicyCard>

            <PolicyCard
              id="retention"
              icon={<Lock className="h-4 w-4" />}
              title={t("sections.retention.title")}
            >
              <p>{t("sections.retention.body")}</p>
            </PolicyCard>

            <PolicyCard
              id="rights"
              icon={<UserCheck className="h-4 w-4" />}
              title={t("sections.rights.title")}
            >
              <p>{t("sections.rights.intro")}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>{t("sections.rights.items.0")}</li>
                <li>{t("sections.rights.items.1")}</li>
                <li>{t("sections.rights.items.2")}</li>
                <li>{t("sections.rights.items.3")}</li>
                <li>{t("sections.rights.items.4")}</li>
              </ul>
              <p className="mt-2">
                {t.rich("sections.rights.outro", {
                  email: (chunks) => (
                    <a
                      href="mailto:myfootballworldstore@gmail.com"
                      className="text-blue-700 underline"
                    >
                      {chunks}
                    </a>
                  ),
                })}
              </p>
            </PolicyCard>

            <PolicyCard
              id="security"
              icon={<Shield className="h-4 w-4" />}
              title={t("sections.security.title")}
            >
              <p>{t("sections.security.body")}</p>
            </PolicyCard>

            <PolicyCard
              id="transfers"
              icon={<Globe2 className="h-4 w-4" />}
              title={t("sections.transfers.title")}
            >
              <p>{t("sections.transfers.body")}</p>
            </PolicyCard>

            <PolicyCard
              id="children"
              icon={<RefreshCw className="h-4 w-4" />}
              title={t("sections.children.title")}
            >
              <p>{t("sections.children.body")}</p>
            </PolicyCard>

            <PolicyCard
              id="changes"
              icon={<FileCheck2 className="h-4 w-4" />}
              title={t("sections.changes.title")}
            >
              <p>{t("sections.changes.body")}</p>
            </PolicyCard>

            <PolicyCard
              id="contact"
              icon={<Mail className="h-4 w-4" />}
              title={t("sections.contact.title")}
            >
              <p>
                {t.rich("sections.contact.body", {
                  email: (chunks) => (
                    <a
                      href="mailto:myfootballworldstore@gmail.com"
                      className="text-blue-700 underline"
                    >
                      {chunks}
                    </a>
                  ),
                })}
              </p>
              <p className="mt-3 text-xs text-gray-500">
                {t("sections.contact.note")}
              </p>
            </PolicyCard>
          </div>

          {/* Sticky sidebar TOC */}
          <aside className="relative hidden lg:block">
            <div className="sticky top-28 rounded-2xl border bg-white/80 p-3 backdrop-blur">
              <div className="px-2 py-1 text-xs font-semibold tracking-wide text-gray-600">
                {t("sidebar.title")}
              </div>

              <ul className="mt-1 space-y-1 text-[13px]">
                {sections.map(({ id, label, Icon }) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50"
                    >
                      <Icon className="h-3.5 w-3.5 text-blue-600" />
                      <span className="leading-tight">{label}</span>
                    </a>
                  </li>
                ))}
              </ul>

              <div className="mt-3 border-t pt-3">
                <a
                  href="#intro"
                  className="inline-flex items-center gap-2 text-xs text-blue-700 hover:underline"
                >
                  {t("sidebar.backToTop")}
                </a>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

/* ===================== Small UI helpers ===================== */
function PolicyCard({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="card group scroll-mt-28 p-6 sm:p-7"
    >
      <div className="flex items-center gap-2">
        {icon && (
          <span className="rounded-md bg-blue-50 p-1.5 text-blue-600">
            {icon}
          </span>
        )}
        <h2 id={`${id}-title`} className="text-lg font-semibold md:text-xl">
          {title}
        </h2>
      </div>
      <div className="mt-3 leading-relaxed text-gray-700">{children}</div>
      <div className="mt-4 h-1 w-0 rounded bg-gradient-to-r from-blue-600 to-cyan-400 transition-all group-hover:w-full" />
    </section>
  );
}