// src/app/terms-of-service/page.tsx
import Link from "next/link";
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

/* ---------- meta ---------- */
export const metadata = {
  title: "Terms of Service — FootballWorld",
  description:
    "FootballWorld Terms of Service: ordering, pricing, shipping, returns, personalizations, payments, promotions, IP, acceptable use, liability, law, and contact.",
};

/* ---------- section index (for sidebar + hero chips) ---------- */
const SECTIONS: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: "intro", label: "Introduction", icon: <FileText className="h-4 w-4" /> },
  { id: "account", label: "Eligibility & Account", icon: <ShieldCheck className="h-4 w-4" /> },
  { id: "ordering", label: "Ordering Process", icon: <PackageCheck className="h-4 w-4" /> },
  { id: "pricing", label: "Pricing & Taxes", icon: <BadgePercent className="h-4 w-4" /> },
  { id: "shipping", label: "Shipping & Delivery", icon: <Truck className="h-4 w-4" /> },
  { id: "custom", label: "Custom Products", icon: <Palette className="h-4 w-4" /> },
  { id: "returns", label: "Returns & Refunds", icon: <Undo2 className="h-4 w-4" /> },
  { id: "cancel", label: "Cancellations & Changes", icon: <XCircle className="h-4 w-4" /> },
  { id: "product", label: "Product Info & Sizing", icon: <Info className="h-4 w-4" /> },
  { id: "payments", label: "Payments & Security", icon: <CreditCard className="h-4 w-4" /> },
  { id: "promos", label: "Promotions", icon: <BadgePercent className="h-4 w-4" /> },
  { id: "ip", label: "Intellectual Property", icon: <LockKeyhole className="h-4 w-4" /> },
  { id: "acceptable", label: "Acceptable Use", icon: <ShieldCheck className="h-4 w-4" /> },
  { id: "third", label: "Third-Party Links", icon: <Globe className="h-4 w-4" /> },
  { id: "warranty", label: "Warranties & Liability", icon: <Scale className="h-4 w-4" /> },
  { id: "law", label: "Governing Law", icon: <Gavel className="h-4 w-4" /> },
  { id: "contact", label: "Contact", icon: <FileText className="h-4 w-4" /> },
];

