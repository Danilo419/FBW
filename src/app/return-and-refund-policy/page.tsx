// src/app/return-and-refund-policy/page.tsx
import Link from "next/link";
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

/* ---------- meta ---------- */
export const metadata = {
  title: "Return & Refund Policy — FootballWorld",
  description:
    "How returns, exchanges and refunds work at FootballWorld: eligibility, timelines, non-returnable items, personalized products, costs, and how to start a return.",
};

/* ---------- section index ---------- */
const SECTIONS: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: "intro", label: "Introduction", icon: <FileText className="h-4 w-4" /> },
  { id: "window", label: "Return Window", icon: <Clock className="h-4 w-4" /> },
  { id: "condition", label: "Item Condition", icon: <Shirt className="h-4 w-4" /> },
  { id: "nonreturn", label: "Non-returnable Items", icon: <AlertCircle className="h-4 w-4" /> },
  { id: "personalized", label: "Personalized Items", icon: <ShieldCheck className="h-4 w-4" /> },
  { id: "start", label: "Start a Return", icon: <Undo2 className="h-4 w-4" /> },
  { id: "exchanges", label: "Exchanges", icon: <RotateCcw className="h-4 w-4" /> },
  { id: "refunds", label: "Refunds & Timing", icon: <BadgeDollarSign className="h-4 w-4" /> },
  { id: "costs", label: "Return Shipping Costs", icon: <Package className="h-4 w-4" /> },
  { id: "defective", label: "Defective / Wrong Item", icon: <PackageOpen className="h-4 w-4" /> },
  { id: "gifts", label: "Gifts & Promotions", icon: <Gift className="h-4 w-4" /> },
  { id: "promos", label: "Bundles / Discounts", icon: <TicketPercent className="h-4 w-4" /> },
  { id: "contact", label: "Need Help?", icon: <Mail className="h-4 w-4" /> },
];

