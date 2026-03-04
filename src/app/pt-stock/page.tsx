// src/app/pt-stock/page.tsx
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { ProductChannel } from "@prisma/client";

export const dynamic = "force-dynamic";

function isExternalUrl(u: string) {
  return /^https?:\/\//i.test(u) || u.startsWith("//");
}
function normalizeUrl(u: string) {
  if (!u) return "";
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}
function getCoverUrl(imageUrls: unknown) {
  try {
    if (!imageUrls) return "/placeholder.png";

    if (Array.isArray(imageUrls)) {
      const first = String(imageUrls[0] ?? "").trim();
      return normalizeUrl(first) || "/placeholder.png";
    }

    if (typeof imageUrls === "string") {
      const s = imageUrls.trim();
      if (!s) return "/placeholder.png";

      if (s.startsWith("[") && s.endsWith("]")) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = String(parsed[0] ?? "").trim();
          return normalizeUrl(first) || "/placeholder.png";
        }
      }

      return normalizeUrl(s) || "/placeholder.png";
    }

    return "/placeholder.png";
  } catch {
    return "/placeholder.png";
  }
}

/** ✅ keep your original formatMoney, only move "€" to the right in THIS FILE */
function formatMoneyRight(cents: number) {
  const s = formatMoney(cents);

  let m = s.match(/^-€\s*(.+)$/);
  if (m) return `-${m[1]}€`;

  m = s.match(/^€\s*(.+)$/);
  if (m) return `${m[1]}€`;

  return s;
}

export default async function PtStockPage() {
  const products = await prisma.product.findMany({
    where: {
      isVisible: true,
      channel: ProductChannel.PT_STOCK_CTT,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      team: true,
      basePrice: true,
      imageUrls: true,
      season: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return (
    <div className="container-fw py-10">
      <div className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Portugal Delivery (CTT)
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Produtos em stock em Portugal — enviados pelos CTT em <b>2–3 dias úteis</b>.
            </p>
          </div>

          <div className="rounded-2xl sm:rounded-full border bg-gray-50 px-4 py-3 sm:py-2">
            <div className="text-sm font-semibold text-gray-900">
              Regras de shipping (Portugal)
            </div>
            <div className="mt-1 text-sm text-gray-700 flex flex-col sm:flex-row sm:items-center sm:gap-3">
              <span>
                1 camisola: <b>6€</b>
              </span>
              <span className="hidden sm:block text-gray-300">•</span>
              <span>
                2 camisolas: <b>3€</b>
              </span>
              <span className="hidden sm:block text-gray-300">•</span>
              <span>
                3+ camisolas: <b>GRÁTIS</b>
              </span>
            </div>
          </div>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border bg-white/70 p-10 text-gray-600">
          Ainda não há produtos em stock para Portugal.
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => {
            const cover = getCoverUrl(p.imageUrls);
            const external = isExternalUrl(cover);

            return (
              <Link
                key={p.id}
                href={`/pt-stock/${p.slug}`}
                className="group rounded-2xl border bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition"
              >
                <div className="relative w-full aspect-[3/4] overflow-hidden rounded-xl bg-white border">
                  <Image
                    src={cover}
                    alt={p.name}
                    fill
                    className="object-contain group-hover:scale-[1.02] transition-transform"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    unoptimized={external}
                  />
                  <div className="absolute left-3 top-3 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-1 text-[11px] font-semibold">
                    CTT 2–3 dias
                  </div>
                </div>

                <div className="mt-3 min-w-0">
                  <div className="text-sm font-semibold leading-snug break-words text-gray-900">
                    {p.name}
                  </div>

                  {p.team ? (
                    <div className="mt-0.5 text-xs text-gray-600 break-words">
                      {p.team}
                      {p.season ? (
                        <span className="text-gray-400"> • {p.season}</span>
                      ) : null}
                    </div>
                  ) : p.season ? (
                    <div className="mt-0.5 text-xs text-gray-600 break-words">
                      {p.season}
                    </div>
                  ) : null}

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="text-sm font-extrabold text-gray-900 tabular-nums">
                      {formatMoneyRight(p.basePrice)}
                    </div>
                    <span className="text-[11px] text-gray-500 group-hover:text-gray-700 transition">
                      Ver produto →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}