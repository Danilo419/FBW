// src/app/[locale]/shipping/page.tsx
import type { Metadata } from "next";
import {
  Truck,
  Timer,
  ShieldCheck,
  Globe2,
  PackageOpen,
  MapPin,
  Info,
  HelpCircle,
  BadgePercent,
  ClipboardList,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const revalidate = 3600; // revalidates every hour

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "shippingPage.metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function ShippingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "shippingPage" });

  return (
    <div className="container-fw section-gap">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t("header.title")}
        </h1>
        <p className="mt-3 max-w-3xl text-gray-600">
          {t("header.description.before")}
          <b>{t("header.description.highlight")}</b>
          {t("header.description.after")}
        </p>
      </header>

      {/* Single shipping method */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-blue-50 p-2">
              <Truck className="h-5 w-5 text-blue-600" />
            </span>
            <h2 className="font-semibold">{t("standard.title")}</h2>
          </div>

          <p className="mt-2 text-sm text-gray-600">
            {t("standard.description")}
          </p>

          <DetailRow
            icon={<Timer className="h-4 w-4" />}
            text={t("standard.details.transit")}
          />
          <DetailRow
            icon={<Globe2 className="h-4 w-4" />}
            text={t("standard.details.worldwide")}
          />
          <DetailRow
            icon={<BadgePercent className="h-4 w-4" />}
            text={t("standard.details.checkout")}
          />
        </Card>
      </section>

      {/* Handling / production */}
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-amber-50 p-2">
              <ClipboardList className="h-5 w-5 text-amber-600" />
            </span>
            <h2 className="font-semibold">{t("handling.title")}</h2>
          </div>

          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            <li>
              • {t("handling.items.0.before")}
              <b>{t("handling.items.0.highlight")}</b>
              {t("handling.items.0.after")}
            </li>
            <li>• {t("handling.items.1")}</li>
            <li>• {t("handling.items.2")}</li>
          </ul>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-purple-50 p-2">
              <MapPin className="h-5 w-5 text-purple-600" />
            </span>
            <h2 className="font-semibold">{t("address.title")}</h2>
          </div>

          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            <li>
              • {t("address.items.0.before")}
              <b>{t("address.items.0.highlight")}</b>
              {t("address.items.0.after")}
            </li>
            <li>• {t("address.items.1")}</li>
          </ul>
        </Card>
      </section>

      {/* Tracking help */}
      <section className="mt-10">
        <Card>
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-sky-50 p-2">
              <Info className="h-5 w-5 text-sky-600" />
            </span>
            <h2 className="font-semibold">{t("tracking.title")}</h2>
          </div>

          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-700">
            <li>{t("tracking.steps.0")}</li>
            <li>{t("tracking.steps.1")}</li>
            <li>{t("tracking.steps.2")}</li>
          </ol>

          <div className="mt-4 flex flex-wrap gap-2">
            <TrackBadge href="https://t.17track.net" label="17TRACK" />
            <TrackBadge href="https://www.parcelsapp.com/en" label="Parcels" />
            <TrackBadge href="https://www.aftership.com/track" label="AfterShip" />
          </div>

          <p className="mt-4 text-xs text-gray-500">{t("tracking.tip")}</p>
        </Card>
      </section>

      {/* Customs / duties & delays */}
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-rose-50 p-2">
              <PackageOpen className="h-5 w-5 text-rose-600" />
            </span>
            <h2 className="font-semibold">{t("customs.title")}</h2>
          </div>

          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            <li>• {t("customs.items.0")}</li>
            <li>• {t("customs.items.1")}</li>
            <li>• {t("customs.items.2")}</li>
          </ul>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-lime-50 p-2">
              <ShieldCheck className="h-5 w-5 text-lime-600" />
            </span>
            <h2 className="font-semibold">{t("delays.title")}</h2>
          </div>

          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            <li>• {t("delays.items.0")}</li>
            <li>
              • {t("delays.items.1.before")}
              <b>{t("delays.items.1.highlight")}</b>
              {t("delays.items.1.after")}
            </li>
            <li>
              • {t("delays.items.2.before")}
              <b>{t("delays.items.2.highlight")}</b>
              {t("delays.items.2.after")}
            </li>
          </ul>
        </Card>
      </section>

      {/* Help CTA */}
      <section className="mt-10">
        <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-blue-50 p-2">
              <HelpCircle className="h-5 w-5 text-blue-600" />
            </span>

            <div>
              <h3 className="font-semibold">{t("help.title")}</h3>
              <p className="text-sm text-gray-600">
                {t.rich("help.description", {
                  faq: (chunks) => (
                    <Link href="/faq" className="text-blue-700 hover:underline">
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </div>
          </div>

          <Link
            href="/contact"
            className="btn-primary w-full text-center sm:w-auto"
          >
            {t("help.button")}
          </Link>
        </div>
      </section>
    </div>
  );
}

/* === small UI helpers (server components) === */

function Card({ children }: { children: React.ReactNode }) {
  return <div className="card p-6">{children}</div>;
}

function DetailRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function TrackBadge({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm hover:bg-gray-50"
    >
      {label} →
    </a>
  );
}