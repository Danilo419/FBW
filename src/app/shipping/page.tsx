// src/app/shipping/page.tsx
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
import Link from "next/link";

export const revalidate = 3600; // revalidates every hour

export const metadata: Metadata = {
  title: "Shipping & Tracking – FootballWorld",
  description:
    "Worldwide tracked shipping. Single delivery window of 7–9 business days after dispatch, plus handling times and how to track your order.",
};

export default function ShippingPage() {
  return (
    <div className="container-fw section-gap">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Shipping & Tracking
        </h1>
        <p className="mt-3 text-gray-600 max-w-3xl">
          We ship worldwide with tracked delivery. There is a single delivery window:
          <b> 7–9 business days after dispatch</b>. Below you’ll find handling times and how to
          track your order once it’s on the way.
        </p>
      </header>

      {/* Single shipping method */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-blue-50 p-2">
              <Truck className="h-5 w-5 text-blue-600" />
            </span>
            <h2 className="font-semibold">Standard Tracked Delivery</h2>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            One reliable, fully tracked service for all destinations.
          </p>
          <DetailRow
            icon={<Timer className="h-4 w-4" />}
            text="Typical transit: 7–9 business days"
          />
          <DetailRow icon={<Globe2 className="h-4 w-4" />} text="Available worldwide" />
          <DetailRow icon={<BadgePercent className="h-4 w-4" />} text="Price shown at checkout" />
        </Card>
      </section>

      {/* Handling / production */}
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-amber-50 p-2">
              <ClipboardList className="h-5 w-5 text-amber-600" />
            </span>
            <h2 className="font-semibold">Handling & Production</h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            <li>
              • Our kits are made to order. Production time is typically <b>2–5 business days</b>.
            </li>
            <li>• Orders placed on weekends/holidays are processed the next business day.</li>
            <li>• You’ll receive an email with your tracking number immediately after dispatch.</li>
          </ul>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-purple-50 p-2">
              <MapPin className="h-5 w-5 text-purple-600" />
            </span>
            <h2 className="font-semibold">Address Changes</h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            <li>• Need to change your address? Contact us <b>before</b> the order ships.</li>
            <li>
              • Once in transit, address changes are subject to the carrier’s policy and may not be
              possible.
            </li>
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
            <h2 className="font-semibold">How to track your order</h2>
          </div>
          <ol className="mt-3 space-y-2 text-sm text-gray-700 list-decimal pl-5">
            <li>Find the tracking code we emailed you after dispatch.</li>
            <li>Use your carrier’s website (link in the email) or any universal tracker below.</li>
            <li>Events may take 24–48h to appear after pickup — this is normal.</li>
          </ol>

          <div className="mt-4 flex flex-wrap gap-2">
            <TrackBadge href="https://t.17track.net" label="17TRACK" />
            <TrackBadge href="https://www.parcelsapp.com/en" label="Parcels" />
            <TrackBadge href="https://www.aftership.com/track" label="AfterShip" />
          </div>

          <p className="mt-4 text-xs text-gray-500">
            Tip: paste your tracking number into one of the services above; it will auto-detect the
            carrier in most cases.
          </p>
        </Card>
      </section>

      {/* Customs / duties & delays */}
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-rose-50 p-2">
              <PackageOpen className="h-5 w-5 text-rose-600" />
            </span>
            <h2 className="font-semibold">Customs, Duties & Taxes</h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            <li>• International shipments may be subject to import duties/VAT set by your country.</li>
            <li>• Any such charges are the recipient’s responsibility and are not collected by us.</li>
            <li>• Refusal to pay duties may result in the parcel being returned or destroyed by customs.</li>
          </ul>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-lime-50 p-2">
              <ShieldCheck className="h-5 w-5 text-lime-600" />
            </span>
              <h2 className="font-semibold">Delays & Lost Parcels</h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            <li>• Weather, customs inspections and peak seasons can extend delivery times.</li>
            <li>
              • If your tracking hasn’t updated for 10+ business days, please reach out — we’ll
              investigate with the carrier.
            </li>
            <li>
              • Declared lost: usually after the carrier’s investigation window (often 30–45 days
              from dispatch).
            </li>
          </ul>
        </Card>
      </section>

      {/* Help CTA */}
      <section className="mt-10">
        <div className="card p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-blue-50 p-2">
              <HelpCircle className="h-5 w-5 text-blue-600" />
            </span>
            <div>
              <h3 className="font-semibold">Need help with your shipment?</h3>
              <p className="text-sm text-gray-600">
                Check our <Link href="/faq" className="text-blue-700 hover:underline">FAQ</Link> or
                contact us with your order number and tracking code.
              </p>
            </div>
          </div>
          <Link href="/contact" className="btn-primary w-full sm:w-auto text-center">
            Contact support
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
