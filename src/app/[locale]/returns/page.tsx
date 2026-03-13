// src/app/[locale]/returns/page.tsx
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import {
  RotateCcw,
  BadgeDollarSign,
  Package,
  Shirt,
  Tag,
  Scissors,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Truck,
  ShieldCheck,
  HelpCircle,
  Info,
  Camera,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

// Use a literal (not an expression) to avoid "Unsupported node type BinaryExpression"
export const revalidate = 3600; // 1h

const SUPPORT_EMAIL = "myfootballworldstore@gmail.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "returnsPage.metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function ReturnsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "returnsPage" });

  return (
    <div className="container-fw section-gap">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t("header.title")}
        </h1>
        <p className="mt-3 max-w-3xl text-gray-600">
          {t("header.description")}
        </p>
      </header>

      {/* Policy at a glance */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card>
          <Header
            icon={<Clock className="h-5 w-5 text-blue-600" />}
            title={t("glance.returnWindow.title")}
          />
          <ul className="mt-2 space-y-2 text-sm text-gray-700">
            <li>
              • {t("glance.returnWindow.items.0.before")}
              <b>{t("glance.returnWindow.items.0.highlight")}</b>
              {t("glance.returnWindow.items.0.after")}
            </li>
            <li>• {t("glance.returnWindow.items.1")}</li>
          </ul>
        </Card>

        <Card>
          <Header
            icon={<ShieldCheck className="h-5 w-5 text-emerald-600" />}
            title={t("glance.itemCondition.title")}
          />
          <ul className="mt-2 space-y-2 text-sm text-gray-700">
            <li>• {t("glance.itemCondition.items.0")}</li>
            <li>• {t("glance.itemCondition.items.1")}</li>
            <li>• {t("glance.itemCondition.items.2")}</li>
          </ul>
        </Card>

        <Card>
          <Header
            icon={<BadgeDollarSign className="h-5 w-5 text-amber-600" />}
            title={t("glance.refundsCosts.title")}
          />
          <ul className="mt-2 space-y-2 text-sm text-gray-700">
            <li>• {t("glance.refundsCosts.items.0")}</li>
            <li>• {t("glance.refundsCosts.items.1")}</li>
            <li>• {t("glance.refundsCosts.items.2")}</li>
          </ul>
        </Card>
      </section>

      {/* Eligibility & exclusions */}
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card>
          <Header
            icon={<Package className="h-5 w-5 text-purple-600" />}
            title={t("eligibility.eligible.title")}
          />
          <Bullet>{t("eligibility.eligible.items.0")}</Bullet>
          <Bullet>{t("eligibility.eligible.items.1")}</Bullet>
          <Bullet>{t("eligibility.eligible.items.2")}</Bullet>
        </Card>

        <Card>
          <Header
            icon={<AlertTriangle className="h-5 w-5 text-rose-600" />}
            title={t("eligibility.notReturnable.title")}
          />
          <Bullet icon={<Shirt className="h-4 w-4" />}>
            <b>{t("eligibility.notReturnable.items.0.highlight")}</b>
            {t("eligibility.notReturnable.items.0.after")}
          </Bullet>
          <Bullet icon={<Scissors className="h-4 w-4" />}>
            {t("eligibility.notReturnable.items.1")}
          </Bullet>
          <Bullet icon={<Tag className="h-4 w-4" />}>
            {t("eligibility.notReturnable.items.2")}
          </Bullet>
          <Bullet>{t("eligibility.notReturnable.items.3")}</Bullet>
        </Card>
      </section>

      {/* How to start */}
      <section className="mt-10">
        <Card>
          <Header
            icon={<RotateCcw className="h-5 w-5 text-sky-600" />}
            title={t("start.title")}
          />
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-700">
            <li>
              {t.rich("start.steps.0", {
                email: () => <b>{SUPPORT_EMAIL}</b>,
                contact: (chunks) => (
                  <Link href="/contact" className="text-blue-700 hover:underline">
                    {chunks}
                  </Link>
                ),
                order: (chunks) => <b>{chunks}</b>,
              })}
            </li>
            <li>
              {t("start.steps.1.before")}
              <span className="text-gray-500">{t("start.steps.1.highlight")}</span>
              {t("start.steps.1.after")}
            </li>
            <li>{t("start.steps.2")}</li>
            <li>{t("start.steps.3")}</li>
          </ol>
          <p className="mt-3 text-xs text-gray-500">{t("start.note")}</p>
        </Card>
      </section>

      {/* Exchanges section */}
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card>
          <Header
            icon={<Truck className="h-5 w-5 text-indigo-600" />}
            title={t("exchanges.size.title")}
          />
          <Bullet>{t("exchanges.size.items.0")}</Bullet>
          <Bullet>{t("exchanges.size.items.1")}</Bullet>
          <Bullet>{t("exchanges.size.items.2")}</Bullet>
          <Bullet>{t("exchanges.size.items.3")}</Bullet>
        </Card>

        <Card>
          <Header
            icon={<Camera className="h-5 w-5 text-amber-600" />}
            title={t("exchanges.damaged.title")}
          />
          <Bullet>
            {t("exchanges.damaged.items.0.before")}
            <b>{t("exchanges.damaged.items.0.highlight")}</b>
            {t("exchanges.damaged.items.0.after")}
          </Bullet>
          <Bullet>{t("exchanges.damaged.items.1")}</Bullet>
          <Bullet>{t("exchanges.damaged.items.2")}</Bullet>
        </Card>
      </section>

      {/* Refund timing */}
      <section className="mt-10">
        <Card>
          <Header
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            title={t("refundTiming.title")}
          />
          <p className="mt-2 text-sm text-gray-700">
            {t("refundTiming.description.before1")}
            <b>{t("refundTiming.description.highlight1")}</b>
            {t("refundTiming.description.between")}
            <b>{t("refundTiming.description.highlight2")}</b>
            {t("refundTiming.description.after")}
          </p>
        </Card>
      </section>

      {/* Cancellations */}
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card>
          <Header
            icon={<Info className="h-5 w-5 text-gray-700" />}
            title={t("cancellations.title")}
          />
          <Bullet>
            {t("cancellations.items.0.before")}
            <b>{t("cancellations.items.0.highlight")}</b>
            {t("cancellations.items.0.after")}
          </Bullet>
          <Bullet>{t("cancellations.items.1")}</Bullet>
        </Card>

        <Card>
          <Header
            icon={<HelpCircle className="h-5 w-5 text-blue-600" />}
            title={t("assistance.title")}
          />
          <p className="mt-2 text-sm text-gray-700">
            {t.rich("assistance.description", {
              faq: (chunks) => (
                <Link href="/faq" className="text-blue-700 hover:underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
          <div className="mt-4">
            <Link href="/contact" className="btn-primary">
              {t("assistance.button")}
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}

/* ---------- small UI helpers ---------- */

function Card({ children }: { children: React.ReactNode }) {
  return <div className="card p-6">{children}</div>;
}

function Header({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="rounded-xl bg-gray-50 p-2">{icon}</span>
      <h2 className="font-semibold">{title}</h2>
    </div>
  );
}

function Bullet({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mt-2 flex items-start gap-2 text-sm text-gray-700">
      <span className="mt-0.5">{icon ?? <span>•</span>}</span>
      <span>{children}</span>
    </div>
  );
}