// src/app/[locale]/admin/(panel)/discount-codes/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/prisma";
import {
  createDiscountCodes,
  deleteDiscountCode,
  toggleDiscountCode,
} from "./actions";

type PageProps = {
  params: Promise<{
    locale: string;
  }>;
};

type DiscountCodeRow = {
  id: string;
  code: string;
  percentOff: number;
  active: boolean;
  maxUses: number;
  usesCount: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
  usedAt: Date | null;
  usedByOrderId?: string | null;
  stripeCouponId?: string | null;
  stripePromotionCodeId?: string | null;
};

function formatDate(value?: Date | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function hasStripeNativeDiscount(code: {
  stripeCouponId?: string | null;
  stripePromotionCodeId?: string | null;
}) {
  return Boolean(
    String(code.stripeCouponId || "").trim() ||
      String(code.stripePromotionCodeId || "").trim()
  );
}

function isCodeUsed(code: {
  usedAt?: Date | null;
  usedByOrderId?: string | null;
  usesCount: number;
  maxUses: number;
}) {
  return Boolean(
    code.usedAt ||
      code.usedByOrderId ||
      code.usesCount >= 1 ||
      code.usesCount >= code.maxUses
  );
}

function isCodeExpired(code: { expiresAt: Date | null }) {
  const now = new Date();
  return Boolean(code.expiresAt && code.expiresAt < now);
}

function isCodeAvailable(code: {
  active: boolean;
  usedAt?: Date | null;
  usedByOrderId?: string | null;
  usesCount: number;
  maxUses: number;
  expiresAt: Date | null;
}) {
  return code.active && !isCodeUsed(code) && !isCodeExpired(code);
}

function getStatus(code: {
  active: boolean;
  usesCount: number;
  maxUses: number;
  expiresAt: Date | null;
  usedAt?: Date | null;
  usedByOrderId?: string | null;
}) {
  if (isCodeUsed(code)) {
    return {
      label: "Used",
      className: "bg-blue-100 text-blue-700",
    };
  }

  if (isCodeExpired(code)) {
    return {
      label: "Expired",
      className: "bg-amber-100 text-amber-700",
    };
  }

  if (!code.active) {
    return {
      label: "Inactive",
      className: "bg-neutral-200 text-neutral-700",
    };
  }

  return {
    label: "Available",
    className: "bg-green-100 text-green-700",
  };
}

export default async function DiscountCodesPage({ params }: PageProps) {
  const { locale } = await params;

  const rawCodes = await prisma.discountCode.findMany({
    orderBy: { createdAt: "desc" },
  });

  const codes: DiscountCodeRow[] = rawCodes.map((code) => {
    const row = code as DiscountCodeRow & {
      usedByOrderId?: string | null;
      stripeCouponId?: string | null;
      stripePromotionCodeId?: string | null;
    };

    return {
      id: row.id,
      code: row.code,
      percentOff: row.percentOff,
      active: row.active,
      maxUses: row.maxUses,
      usesCount: row.usesCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      expiresAt: row.expiresAt ?? null,
      usedAt: row.usedAt ?? null,
      usedByOrderId:
        typeof row.usedByOrderId === "string" ? row.usedByOrderId : null,
      stripeCouponId:
        typeof row.stripeCouponId === "string" ? row.stripeCouponId : null,
      stripePromotionCodeId:
        typeof row.stripePromotionCodeId === "string"
          ? row.stripePromotionCodeId
          : null,
    };
  });

  const totalCodes = codes.length;
  const availableCodes = codes.filter((code) => isCodeAvailable(code)).length;
  const usedCodes = codes.filter((code) => isCodeUsed(code)).length;
  const expiredCodes = codes.filter(
    (code) => !isCodeUsed(code) && isCodeExpired(code)
  ).length;
  const stripeReadyCodes = codes.filter((code) =>
    hasStripeNativeDiscount(code)
  ).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Discount Codes</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Crie códigos únicos para dar desconto apenas no preço dos produtos,
            sem descontar o shipping. Cada código é de uso único real: depois de
            pago, fica automaticamente marcado como usado e ligado à respetiva
            encomenda. Se um código tiver Stripe Coupon ID ou Stripe Promotion
            Code ID, o desconto poderá aparecer como linha separada no Stripe
            Checkout.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Total codes
            </p>
            <p className="mt-2 text-2xl font-bold">{totalCodes}</p>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Available
            </p>
            <p className="mt-2 text-2xl font-bold">{availableCodes}</p>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Used
            </p>
            <p className="mt-2 text-2xl font-bold">{usedCodes}</p>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Expired
            </p>
            <p className="mt-2 text-2xl font-bold">{expiredCodes}</p>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Stripe ready
            </p>
            <p className="mt-2 text-2xl font-bold">{stripeReadyCodes}</p>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Create discount codes</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Gere um lote de códigos únicos. Cada código será criado com apenas 1
          utilização. Se a tua action já suportar integração Stripe, podes
          preencher também os IDs abaixo.
        </p>

        <form
          action={createDiscountCodes}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <input type="hidden" name="locale" value={locale} />

          <div className="space-y-2">
            <label htmlFor="amount" className="text-sm font-medium">
              Quantity
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              min={1}
              max={500}
              defaultValue={10}
              className="w-full rounded-xl border px-3 py-2 outline-none transition focus:border-black"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="prefix" className="text-sm font-medium">
              Prefix (optional)
            </label>
            <input
              id="prefix"
              name="prefix"
              type="text"
              defaultValue="REVIEW"
              placeholder="REVIEW"
              className="w-full rounded-xl border px-3 py-2 uppercase outline-none transition focus:border-black"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="percentOff" className="text-sm font-medium">
              Percent off
            </label>
            <input
              id="percentOff"
              name="percentOff"
              type="number"
              min={1}
              max={100}
              defaultValue={10}
              className="w-full rounded-xl border px-3 py-2 outline-none transition focus:border-black"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="expiresAt" className="text-sm font-medium">
              Expires at (optional)
            </label>
            <input
              id="expiresAt"
              name="expiresAt"
              type="datetime-local"
              className="w-full rounded-xl border px-3 py-2 outline-none transition focus:border-black"
            />
          </div>

          <div className="space-y-2 md:col-span-2 xl:col-span-2">
            <label
              htmlFor="stripePromotionCodeId"
              className="text-sm font-medium"
            >
              Stripe Promotion Code ID (optional)
            </label>
            <input
              id="stripePromotionCodeId"
              name="stripePromotionCodeId"
              type="text"
              placeholder="promo_..."
              className="w-full rounded-xl border px-3 py-2 outline-none transition focus:border-black"
            />
          </div>

          <div className="space-y-2 md:col-span-2 xl:col-span-2">
            <label htmlFor="stripeCouponId" className="text-sm font-medium">
              Stripe Coupon ID (optional)
            </label>
            <input
              id="stripeCouponId"
              name="stripeCouponId"
              type="text"
              placeholder="coupon_..."
              className="w-full rounded-xl border px-3 py-2 outline-none transition focus:border-black"
            />
          </div>

          <div className="md:col-span-2 xl:col-span-4">
            <button
              type="submit"
              className="inline-flex rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Generate codes
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">All discount codes</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">% Off</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Usage</th>
                <th className="px-4 py-3 font-semibold">Stripe</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Expires</th>
                <th className="px-4 py-3 font-semibold">Used at</th>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {codes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-neutral-500">
                    No discount codes created yet.
                  </td>
                </tr>
              ) : (
                codes.map((code) => {
                  const status = getStatus(code);
                  const isUsed = isCodeUsed(code);
                  const stripeReady = hasStripeNativeDiscount(code);
                  const canToggle = !isUsed && !isCodeExpired(code);

                  return (
                    <tr key={code.id} className="border-t align-middle">
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm font-semibold tracking-wide">
                          {code.code}
                        </div>
                      </td>

                      <td className="px-4 py-3">{code.percentOff}%</td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div>
                            {isUsed ? "1/1" : "0/1"}
                          </div>
                          <div className="text-xs text-neutral-500">
                            Stored: {code.usesCount}/{code.maxUses}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                stripeReady
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-neutral-100 text-neutral-600"
                              }`}
                            >
                              {stripeReady ? "Native Stripe" : "Fallback only"}
                            </span>
                          </div>

                          <div className="text-xs text-neutral-500">
                            <div>
                              Promo:{" "}
                              <span className="font-mono">
                                {code.stripePromotionCodeId || "—"}
                              </span>
                            </div>
                            <div>
                              Coupon:{" "}
                              <span className="font-mono">
                                {code.stripeCouponId || "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">{formatDate(code.createdAt)}</td>
                      <td className="px-4 py-3">{formatDate(code.expiresAt)}</td>
                      <td className="px-4 py-3">{formatDate(code.usedAt)}</td>

                      <td className="px-4 py-3">
                        <span className="font-mono text-xs">
                          {code.usedByOrderId || "—"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {canToggle && (
                            <form action={toggleDiscountCode}>
                              <input type="hidden" name="id" value={code.id} />
                              <input type="hidden" name="locale" value={locale} />
                              <button
                                type="submit"
                                className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-neutral-50"
                              >
                                {code.active ? "Deactivate" : "Activate"}
                              </button>
                            </form>
                          )}

                          <form action={deleteDiscountCode}>
                            <input type="hidden" name="id" value={code.id} />
                            <input type="hidden" name="locale" value={locale} />
                            <button
                              type="submit"
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}