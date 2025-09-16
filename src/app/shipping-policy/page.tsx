// src/app/shipping-policy/page.tsx
import Link from "next/link";
import {
  Truck,
  PackageCheck,
  PackageOpen,
  Plane,
  Globe,
  MapPin,
  Clock,
  ShieldCheck,
  Undo2,
  AlertTriangle,
  Info,
  Mail,
  ArrowRight,
  Sparkles,
} from "lucide-react";

/* ---------- meta ---------- */
export const metadata = {
  title: "Shipping Policy — FootballWorld",
  description:
    "FootballWorld Shipping Policy: processing times, carriers, rates, delivery estimates, tracking, customs/duties, failed deliveries, lost parcels, and contact.",
};

/* ---------- section index ---------- */
const SECTIONS: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: "intro", label: "Introduction", icon: <Info className="h-4 w-4" /> },
  { id: "processing", label: "Processing Times", icon: <Clock className="h-4 w-4" /> },
  { id: "carriers", label: "Carriers & Methods", icon: <Plane className="h-4 w-4" /> },
  { id: "rates", label: "Rates & Free Shipping", icon: <Truck className="h-4 w-4" /> },
  { id: "estimates", label: "Delivery Estimates", icon: <Globe className="h-4 w-4" /> },
  { id: "tracking", label: "Tracking", icon: <PackageCheck className="h-4 w-4" /> },
  { id: "address", label: "Address Changes", icon: <MapPin className="h-4 w-4" /> },
  { id: "customs", label: "Customs & Duties", icon: <ShieldCheck className="h-4 w-4" /> },
  { id: "failed", label: "Failed Delivery", icon: <AlertTriangle className="h-4 w-4" /> },
  { id: "lost", label: "Lost / Delayed Parcels", icon: <PackageOpen className="h-4 w-4" /> },
  { id: "split", label: "Split Shipments", icon: <PackageCheck className="h-4 w-4" /> },
  { id: "preorders", label: "Pre-orders", icon: <Clock className="h-4 w-4" /> },
  { id: "holidays", label: "Holidays & Peak", icon: <Clock className="h-4 w-4" /> },
  { id: "force", label: "Force Majeure", icon: <ShieldCheck className="h-4 w-4" /> },
  { id: "contact", label: "Contact", icon: <Mail className="h-4 w-4" /> },
];

