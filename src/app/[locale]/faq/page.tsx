// src/app/faq/page.tsx
import Link from "next/link";
import {
  HelpCircle,
  Truck,
  Package,
  BadgeCheck,
  Shirt,
  Ruler,
  RefreshCcw,
  ShieldCheck,
  CreditCard,
  Globe2,
  Clock,
  MapPin,
  Search,
  Mail,
  AlertTriangle,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

const SUPPORT_EMAIL = "myfootballworldstore@gmail.com";

// ✅ agora envia diretamente para a tab de Orders
const MY_ORDERS_URL = "/account?tab=orders";

type FaqItem = {
  q: string;
  a: React.ReactNode;
  tags?: string[];
  icon?: React.ReactNode;
};

type FaqSection = {
  section: string;
  id: string;
  icon: React.ReactNode;
  items: FaqItem[];
};

export async function generateMetadata() {
  const t = await getTranslations("faqPage.metadata");

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function FAQPage() {
  const t = await getTranslations("faqPage");

  const FAQ: FaqSection[] = [
    {
      section: t("sections.orders.title"),
      id: "orders",
      icon: <Package className="h-4 w-4" />,
      items: [
        {
          q: t("sections.orders.items.placeOrder.q"),
          a: (
            <div className="space-y-2">
              <p>
                {t.rich("sections.orders.items.placeOrder.a1", {
                  cart: (chunks) => (
                    <Link
                      href="/cart"
                      className="underline hover:text-blue-700"
                    >
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
              <p className="text-sm text-gray-600">
                {t("sections.orders.items.placeOrder.a2")}
              </p>
            </div>
          ),
          tags: [
            t("sections.orders.items.placeOrder.tags.0"),
            t("sections.orders.items.placeOrder.tags.1"),
          ],
          icon: <ChevronRight className="h-4 w-4" />,
        },
        {
          q: t("sections.orders.items.confirmation.q"),
          a: <p>{t("sections.orders.items.confirmation.a")}</p>,
          tags: [
            t("sections.orders.items.confirmation.tags.0"),
            t("sections.orders.items.confirmation.tags.1"),
          ],
          icon: <BadgeCheck className="h-4 w-4" />,
        },
        {
          q: t("sections.orders.items.changeCancel.q"),
          a: (
            <div className="space-y-2">
              <p>{t("sections.orders.items.changeCancel.a1")}</p>
              <p className="text-sm text-gray-600">
                {t("sections.orders.items.changeCancel.a2")}
              </p>
            </div>
          ),
          tags: [
            t("sections.orders.items.changeCancel.tags.0"),
            t("sections.orders.items.changeCancel.tags.1"),
          ],
          icon: <AlertTriangle className="h-4 w-4" />,
        },
      ],
    },
    {
      section: t("sections.shipping.title"),
      id: "shipping",
      icon: <Truck className="h-4 w-4" />,
      items: [
        {
          q: t("sections.shipping.items.estimates.q"),
          a: (
            <div className="space-y-2">
              <p>{t("sections.shipping.items.estimates.a1")}</p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                <li>
                  <span className="font-semibold">
                    {t("sections.shipping.items.estimates.regions.europe.label")}
                  </span>{" "}
                  {t("sections.shipping.items.estimates.regions.europe.value")}
                </li>
                <li>
                  <span className="font-semibold">
                    {t(
                      "sections.shipping.items.estimates.regions.northAmerica.label"
                    )}
                  </span>{" "}
                  {t(
                    "sections.shipping.items.estimates.regions.northAmerica.value"
                  )}
                </li>
                <li>
                  <span className="font-semibold">
                    {t(
                      "sections.shipping.items.estimates.regions.southAmerica.label"
                    )}
                  </span>{" "}
                  {t(
                    "sections.shipping.items.estimates.regions.southAmerica.value"
                  )}
                </li>
                <li>
                  <span className="font-semibold">
                    {t("sections.shipping.items.estimates.regions.asia.label")}
                  </span>{" "}
                  {t("sections.shipping.items.estimates.regions.asia.value")}
                </li>
                <li>
                  <span className="font-semibold">
                    {t("sections.shipping.items.estimates.regions.oceania.label")}
                  </span>{" "}
                  {t("sections.shipping.items.estimates.regions.oceania.value")}
                </li>
                <li>
                  <span className="font-semibold">
                    {t(
                      "sections.shipping.items.estimates.regions.middleEast.label"
                    )}
                  </span>{" "}
                  {t(
                    "sections.shipping.items.estimates.regions.middleEast.value"
                  )}
                </li>
              </ul>
              <p className="text-sm text-gray-600">
                {t("sections.shipping.items.estimates.a2")}
              </p>
            </div>
          ),
          tags: [
            t("sections.shipping.items.estimates.tags.0"),
            t("sections.shipping.items.estimates.tags.1"),
          ],
          icon: <Clock className="h-4 w-4" />,
        },
        {
          q: t("sections.shipping.items.tracking.q"),
          a: <p>{t("sections.shipping.items.tracking.a")}</p>,
          tags: [t("sections.shipping.items.tracking.tags.0")],
          icon: <Search className="h-4 w-4" />,
        },
        {
          q: t("sections.shipping.items.customs.q"),
          a: <p>{t("sections.shipping.items.customs.a")}</p>,
          tags: [
            t("sections.shipping.items.customs.tags.0"),
            t("sections.shipping.items.customs.tags.1"),
          ],
          icon: <Globe2 className="h-4 w-4" />,
        },
        {
          q: t("sections.shipping.items.address.q"),
          a: (
            <div className="space-y-2">
              <p>{t("sections.shipping.items.address.a1")}</p>
              <p className="text-sm text-gray-600">
                {t("sections.shipping.items.address.a2")}
              </p>
            </div>
          ),
          tags: [t("sections.shipping.items.address.tags.0")],
          icon: <MapPin className="h-4 w-4" />,
        },
      ],
    },
    {
      section: t("sections.products.title"),
      id: "products",
      icon: <Shirt className="h-4 w-4" />,
      items: [
        {
          q: t("sections.products.items.original.q"),
          a: (
            <div className="space-y-2">
              <p>{t("sections.products.items.original.a1")}</p>
              <p className="text-sm text-gray-600">
                {t("sections.products.items.original.a2")}
              </p>
            </div>
          ),
          tags: [
            t("sections.products.items.original.tags.0"),
            t("sections.products.items.original.tags.1"),
          ],
          icon: <Sparkles className="h-4 w-4" />,
        },
        {
          q: t("sections.products.items.size.q"),
          a: (
            <div className="space-y-2">
              <p>{t("sections.products.items.size.a1")}</p>
              <p className="text-sm text-gray-600">
                {t("sections.products.items.size.a2")}
              </p>
            </div>
          ),
          tags: [
            t("sections.products.items.size.tags.0"),
            t("sections.products.items.size.tags.1"),
          ],
          icon: <Ruler className="h-4 w-4" />,
        },
        {
          q: t("sections.products.items.personalization.q"),
          a: <p>{t("sections.products.items.personalization.a")}</p>,
          tags: [
            t("sections.products.items.personalization.tags.0"),
            t("sections.products.items.personalization.tags.1"),
            t("sections.products.items.personalization.tags.2"),
          ],
          icon: <BadgeCheck className="h-4 w-4" />,
        },
      ],
    },
    {
      section: t("sections.payments.title"),
      id: "payments",
      icon: <CreditCard className="h-4 w-4" />,
      items: [
        {
          q: t("sections.payments.items.methods.q"),
          a: (
            <div className="space-y-2">
              <p>{t("sections.payments.items.methods.a1")}</p>

              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                <li>{t("sections.payments.items.methods.list.0")}</li>
                <li>{t("sections.payments.items.methods.list.1")}</li>
                <li>{t("sections.payments.items.methods.list.2")}</li>
                <li>{t("sections.payments.items.methods.list.3")}</li>
                <li>{t("sections.payments.items.methods.list.4")}</li>
                <li>{t("sections.payments.items.methods.list.5")}</li>
                <li>{t("sections.payments.items.methods.list.6")}</li>
                <li>{t("sections.payments.items.methods.list.7")}</li>
                <li>{t("sections.payments.items.methods.list.8")}</li>
                <li>{t("sections.payments.items.methods.list.9")}</li>
              </ul>

              <p className="text-sm text-gray-600">
                {t("sections.payments.items.methods.a2")}
              </p>
            </div>
          ),
          tags: [
            t("sections.payments.items.methods.tags.0"),
            t("sections.payments.items.methods.tags.1"),
            t("sections.payments.items.methods.tags.2"),
            t("sections.payments.items.methods.tags.3"),
            t("sections.payments.items.methods.tags.4"),
          ],
          icon: <CreditCard className="h-4 w-4" />,
        },
        {
          q: t("sections.payments.items.secure.q"),
          a: <p>{t("sections.payments.items.secure.a")}</p>,
          tags: [t("sections.payments.items.secure.tags.0")],
          icon: <ShieldCheck className="h-4 w-4" />,
        },
      ],
    },
    {
      section: t("sections.returns.title"),
      id: "returns",
      icon: <RefreshCcw className="h-4 w-4" />,
      items: [
        {
          q: t("sections.returns.items.policy.q"),
          a: (
            <div className="space-y-2">
              <p>{t("sections.returns.items.policy.a")}</p>
            </div>
          ),
          tags: [t("sections.returns.items.policy.tags.0")],
          icon: <RefreshCcw className="h-4 w-4" />,
        },
        {
          q: t("sections.returns.items.damaged.q"),
          a: (
            <div className="space-y-2">
              <p>{t("sections.returns.items.damaged.a")}</p>
            </div>
          ),
          tags: [
            t("sections.returns.items.damaged.tags.0"),
            t("sections.returns.items.damaged.tags.1"),
            t("sections.returns.items.damaged.tags.2"),
          ],
          icon: <AlertTriangle className="h-4 w-4" />,
        },
      ],
    },
    {
      section: t("sections.support.title"),
      id: "support",
      icon: <HelpCircle className="h-4 w-4" />,
      items: [
        {
          q: t("sections.support.items.contact.q"),
          a: (
            <div className="space-y-2">
              <p>
                {t.rich("sections.support.items.contact.a1", {
                  email: () => (
                    <a
                      className="underline hover:text-blue-700"
                      href={`mailto:${SUPPORT_EMAIL}`}
                    >
                      {SUPPORT_EMAIL}
                    </a>
                  ),
                })}
              </p>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={MY_ORDERS_URL}
                  className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <Package className="h-4 w-4" />
                  {t("sections.support.items.contact.buttons.orders")}
                </Link>

                <Link
                  href="/shipping-policy"
                  className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <Truck className="h-4 w-4" />
                  {t("sections.support.items.contact.buttons.shipping")}
                </Link>
              </div>

              <p className="flex items-center gap-2 text-xs text-gray-500">
                <Mail className="h-4 w-4" />
                {t("sections.support.items.contact.a2")}
              </p>
            </div>
          ),
          tags: [
            t("sections.support.items.contact.tags.0"),
            t("sections.support.items.contact.tags.1"),
          ],
          icon: <Mail className="h-4 w-4" />,
        },
      ],
    },
  ];

  const lastUpdate = new Intl.DateTimeFormat(t("lastUpdateLocale"), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  return (
    <main className="min-h-[calc(100vh-6rem)]">
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-white">
        <div className="pointer-events-none absolute inset-0 opacity-80">
          <div className="absolute -top-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-blue-200 blur-3xl" />
          <div className="absolute -bottom-44 -left-40 h-[30rem] w-[30rem] rounded-full bg-cyan-200 blur-3xl" />
        </div>

        <div className="container-fw relative py-12 md:py-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border bg-white/80 px-3 py-1 text-xs font-semibold text-gray-700">
              <HelpCircle className="h-4 w-4 text-blue-700" />
              {t("hero.badge")}
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
              {t("hero.title")}
            </h1>
            <p className="mt-3 text-base text-gray-600 md:text-lg">
              {t("hero.subtitle")}
            </p>

            {/* Quick links */}
            <div className="mt-7 flex flex-wrap gap-2">
              {FAQ.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="inline-flex items-center gap-2 rounded-full border bg-white/80 px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <span className="text-gray-700">{s.icon}</span>
                  <span className="font-medium">{s.section}</span>
                </a>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/shipping-policy"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Truck className="h-4 w-4" />
                {t("hero.buttons.shippingPolicy")}
              </Link>

              <Link
                href="/cart"
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                <Package className="h-4 w-4" />
                {t("hero.buttons.cart")}
              </Link>

              <Link
                href={MY_ORDERS_URL}
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                <Package className="h-4 w-4" />
                {t("hero.buttons.orders")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="container-fw py-10 md:py-14">
        <div className="grid gap-8">
          {FAQ.map((section) => (
            <div key={section.id} id={section.id} className="scroll-mt-28">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center justify-center rounded-xl border bg-white px-2.5 py-2">
                  {section.icon}
                </div>
                <h2 className="text-xl font-semibold md:text-2xl">
                  {section.section}
                </h2>
              </div>

              <div className="mt-4 grid gap-3">
                {section.items.map((it) => (
                  <details
                    key={it.q}
                    className="group rounded-2xl border bg-white/80 px-4 py-3 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.25)] backdrop-blur"
                  >
                    <summary className="list-none cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border bg-white">
                          {it.icon ?? <ChevronRight className="h-4 w-4" />}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-gray-900 md:text-[15px]">
                              {it.q}
                            </div>
                            <span className="ml-auto text-gray-400 transition-transform duration-200 group-open:rotate-90">
                              <ChevronRight className="h-4 w-4" />
                            </span>
                          </div>

                          {it.tags?.length ? (
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {it.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full border bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </summary>

                    <div className="mt-3 pl-11 text-sm leading-relaxed text-gray-700">
                      {it.a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}

          {/* Footer CTA */}
          <div className="rounded-3xl border bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                  <ShieldCheck className="h-4 w-4 text-blue-700" />
                  {t("footer.badge")}
                </div>
                <h3 className="mt-2 text-lg font-semibold md:text-xl">
                  {t("footer.title")}
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  {t("footer.subtitle")}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={MY_ORDERS_URL}
                  className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-white"
                >
                  <Package className="h-4 w-4" />
                  {t("footer.buttons.orders")}
                </Link>

                <Link
                  href="/shipping-policy"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Truck className="h-4 w-4" />
                  {t("footer.buttons.shippingPolicy")}
                </Link>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            {t("lastUpdateLabel")} {lastUpdate}
          </div>
        </div>
      </section>
    </main>
  );
}