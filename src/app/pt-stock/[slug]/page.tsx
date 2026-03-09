// src/app/pt-stock/[slug]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductChannel } from "@prisma/client";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ====================== Helpers ====================== */

function normalizeUrl(u: string) {
  if (!u) return "";
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}

function getImages(imageUrls: unknown): string[] {
  try {
    if (!imageUrls) return ["/placeholder.png"];

    if (Array.isArray(imageUrls)) {
      const arr = imageUrls
        .map((x) => String(x || "").trim())
        .filter(Boolean)
        .map(normalizeUrl);

      return arr.length ? arr : ["/placeholder.png"];
    }

    if (typeof imageUrls === "string") {
      const s = imageUrls.trim();
      if (!s) return ["/placeholder.png"];

      if (s.startsWith("[") && s.endsWith("]")) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          const arr = parsed
            .map((x) => String(x || "").trim())
            .filter(Boolean)
            .map(normalizeUrl);

          return arr.length ? arr : ["/placeholder.png"];
        }
      }

      return [normalizeUrl(s)];
    }

    return ["/placeholder.png"];
  } catch {
    return ["/placeholder.png"];
  }
}

function formatMoneyRight(cents: number) {
  const s = formatMoney(cents);

  let m = s.match(/^-€\s*(.+)$/);
  if (m) return `-${m[1]}€`;

  m = s.match(/^€\s*(.+)$/);
  if (m) return `${m[1]}€`;

  return s;
}

