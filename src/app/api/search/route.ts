// src/app/api/search/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type AnyRec = Record<string, any>;
type LoadResult = { items: any[]; filtered: boolean } | null;

const DEBUG = process.env.SEARCH_DEBUG === "1";
function log(...args: any[]) {
  if (DEBUG) console.log("[/api/search]", ...args);
}

/* ----------------- helpers ----------------- */

// Convert number | string | Prisma.Decimal to number
function toNum(v: any): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  // Prisma Decimal has toNumber / toString
  if (typeof v?.toNumber === "function") {
    try {
      const n = v.toNumber();
      return Number.isFinite(n) ? n : undefined;
    } catch {}
  }
  if (typeof v?.toString === "function") {
    const n = Number(v.toString());
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

// Normalize a product-like object to a common shape the UI expects
function normalizeProduct(p: AnyRec) {
  const name = p.name ?? p.title ?? p.productName ?? "";

  // Collect many possible price fields (DB & APIs)
  let price: number | undefined;
  if (typeof p.price_cents === "number") {
    price = p.price_cents / 100;
  } else {
    price =
      toNum(p.price) ??
      toNum(p.basePrice) ?? // <- Prisma Product.basePrice
      toNum(p.price_eur) ??
      toNum(p.pricing?.price) ??
      toNum(p.amount) ??
      toNum(p.value);
  }

  const img =
    p.img ??
    p.image ??
    p.imageUrl ??
    p.cover ??
    p.photo ??
    (Array.isArray(p.images) ? (p.images[0]?.url ?? p.images[0]) : undefined) ??
    (Array.isArray(p.photos) ? (p.photos[0]?.url ?? p.photos[0]) : undefined);

  const id = p.id ?? p.sku ?? p.slug ?? name;
  const slug =
    p.slug ??
    (typeof name === "string" ? name.toLowerCase().replace(/\s+/g, "-") : undefined);

  return { id, name, price, img, slug, ...p };
}

function productText(p: AnyRec) {
  const parts = [
    p.name,
    p.title,
    p.productName,
    p.description,
    p.club,
    p.team,
    p.category,
    ...(Array.isArray(p.tags) ? p.tags : []),
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function unique<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function extractArrayFromJson(json: any): any[] | null {
  if (!json) return null;
  if (Array.isArray(json)) return json;

  const keys = ["products", "items", "results", "data", "rows", "list", "edges", "nodes"];
  for (const k of keys) {
    const v = (json as AnyRec)[k];
    if (Array.isArray(v) && v.length) return v;
    if (Array.isArray(v?.data) && v.data.length) return v.data;
  }

  const candidates: any[] = [];
  function scan(v: any) {
    if (!v) return;
    if (Array.isArray(v)) {
      if (v.length && typeof v[0] === "object") {
        const ok = "name" in (v[0] || {}) || "title" in (v[0] || {}) || "productName" in (v[0] || {});
        if (ok) candidates.push(v);
      }
      return;
    }
    if (typeof v === "object") for (const k of Object.keys(v)) scan(v[k]);
  }
  scan(json);
  if (candidates.length) return candidates.sort((a, b) => b.length - a.length)[0];
  return null;
}

/* ------------ 1) Try Prisma directly ------------ */

let prismaSingleton: any;
async function getPrisma() {
  if (prismaSingleton) return prismaSingleton;
  try {
    const { PrismaClient } = await import("@prisma/client");
    prismaSingleton = (globalThis as any).__prisma ?? new PrismaClient();
    (globalThis as any).__prisma = prismaSingleton;
    return prismaSingleton;
  } catch {
    return null;
  }
}

async function loadFromPrisma(q: string): Promise<LoadResult> {
  const prisma = await getPrisma();
  if (!prisma) return null;

  // common model names
  const candidates = [
    "product",
    "products",
    "item",
    "items",
    "listing",
    "listings",
    "jersey",
    "kit",
  ];

  for (const key of candidates) {
    const model = (prisma as any)[key];
    if (!model || typeof model.findMany !== "function") continue;

    try {
      // Fetch up to 500 rows and filter in JS to avoid unknown-field errors
      const rows: any[] = await model.findMany({ take: 500 });
      log("Prisma model:", key, "rows:", rows?.length ?? 0);
      if (!Array.isArray(rows) || rows.length === 0) continue;

      const filtered = rows.filter((r) => productText(r).includes(q));
      if (filtered.length) return { items: filtered, filtered: true };

      // If nothing matched, return all for further normalization
      return { items: rows, filtered: false };
    } catch (e: any) {
      log("Prisma error on", key, e?.message || e);
      continue;
    }
  }
  return null;
}

/* ------------ 2) Optional HTTP endpoints ------------ */

const DEFAULT_RELATIVE_ENDPOINTS = unique([
  "/api/products",
  "/api/store/products",
  "/api/catalog",
  "/api/items",
  "/store/products",
  "/api/v1/products",
]);

const QUERY_PARAM_NAMES = ["q", "query", "search", "term", "keyword", "name", "title"];

async function loadFromHttp(reqUrl: URL, q: string): Promise<LoadResult> {
  const envCsv =
    process.env.PRODUCTS_API_URLS || process.env.NEXT_PUBLIC_PRODUCTS_API_URLS || "";
  const envEndpoints = envCsv.split(",").map((s) => s.trim()).filter(Boolean);
  const bases = unique([...envEndpoints, ...DEFAULT_RELATIVE_ENDPOINTS]);
  if (DEBUG) log("Trying endpoints:", bases);

  // 1) endpoints with query param
  for (const base of bases) {
    try {
      const absolute = base.startsWith("http") ? base : new URL(base, reqUrl).toString();
      for (const param of QUERY_PARAM_NAMES) {
        const u = new URL(absolute);
        u.searchParams.set(param, q);
        const r = await fetch(u.toString(), { cache: "no-store" });
        if (!r.ok) continue;
        const json = await r.json();
        const arr = extractArrayFromJson(json);
        log(" ->", u.toString(), "status", r.status, "items", arr?.length ?? 0);
        if (Array.isArray(arr) && arr.length) return { items: arr, filtered: true };
      }
    } catch (e: any) {
      log(" x failed", base, e?.message || e);
    }
  }

  // 2) fetch all and filter locally
  for (const base of bases) {
    try {
      const absolute = base.startsWith("http") ? base : new URL(base, reqUrl).toString();
      const r = await fetch(absolute, { cache: "no-store" });
      if (!r.ok) continue;
      const json = await r.json();
      const arr = extractArrayFromJson(json);
      log(" ->", absolute, "status", r.status, "items_total", arr?.length ?? 0);
      if (Array.isArray(arr) && arr.length) return { items: arr, filtered: false };
    } catch (e: any) {
      log(" x failed", base, e?.message || e);
    }
  }
  return null;
}

/* ------------ 3) Local modules/files (optional) ------------ */

async function loadFromModules(): Promise<LoadResult> {
  async function tryImport(path: string) {
    try {
      // @ts-ignore
      const m = await import(path);
      return m as AnyRec;
    } catch {
      return null;
    }
  }
  const mods = ["@/lib/products", "@/data/products", "src/lib/products", "src/data/products"];
  for (const m of mods) {
    const mod = await tryImport(m);
    if (!mod) continue;
    if (Array.isArray((mod as any).products) && (mod as any).products.length)
      return { items: (mod as any).products, filtered: false };
    if (Array.isArray((mod as any).default) && (mod as any).default.length)
      return { items: (mod as any).default, filtered: false };
  }
  return null;
}

async function loadFromJsonFiles(): Promise<LoadResult> {
  try {
    const { readFile } = await import("fs/promises");
    const { join } = await import("path");
    const files = [
      join(process.cwd(), "src", "data", "products.json"),
      join(process.cwd(), "data", "products.json"),
      join(process.cwd(), "public", "products.json"),
    ];
    for (const p of files) {
      try {
        const raw = await readFile(p, "utf-8");
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) return { items: arr, filtered: false };
      } catch {}
    }
  } catch {}
  return null;
}

/* -------------------- handler -------------------- */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  if (!q) return NextResponse.json({ products: [] });

  // 1) Try DB (Prisma)
  let data: LoadResult = await loadFromPrisma(q);

  // 2) HTTP endpoints (if present)
  if (!data) data = await loadFromHttp(url, q);

  // 3) Local modules/files (fallback)
  if (!data) data = await loadFromModules();
  if (!data) data = await loadFromJsonFiles();

  if (!data) {
    log("No product source found.");
    return NextResponse.json({ products: [] });
  }

  const { items, filtered } = data;

  const final = (filtered ? items : items.filter((p: any) => productText(p).includes(q))).map(
    normalizeProduct
  );

  log("Returning", final.length, "results for:", q);
  return NextResponse.json({ products: final });
}
