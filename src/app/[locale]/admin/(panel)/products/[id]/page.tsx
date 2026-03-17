// src/app/[locale]/admin/(panel)/products/[id]/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { updateProduct, setSelectedBadges } from "@/app/[locale]/admin/(panel)/products/actions";
import SizeAvailabilityToggle from "@/app/[locale]/admin/(panel)/products/SizeAvailabilityToggle";
import ImagesEditor from "@/app/[locale]/admin/(panel)/products/ImagesEditor";
import type { OptionType } from "@prisma/client";
import Script from "next/script";

/** ===== Wrapper server action that returns void ===== */
async function saveBadgesAction(formData: FormData): Promise<void> {
  "use server";
  await setSelectedBadges(formData);
}

/* =============== Helpers =============== */
function centsToInput(cents: number) {
  return (cents / 100).toFixed(2);
}

/* =============== S→2XL rules (with “ghosts”) =============== */
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

function completeAdultsWithGhosts<T extends { id?: string; size: string; available?: boolean }>(rows: T[]) {
  const by = new Map(rows.map((r) => [r.size.toUpperCase(), r]));
  return ADULT_ALLOWED_ORDER.map((sz) => {
    const hit = by.get(sz);
    if (hit) return { ...hit, __ghost: false as const };
    return { id: `ghost-${sz}`, size: sz, available: false, __ghost: true as const } as T & {
      __ghost: true;
    };
  });
}

/** ===== Add missing adult size (ghost -> DB) =====
 * No prisma.productSize — uses nested write via product.sizes relation
 */
async function addAdultSizeAction(formData: FormData): Promise<void> {
  "use server";

  const productId = String(formData.get("productId") || "").trim();
  const raw = String(formData.get("size") || "").trim();
  const locale = String(formData.get("locale") || "en").trim();

  if (!productId || !raw) return;

  const size = normalizeAdultSizeLabel(raw);
  if (!isAllowedAdultSize(size)) return;

  const p = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, sizes: { select: { id: true, size: true } } },
  });
  if (!p) return;

  const exists = (p.sizes || []).some((s) => (s.size || "").trim().toUpperCase() === size.toUpperCase());

  if (!exists) {
    await prisma.product.update({
      where: { id: productId },
      data: {
        sizes: {
          create: {
            size,
            available: false,
          },
        },
      },
    });
  }

  revalidatePath(`/${locale}/admin/products/${productId}`);
  revalidatePath(`/${locale}/admin/products`);
  revalidatePath(`/${locale}/admin`);
  redirect(`/${locale}/admin/products/${productId}`);
}

/** ===== Remove size from product (delete row)
 * No prisma.productSize — uses nested delete via product.sizes relation
 */