function isExternalUrl(u: string) {
  return /^https?:\/\//i.test(u) || u.startsWith("//");
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/* ====================== Discount map ====================== */

const SALE_MAP_EUR: Record<string, number> = {
  "29.99": 70,
  "34.99": 100,
  "39.99": 120,
  "44.99": 150,
  "49.99": 165,
  "59.99": 200,
  "69.99": 230,
};

function getPricePresentation(basePrice: number) {
  const rawUnitPrice = basePrice;
  const candidateEur1 = rawUnitPrice;
  const candidateEur2 = rawUnitPrice / 100;

  let salePriceEur: number;
  if (SALE_MAP_EUR[candidateEur1.toFixed(2)]) salePriceEur = candidateEur1;
  else if (SALE_MAP_EUR[candidateEur2.toFixed(2)]) salePriceEur = candidateEur2;
  else salePriceEur = rawUnitPrice > 100 ? candidateEur2 : candidateEur1;

  const saleKey = salePriceEur.toFixed(2);
  const originalPriceEur = SALE_MAP_EUR[saleKey];

  let originalUnitPriceForMoney: number | undefined;
  if (typeof originalPriceEur === "number") {
    const factor = rawUnitPrice / salePriceEur;
    originalUnitPriceForMoney = originalPriceEur * factor;
  }

  const hasDiscount =
    typeof originalPriceEur === "number" && originalPriceEur > salePriceEur;

  const discountPercent = hasDiscount
    ? Math.round(((originalPriceEur - salePriceEur) / originalPriceEur) * 100)
    : 0;

  return {
    hasDiscount,
    discountPercent,
    originalUnitPriceForMoney,
  };
}

/* ====================== Types ====================== */

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type ProductSizeUI = {
  id: string;
  size: string;
  available: boolean;
};

/* ====================== Page ====================== */

export default async function PtStockProductPage({ params }: PageProps) {
  const { slug } = await params;

  const product = await prisma.product.findFirst({
    where: {
      slug,
      isVisible: true,
      channel: ProductChannel.PT_STOCK_CTT,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      team: true,
      season: true,
      description: true,
      basePrice: true,
      imageUrls: true,
      ptStockQty: true,
      sizes: {
        orderBy: { size: "asc" },
        select: {
          id: true,
          size: true,
          available: true,
        },
      },
    },
  });

  if (!product) notFound();

  const images = getImages(product.imageUrls);
  const mainImage = images[0];

  const sizes: ProductSizeUI[] = product.sizes.map((s) => ({
    id: s.id,
    size: s.size,
    available: s.available,
  }));

  const availableSizes = sizes.filter((s) => s.available);

  const { hasDiscount, discountPercent, originalUnitPriceForMoney } =
    getPricePresentation(product.basePrice);

  return (
    <main className="min-h-screen bg-white">
      <div className="container-fw py-6 md:py-10">
        {/* Breadcrumb */}
        <div className="mb-5 text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-900">
            Início
          </Link>
          <span className="mx-2">/</span>
          <Link href="/pt-stock" className="hover:text-gray-900">
            Stock em Portugal
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{product.name}</span>
        </div>

        <div className="w-full flex justify-center overflow-x-hidden px-2">
          <div className="relative w-full max-w-[260px] sm:max-w-[520px] lg:max-w-none flex flex-col gap-6 lg:gap-8 lg:flex-row lg:items-start">
            {/* ===== GALLERY ===== */}
            <section className="rounded-2xl border bg-white w-full lg:w-[560px] lg:flex-none lg:self-start p-3 sm:p-4 lg:p-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-10 w-10 shrink-0 hidden lg:block" />

                <div className="relative aspect-[3/4] w-full max-w-[240px] sm:max-w-[320px] lg:max-w-none mx-auto overflow-hidden rounded-xl bg-white">
                  <Image
                    src={mainImage}
                    alt={product.name}
                    fill
                    className="object-contain"
                    sizes="(min-width: 1024px) 540px, 100vw"
                    priority
                    unoptimized={isExternalUrl(mainImage)}
                  />

                  {hasDiscount && (
                    <div className="absolute left-3 top-3 sm:left-4 sm:top-4 rounded-full bg-red-500 px-3 py-1.5 text-xs sm:text-sm font-bold text-white shadow-md flex items-center justify-center">
                      -{discountPercent}%
                    </div>
                  )}
                </div>

                <div className="h-10 w-10 shrink-0 hidden lg:block" />
              </div>

              {images.length > 1 && (
                <div className="mt-3">
                  <div className="mx-auto overflow-x-auto overflow-y-hidden whitespace-nowrap py-2 pr-2 [scrollbar-width:none] [-ms-overflow-style:none] no-scrollbar">
                    <style>{`.no-scrollbar::-webkit-scrollbar{display:none;}`}</style>
                    <div className="inline-flex gap-2">
                      {images.map((src, i) => (
                        <div
                          key={`${src}-${i}`}
                          className={cx(
                            "relative flex-none h-[52px] w-[42px] sm:h-[60px] sm:w-[50px] lg:h-[82px] lg:w-[68px] rounded-xl border",
                            i === 0
                              ? "border-transparent ring-2 ring-blue-100"
                              : "hover:opacity-90"
                          )}
                        >
                          {i === 0 && (
                            <span
                              aria-hidden
                              className="pointer-events-none absolute inset-0 rounded-xl border-2 border-blue-600"
                            />
                          )}
                          <span className="absolute inset-[3px] overflow-hidden rounded-[10px]">
                            <Image
                              src={src}
                              alt={`${product.name} ${i + 1}`}
                              fill
                              className="object-contain"
                              sizes="68px"
                              unoptimized={isExternalUrl(src)}
                            />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 grid grid-cols-3 gap-2">
                <TrustPill icon={<ShieldIcon />} text="Pagamento seguro" />
                <TrustPill icon={<CttTruckIcon />} text="Entrega CTT" />
                <TrustPill icon={<ChatIcon />} text="Suporte rápido" />
              </div>
            </section>

            {/* ===== INFO / CONFIGURATOR STYLE ===== */}
            <section className="w-full rounded-2xl border bg-white p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-6 flex-1 min-w-0 shadow-sm">
              <header className="space-y-2">
                <div
                  className="rounded-full bg-gray-100 h-2 overflow-hidden"
                  aria-hidden="true"
                >
                  <div className="h-2 bg-blue-600" style={{ width: "100%" }} />
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] sm:text-xs font-semibold text-emerald-800">
                      Stock em Portugal • Entrega rápida
                    </div>

                    <h1 className="text-sm sm:text-base lg:text-2xl font-extrabold tracking-tight leading-snug text-slate-900">
                      {product.name}
                    </h1>

                    {(product.team || product.season) && (
                      <p className="mt-1 text-[11px] sm:text-xs text-gray-600">
                        {product.team}
                        {product.team && product.season ? " • " : ""}
                        {product.season}
                      </p>
                    )}

                    <div className="mt-2 flex items-baseline gap-2">
                      {hasDiscount && originalUnitPriceForMoney && (
                        <span className="text-[11px] sm:text-xs text-gray-400 line-through">
                          {formatMoneyRight(originalUnitPriceForMoney)}
                        </span>
                      )}

                      <span className="text-sm sm:text-lg lg:text-xl font-semibold text-gray-900">
                        {formatMoneyRight(product.basePrice)}
                      </span>

                      {hasDiscount && (
                        <span className="ml-1 text-[11px] sm:text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                          Poupa {discountPercent}%
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-[11px] sm:text-xs text-gray-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-2">
                        <ReadOnlyStars value={4.9} />
                        <span className="font-semibold">4.9</span>
                        <span className="text-gray-500">(Portugal stock)</span>
                      </span>

                      <span className="inline-flex items-center gap-2">
                        <CttTruckIcon className="h-3.5 w-3.5" />
                        Entrega estimada: 2–3 dias úteis
                      </span>
                    </div>
                  </div>
                </div>

                {product.description && (
                  <p className="mt-1.5 text-xs sm:text-sm text-gray-700 whitespace-pre-line">
                    {product.description}
                  </p>
                )}
              </header>

              {/* CTT Highlight */}
              <div className="rounded-2xl border p-3 sm:p-4 bg-white/70">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-yellow-300 bg-white shadow-sm">
                    <span className="text-sm font-black text-yellow-500">CTT</span>
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm sm:text-base font-semibold text-gray-900">
                      Entrega com os CTT
                    </div>
                    <p className="mt-1 text-[11px] sm:text-sm text-gray-700">
                      Este produto já se encontra em stock em Portugal e é enviado
                      através dos <strong>CTT</strong>, com entrega rápida e local.
                    </p>
                    <div className="mt-3 inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-[11px] sm:text-xs font-semibold text-emerald-800">
                      Entrega estimada: 2–3 dias úteis
                    </div>
                  </div>
                </div>
              </div>

              {/* Stock note */}
              {typeof product.ptStockQty === "number" && (
                <div className="rounded-2xl border p-3 sm:p-4 bg-white/70">
                  <div className="text-[11px] sm:text-sm text-gray-700 font-semibold">
                    Stock local em Portugal
                  </div>
                  <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] sm:text-xs text-emerald-900">
                    Quantidade disponível em Portugal:{" "}
                    <strong>{product.ptStockQty}</strong>
                  </div>
                </div>
              )}

              {/* Sizes */}
              <div
                data-section="size"
                className="rounded-2xl border p-3 sm:p-4 bg-white/70"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="mb-2 text-[11px] sm:text-sm text-gray-700">
                    Tamanhos disponíveis
                  </div>
                </div>

                {sizes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {sizes.map((s) => (
                      <div
                        key={s.id}
                        className={cx(
                          "rounded-xl px-2.5 py-1.5 border text-[11px] sm:text-xs lg:text-sm transition",
                          s.available
                            ? "bg-blue-600 text-white border-blue-600"
                            : "opacity-50 line-through bg-gray-100 text-gray-500"
                        )}
                      >
                        {s.size}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    Sem tamanhos disponíveis.
                  </div>
                )}

                {availableSizes.length > 0 && (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] sm:text-xs text-emerald-900">
                    Produto em stock e pronto para envio a partir de Portugal.
                  </div>
                )}
              </div>

              {/* Shipping prices */}
              <div className="rounded-2xl border p-3 sm:p-4 bg-white/70">
                <div className="mb-2 text-[11px] sm:text-sm text-gray-700 font-semibold">
                  Informação de envio
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                    <span>1 camisola</span>
                    <span className="font-semibold text-gray-900">
                      6€ de envio
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                    <span>2 camisolas</span>
                    <span className="font-semibold text-gray-900">
                      3€ de envio
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                    <span>3 ou mais camisolas</span>
                    <span className="font-semibold text-emerald-700">
                      Envio gratuito
                    </span>
                  </div>
                </div>
              </div>

              {/* Info accordions */}
              <InfoAccordions />

              {/* Reassurance */}
              <div className="rounded-2xl border bg-white/70 p-3 sm:p-4">
                <div className="grid sm:grid-cols-3 gap-2 text-[11px] sm:text-xs text-gray-700">
                  <div className="flex items-start gap-2">
                    <ShieldIcon className="h-4 w-4 mt-0.5" />
                    <div>
                      <div className="font-semibold">Pagamento seguro</div>
                      <div className="text-gray-500">Checkout protegido</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <CttTruckIcon className="h-4 w-4 mt-0.5" />
                    <div>
                      <div className="font-semibold">Envio rápido</div>
                      <div className="text-gray-500">2–3 dias úteis com CTT</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <ChatIcon className="h-4 w-4 mt-0.5" />
                    <div>
                      <div className="font-semibold">Suporte rápido</div>
                      <div className="text-gray-500">
                        Respondemos rapidamente
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nota final */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs sm:text-sm text-blue-900">
                <strong>Vantagem do stock em Portugal:</strong> entrega mais
                rápida, sem espera de envio internacional, mantendo a mesma
                qualidade do produto.
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ====================== Info accordions ====================== */

function InfoAccordions() {
  return (
    <div className="rounded-2xl border bg-white/70 overflow-hidden">
      <AccordionRow
        icon={<CttTruckIcon className="h-4 w-4" />}
        title="Envio & entrega"
        defaultOpen
      >
        <ul className="space-y-2 text-xs sm:text-sm text-gray-700">
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>
              <b>Entrega estimada:</b> 2–3 dias úteis em Portugal.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>
              Envio efetuado através dos <b>CTT</b>.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>
              Produto já armazenado em Portugal para uma entrega muito mais
              rápida.
            </span>
          </li>
        </ul>
      </AccordionRow>

      <Divider />

      <AccordionRow
        icon={<RotateIcon className="h-4 w-4" />}
        title="Apoio & devoluções"
      >
        <ul className="space-y-2 text-xs sm:text-sm text-gray-700">
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>
              Se existir algum problema com a encomenda, entra em contacto
              connosco.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>
              Guarda o produto em bom estado caso seja necessário tratar alguma
              questão.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>
              O nosso suporte responde rapidamente para ajudar no processo.
            </span>
          </li>
        </ul>
      </AccordionRow>

      <Divider />

      <AccordionRow
        icon={<StarBadgeIcon className="h-4 w-4" />}
        title="Detalhes de qualidade"
      >
        <ul className="space-y-2 text-xs sm:text-sm text-gray-700">
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>Boa qualidade de costura e acabamento.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>Tecido confortável para uso diário.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>
              Mesma qualidade do produto, com a vantagem de já estar em stock em
              Portugal.
            </span>
          </li>
        </ul>
      </AccordionRow>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-black/10" aria-hidden="true" />;
}

function AccordionRow({
  icon,
  title,
  children,
  defaultOpen,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="group" open={!!defaultOpen}>
      <summary className="list-none cursor-pointer select-none px-4 py-3 flex items-center gap-3 hover:bg-white/60 transition">
        <span className="text-gray-800">{icon}</span>
        <span className="text-sm sm:text-base font-semibold text-gray-900">
          {title}
        </span>
        <span className="ml-auto text-gray-600">
          <ChevronDownIcon className="h-5 w-5 transition-transform duration-200 group-open:rotate-180" />
        </span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

/* ====================== Stars (read-only) ====================== */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function ReadOnlyStars({ value, size = 14 }: { value: number; size?: number }) {
  const v = clamp(value, 0, 5);
  const full = Math.floor(v);
  const partial = v - full;

  return (
    <div
      className="inline-flex gap-1 align-middle"
      aria-label={`${v.toFixed(1)} out of 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < full ? 1 : i === full ? partial : 0;
        return (
          <div
            className="relative"
            key={i}
            style={{ width: size, height: size }}
          >
            <StarShape
              className="absolute inset-0 text-gray-300"
              size={size}
              fill="currentColor"
            />
            <StarShape
              className="absolute inset-0 text-amber-500"
              size={size}
              fill="currentColor"
              style={{ clipPath: `inset(0 ${100 - filled * 100}% 0 0)` }}
            />
            <StarShape
              className="absolute inset-0 text-black/10"
              size={size}
              fill="none"
            />
          </div>
        );
      })}
    </div>
  );
}

/* ====================== Trust pill ====================== */

function TrustPill({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="rounded-xl border bg-gray-50 px-2.5 py-2 text-[11px] sm:text-xs text-gray-700 flex items-center justify-center gap-2">
      <span className="text-gray-800">{icon}</span>
      <span className="font-semibold">{text}</span>
    </div>
  );
}

/* ====================== Icons ====================== */

function ChevronDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      className={cx("h-5 w-5", props.className)}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarShape({
  size,
  className,
  fill,
  style,
}: {
  size: number;
  className?: string;
  fill: "none" | "currentColor";
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill={fill}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M12 2l3.09 6.26 6.91 1-5 4.87 1.18 6.87L12 18.9 5.82 21l1.18-6.87-5-4.87 6.91-1L12 2z"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CttTruckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      className={cx("text-gray-800", props.className)}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 7h11v10H3V7zM14 10h4l3 3v4h-7v-7z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path
        d="M7 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
        fill="currentColor"
      />
    </svg>
  );
}

function ShieldIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      className={cx("text-gray-800", props.className)}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3l8 4v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V7l8-4z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2 2 4-5"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChatIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      className={cx("text-gray-800", props.className)}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 5h16v11H7l-3 3V5z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path
        d="M8 9h8M8 12h6"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}

function RotateIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      className={cx("text-gray-800", props.className)}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M21 12a9 9 0 10-3 6.7"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <path
        d="M21 7v5h-5"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarBadgeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      className={cx("text-gray-800", props.className)}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 2l2.3 4.7 5.2.8-3.8 3.7.9 5.2L12 14.9 7.4 16.4l.9-5.2-3.8-3.7 5.2-.8L12 2z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path
        d="M7 21l5-2 5 2"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}