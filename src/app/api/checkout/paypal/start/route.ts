// src/app/api/checkout/paypal/start/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Constrói uma URL absoluta com base no pedido atual */
function toUrl(req: NextRequest, path: string) {
  return new URL(path, req.url);
}

/** Chama o nosso criador de ordem (/api/checkout/paypal/create) e devolve a resposta já validada */
async function callCreate(
  req: NextRequest,
  body?: unknown
): Promise<{ url: string; orderId: string; paypalOrderId?: string }> {
  const createUrl = toUrl(req, "/api/checkout/paypal/create");
  const res = await fetch(createUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as any;

  if (!res.ok || !data?.url) {
    const msg = data?.error || `create_failed_${res.status ?? "unknown"}`;
    throw new Error(String(msg));
  }

  return data as { url: string; orderId: string; paypalOrderId?: string };
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
 * POST → cria a ordem e devolve JSON ({ url, orderId, paypalOrderId }).
 * Útil quando queres controlar o redirect no cliente.
 * O body recebido é repassado para o /create (ex.: preferências futuras).
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
