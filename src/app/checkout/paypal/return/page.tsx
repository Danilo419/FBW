// src/app/checkout/paypal/return/page.tsx
import { prisma } from "@/lib/prisma";
import paypal from "@paypal/checkout-server-sdk";
import { notFound, redirect } from "next/navigation";

/** Cliente PayPal — usa PAYPAL_MODE para escolher sandbox/live */
function paypalClient() {
  const mode = (process.env.PAYPAL_MODE || "sandbox").toLowerCase().trim();
  const clientId = (process.env.PAYPAL_CLIENT_ID || "").trim();
  const secret = (process.env.PAYPAL_CLIENT_SECRET || "").trim();

  if (!clientId || !secret) {
    throw new Error("Missing PayPal credentials (PAYPAL_CLIENT_ID/SECRET).");
  }

  const env =
    mode === "live"
      ? new paypal.core.LiveEnvironment(clientId, secret)
      : new paypal.core.SandboxEnvironment(clientId, secret);

  return new paypal.core.PayPalHttpClient(env);
}

type PageProps = {
  searchParams: { token?: string; PayerID?: string };
};

export default async function PayPalReturnPage({ searchParams }: PageProps) {
  const token = searchParams.token; // PayPal order ID
  if (!token) notFound();

  const client = paypalClient();

  try {
    // 1) Capturar pagamento
    const captureReq = new paypal.orders.OrdersCaptureRequest(token);
    captureReq.requestBody({});
    const capture = await client.execute(captureReq);

    const orderId = capture.result.purchase_units?.[0]?.custom_id;
    if (!orderId) throw new Error("Missing custom_id (internal orderId).");

    // 2) Atualizar DB → status paid
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "paid",
        paypalCaptureId: String(capture.result.id),
      },
    });

    // 3) Redirecionar para página de sucesso
    redirect(`/checkout/success?order=${orderId}&provider=paypal`);
  } catch (err: any) {
    console.error("[PayPalReturn] error:", err);
    redirect("/checkout?error=paypal");
  }
}