export default function TermsOfServicePage() {
  return (
    <main className="container-fw pt-16 md:pt-24 pb-24">
      {/* --- Ambient shapes (subtle, purely decorative) --- */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-20 mx-auto h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed right-0 top-64 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl"
      />

      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-6 md:p-8 shadow-sm mb-8">
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full border bg-white/80 px-2.5 py-1">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            Clear & simple policy
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border bg-white/80 px-2.5 py-1">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            Last updated: 09 Sep 2025
          </span>
        </div>

        <h1 className="mt-3 bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent text-3xl md:text-4xl font-extrabold tracking-tight">
          Terms of Service
        </h1>
        <p className="mt-2 max-w-3xl text-gray-600">
          These Terms govern your use of FootballWorld and any purchases you make here. By using our
          site, you agree to these Terms. For how we collect and handle your data, see our{" "}
          <Link href="/privacy-policy" className="text-blue-700 underline">
            Privacy Policy
          </Link>
          .
        </p>

        {/* Quick actions (nice chips) */}
        <div className="mt-5 flex flex-wrap gap-2">
          {SECTIONS.slice(0, 6).map((s) => (
            <AnchorPill key={s.id} id={s.id} icon={s.icon}>
              {s.label}
            </AnchorPill>
          ))}
          <AnchorPill id="returns" icon={<Undo2 className="h-4 w-4" />}>
            Returns & Refunds
          </AnchorPill>
          <AnchorPill id="payments" icon={<CreditCard className="h-4 w-4" />}>
            Payments
          </AnchorPill>
        </div>
      </section>

      {/* ---------- GRID: content + sticky nav ---------- */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* CONTENT */}
        <div className="grid gap-6">
          <Section id="intro" title="Introduction">
            <p>
              These Terms (“Terms”) apply to the FootballWorld website and to orders placed through
              it. If you do not agree, do not use the site. Where mandatory consumer laws provide
              additional protections in your country, those protections prevail.
            </p>
            <Callout tone="info" icon={<Info className="h-4 w-4" />}>
              Tip: keep your order-confirmation email — it includes your order number and helpful
              links.
            </Callout>
          </Section>

          <Section id="account" title="Eligibility & Account">
            <List
              items={[
                "You must have legal capacity to contract in your jurisdiction.",
                "You are responsible for activity under your account and for keeping credentials secure.",
                "We may suspend/terminate accounts for fraud, abuse, or violation of these Terms.",
              ]}
            />
          </Section>

          <Section id="ordering" title="Ordering Process">
            <List
              items={[
                "You will receive an email confirming your order. The contract is formed when we send a dispatch/shipping confirmation.",
                "We reserve the right to refuse/cancel due to inventory, suspected fraud, or pricing error (you will be refunded).",
                "Double-check customizations; items are produced exactly as entered.",
              ]}
            />
          </Section>

          <Section id="pricing" title="Pricing & Taxes">
            <List
              items={[
                "Prices are usually in EUR unless otherwise shown.",
                "Taxes, duties, and import fees may be collected by the carrier at destination depending on your country.",
                "Obvious pricing mistakes may be corrected; we’ll contact you before processing.",
              ]}
            />
          </Section>

          <Section id="shipping" title="Shipping & Delivery">
            <p>
              Production and transit times are estimates and can vary by carrier and customs. For a
              detailed guide and live tracking tips, see{" "}
              <Link href="/shipping-tracking" className="text-blue-700 underline">
                Shipping &amp; Tracking
              </Link>
              .
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Stat label="Average production" value="3–5 days" />
              <Stat label="Typical transit" value="7-9 working days" />
              <Stat label="Coverage" value="Worldwide" />
            </div>
          </Section>

          <Section id="custom" title="Custom & Personalized Products">
            <List
              items={[
                "Personalized items (e.g., name/number) are made to order and are not returnable unless defective.",
                "Please verify spelling, number, and size before checkout.",
              ]}
            />
            <Callout tone="info" icon={<Palette className="h-4 w-4" />}>
              Before customizing, check our{" "}
              <Link href="/size-guide" className="underline">
                Size Guide
              </Link>{" "}
              to make sure the fit is perfect.
            </Callout>
          </Section>

          <Section id="returns" title="Returns & Refunds">
            <p>
              Eligible items can be returned according to our{" "}
              <Link href="/returns" className="text-blue-700 underline">
                Returns &amp; Exchanges
              </Link>{" "}
              policy. Items must be new, unused, and with tags. Personalized items: only if
              defective or damaged.
            </p>
          </Section>

          <Section id="cancel" title="Cancellations & Changes">
            <List
              items={[
                "We process orders quickly — contact us immediately for changes/cancellations.",
                "Orders already in production or shipped cannot be changed/cancelled. Personalized items typically enter production shortly after purchase.",
              ]}
            />
          </Section>

          <Section id="product" title="Product Information & Sizing">
            <p>
              Colors may vary slightly due to display settings. For measurements and fit, see the{" "}
              <Link href="/size-guide" className="text-blue-700 underline">
                Size Guide
              </Link>
              .
            </p>
          </Section>

          <Section id="payments" title="Payments & Security">
            <List
              items={[
                "Payments are handled by trusted processors (e.g., Stripe, PayPal, Amazon Pay). We do not store full card numbers.",
                "We may run antifraud checks to protect customers and the store.",
              ]}
            />
            <Callout tone="info" icon={<LockKeyhole className="h-4 w-4" />}>
              Payment data is processed securely by those providers. Review their privacy and
              security policies as well.
            </Callout>
          </Section>

          <Section id="promos" title="Promotions & Discount Codes">
            <List
              items={[
                "Codes must be applied at checkout and cannot be applied retroactively.",
                "Promotions can be modified or withdrawn at any time.",
              ]}
            />
          </Section>

          <Section id="ip" title="Intellectual Property">
            <p>
              All content (images, text, graphics, and designs) is owned/licensed by FootballWorld
              and protected by law. Use without prior permission is prohibited.
            </p>
          </Section>

          <Section id="acceptable" title="Acceptable Use">
            <List
              items={[
                "Do not engage in unlawful, fraudulent, infringing, or harmful activities.",
                "Do not interfere with security, site operation, or the experience of other users.",
                "No automated scraping or reuse of content without permission.",
              ]}
            />
          </Section>

          <Section id="third" title="Third-Party Links">
            <p>
              We may reference third-party sites. We are not responsible for their content, policies,
              or practices — access at your own risk and review their terms and privacy notices.
            </p>
          </Section>

          <Section id="warranty" title="Warranties & Liability">
            <List
              items={[
                "The site is provided “as is” and “as available”. To the fullest extent permitted by law, we disclaim implied warranties.",
                "We are not liable for indirect or consequential losses. Our total liability for any claim is limited to the amount you paid for the product at issue.",
                "Nothing in these Terms limits non-excludable consumer rights under applicable law.",
              ]}
            />
          </Section>

          <Section id="law" title="Governing Law & Disputes">
            <p>
              These Terms are governed by the laws applicable in our principal place of business,
              without regard to conflict-of-laws rules. Disputes will be submitted to the competent
              courts there, without prejudice to mandatory consumer protections in your country.
            </p>
          </Section>

          <Section id="contact" title="Contact">
            <p>
              Questions about these Terms? Reach out via{" "}
              <Link href="/contact" className="text-blue-700 underline">
                Contact
              </Link>{" "}
              or email{" "}
              <a href="mailto:myfootballworldshop@gmail.com" className="text-blue-700 underline">
                myfootballworldshop@gmail.com
              </a>
              .
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/privacy-policy"
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm hover:bg-gray-50"
              >
                <LockKeyhole className="h-4 w-4" />
                Privacy Policy
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/returns"
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm hover:bg-gray-50"
              >
                <Undo2 className="h-4 w-4" />
                Returns & Exchanges
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Section>
        </div>

        {/* STICKY SIDE NAV */}
        <aside className="lg:sticky lg:top-28 h-max">
          <div className="rounded-2xl border bg-white/85 backdrop-blur p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold">On this page</h3>
            </div>

            <ul className="mt-3 space-y-1.5 text-sm">
              {SECTIONS.map((s) => (
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

            {/* Quick CTAs */}
            <div className="mt-4 grid gap-2">
              <Link
                href="/shipping-tracking"
                className="inline-flex items-center justify-between rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-600" />
                  Shipping & Tracking
                </span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
              <Link
                href="/returns"
                className="inline-flex items-center justify-between rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Undo2 className="h-4 w-4 text-amber-600" />
                  Start a return
                </span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
            </div>

            {/* tiny stats */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600">
              <StatMini label="Avg reply" value="24–48h" />
              <StatMini label="Coverage" value="Worldwide" />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

/* ===========================================================
   UI helpers (kept here for clarity)
   =========================================================== */

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
      <div className="mt-2 text-gray-700 space-y-2">{children}</div>
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
