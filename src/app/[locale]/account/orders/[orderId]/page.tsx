// src/app/[locale]/account/orders/[orderId]/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OrderDetailsClient from "./OrderDetailsClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ locale: string; orderId: string }>;
};

export default async function OrderDetailsPage({ params }: PageProps) {
  const { locale, orderId } = await params;

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    redirect(`/${locale}/account/login?next=/${locale}/account/orders/${orderId}`);
  }

  return <OrderDetailsClient orderId={orderId} />;
}