export default function ShippingPolicyPage() {
  return (
    <main className="container-fw pt-16 md:pt-24 pb-24">
      {/* soft ambient glows */}
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
            Transparent shipping info
          </span>
        </div>

        <h1 className="mt-3 bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent text-3xl md:text-4xl font-extrabold tracking-tight">
          Shipping Policy
        </h1>
        <p className="mt-2 max-w-3xl text-gray-600">
          Here’s how we process, ship, and track your order. If you need hands-on help, visit{" "}
          <Link href="/shipping-tracking" className="text-blue-700 underline">
            Shipping &amp; Tracking
          </Link>{" "}
          for live tips and tools.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {SECTIONS.slice(0, 6).map((s) => (
            <AnchorPill key={s.id} id={s.id} icon={s.icon}>
              {s.label}
            </AnchorPill>
          ))}
          <AnchorPill id="customs" icon={<ShieldCheck className="h-4 w-4" />}>
            Customs & Duties
          </AnchorPill>
          <AnchorPill id="lost" icon={<PackageOpen className="h-4 w-4" />}>
            Lost parcels
          </AnchorPill>
        </div>
      </section>

      {/* ---------- GRID ---------- */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* CONTENT */}
        <div className="grid gap-6">
          <Section id="intro" title="Introduction">
            <p>
              We ship worldwide from our partner facilities. Processing times and transit times are
              estimates and may vary due to volume, customs, weather, and carrier performance.
            </p>
          </Section>

          <Section id="processing" title="Processing Times">
            <List
              items={[
                "Standard production: 3–7 business days for most items.",
                "Personalized/custom products: usually 5–10 business days.",
                "Orders placed on weekends or holidays begin processing next business day.",
              ]}
            />
            <StatsRow
              stats={[
                { label: "Standard production", value: "3–7 days" },
                { label: "Personalized items", value: "5–10 days" },
                { label: "Cut-off", value: "Mon–Fri" },
              ]}
            />
          </Section>

          <Section id="carriers" title="Carriers & Methods">
            <p>
              We use reliable postal and courier partners (varies by destination) to deliver safely
              and quickly. You’ll receive a shipping confirmation with a tracking link when your
              parcel leaves our facility.
            </p>
          </Section>

          <Section id="rates" title="Rates & Free Shipping">
            <List
              items={[
                "Shipping rates are shown at checkout based on destination, weight, and method.",
                "From time to time we may offer free-shipping promotions (see banner at the top of the site).",
                "Any additional customs charges are separate from shipping fees collected at checkout.",
              ]}
            />
          </Section>

          <Section id="estimates" title="Delivery Estimates (after dispatch)">
            <p className="text-gray-700">
              Typical transit ranges below. Remote areas may require extra time.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard region="Europe" days="4–9 business days" />
              <StatCard region="North America" days="6–12 business days" />
              <StatCard region="South America" days="8–15 business days" />
              <StatCard region="Asia" days="6–12 business days" />
              <StatCard region="Oceania" days="7–13 business days" />
              <StatCard region="Middle East & Africa" days="8–16 business days" />
            </div>
            <Callout tone="info" icon={<Clock className="h-4 w-4" />}>
              Estimates exclude production/processing time. Customs inspections can extend delivery.
            </Callout>
          </Section>

          <Section id="tracking" title="Tracking">
            <p>
              Use the link in your shipping email or head to{" "}
              <Link href="/shipping-tracking" className="text-blue-700 underline">
                Shipping &amp; Tracking
              </Link>{" "}
              for carrier tools, troubleshooting, and status explanations.
            </p>
          </Section>

          <Section id="address" title="Address Changes & Corrections">
            <List
              items={[
                "Contact us immediately if you entered the wrong address. We can only edit before the order ships.",
                "Once in transit, address changes are rarely possible and may incur a re-shipping fee if the parcel returns to us.",
              ]}
            />
          </Section>

          <Section id="customs" title="Customs, Duties & Taxes">
            <List
              items={[
                "International orders may be subject to import duties, taxes, and fees collected by the destination country.",
                "These charges are the recipient’s responsibility and are not included in our product or shipping prices (unless explicitly stated).",
                "Customs processing can add time to the delivery window.",
              ]}
            />
          </Section>

          <Section id="failed" title="Failed Delivery / Returned to Sender">
            <List
              items={[
                "If delivery fails due to an incorrect address, unavailability, or non-collection, carriers may return the parcel.",
                "We can reship once it returns (additional shipping costs may apply).",
                "If you prefer a refund on return, shipping fees are non-refundable and personalized items are not eligible unless defective.",
              ]}
            />
          </Section>

          <Section id="lost" title="Lost or Heavily Delayed Parcels">
            <List
              items={[
                "If your tracking hasn’t updated for several days, check our tips on the Shipping & Tracking page first.",
                "Contact us if the parcel appears lost; we’ll open a trace with the carrier.",
                "Resolutions may include replacement or refund depending on the investigation outcome and product type.",
              ]}
            />
          </Section>

          <Section id="split" title="Split Shipments">
            <p>
              Orders with multiple items may ship separately to speed up delivery. You’ll receive
              separate tracking numbers where applicable.
            </p>
          </Section>

          <Section id="preorders" title="Pre-orders & Back-orders">
            <p>
              Pre-order products ship once available. Estimated ship windows are shown on the product
              page and in your order confirmation. Your entire order may be held to ship together
              unless otherwise stated.
            </p>
          </Section>

          <Section id="holidays" title="Holidays & Peak Periods">
            <p>
              During peak seasons (e.g., Black Friday, December holidays) production and carriers may
              experience delays. Please order early to allow extra time.
            </p>
          </Section>

          <Section id="force" title="Service Interruptions / Force Majeure">
            <p>
              We are not liable for delays caused by events outside our control (e.g., severe
              weather, strikes, pandemic restrictions, customs closures). We always work with
              carriers to minimize impact and keep you informed.
            </p>
          </Section>

          <Section id="contact" title="Need help with shipping?">
            <p>
              Visit{" "}
              <Link href="/shipping-tracking" className="text-blue-700 underline">
                Shipping &amp; Tracking
              </Link>{" "}
              for step-by-step fixes. Still stuck?{" "}
              <Link href="/contact" className="text-blue-700 underline">
                Contact Support
              </Link>{" "}
              or email{" "}
              <a href="mailto:myfootballworldshop@gmail.com" className="text-blue-700 underline">
                myfootballworldshop@gmail.com
              </a>
              .
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/returns"
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm hover:bg-gray-50"
              >
                <Undo2 className="h-4 w-4" />
                Returns & Exchanges
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/size-guide"
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm hover:bg-gray-50"
              >
                <PackageCheck className="h-4 w-4" />
                Size Guide
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Section>
        </div>

        {/* STICKY NAV */}
        <aside className="lg:sticky lg:top-28 h-max">
          <div className="rounded-2xl border bg-white/85 backdrop-blur p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-600" />
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
                  <Plane className="h-4 w-4 text-blue-600" />
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

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600">
              <StatMini label="Production" value="3–7 days" />
              <StatMini label="Worldwide" value="Yes" />
            </div>
          </div>
        </aside>
      </div>
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

function StatCard({ region, days }: { region: string; days: string }) {
  return (
    <div className="rounded-xl border bg-white/70 p-4">
      <div className="text-xs text-gray-600">{region}</div>
      <div className="mt-0.5 text-base font-semibold">{days}</div>
    </div>
  );
}

function StatsRow({
  stats,
}: {
  stats: { label: string; value: string }[];
}) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border bg-white/70 p-3 text-center">
          <div className="text-xs text-gray-600">{s.label}</div>
          <div className="text-base font-semibold">{s.value}</div>
        </div>
      ))}
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
