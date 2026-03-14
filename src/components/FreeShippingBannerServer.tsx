import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import FreeShippingBanner from "@/components/FreeShippingBanner";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AnyRecord = Record<string, unknown>;

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof (value as { toNumber: () => number }).toNumber === "function"
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }

  return 0;
}

function getObject(value: unknown): AnyRecord | null {
  return typeof value === "object" && value !== null
    ? (value as AnyRecord)
    : null;
}

function getItemPrice(item: unknown): number {
  const itemObj = getObject(item);
  if (!itemObj) return 0;

  const directPrice = toNumber(itemObj["price"]);
  if (directPrice > 0) return directPrice;

  const productObj = getObject(itemObj["product"]);
  const productPrice = toNumber(productObj?.["price"]);
  if (productPrice > 0) return productPrice;

  return 0;
}

function getItemQuantity(item: unknown): number {
  const itemObj = getObject(item);
  if (!itemObj) return 1;

  const quantity = toNumber(itemObj["quantity"]);
  return quantity > 0 ? quantity : 1;
}

async function getCartSubtotal(): Promise<number> {
  const cookieStore = await cookies();
  const cartId = cookieStore.get("cartId")?.value;

  if (!cartId) return 0;

  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  const cartObj = getObject(cart);
  const items = Array.isArray(cartObj?.["items"]) ? cartObj["items"] : [];

  if (!items.length) return 0;

  const subtotal = items.reduce((sum: number, item: unknown) => {
    const itemPrice = getItemPrice(item);
    const itemQuantity = getItemQuantity(item);

    return sum + itemPrice * itemQuantity;
  }, 0);

  return subtotal;
}

export default async function FreeShippingBannerServer() {
  const subtotal = await getCartSubtotal();

  return <FreeShippingBanner subtotal={subtotal} threshold={70} />;
}
