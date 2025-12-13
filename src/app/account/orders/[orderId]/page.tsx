// src/app/account/orders/[orderId]/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OrderDetailsClient from "./OrderDetailsClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  // ✅ Next build is expecting params as a Promise in your project
  params: Promise<{ orderId: string }>;
};

export default async function OrderDetailsPage({ params }: PageProps) {
  const { orderId } = await params;

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    redirect(`/account/login?next=/account/orders/${orderId}`);
  }

  return <OrderDetailsClient orderId={orderId} />;
}
