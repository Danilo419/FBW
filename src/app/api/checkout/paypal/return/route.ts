// src/app/api/checkout/paypal/return/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// helper para criar URLs absolutas com base no pedido atual
function toUrl(req: NextRequest, path: string) {
  return new URL(path, req.url);
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    // PayPal envia ?token=<paypalOrderId>; no create definimos também ?order=<id_local>
    const paypalOrderId = url.searchParams.get("token");
    const localOrderId = url.searchParams.get("order");

    if (!paypalOrderId) {
      return NextResponse.redirect(
        toUrl(req, "/cart?paypal_error=missing_token")
      );
    }

    // Chama o nosso endpoint de captura (POST) com os mesmos parâmetros
    const captureUrl = toUrl(
      req,
      `/api/checkout/paypal/capture?token=${encodeURIComponent(
        paypalOrderId
      )}${localOrderId ? `&order=${encodeURIComponent(localOrderId)}` : ""}`
    );

    const res = await fetch(captureUrl, { method: "POST" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.ok !== true) {
      const msg =
        data?.error ||
        data?.status ||
        `capture_failed_${res.status ?? "unknown"}`;
      return NextResponse.redirect(
        toUrl(req, `/cart?paypal_error=${encodeURIComponent(String(msg))}`)
      );
    }

    // Sucesso → leva o cliente para a página de sucesso do checkout
    const success = toUrl(
      req,
      `/checkout/success?provider=paypal&paypal_order=${encodeURIComponent(
        paypalOrderId
      )}${localOrderId ? `&order=${encodeURIComponent(localOrderId)}` : ""}`
    );
    return NextResponse.redirect(success);
  } catch (e: any) {
    const msg = e?.message || "paypal_return_error";
    return NextResponse.redirect(
      toUrl(req, `/cart?paypal_error=${encodeURIComponent(String(msg))}`)
    );
  }
}
