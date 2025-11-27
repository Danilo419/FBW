// src/app/admin/(panel)/products/[id]/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { updateProduct, setSelectedBadges } from "@/app/admin/(panel)/products/actions";
import SizeAvailabilityToggle from "@/app/admin/(panel)/products/SizeAvailabilityToggle";
import ImagesEditor from "@/app/admin/(panel)/products/ImagesEditor";
import type { OptionType } from "@prisma/client";
import Script from "next/script";

/** ===== Wrapper server action que retorna void ===== */
async function saveBadgesAction(formData: FormData): Promise<void> {
  "use server";
  await setSelectedBadges(formData);
}

/* =============== Helpers =============== */
function centsToInput(cents: number) {
  return (cents / 100).toFixed(2);
}

/* =============== Regras S→2XL (sem 3XL e 4XL) =============== */
const ADULT_ALLOWED_ORDER = ["S", "M", "L", "XL", "2XL"] as const;
type AllowedAdult = (typeof ADULT_ALLOWED_ORDER)[number];

function normalizeAdultSizeLabel(raw: string): string {
  const t = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (t === "XXL") return "2XL";
  return t;
}

function isAllowedAdultSize(label: string): label is AllowedAdult {
  return ADULT_ALLOWED_ORDER.includes(label as AllowedAdult);
}

