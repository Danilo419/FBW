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
} from "lucide-react";

export const metadata = {
  title: "FAQ — FootballWorld",
  description:
    "FootballWorld FAQ: orders, shipping times, tracking, payments, sizes, customization (name/number), returns, and support.",
};

type FaqItem = {
  q: string;
  a: React.ReactNode;
  tags?: string[];
  icon?: React.ReactNode;
};

const FAQ: { section: string; id: string; icon: React.ReactNode; items: FaqItem[] }[] = [
  {
    section: "Orders",
    id: "orders",
    icon: <Package className="h-4 w-4" />,
    items: [
      {
        q: "How do I place an order?",
        a: (
          <div className="space-y-2">
            <p>
              Pick your product, choose the options (size / version), and add to cart. Then go to{" "}
              <Link href="/cart" className="underline hover:text-blue-700">
                Cart
              </Link>{" "}
              and complete checkout.
            </p>
            <p className="text-sm text-gray-600">
              Tip: Use the search bar in the header to find a kit fast.
            </p>
          </div>
        ),
        tags: ["order", "checkout"],
        icon: <ChevronRight className="h-4 w-4" />,
      },
      {
        q: "Will I receive an order confirmation?",
        a: (
          <p>
            Yes — after payment you’ll see a confirmation screen and you should also receive an email
            confirmation. If you don’t see it, check Spam/Promotions.
          </p>
        ),
        tags: ["email", "confirmation"],
        icon: <BadgeCheck className="h-4 w-4" />,
      },
      {
        q: "Can I change or cancel my order?",
        a: (
          <div className="space-y-2">
            <p>
              If you need changes (size, name/number, address), contact us as soon as possible. If the
              order is already processed/shipped, changes may not be possible.
            </p>
            <p className="text-sm text-gray-600">
              The fastest way is to message support with your order number.
            </p>
          </div>
        ),
        tags: ["cancel", "change"],
        icon: <AlertTriangle className="h-4 w-4" />,
      },
    ],
  },
  {
    section: "Shipping & Delivery",
    id: "shipping",
    icon: <Truck className="h-4 w-4" />,
    items: [
      {
        q: "What are the delivery estimates by region?",
        a: (
          <div className="space-y-2">
            <p>Typical delivery estimates (business days):</p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
              <li>
                <span className="font-semibold">Europe:</span> 7–9
              </li>
              <li>
                <span className="font-semibold">North America:</span> 10–15
              </li>
              <li>
                <span className="font-semibold">South America:</span> 15–20
              </li>
              <li>
                <span className="font-semibold">Asia:</span> 10–12
              </li>
              <li>
                <span className="font-semibold">Oceania:</span> 9–12
              </li>
              <li>
                <span className="font-semibold">Middle East:</span> 7–15
              </li>
            </ul>
            <p className="text-sm text-gray-600">
              These are estimates and can vary due to customs, peak seasons, or local carrier delays.
            </p>
          </div>
        ),
        tags: ["delivery", "times"],
        icon: <Clock className="h-4 w-4" />,
      },
      {
        q: "Do you provide tracking?",
        a: (
          <p>
            Yes. When available, you’ll receive a tracking code. If you already have tracking, you can
            follow it on your local carrier site once it reaches your country.
          </p>
        ),
        tags: ["tracking"],
        icon: <Search className="h-4 w-4" />,
      },
      {
        q: "Do I have to pay customs or duties?",
        a: (
          <p>
            Depending on your country, customs/VAT/import fees may apply and are usually paid by the
            recipient. If you’re unsure, check your local customs rules.
          </p>
        ),
        tags: ["customs", "duties"],
        icon: <Globe2 className="h-4 w-4" />,
      },
      {
        q: "What if the address is wrong or incomplete?",
        a: (
          <div className="space-y-2">
            <p>
              Please contact us immediately. If the parcel is returned or fails delivery due to an
              incorrect address, reshipping may require an additional fee.
            </p>
            <p className="text-sm text-gray-600">
              Always double-check your postal code, city, and apartment number before paying.
            </p>
          </div>
        ),
        tags: ["address"],
        icon: <MapPin className="h-4 w-4" />,
      },
    ],
  },
  {
    section: "Products & Quality",
    id: "products",
    icon: <Shirt className="h-4 w-4" />,
    items: [
      {
        q: "Are these original/official jerseys?",
        a: (
          <p>
            FootballWorld focuses on high-quality football kits and fan gear. If a product is an
            “official” item, it will be clearly stated on the product page. Otherwise, consider it fan
            apparel.
          </p>
        ),
        tags: ["quality", "official"],
        icon: <ShieldCheck className="h-4 w-4" />,
      },
      {
        q: "How do I choose the right size?",
        a: (
          <div className="space-y-2">
            <p>
              Choose your usual size for a regular fit. If you prefer a looser fit, consider sizing up.
              For “Player Version” (slim fit), sizing up is usually recommended.
            </p>
            <p className="text-sm text-gray-600">
              If your product page includes a size chart, follow it first.
            </p>
          </div>
        ),
        tags: ["size", "fit"],
        icon: <Ruler className="h-4 w-4" />,
      },
      {
        q: "Can I add name & number personalization?",
        a: (
          <p>
            Yes — if the product supports customization, you can enter the name and number in the
            configurator before adding to cart. Personalized items may have different return rules.
          </p>
        ),
        tags: ["custom", "name", "number"],
        icon: <BadgeCheck className="h-4 w-4" />,
      },
    ],
  },
  {
    section: "Payments",
    id: "payments",
    icon: <CreditCard className="h-4 w-4" />,
    items: [
      {
        q: "What payment methods do you accept?",
        a: (
          <p>
            Available methods are shown at checkout. If you don’t see your preferred method, it may not
            be available in your country/currency.
          </p>
        ),
        tags: ["payment"],
        icon: <CreditCard className="h-4 w-4" />,
      },
      {
        q: "Is checkout secure?",
        a: (
          <p>
            Yes — payments are processed through secure providers. Your card details are not stored on
            FootballWorld servers.
          </p>
        ),
        tags: ["secure"],
        icon: <ShieldCheck className="h-4 w-4" />,
      },
    ],
  },
  {
    section: "Returns & Issues",
    id: "returns",
    icon: <RefreshCcw className="h-4 w-4" />,
    items: [
      {
        q: "What is your return policy?",
        a: (
          <div className="space-y-2">
            <p>
              Returns depend on the product type and condition. Items must generally be unused and in
              original packaging. Personalized items may not be eligible unless there’s a defect or an
              error on our side.
            </p>
            <p className="text-sm text-gray-600">
              If you already have a dedicated page, link it here too.
            </p>
          </div>
        ),
        tags: ["returns"],
        icon: <RefreshCcw className="h-4 w-4" />,
      },
      {
        q: "My item arrived damaged / wrong — what now?",
        a: (
          <div className="space-y-2">
            <p>
              Contact support with your order number and photos of the issue (front/back + packaging).
              We’ll review and help with a replacement or solution.
            </p>
          </div>
        ),
        tags: ["issue", "damaged", "wrong item"],
        icon: <AlertTriangle className="h-4 w-4" />,
      },
    ],
  },
  {
    section: "Support",
    id: "support",
    icon: <HelpCircle className="h-4 w-4" />,
    items: [
      {
        q: "How do I contact support?",
        a: (
          <div className="space-y-2">
            <p>
              Use our contact channel and include your order number for faster help. You can also email
              us if an email address is provided on the website.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/orders"
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
              >
                <Package className="h-4 w-4" />
                My orders
              </Link>
              <Link
                href="/shipping-policy"
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
              >
                <Truck className="h-4 w-4" />
                Shipping policy
              </Link>
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Tip: add a “Contact” page later if you want.
            </p>
          </div>
        ),
        tags: ["support", "contact"],
        icon: <Mail className="h-4 w-4" />,
      },
    ],
  },
];

