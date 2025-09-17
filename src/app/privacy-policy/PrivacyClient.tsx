// src/app/privacy-policy/PrivacyClient.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

const SECTIONS = [
  { id: "intro", label: "What this policy covers", Icon: Shield },
  { id: "data", label: "Data we collect", Icon: Database },
  { id: "use", label: "How we use data", Icon: FileCheck2 },
  { id: "legal", label: "Legal bases", Icon: ShieldCheck },
  { id: "sharing", label: "Sharing & processors", Icon: Globe2 },
  { id: "payments", label: "Payments", Icon: CreditCard },
  { id: "shipping", label: "Shipping", Icon: Truck },
  { id: "cookies", label: "Analytics & cookies", Icon: Cookie },
  { id: "retention", label: "Retention", Icon: Lock },
  { id: "rights", label: "Your rights", Icon: UserCheck },
  { id: "security", label: "Security", Icon: Shield },
  { id: "transfers", label: "International transfers", Icon: Globe2 },
  { id: "children", label: "Children’s privacy", Icon: RefreshCw },
  { id: "changes", label: "Changes", Icon: FileCheck2 },
  { id: "contact", label: "Contact us", Icon: Mail },
] as const;

export default function PrivacyClient() {
  // Optional deep-link support: ?section=rights → scroll to that section
  const search = useSearchParams();
  const section = search.get("section");

  useEffect(() => {
    if (!section) return;
    const el = document.getElementById(section);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [section]);

  return (
    <main className="container-fw pt-20 md:pt-28 pb-28">
      {/* ======= HERO ======= */}
      <section className="relative overflow-hidden rounded-3xl border bg-white">
        {/* soft glow decorations */}
        <div className="pointer-events-none absolute -top-24 -right-12 h-64 w-64 rounded-full bg-cyan-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-12 h-64 w-64 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="relative grid gap-6 p-6 sm:p-8 md:p-10">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
              <Shield className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                Privacy Policy
              </h1>
              <p className="mt-2 text-sm text-gray-600">Last updated: 09 Sep 2025</p>
              <p className="mt-3 max-w-prose text-gray-700">
                We respect your privacy. This page explains what we collect,
                why we collect it, and how you can control your information.
              </p>
            </div>
          </div>

          {/* Mobile TOC (pills) */}
          <nav
            aria-label="Sections"
            className="lg:hidden -mb-2 overflow-x-auto rounded-2xl border bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60"
          >
            <ul className="flex gap-2 p-2 text-sm min-w-max">
              {SECTIONS.map(({ id, label }) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 hover:bg-gray-50 whitespace-nowrap"
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
      <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
        {/* Main content */}
        <div className="grid gap-6">
          {/* Intro */}
          <PolicyCard id="intro" icon={<Shield className="h-4 w-4" />} title="What this policy covers">
            <p>
              This Privacy Policy explains how <strong>FootballWorld</strong>{" "}
              (“we”, “us”, “our”) collects, uses, discloses, and safeguards your
              information when you visit our website, create an account, place
              an order, or contact support. By using our services you agree to
              the practices described here.
            </p>
          </PolicyCard>

          {/* Data we collect */}
          <PolicyCard id="data" icon={<Database className="h-4 w-4" />} title="Data we collect">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Account & order data:</strong> name, email, shipping
                address, phone (optional), order details, personalization choices.
              </li>
              <li>
                <strong>Payment data:</strong> handled by payment providers
                (e.g., Stripe, PayPal). We do not store full card numbers.
              </li>
              <li>
                <strong>Support messages:</strong> content you send via forms/email,
                plus metadata (time, IP, browser info).
              </li>
              <li>
                <strong>Usage data:</strong> pages viewed, clicks, device/browser,
                approximate location, referrer (via cookies/analytics).
              </li>
              <li>
                <strong>Cookies:</strong> essential for cart/session and optional
                analytics/marketing cookies (see Cookies section).
              </li>
            </ul>
          </PolicyCard>

          {/* How we use */}
          <PolicyCard id="use" icon={<FileCheck2 className="h-4 w-4" />} title="How we use your data">
            <ul className="list-disc pl-5 space-y-1">
              <li>Process and deliver orders, including shipping updates.</li>
              <li>Provide customer support and handle returns/exchanges.</li>
              <li>Personalize products (e.g., name/number on jerseys).</li>
              <li>Improve website performance, features, and experience.</li>
              <li>Prevent fraud and ensure platform security.</li>
              <li>
                Send transactional emails and (with consent where required)
                newsletters or promotions — you can unsubscribe anytime.
              </li>
            </ul>
          </PolicyCard>

          {/* Legal bases */}
          <PolicyCard id="legal" icon={<ShieldCheck className="h-4 w-4" />} title="Legal bases (GDPR)">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Contract:</strong> fulfilling purchases and providing services.
              </li>
              <li>
                <strong>Legitimate interests:</strong> security, fraud prevention, improving services.
              </li>
              <li>
                <strong>Consent:</strong> optional analytics/marketing and some communications.
              </li>
              <li>
                <strong>Legal obligation:</strong> tax/accounting compliance.
              </li>
            </ul>
          </PolicyCard>

          {/* Sharing */}
          <PolicyCard id="sharing" icon={<Globe2 className="h-4 w-4" />} title="Sharing & processors">
            <p>We share data with trusted providers who help operate our business:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>
                <strong>Payment processors:</strong> e.g., Stripe, PayPal, Amazon Pay.
              </li>
              <li>
                <strong>Shipping & logistics:</strong> carriers and tracking services.
              </li>
              <li>
                <strong>Analytics:</strong> privacy-friendly tools and/or major analytics (lawfully configured).
              </li>
              <li>
                <strong>Infrastructure & hosting:</strong> cloud and CDNs.
              </li>
            </ul>
            <p className="mt-2">
              We require processors to handle data only on our instructions and protect it appropriately.
              We do not sell your personal data.
            </p>
          </PolicyCard>

          {/* Payments */}
          <PolicyCard id="payments" icon={<CreditCard className="h-4 w-4" />} title="Payments">
            <p>
              Payments are handled by third-party processors. We never store your
              full card details on our servers. Refer to your selected provider’s
              privacy policy for more details.
            </p>
          </PolicyCard>

          {/* Shipping */}
          <PolicyCard id="shipping" icon={<Truck className="h-4 w-4" />} title="Shipping">
            <p>
              For delivery, we share necessary information (name, address, phone,
              order contents) with shipping partners for parcel creation and tracking.
              See our{" "}
              <Link href="/shipping-tracking" className="text-blue-700 underline">
                Shipping &amp; Tracking
              </Link>{" "}
              page for service levels and timings.
            </p>
          </PolicyCard>

          {/* Cookies */}
          <PolicyCard id="cookies" icon={<Cookie className="h-4 w-4" />} title="Analytics & cookies">
            <p>
              We use essential cookies for core features (cart, session). With consent where required,
              we may use analytics/marketing cookies to understand usage and improve the site.
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>
                <strong>Essential:</strong> strictly necessary; cannot be switched off.
              </li>
              <li>
                <strong>Analytics:</strong> help measure and improve performance.
              </li>
              <li>
                <strong>Marketing:</strong> optional; used to show relevant offers.
              </li>
            </ul>
          </PolicyCard>

          {/* Retention */}
          <PolicyCard id="retention" icon={<Lock className="h-4 w-4" />} title="Data retention">
            <p>
              We keep personal data only as long as necessary for purposes described in this policy,
              including legal, accounting, or reporting requirements. Retention periods vary by data type
              and legal obligations.
            </p>
          </PolicyCard>

          {/* Rights */}
          <PolicyCard id="rights" icon={<UserCheck className="h-4 w-4" />} title="Your rights">
            <p>Depending on your location, you may have rights to:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Access, correct, or delete your personal data.</li>
              <li>Object to or restrict certain processing.</li>
              <li>Data portability.</li>
              <li>Withdraw consent where processing relies on consent.</li>
              <li>Lodge a complaint with a supervisory authority.</li>
            </ul>
            <p className="mt-2">
              To exercise these rights, contact us at{" "}
              <a href="mailto:myfootballworldshop@gmail.com" className="text-blue-700 underline">
                myfootballworldshop@gmail.com
              </a>.
            </p>
          </PolicyCard>

          {/* Security */}
          <PolicyCard id="security" icon={<Shield className="h-4 w-4" />} title="Security">
            <p>
              We implement appropriate technical and organizational measures to protect your data. However,
              no method of transmission or storage is 100% secure; we cannot guarantee absolute security.
            </p>
          </PolicyCard>

          {/* Transfers */}
          <PolicyCard id="transfers" icon={<Globe2 className="h-4 w-4" />} title="International transfers">
            <p>
              Your information may be transferred to and processed in countries outside your own. Where required,
              we implement safeguards (e.g., standard contractual clauses) to protect your data.
            </p>
          </PolicyCard>

          {/* Children */}
          <PolicyCard id="children" icon={<RefreshCw className="h-4 w-4" />} title="Children’s privacy">
            <p>
              Our services are not directed to children under the age required by applicable law. We do not
              knowingly collect data from children. If you believe a child has provided personal data, please
              contact us to request deletion.
            </p>
          </PolicyCard>

          {/* Changes */}
          <PolicyCard id="changes" icon={<FileCheck2 className="h-4 w-4" />} title="Changes to this policy">
            <p>
              We may update this policy from time to time. We will post the new version on this page and update
              the “Last updated” date above.
            </p>
          </PolicyCard>

          {/* Contact */}
          <PolicyCard id="contact" icon={<Mail className="h-4 w-4" />} title="Contact us">
            <p>
              Questions about this policy or your data? Email{" "}
              <a href="mailto:myfootballworldshop@gmail.com" className="text-blue-700 underline">
                myfootballworldshop@gmail.com
              </a>.
            </p>
            <p className="mt-3 text-xs text-gray-500">
              This page is provided for transparency and does not constitute legal advice.
            </p>
          </PolicyCard>
        </div>

        {/* Sticky sidebar TOC (desktop) */}
        <aside className="relative hidden lg:block">
          <div className="sticky top-28 rounded-2xl border bg-white/80 backdrop-blur p-3">
            <div className="px-2 py-1 text-xs font-semibold tracking-wide text-gray-600">
              On this page
            </div>
            <ul className="mt-1 space-y-1 text-[13px]">
              {SECTIONS.map(({ id, label, Icon }) => (
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
                Back to top
              </a>
            </div>
          </div>
        </aside>
      </section>
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
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="card p-6 scroll-mt-28"
    >
      <div className="flex items-center gap-2">
        {icon && (
          <span className="rounded-md bg-blue-50 p-1.5 text-blue-600">{icon}</span>
        )}
        <h2 id={`${id}-title`} className="text-lg md:text-xl font-semibold">
          {title}
        </h2>
      </div>
      <div className="mt-3 text-gray-700 leading-relaxed">{children}</div>
      {/* blue accent line on hover */}
      <div className="mt-4 h-1 w-0 bg-gradient-to-r from-blue-600 to-cyan-400 rounded transition-all group-hover:w-full" />
    </section>
  );
}
