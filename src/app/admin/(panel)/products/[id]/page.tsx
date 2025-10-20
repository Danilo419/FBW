// src/app/admin/(panel)/products/[id]/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { updateProduct } from "@/app/admin/(panel)/products/actions";
import SizeAvailabilityToggle from "@/app/admin/(panel)/products/SizeAvailabilityToggle";
import ImagesEditor from "@/app/admin/(panel)/products/ImagesEditor";
import type { OptionType } from "@prisma/client";

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2);
}

/* ==================== Regras S→4XL (com “fantasmas”) ==================== */
const ADULT_ALLOWED_ORDER = ["S", "M", "L", "XL", "2XL", "3XL", "4XL"] as const;
type AllowedAdult = (typeof ADULT_ALLOWED_ORDER)[number];

function normalizeAdultSizeLabel(raw: string): string {
  const t = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (t === "XXL") return "2XL";
  if (t === "XXXL") return "3XL";
  if (t === "XXXXL") return "4XL";
  return t;
}
function isAllowedAdultSize(label: string): label is AllowedAdult {
  return ADULT_ALLOWED_ORDER.includes(label as AllowedAdult);
}
function isKidsLabel(s: string) {
  const t = s.trim().toUpperCase();
  if (/^\d+\s*Y$/.test(t)) return true;             // 6Y
  if (/^\d+\s*-\s*\d+\s*Y$/.test(t)) return true;   // 10-11Y
  if (/^\d+\s*(YR|YRS|YEAR|YEARS)$/.test(t)) return true;
  if (/^\d+\s*(ANOS|AÑOS)$/.test(t)) return true;
  if (/^(KID|KIDS|CHILD|JUNIOR|JR)\b/.test(t)) return true;
  if (/\b(JR|JUNIOR|KID|KIDS)$/.test(t)) return true;
  return false;
}
function indexInOrder(value: string, order: readonly string[]) {
  const i = order.indexOf(value.toUpperCase());
  return i === -1 ? Number.POSITIVE_INFINITY : i;
}
function sortByOrder<T extends { size: string }>(list: T[], order: readonly string[]): T[] {
  return [...list].sort(
    (a, b) => indexInOrder(a.size.toUpperCase(), order) - indexInOrder(b.size.toUpperCase(), order)
  );
}

/** Completa S→4XL com “fantasmas” (sem id real, sem toggle) */
function completeAdultsWithGhosts<
  T extends { id?: string; size: string; available?: boolean }
>(rows: T[]) {
  const by = new Map(rows.map((r) => [r.size.toUpperCase(), r]));
  return ADULT_ALLOWED_ORDER.map((sz) => {
    const hit = by.get(sz);
    if (hit) return { ...hit, __ghost: false as const };
    return { id: `ghost-${sz}`, size: sz, available: false, __ghost: true as const } as T & {
      __ghost: true;
    };
  });
}

export default async function ProductEditPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      sizes: true, // { id, productId, size, available }
      options: {
        where: { type: "SIZE" as OptionType },
        include: { values: { select: { value: true, label: true } } },
      },
    },
  });
  if (!product) return notFound();

  // (Opcional) ainda respeitamos o grupo SIZE, mas a seguir vamos completar com fantasmas
  const sizeGroup = product.options[0] ?? null;
  const allowedFromGroup =
    sizeGroup && sizeGroup.values.length > 0
      ? new Set(
          sizeGroup.values
            .map((v) => normalizeAdultSizeLabel(v.label || v.value || ""))
            .filter((x) => x && isAllowedAdultSize(x))
        )
      : null;

  // 1) Normaliza tamanhos adultos existentes (ignora kids) e filtra S→4XL
  const normalizedAdults = product.sizes
    .filter((s) => !isKidsLabel(s.size))
    .map((s) => ({ ...s, size: normalizeAdultSizeLabel(s.size) }))
    .filter((s) => isAllowedAdultSize(s.size))
    .filter((s) => (allowedFromGroup ? allowedFromGroup.has(s.size) : true));

  // 2) Dedup (mantém o com available=true se houver duplicados)
  const dedupMap = new Map<string, (typeof normalizedAdults)[number]>();
  for (const s of normalizedAdults) {
    const key = s.size.toUpperCase();
    const prev = dedupMap.get(key);
    if (!prev) dedupMap.set(key, s);
    else if (prev.available === false && s.available === true) dedupMap.set(key, s);
  }
  const dedupList = Array.from(dedupMap.values());

  // 3) Completa com “fantasmas” para S, M, L, XL, 2XL, 3XL, 4XL
  const completed = completeAdultsWithGhosts(dedupList);

  // 4) Ordena e usa contagem fixa (7)
  const viewSizes = sortByOrder(completed, ADULT_ALLOWED_ORDER);
  const originCount = ADULT_ALLOWED_ORDER.length;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-extrabold">Edit product</h1>
        <p className="text-sm text-gray-500">
          Update general information, images and size availability.
        </p>
      </header>

      <section className="rounded-2xl bg-white p-5 shadow border">
        <form action={updateProduct} className="grid gap-6">
          <input type="hidden" name="id" defaultValue={product.id} />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600">Name</label>
              <input
                name="name"
                defaultValue={product.name}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Team</label>
              <input
                name="team"
                defaultValue={product.team ?? ""}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Season</label>
              <input
                name="season"
                defaultValue={product.season ?? ""}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="e.g. 25/26"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Base price (EUR)</label>
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={centsToInput(product.basePrice)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600">Description</label>
              <textarea
                name="description"
                defaultValue={product.description ?? ""}
                className="mt-1 w-full rounded-xl border px-3 py-2 min-h-[120px]"
                placeholder="Product description..."
              />
            </div>
          </div>

          {/* Editor de Imagens (drag, add, remove, reorder). Submete `imagesText` */}
          <ImagesEditor
            name="imagesText"
            initialImages={product.images ?? []}
            alt={product.name}
          />

          <div>
            <button
              type="submit"
              className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Save product
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Sizes & Availability</h3>
          <span className="text-xs text-gray-500">
            Showing {viewSizes.length} of {originCount} adult sizes (S–4XL)
          </span>
        </div>

        {viewSizes.length === 0 ? (
          <p className="text-sm text-gray-500">No adult sizes to show (S–4XL).</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {viewSizes.map((s: any) => {
              const isGhost = s.__ghost === true;
              const unavailable = !s.available;

              return (
                <div
                  key={s.id}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
                    isGhost ? "bg-gray-50" : unavailable ? "bg-red-50" : "bg-green-50"
                  }`}
                  title={isGhost ? "This size does not exist in the database yet" : undefined}
                >
                  <div
                    className={`font-semibold flex items-center gap-2 ${
                      isGhost ? "opacity-70" : unavailable ? "line-through opacity-50" : ""
                    }`}
                  >
                    <span>{s.size}</span>
                    {isGhost && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">
                        ghost
                      </span>
                    )}
                  </div>

                  {isGhost ? (
                    <button
                      type="button"
                      className="cursor-not-allowed text-xs rounded-lg border px-2 py-1 text-gray-400"
                      title="Create this size in DB to enable"
                      disabled
                    >
                      Unavailable
                    </button>
                  ) : (
                    <SizeAvailabilityToggle
                      sizeId={s.id}
                      initialUnavailable={unavailable}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-gray-500 mt-3">
          Sizes shown are fixed to S–4XL. Entries marked as <strong>ghost</strong> don’t exist in
          the database yet; create them (via seed/Studio) to enable the toggle.
        </p>
      </section>
    </div>
  );
}