export default function ReturnRefundPolicyPage() {
  return (
    <main className="container-fw pt-16 md:pt-24 pb-24">
      {/* subtle ambient glows */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-24 mx-auto h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed right-0 top-72 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl"
      />

      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-6 md:p-8 shadow-sm mb-8">
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full border bg-white/80 px-2.5 py-1">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            Hassle-free returns (policy outline)
          </span>
        </div>

        <h1 className="mt-3 bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent text-3xl md:text-4xl font-extrabold tracking-tight">
          Return & Refund Policy
        </h1>
        <p className="mt-2 max-w-3xl text-gray-600">
          We want you to love your jersey. Below you’ll find how returns, exchanges, and refunds
          work. For a guided flow, use{" "}
          <Link href="/returns" className="text-blue-700 underline">
            Returns &amp; Exchanges
          </Link>
          .
        </p>

        {/* quick anchors */}
        <div className="mt-5 flex flex-wrap gap-2">
          {SECTIONS.slice(0, 7).map((s) => (
            <AnchorPill key={s.id} id={s.id} icon={s.icon}>
              {s.label}
            </AnchorPill>
          ))}
          <AnchorPill id="refunds" icon={<BadgeDollarSign className="h-4 w-4" />}>
            Refunds
          </AnchorPill>
          <AnchorPill id="defective" icon={<PackageOpen className="h-4 w-4" />}>
            Defective
          </AnchorPill>
        </div>
      </section>

      {/* ---------- GRID ---------- */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* CONTENT */}
        <div className="grid gap-6">
          <Section id="intro" title="Introduction">
            <p>
              This policy applies to purchases made directly on{" "}
              <strong>FootballWorld</strong>. If you bought from a third-party marketplace, please
              refer to their return rules. Your statutory rights remain unaffected where applicable.
            </p>
          </Section>

          <Section id="window" title="Return window">
            <List
              items={[
                "You can request a return or exchange within 14 days of delivery.",
                "The window counts from the day tracking marks the parcel as delivered.",
                "For holiday gifts, we may extend the window—check our seasonal notice or contact support.",
              ]}
            />
            <Callout tone="info" icon={<Clock className="h-4 w-4" />}>
              Tip: Start your return as soon as you decide. Faster initiation = faster resolution.
            </Callout>
          </Section>

          <Section id="condition" title="Item condition requirements">
            <List
              items={[
                "Unworn, unwashed, and in original condition.",
                "All tags, hygiene seals, and packaging intact.",
                "No smells (e.g., perfume, smoke) or signs of wear/use.",
                "Include any freebies/gifts that came with the order.",
              ]}
            />
            <Callout tone="warn" icon={<AlertTriangle className="h-4 w-4" />}>
              Items returned in non-resellable condition may be refused or incur a partial refund.
            </Callout>
          </Section>

          <Section id="nonreturn" title="Non-returnable items">
            <List
              items={[
                "Final-sale items clearly marked as non-returnable.",
                "Gift cards and downloadable products.",
                "Used or washed items.",
              ]}
            />
          </Section>

          <Section id="personalized" title="Personalized / Custom products">
            <List
              items={[
                "Customized jerseys (e.g., printed name/number, badges) are non-returnable and non-refundable, except if defective or we made a mistake.",
                "Please double-check spelling, numbers, and sizing before ordering.",
              ]}
            />
            <Callout tone="info" icon={<ShieldCheck className="h-4 w-4" />}>
              If a personalized item arrives damaged or incorrect, we will repair, replace, or
              refund according to the issue—contact us right away with photos.
            </Callout>
          </Section>

          <Section id="start" title="How to start a return">
            <List
              items={[
                "Go to the dedicated page: ",
                "Use your order number and email to request a label or instructions.",
                "Pack items securely; include your order slip or a note with name, email, and order number.",
              ]}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/returns"
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm hover:bg-gray-50"
              >
                <Undo2 className="h-4 w-4" />
                Start a return
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm hover:bg-gray-50"
              >
                <Mail className="h-4 w-4" />
                Contact Support
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Section>

          <Section id="exchanges" title="Exchanges (size / variant)">
            <List
              items={[
                "Exchanges depend on availability. If the requested size/variant is out of stock, we’ll offer alternatives or a refund.",
                "We typically ship the replacement after receiving and checking your return, unless otherwise arranged.",
              ]}
            />
          </Section>

          <Section id="refunds" title="Refund method & timing">
            <List
              items={[
                "Refunds are issued to the original payment method unless agreed otherwise.",
                "Once your return is inspected and approved, we process refunds within 2–5 business days.",
                "Your bank/card issuer may take additional time to post the credit (up to 10 business days).",
                "Original shipping fees are non-refundable unless the item was defective or we made an error.",
              ]}
            />
          </Section>

          <Section id="costs" title="Return shipping costs & responsibility">
            <List
              items={[
                "Return postage is generally the customer’s responsibility, unless the item is defective or incorrect.",
                "If we provide a prepaid label, we may deduct its cost from the refund unless the return is due to our error.",
                "We recommend a tracked service; lost return parcels without proof of posting cannot be refunded.",
              ]}
            />
          </Section>

          <Section id="defective" title="Defective, damaged, or wrong item received">
            <List
              items={[
                "Inspect your order upon arrival. If there’s an issue, contact us within 7 days.",
                "Include clear photos and a short description of the problem.",
                "We will repair, replace, or refund depending on the case and stock availability.",
              ]}
            />
            <Callout tone="info" icon={<PackageCheck className="h-4 w-4" />}>
              Keep all packaging until we confirm next steps. Carriers may require evidence for a
              claim.
            </Callout>
          </Section>

          <Section id="gifts" title="Gifts">
            <List
              items={[
                "If the item was marked as a gift and shipped directly to you, you may receive store credit for the value of your return once processed.",
                "If the order wasn’t marked as a gift, the refund goes to the original purchaser.",
              ]}
            />
          </Section>

          <Section id="promos" title="Bundles, promotions & partial returns">
            <List
              items={[
                "For bundle/BOGO deals, returning part of the bundle may adjust the discount.",
                "Free gifts must be returned if they were part of a promotion tied to the returned item.",
              ]}
            />
          </Section>

          <Section id="contact" title="Questions or special cases?">
            <p>
              Our team is happy to help with sizing issues, damaged parcels, or unique situations.
              Use{" "}
              <Link href="/returns" className="text-blue-700 underline">
                Returns &amp; Exchanges
              </Link>{" "}
              or{" "}
              <Link href="/contact" className="text-blue-700 underline">
                Contact Support
              </Link>
              . You can also email{" "}
              <a href="mailto:myfootballworldstore@gmail.com" className="text-blue-700 underline">
                myfootballworldstore@gmail.com
              </a>
              .
            </p>
          </Section>
        </div>

        {/* STICKY NAV */}
        <aside className="lg:sticky lg:top-28 h-max">
          <div className="rounded-2xl border bg-white/85 backdrop-blur p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-blue-600" />
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
                href="/returns"
                className="inline-flex items-center justify-between rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Undo2 className="h-4 w-4 text-amber-600" />
                  Start a return
                </span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-between rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                  Contact Support
                </span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600">
              <StatMini label="Return window" value="14 days" />
              <StatMini label="Refund time" value="2–5 biz days" />
            </div>
          </div>
        </aside>
      </div>

      {/* fine print */}
      <p className="mt-8 text-xs text-gray-500">
        Last updated: {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
      </p>
    </main>
  );
}

/* ===========================================================
   UI helpers
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

function List({ items }: { items: (string | React.ReactNode)[] }) {
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

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border px-3 py-2">
      <div className="text-[11px] text-gray-600">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}
