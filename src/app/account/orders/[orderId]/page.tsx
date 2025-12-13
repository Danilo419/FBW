// src/app/account/orders/[orderId]/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OrderDetailsClient from "./OrderDetailsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

type Props = {
  params: { orderId: string };
};

export default async function OrderDetailsPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    redirect("/account/login?next=/account"); // ajusta para o teu login
  }

  // Passa só o que precisas para o client
  return <OrderDetailsClient orderId={params.orderId} />;
}
