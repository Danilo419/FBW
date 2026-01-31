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
  const h: Record<string, string> = {
    "content-type": "application/json",
  };

  const cookie = req.headers.get("cookie");
  if (cookie) h.cookie = cookie;

  // úteis em deploys/proxies (Vercel, Cloudflare, etc.)
  const xfProto = req.headers.get("x-forwarded-proto");
  const xfHost = req.headers.get("x-forwarded-host");
  const xfFor = req.headers.get("x-forwarded-for");

  if (xfProto) h["x-forwarded-proto"] = xfProto;
  if (xfHost) h["x-forwarded-host"] = xfHost;
  if (xfFor) h["x-forwarded-for"] = xfFor;

  return h;
}

/** Chama o nosso criador de ordem (/api/checkout/paypal/create) e devolve a resposta já validada */
async function callCreate(
  req: NextRequest,
  body?: unknown
): Promise<{ url: string; approveUrl?: string; orderId: string; paypalOrderId?: string }> {
  const createUrl = toUrl(req, "/api/checkout/paypal/create");

  const res = await fetch(createUrl, {
    method: "POST",
    headers: forwardHeaders(req),
    body: body ? JSON.stringify(body) : JSON.stringify({}),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as any;

  // Aceita tanto "url" quanto "approveUrl" (para compatibilidade)
  const approve = data?.approveUrl || data?.url;

  if (!res.ok || !approve) {
    const msg = data?.error || `create_failed_${res.status ?? "unknown"}`;
    throw new Error(String(msg));
  }

  // devolve "url" e "approveUrl" para não quebrares nada no client
  return {
    ...data,
    url: String(approve),
    approveUrl: String(approve),
  };
}

/**
 * GET → cria a ordem e faz redirect direto para a página de aprovação do PayPal.
 * Útil para iniciar o fluxo via link/botão simples.
 */
export async function GET(req: NextRequest) {
  try {
    const { url } = await callCreate(req);
    return NextResponse.redirect(url);
  } catch (e: any) {
    const msg = e?.message || "paypal_start_error";
    return NextResponse.redirect(
      toUrl(req, `/cart?paypal_error=${encodeURIComponent(String(msg))}`)
    );
  }
}

/**
 * POST → cria a ordem e devolve JSON ({ url, approveUrl, orderId, paypalOrderId }).
 * Útil quando queres controlar o redirect no cliente.
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
