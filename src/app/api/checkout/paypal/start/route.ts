// src/app/api/checkout/paypal/start/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Constrói uma URL absoluta com base no pedido atual */
function toUrl(req: NextRequest, path: string) {
  return new URL(path, req.url);
}

/** Encaminha cookies + headers úteis para o /create conseguir ver o carrinho do cliente */
function forwardHeaders(req: NextRequest) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  // 🔑 MUITO IMPORTANTE: reenviar cookies (cartId, session, etc.)
  const cookie = req.headers.get("cookie");
  if (cookie) headers.cookie = cookie;

  // Headers úteis em Vercel / proxies
  const xfProto = req.headers.get("x-forwarded-proto");
  const xfHost = req.headers.get("x-forwarded-host");
  const xfFor = req.headers.get("x-forwarded-for");

  if (xfProto) headers["x-forwarded-proto"] = xfProto;
  if (xfHost) headers["x-forwarded-host"] = xfHost;
  if (xfFor) headers["x-forwarded-for"] = xfFor;

  return headers;
}

/** Chama o criador de ordem (/api/checkout/paypal/create) */
async function callCreate(
  req: NextRequest,
  body?: unknown
): Promise<{
  url: string;
  approveUrl: string;
  orderId: string;
  paypalOrderId?: string;
}> {
  const createUrl = toUrl(req, "/api/checkout/paypal/create");

  const res = await fetch(createUrl, {
    method: "POST",
    headers: forwardHeaders(req),
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as any;

  // Aceita tanto "approveUrl" como "url"
  const approve = data?.approveUrl || data?.url;

  if (!res.ok || !approve) {
    const msg = data?.error || `paypal_create_failed_${res.status}`;
    throw new Error(String(msg));
  }

  // Devolve ambos para compatibilidade total com o client
  return {
    ...data,
    url: String(approve),
    approveUrl: String(approve),
  };
}

/**
 * GET → cria a ordem e faz redirect direto para o PayPal
 */
export async function GET(req: NextRequest) {
  try {
    const { url } = await callCreate(req);
    return NextResponse.redirect(url);
  } catch (e: any) {
    const msg = e?.message || "paypal_start_error";
    return NextResponse.redirect(
      toUrl(req, `/cart?paypal_error=${encodeURIComponent(msg)}`)
    );
  }
}

/**
 * POST → cria a ordem e devolve JSON
 * Usado pelo CheckoutClient
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => undefined);
    const data = await callCreate(req, body);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "PayPal start error" },
      { status: 400 }
    );
  }
}