function isKidsLabel(s: string) {
  const t = s.trim().toUpperCase();
  if (/^\d+\s*Y$/.test(t)) return true;
  if (/^\d+\s*-\s*\d+\s*Y$/.test(t)) return true;
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

function completeAdultsWithGhosts<
  T extends { id?: string; size: string; available?: boolean }
>(rows: T[]) {
  const by = new Map(rows.map((r) => [r.size.toUpperCase(), r]));
  return ADULT_ALLOWED_ORDER.map((sz) => {
    const hit = by.get(sz);
    if (hit) return { ...hit, __ghost: false as const };
    return {
      id: `ghost-${sz}`,
      size: sz,
      available: false,
      __ghost: true as const,
    } as T & { __ghost: true };
  });
}

/* =============== Badge Catalog (EN) =============== */
type BadgeOption = { value: string; label: string };
const BADGE_GROUPS: { title: string; items: BadgeOption[] }[] = [
  {
    title: "Domestic Leagues – Europe (Top 8)",
    items: [
      { value: "premier-league-regular", label: "Premier League – League Badge" },
      { value: "premier-league-champions", label: "Premier League – Champions (Gold)" },
      { value: "la-liga-regular", label: "La Liga – League Badge" },
      { value: "la-liga-champions", label: "La Liga – Champion" },
      { value: "serie-a-regular", label: "Serie A – League Badge" },
      { value: "serie-a-scudetto", label: "Italy – Scudetto (Serie A Champion)" },
      { value: "bundesliga-regular", label: "Bundesliga – League Badge" },
      { value: "bundesliga-champions", label: "Bundesliga – Champion (Meister Badge)" },
      { value: "ligue1-regular", label: "Ligue 1 – League Badge" },
      { value: "ligue1-champions", label: "Ligue 1 – Champion" },
      { value: "primeira-liga-regular", label: "Primeira Liga (Portugal) – League Badge" },
      { value: "primeira-liga-champions", label: "Primeira Liga – Champion" },
      { value: "eredivisie-regular", label: "Eredivisie – League Badge" },
      { value: "eredivisie-champions", label: "Eredivisie – Champion" },
      { value: "scottish-premiership-regular", label: "Scottish Premiership – League Badge" },
      { value: "scottish-premiership-champions", label: "Scottish Premiership – Champion" },
    ],
  },
  {
    title: "Domestic Leagues – Others mentioned",
    items: [
      { value: "mls-regular", label: "MLS – League Badge" },
      { value: "mls-champions", label: "MLS – Champions (MLS Cup Holders)" },
      { value: "brasileirao-regular", label: "Brazil – Brasileirão – League Badge" },
      { value: "brasileirao-champions", label: "Brazil – Brasileirão – Champion" },
      { value: "super-lig-regular", label: "Turkey – Süper Lig – League Badge" },
      { value: "super-lig-champions", label: "Turkey – Süper Lig – Champion (if applicable)" },
      { value: "spl-saudi-regular", label: "Saudi Pro League – League Badge" },
      { value: "spl-saudi-champions", label: "Saudi Pro League – Champion (if applicable)" },
    ],
  },
  {
    title: "UEFA Competitions",
    items: [
      { value: "ucl-regular", label: "UEFA Champions League – Starball Badge" },
      { value: "ucl-winners", label: "UEFA Champions League – Winners Badge" },
      { value: "uel-regular", label: "UEFA Europa League – Badge" },
      { value: "uel-winners", label: "UEFA Europa League – Winners Badge" },
      { value: "uecl-regular", label: "UEFA Europa Conference League – Badge" },
      { value: "uecl-winners", label: "UEFA Europa Conference League – Winners Badge" },
    ],
  },
  {
    title: "International Club",
    items: [
      { value: "club-world-cup-champions", label: "Club World Cup – Champions Badge" },
      { value: "intercontinental-cup-champions", label: "FIFA Intercontinental Cup – Champions Badge" },
    ],
  },
];

export default async function ProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      sizes: true,
      options: {
        where: { type: "SIZE" as OptionType },
        include: { values: { select: { value: true, label: true } } },
      },
    },
  });

  if (!product) return notFound();

  const selectedInitial: string[] = (product as any).badges ?? [];

  const sizeGroup = product.options[0] ?? null;

  const allowedFromGroup =
    sizeGroup && sizeGroup.values.length > 0
      ? new Set(
          sizeGroup.values
            .map((v) => normalizeAdultSizeLabel(v.label || v.value || ""))
            .filter((x) => x && isAllowedAdultSize(x))
        )
      : null;

  const normalizedAdults = product.sizes
    .filter((s) => !isKidsLabel(s.size))
    .map((s) => ({ ...s, size: normalizeAdultSizeLabel(s.size) }))
    .filter((s) => isAllowedAdultSize(s.size))
    .filter((s) => (allowedFromGroup ? allowedFromGroup.has(s.size) : true));

  const dedupMap = new Map<string, (typeof normalizedAdults)[number]>();
  for (const s of normalizedAdults) {
    const key = s.size.toUpperCase();
    const prev = dedupMap.get(key);
    if (!prev) dedupMap.set(key, s);
    else if (prev.available === false && s.available === true) dedupMap.set(key, s);
  }

  const completed = completeAdultsWithGhosts(Array.from(dedupMap.values()));
  const viewSizes = sortByOrder(completed, ADULT_ALLOWED_ORDER);
  const originCount = ADULT_ALLOWED_ORDER.length;

  const ALL_BADGES = BADGE_GROUPS.flatMap((g) => g.items.map((it) => ({ ...it, group: g.title })));
  const BADGES_JSON = JSON.stringify(ALL_BADGES);
  const SELECTED_JSON = JSON.stringify(selectedInitial);

  return (
    <div className="space-y-6" data-product-id={product.id}>
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-extrabold">Edit product</h1>
        <p className="text-sm text-gray-500">
          Update general information, images, badges and size availability.
        </p>
      </header>

      {/* =============================== FORM PRINCIPAL =============================== */}
      <section className="rounded-2xl bg-white p-5 shadow border">
        <style
          dangerouslySetInnerHTML={{
            __html: `
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
section .images-editor input[type="text"],
section .images-editor [placeholder*="Paste an image URL"] {
  position:absolute !important;
  width:1px !important; height:1px !important;
  padding:0 !important; margin:-1px !important;
  overflow:hidden !important; clip:rect(0,0,0,0) !important;
  white-space:nowrap !important; border:0 !important;
}
`,
          }}
        />

        <form action={updateProduct} className="grid gap-6" id="edit-product-form">
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

          {/* ====== Images ====== */}
          <div className="space-y-2 images-editor">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Images</label>
              <div className="flex items-center gap-2">
                <span id="blob-images-status" className="text-[11px] text-gray-500"></span>

                <label
                  htmlFor="blob-images-input"
                  className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer"
                  title="Add images from your computer"
                >
                  Add from computer
                </label>

                <input id="blob-images-input" type="file" accept="image/*" multiple className="sr-only" />
              </div>
            </div>

            <ImagesEditor
              name="imagesText"
              initialImages={(product as any).imageUrls ?? []}
              alt={product.name}
            />
          </div>

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

      {/* =============================== BADGES =============================== */}
      <section className="rounded-2xl bg-white p-5 shadow border mt-8">
        <form action={saveBadgesAction} id="badges-form" className="space-y-3">
          <input type="hidden" name="productId" value={product.id} />

          <label className="text-sm font-medium">Badges (optional)</label>
          <p className="text-xs text-gray-500">
            Type to search patches (league, champion, UEFA, etc.).
          </p>

          <input
            id="badge-query"
            type="text"
            placeholder="Search badges…"
            className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
            autoComplete="off"
          />

          <div id="badge-hint" className="text-xs text-gray-500">
            Start typing to see available badges.
          </div>

          <div
            id="badge-results"
            className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-auto border rounded-xl p-2 hidden"
          />

          <div id="badge-selected-wrap" className="space-y-2 hidden">
            <div className="text-xs font-semibold uppercase text-gray-500">Selected badges</div>
            <div id="badge-selected" className="flex flex-wrap gap-2" />
          </div>

          <div id="badge-hidden-inputs" className="hidden" />

          <div className="pt-2">
            <button
              type="submit"
              className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Save badges
            </button>
          </div>
        </form>
      </section>

      {/* =============================== SIZES =============================== */}
      <section className="rounded-2xl bg-white p-5 shadow border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Sizes & Availability</h3>
          <span className="text-xs text-gray-500">
            Showing {viewSizes.length} of {originCount} adult sizes (S–2XL)
          </span>
        </div>

        {viewSizes.length === 0 ? (
          <p className="text-sm text-gray-500">No adult sizes to show (S–2XL).</p>
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
                      disabled
                    >
                      Unavailable
                    </button>
                  ) : (
                    <SizeAvailabilityToggle sizeId={s.id} initialUnavailable={unavailable} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-gray-500 mt-3">
          Sizes shown are fixed to S–2XL. Entries marked as <strong>ghost</strong> don’t exist in the
          database yet; create them (via seed/Studio) to enable the toggle.
        </p>
      </section>
    </div>
  );
}