export default function FAQPage() {
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
              Help Center
            </div>

            <h1 className="mt-4 text-3xl md:text-5xl font-semibold tracking-tight">
              Frequently Asked Questions
            </h1>
            <p className="mt-3 text-gray-600 text-base md:text-lg">
              Quick answers about orders, shipping, tracking, sizing, payments, and returns.
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
                Read Shipping Policy
              </Link>
              <Link
                href="/cart"
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                <Package className="h-4 w-4" />
                Go to Cart
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
                <h2 className="text-xl md:text-2xl font-semibold">{section.section}</h2>
              </div>

              <div className="mt-4 grid gap-3">
                {section.items.map((it) => (
                  <details
                    key={it.q}
                    className="group rounded-2xl border bg-white/80 backdrop-blur px-4 py-3 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.25)]"
                  >
                    <summary className="cursor-pointer list-none">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-xl border bg-white">
                          {it.icon ?? <ChevronRight className="h-4 w-4" />}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-sm md:text-[15px] font-semibold text-gray-900">
                              {it.q}
                            </div>
                            <span className="ml-auto transition-transform duration-200 group-open:rotate-90 text-gray-400">
                              <ChevronRight className="h-4 w-4" />
                            </span>
                          </div>

                          {it.tags?.length ? (
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {it.tags.map((t) => (
                                <span
                                  key={t}
                                  className="text-[11px] rounded-full border bg-gray-50 px-2 py-0.5 text-gray-600"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </summary>

                    <div className="mt-3 pl-11 text-sm text-gray-700 leading-relaxed">
                      {it.a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}

          {/* Footer CTA */}
          <div className="rounded-3xl border bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                  <ShieldCheck className="h-4 w-4 text-blue-700" />
                  Need more help?
                </div>
                <h3 className="mt-2 text-lg md:text-xl font-semibold">
                  We’re here to help with your order.
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  If your question isn’t answered here, contact support with your order number.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/orders"
                  className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-white"
                >
                  <Package className="h-4 w-4" />
                  My orders
                </Link>
                <Link
                  href="/shipping-policy"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Truck className="h-4 w-4" />
                  Shipping policy
                </Link>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            Last update: {new Date().toLocaleDateString("pt-PT")}
          </div>
        </div>
      </section>
    </main>
  );
}