async function removeSizeAction(formData: FormData): Promise<void> {
  "use server";

  const productId = String(formData.get("productId") || "").trim();
  const sizeId = String(formData.get("sizeId") || "").trim();
  const locale = String(formData.get("locale") || "en").trim();

  if (!productId || !sizeId) return;

  try {
    await prisma.product.update({
      where: { id: productId },
      data: {
        sizes: {
          delete: { id: sizeId },
        },
      },
    });
  } catch (e) {
    console.error(e);
  }

  revalidatePath(`/${locale}/admin/products/${productId}`);
  revalidatePath(`/${locale}/admin/products`);
  revalidatePath(`/${locale}/admin`);
  redirect(`/${locale}/admin/products/${productId}`);
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
    title: "Domestic Cups",
    items: [{ value: "coppa-italia-winners", label: "Coppa Italia – Winners (Coccarda)" }],
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
    title: "National Teams – FIFA",
    items: [
      { value: "fifa-world-cup-regular", label: "FIFA World Cup – Tournament Badge" },
      { value: "fifa-world-cup-winners", label: "FIFA World Cup – Winners Badge" },

      { value: "olympic-football-regular", label: "Olympic Football – Tournament Badge" },
      { value: "olympic-football-winners", label: "Olympic Football – Winners Badge" },
    ],
  },
  {
    title: "National Teams – Europe (UEFA)",
    items: [
      { value: "uefa-euro-regular", label: "UEFA EURO – Tournament Badge" },
      { value: "uefa-euro-winners", label: "UEFA EURO – Winners Badge" },

      { value: "uefa-nations-league-regular", label: "UEFA Nations League – Tournament Badge" },
      { value: "uefa-nations-league-winners", label: "UEFA Nations League – Winners Badge" },

      { value: "uefa-finalissima-regular", label: "Finalissima – Match Badge" },
      { value: "uefa-finalissima-winners", label: "Finalissima – Winners Badge" },
    ],
  },
  {
    title: "National Teams – South America (CONMEBOL)",
    items: [
      { value: "copa-america-regular", label: "Copa América – Tournament Badge" },
      { value: "copa-america-winners", label: "Copa América – Winners Badge" },
    ],
  },
  {
    title: "National Teams – Africa (CAF)",
    items: [
      { value: "afcon-regular", label: "AFCON (Africa Cup of Nations) – Tournament Badge" },
      { value: "afcon-winners", label: "AFCON (Africa Cup of Nations) – Winners Badge" },
    ],
  },
  {
    title: "National Teams – Asia (AFC)",
    items: [
      { value: "afc-asian-cup-regular", label: "AFC Asian Cup – Tournament Badge" },
      { value: "afc-asian-cup-winners", label: "AFC Asian Cup – Winners Badge" },

      { value: "afc-nations-league-regular", label: "AFC Nations League – Tournament Badge" },
      { value: "afc-nations-league-winners", label: "AFC Nations League – Winners Badge" },
    ],
  },
  {
    title: "National Teams – North/Central America & Caribbean (CONCACAF)",
    items: [
      { value: "concacaf-gold-cup-regular", label: "CONCACAF Gold Cup – Tournament Badge" },
      { value: "concacaf-gold-cup-winners", label: "CONCACAF Gold Cup – Winners Badge" },

      { value: "concacaf-nations-league-regular", label: "CONCACAF Nations League – Tournament Badge" },
      { value: "concacaf-nations-league-winners", label: "CONCACAF Nations League – Winners Badge" },
    ],
  },
  {
    title: "National Teams – Oceania (OFC)",
    items: [
      { value: "ofc-nations-cup-regular", label: "OFC Nations Cup – Tournament Badge" },
      { value: "ofc-nations-cup-winners", label: "OFC Nations Cup – Winners Badge" },
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

type TeamTypeLocal = "CLUB" | "NATION";

export default async function ProductEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      sizes: true,
      options: {
        include: { values: { select: { value: true, label: true } } },
      },
    },
  });

  if (!product) return notFound();

  const selectedInitial: string[] = (product as any).badges ?? [];

  const sizeGroup =
    (product.options || []).find((o: any) => o?.type === ("SIZE" as OptionType)) ?? null;

  const allowedFromGroup =
    sizeGroup && sizeGroup.values.length > 0
      ? new Set(
          sizeGroup.values
            .map((v: any) => normalizeAdultSizeLabel(v.label || v.value || ""))
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

  const currentTeamType: TeamTypeLocal = ((product as any).teamType as TeamTypeLocal) ?? "CLUB";
  const disableCustomizationInitial: boolean = product.allowNameNumber === false;

  return (
    <div className="space-y-6" data-product-id={product.id}>
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold md:text-3xl">Edit product</h1>
        <p className="text-sm text-gray-500">
          Update general information, images, badges and size availability.
        </p>
      </header>

      <section className="rounded-2xl border bg-white p-5 shadow">
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
          <input type="hidden" name="locale" value={locale} />

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
              <label className="text-xs font-medium text-gray-600">Team type</label>
              <select
                name="teamType"
                defaultValue={currentTeamType}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              >
                <option value="CLUB">Club</option>
                <option value="NATION">Nation</option>
              </select>
              <p className="mt-1 text-[11px] text-gray-500">
                Clubs appear in <strong>/clubs</strong>. Nations appear in <strong>/nations</strong>.
              </p>
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
          </div>

          <div className="space-y-2 images-editor">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Images</label>
              <div className="flex items-center gap-2">
                <span id="blob-images-status" className="text-[11px] text-gray-500"></span>

                <label
                  htmlFor="blob-images-input"
                  className="cursor-pointer rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
                  title="Add images from your computer"
                >
                  Add from computer
                </label>

                <input id="blob-images-input" type="file" accept="image/*" multiple className="sr-only" />
              </div>
            </div>

            <ImagesEditor name="imagesText" initialImages={(product as any).imageUrls ?? []} alt={product.name} />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Personalization</label>

            <input type="hidden" name="disableCustomization" value="false" />

            <div className="flex items-start gap-3 rounded-2xl border bg-white/70 p-4">
              <input
                id="disableCustomization"
                name="disableCustomization"
                type="checkbox"
                value="true"
                defaultChecked={disableCustomizationInitial}
                className="mt-1"
              />
              <div>
                <label htmlFor="disableCustomization" className="font-medium">
                  Remove “Customization” section on product page
                </label>
                <p className="mt-1 text-xs text-gray-600">
                  Use for products without any personalization (no name/number, no “Name &amp; Number + Badge” option).
                  This will set <code>allowNameNumber=false</code> in the database (via the server action).
                </p>
              </div>
            </div>
          </div>

          <div>
            <button type="submit" className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50">
              Save product
            </button>
          </div>
        </form>

        <Script
          id={`hide-add-button-${product.id}`}
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  const root = document.querySelector('[data-product-id="${product.id}"] .images-editor');
  if (!root) return;
  function hide() {
    root.querySelectorAll('button').forEach(b => {
      const t = (b.textContent || '').trim().toLowerCase();
      if (t === 'add') {
        b.classList.add('sr-only');
        b.style.display = '';
      }
    });
  }
  hide();
  new MutationObserver(hide).observe(root, { childList: true, subtree: true });
})();`,
          }}
        />

        <form action={saveBadgesAction} id="badges-form" className="mt-8 space-y-3">
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="locale" value={locale} />

          <label className="text-sm font-medium">Badges (optional)</label>
          <p className="text-xs text-gray-500">
            Type to search patches (league, champion, UEFA, cups, etc.). Selected badges are kept even if hidden by the
            filter.
          </p>

          <input
            id="badge-query"
            type="text"
            placeholder="Search badges… (try: coppa, coccarda, italy)"
            className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
            autoComplete="off"
          />

          <div id="badge-hint" className="text-xs text-gray-500">
            Start typing to see available badges.
          </div>

          <div
            id="badge-results"
            className="hidden max-h-72 grid-cols-1 gap-2 overflow-auto rounded-xl border p-2 sm:grid sm:grid-cols-2"
          />

          <div id="badge-selected-wrap" className="hidden space-y-2">
            <div className="text-xs font-semibold uppercase text-gray-500">Selected badges</div>
            <div id="badge-selected" className="flex flex-wrap gap-2" />
          </div>

          <div id="badge-hidden-inputs" className="hidden" />

          <div className="pt-2">
            <button type="submit" className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50">
              Save badges
            </button>
          </div>
        </form>

        <Script
          id={`badges-search-${product.id}`}
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  const scope = document.querySelector('[data-product-id="${product.id}"]');
  if (!scope) return;

  const BADGES = ${BADGES_JSON};
  const INITIAL = new Set(${SELECTED_JSON});

  const q = scope.querySelector('#badge-query');
  const results = scope.querySelector('#badge-results');
  const hint = scope.querySelector('#badge-hint');
  const selWrap = scope.querySelector('#badge-selected-wrap');
  const selectedDiv = scope.querySelector('#badge-selected');
  const hiddenInputs = scope.querySelector('#badge-hidden-inputs');
  if (!q || !results || !hint || !selWrap || !selectedDiv || !hiddenInputs) return;

  const selected = new Set(INITIAL);

  function syncHiddenInputs() {
    hiddenInputs.innerHTML = '';
    selected.forEach((val) => {
      const inp = document.createElement('input');
      inp.type = 'hidden';
      inp.name = 'selectedBadges[]';
      inp.value = val;
      hiddenInputs.appendChild(inp);
    });
    selWrap.classList.toggle('hidden', selected.size === 0);
    renderSelected();
  }

  function renderSelected() {
    selectedDiv.innerHTML = '';
    selected.forEach((val) => {
      const meta = BADGES.find(b => b.value === val);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-gray-50';
      btn.title = 'Remove';
      btn.textContent = (meta && meta.label) ? meta.label + ' ×' : (val + ' ×');
      btn.addEventListener('click', () => { selected.delete(val); syncHiddenInputs(); renderResults(); });
      selectedDiv.appendChild(btn);
    });
  }

  function makeOptionRow(opt) {
    const label = document.createElement('label');
    label.className = 'inline-flex items-center gap-2 rounded-xl border px-3 py-2';
    label.title = opt.group;

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = selected.has(opt.value);
    cb.addEventListener('change', () => {
      if (cb.checked) selected.add(opt.value);
      else selected.delete(opt.value);
      syncHiddenInputs();
    });

    const span = document.createElement('span');
    span.className = 'text-sm';
    span.textContent = opt.label;

    const tag = document.createElement('span');
    tag.className = 'ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600';
    tag.textContent = opt.group.split(' – ')[0];

    label.appendChild(cb);
    label.appendChild(span);
    label.appendChild(tag);
    return label;
  }

  function renderResults() {
    const query = (q.value || '').trim().toLowerCase();
    if (!query) {
      results.classList.add('hidden');
      hint.classList.remove('hidden');
      results.innerHTML = '';
      return;
    }
    hint.classList.add('hidden');
    results.classList.remove('hidden');

    const filtered = BADGES.filter(b =>
      b.label.toLowerCase().includes(query) ||
      b.value.toLowerCase().includes(query) ||
      b.group.toLowerCase().includes(query)
    ).slice(0, 50);

    results.innerHTML = '';
    if (filtered.length === 0) {
      const div = document.createElement('div');
      div.className = 'text-xs text-gray-500';
      div.textContent = 'No badges found.';
      results.appendChild(div);
      return;
    }
    filtered.forEach(opt => results.appendChild(makeOptionRow(opt)));
  }

  q.addEventListener('input', renderResults);
  syncHiddenInputs();
  renderResults();
})();`,
          }}
        />

        <Script
          id={`blob-upload-auto-add-${product.id}`}
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  const scope = document.querySelector('[data-product-id="${product.id}"]');
  if (!scope) return;
  const input = scope.querySelector('#blob-images-input');
  const status = scope.querySelector('#blob-images-status');

  const EDITOR_NAME = "imagesText";
  const ALLOWED = new Set(["image/jpeg","image/png","image/webp","image/avif","image/gif"]);
  const MAX_BYTES = 8 * 1024 * 1024;

  function setStatus(text) {
    if (status) status.textContent = text || '';
  }

  function pushIntoEditor(urls) {
    const apiRoot = (window).__imagesEditor && (window).__imagesEditor[EDITOR_NAME];
    if (apiRoot && typeof apiRoot.append === "function") {
      try { apiRoot.append(urls); return; } catch (_) {}
    }

    const root = scope.querySelector('.images-editor');
    if (!root) return;
    const paste = root.querySelector('input[placeholder*="Paste"]');
    const addBtn = Array.from(root.querySelectorAll('button'))
      .find(b => ((b.textContent || '').trim().toLowerCase() === 'add'));
    if (paste && addBtn) {
      urls.forEach(u => {
        paste.value = u;
        paste.dispatchEvent(new Event('input', { bubbles: true }));
        addBtn.click();
      });
      return;
    }

    const field = scope.querySelector('textarea[name="imagesText"], input[name="imagesText"]');
    if (field) {
      let current = [];
      try {
        const raw = field.value || '[]';
        current = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
      } catch (_) {
        current = String(field.value || '').split(/\\r?\\n/).map(s => s.trim()).filter(Boolean);
      }
      const set = new Set([ ...current, ...urls ]);
      const asArray = Array.from(set);
      try { field.value = JSON.stringify(asArray); }
      catch (_) { field.value = asArray.join('\\n'); }
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  async function uploadOne(file) {
    if (!ALLOWED.has(file.type)) throw new Error('Unsupported type');
    if (file.size > MAX_BYTES) throw new Error('File too large');

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data || !data.url) {
      throw new Error(data && data.error ? data.error : "Upload failed");
    }
    return data.url;
  }

  input && input.addEventListener('change', async () => {
    const files = Array.from(input.files || []);
    if (!files.length) return;

    const valid = files.filter(f => ALLOWED.has(f.type) && f.size <= MAX_BYTES);
    const rejected = files.filter(f => !valid.includes(f));

    if (rejected.length) {
      alert('Ignored some files (unsupported type or > 8MB).');
    }

    if (!valid.length) {
      input.value = '';
      return;
    }

    let done = 0;
    const urls = [];
    setStatus('Uploading 0/' + valid.length + '...');

    for (const file of valid) {
      try {
        const url = await uploadOne(file);
        urls.push(url);
      } catch (err) {
        console.error(err);
        alert(file.name + ': ' + (err && err.message ? err.message : 'upload failed'));
      } finally {
        done += 1;
        setStatus('Uploading ' + done + '/' + valid.length + '...');
      }
    }

    if (urls.length) pushIntoEditor(urls);

    input.value = '';
    setStatus('Uploaded ' + urls.length + '/' + valid.length + '.');
  });
})();`,
          }}
        />
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow">
        <div className="mb-3 flex items-center justify-between">
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
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
                    isGhost ? "bg-gray-50" : unavailable ? "bg-red-50" : "bg-green-50"
                  }`}
                  title={isGhost ? "This size does not exist in the database yet" : undefined}
                >
                  <div
                    className={`flex items-center gap-2 font-semibold ${
                      isGhost ? "opacity-70" : unavailable ? "line-through opacity-50" : ""
                    }`}
                  >
                    <span>{s.size}</span>
                    {isGhost && (
                      <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-700">
                        ghost
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isGhost ? (
                      <form action={addAdultSizeAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="productId" value={product.id} />
                        <input type="hidden" name="size" value={s.size} />
                        <button
                          type="submit"
                          className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                          title="Create this size (starts as unavailable)"
                        >
                          Add
                        </button>
                      </form>
                    ) : (
                      <>
                        <SizeAvailabilityToggle sizeId={s.id} initialUnavailable={unavailable} />

                        <form action={removeSizeAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="productId" value={product.id} />
                          <input type="hidden" name="sizeId" value={s.id} />
                          <button
                            type="submit"
                            className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                            title="Remove this size from the product"
                          >
                            Remove
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-3 text-xs text-gray-500">
          Sizes shown are fixed to <strong>S–2XL</strong>. Entries marked as <strong>ghost</strong> do not exist in the
          database yet — click <strong>Add</strong> to create them (they start as unavailable), then use the toggle to
          enable or disable them. Use <strong>Remove</strong> to delete a size from the product.
        </p>
      </section>
    </div>
  );
}