// src/app/returns/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import {
  RotateCcw,
  BadgeDollarSign, // replacing ReceiptRefund
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

// Use a literal (not an expression) to avoid "Unsupported node type BinaryExpression"
export const revalidate = 3600; // 1h

export const metadata: Metadata = {
  title: "Returns & Exchanges – FootballWorld",
  description:
    "Return window, eligibility rules, how to start a return or request an exchange, and refund processing times.",
};

export default function ReturnsPage() {
  return (
    <div className="container-fw section-gap">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Returns & Exchanges
        </h1>
        <p className="mt-3 text-gray-600 max-w-3xl">
          We want you to love your jersey. If something isn’t right, you can
          request a return or size exchange within our policy window. Read the
          conditions below and start your request when ready.
        </p>
      </header>

      {/* Policy at a glance */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card>
          <Header icon={<Clock className="h-5 w-5 text-blue-600" />} title="Return window" />
          <ul className="mt-2 space-y-2 text-sm text-gray-700">
            <li>• Returns/exchanges accepted within <b>14 days of delivery</b>.</li>
            <li>• Contact us first to obtain instructions and the correct return address.</li>
          </ul>
        </Card>

        <Card>
          <Header icon={<ShieldCheck className="h-5 w-5 text-emerald-600" />} title="Item condition" />
          <ul className="mt-2 space-y-2 text-sm text-gray-700">
            <li>• Unused, unwashed, no smells or marks.</li>
            <li>• All original tags/packaging intact.</li>
            <li>• Try-ons are OK — just keep tags attached.</li>
          </ul>
        </Card>

        <Card>
          <Header
            icon={<BadgeDollarSign className="h-5 w-5 text-amber-600" />}
            title="Refunds & costs"
          />
          <ul className="mt-2 space-y-2 text-sm text-gray-700">
            <li>• Refund to original payment method.</li>
            <li>• Original shipping is non-refundable.</li>
            <li>• Return postage paid by customer (except faulty/incorrect items).</li>
          </ul>
        </Card>
      </section>

      {/* Eligibility & exclusions */}
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card>
          <Header icon={<Package className="h-5 w-5 text-purple-600" />} title="Eligible items" />
          <Bullet>Standard jerseys and apparel in original condition.</Bullet>
          <Bullet>Accessories that are unopened and unused.</Bullet>
          <Bullet>Requests submitted within 14 days of delivery.</Bullet>
        </Card>

        <Card>
          <Header icon={<AlertTriangle className="h-5 w-5 text-rose-600" />} title="Not returnable" />
          <Bullet icon={<Shirt className="h-4 w-4" />}>
            <b>Customized jerseys</b> (name/number patches) — made to order and final sale.
          </Bullet>
          <Bullet icon={<Scissors className="h-4 w-4" />}>Altered or washed items.</Bullet>
          <Bullet icon={<Tag className="h-4 w-4" />}>Clearance or “final sale” marked products.</Bullet>
          <Bullet>Items returned without contacting us first.</Bullet>
        </Card>
      </section>

      {/* How to start */}
      <section className="mt-10">
        <Card>
          <Header icon={<RotateCcw className="h-5 w-5 text-sky-600" />} title="How to start a return/exchange" />
          <ol className="mt-3 list-decimal pl-5 space-y-2 text-sm text-gray-700">
            <li>
              Email us at <b>myfootballworldshop@gmail.com</b> or use the{" "}
              <Link href="/contact" className="text-blue-700 hover:underline">
                contact form
              </Link>{" "}
              with your <b>order number</b>, your request (return or exchange) and the reason.
            </li>
            <li>
              (Optional) Attach clear photos if there is a defect/damage{" "}
              <span className="text-gray-500">(helps us speed things up)</span>.
            </li>
            <li>
              We’ll reply with the return authorization and the correct return address. Please do
              not send anything before receiving it.
            </li>
            <li>
              Pack items securely. Use a tracked service and keep the receipt until your request is
              completed.
            </li>
          </ol>
          <p className="mt-3 text-xs text-gray-500">
            Note: For exchanges, we’ll reserve the requested size once your parcel shows movement
            in tracking (or upon arrival, depending on stock).
          </p>
        </Card>
      </section>

      {/* Exchanges section */}
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card>
          <Header icon={<Truck className="h-5 w-5 text-indigo-600" />} title="Size exchanges" />
          <Bullet>Request within 14 days of delivery.</Bullet>
          <Bullet>Item must be in original condition with tags.</Bullet>
          <Bullet>
            You cover the postage back to us; we cover the replacement dispatch (standard option).
          </Bullet>
          <Bullet>
            If the requested size is unavailable, we can refund or issue store credit — your choice.
          </Bullet>
        </Card>

        <Card>
          <Header icon={<Camera className="h-5 w-5 text-amber-600" />} title="Damaged / incorrect items" />
          <Bullet>
            If your order arrived damaged, defective or incorrect, contact us within <b>7 days</b>{" "}
            of delivery.
          </Bullet>
          <Bullet>Include photos of the issue and the outer packaging/labels.</Bullet>
          <Bullet>
            We will replace or refund at no extra cost after verification (carrier investigation may
            be required).
          </Bullet>
        </Card>
      </section>

      {/* Refund timing */}
      <section className="mt-10">
        <Card>
          <Header icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} title="Refund timing" />
          <p className="mt-2 text-sm text-gray-700">
            Once your return is delivered and inspected, refunds are typically issued within{" "}
            <b>3–5 business days</b>. Your bank or card provider may take an additional{" "}
            <b>3–10 business days</b> to post the funds back to your account. We’ll email you a
            confirmation as soon as it’s processed.
          </p>
        </Card>
      </section>

      {/* Cancellations */}
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card>
          <Header icon={<Info className="h-5 w-5 text-gray-700" />} title="Order cancellations" />
          <Bullet>
            We can cancel and refund <b>before</b> production/dispatch starts.
          </Bullet>
          <Bullet>
            Orders already produced or shipped follow the return policy above once delivered.
          </Bullet>
        </Card>

        <Card>
          <Header icon={<HelpCircle className="h-5 w-5 text-blue-600" />} title="Need assistance?" />
          <p className="mt-2 text-sm text-gray-700">
            Check our{" "}
            <Link href="/faq" className="text-blue-700 hover:underline">
              FAQ
            </Link>{" "}
            or contact us with your order number — we’re happy to help.
          </p>
          <div className="mt-4">
            <Link href="/contact" className="btn-primary">
              Contact support
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
