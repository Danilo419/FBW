// src/app/(store)/cart/page.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma, CartItem } from "@prisma/client";
import FWImage from "@/components/FWImage";

export const dynamic = "force-dynamic";

// ---- Helper types (garantem que 'items' existe) ----
type CartWithItems = Prisma.CartGetPayload<{
  include: {
    items: {
      include: {
        product: {
          select: {
            id: true;
            name: true;
            team: true;
            images: true;
            slug: true;
          };
        };
      };
    };
  };
}>;

// Server Action to remove an item (id is a string)
export async function removeItem(formData: FormData) {
  "use server";

  const jar = await cookies();
  const sid = jar.get("sid")?.value ?? null;

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id ?? null;

  const itemId = formData.get("itemId");
  if (!itemId || typeof itemId !== "string") {
    redirect("/cart");
  }

  try {
    const currentCart = await prisma.cart.findFirst({
      where: {
        OR: [
          userId ? { userId } : undefined,
          sid ? { sessionId: sid } : undefined,
        ].filter(Boolean) as any,
      },
      select: { id: true },
    });

    if (currentCart) {
      await prisma.cartItem.deleteMany({
        where: { id: itemId, cartId: currentCart.id },
      });
    }
  } finally {
    revalidatePath("/cart");
    redirect("/cart");
  }
}

export default async function CartPage() {
  const cookieStore = await cookies();
  const sid = cookieStore.get("sid")?.value ?? null;

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id ?? null;

  // Find cart by userId (if logged in) OR by sessionId (anonymous)
  const cart = (await prisma.cart.findFirst({
    where: {
      OR: [
        userId ? { userId } : undefined,
        sid ? { sessionId: sid } : undefined,
      ].filter(Boolean) as any,
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              team: true,
              images: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })) as CartWithItems | null;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-fw py-16">
        <h1 className="text-3xl font-extrabold mb-6">Your Cart</h1>
        <div className="rounded-2xl border p-10 bg-white/70 text-gray-600">
          Your cart is empty.
        </div>
        <div className="mt-6">
          <Link
            href="/products"
            className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-white hover:bg-blue-700"
          >
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  // Construímos itens para mostrar: preço SEM personalização (usa sempre unitPrice)
  const displayItems = cart.items.map((it) => {
    // 'unitPrice' vem do cartItem (preço base gravado no "add to cart")
    const displayUnit: number = (it as CartItem).unitPrice ?? 0;
    const displayTotal: number = displayUnit * it.qty;

    const opts =
      (it as any).optionsJson && typeof (it as any).optionsJson === "object"
        ? (it as any).optionsJson
        : null;

    return {
      ...it,
      displayUnit,
      displayTotal,
      opts,
    };
  });

  const grandTotal: number = displayItems.reduce(
    (acc: number, it) => acc + it.displayTotal,
    0
  );

  return (
    <div className="container-fw py-12">
      <h1 className="text-3xl font-extrabold mb-8">Your Cart</h1>

      <div className="grid gap-5">
        {displayItems.map((it) => {
          const cover = it.product.images?.[0] ?? "/placeholder.png";

          return (
            <div
              key={String(it.id)}
              className="group rounded-2xl border bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition"
            >
              <div className="flex gap-4 sm:gap-5">
                <div className="relative h-28 w-24 sm:h-32 sm:w-28 overflow-hidden rounded-xl border">
                  <FWImage
                    src={cover}
                    alt={it.product.name}
                    fill
                    className="object-contain"
                    sizes="112px"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold leading-tight">
                        {it.product.name}
                      </h3>
                      {it.product.team && (
                        <div className="text-sm text-gray-600">
                          {it.product.team}
                        </div>
                      )}
                      {it.opts ? (
                        <div className="mt-1 text-xs text-gray-500">
                          {Object.entries(it.opts as Record<string, any>)
                            .map(([k, v]) => `${k}: ${String(v)}`)
                            .join(" · ")}
                        </div>
                      ) : null}
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        Unit: {formatMoney(it.displayUnit)}
                      </div>
                      <div className="text-base font-semibold">
                        {formatMoney(it.displayTotal)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 text-sm text-gray-600">
                    Qty: <span className="font-medium">{it.qty}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-end">
                    <form action={removeItem}>
                      <input type="hidden" name="itemId" value={String(it.id)} />
                      <button
                        type="submit"
                        className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm hover:bg-red-50 hover:text-red-700 transition"
                        aria-label={`Remove ${it.product.name} from cart`}
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-end gap-4">
        <div className="rounded-2xl border bg-white px-5 py-3 text-lg font-bold">
          Total:&nbsp;{formatMoney(grandTotal)}
        </div>
        <Link
          href="/checkout/address"
          className="inline-flex items-center rounded-xl bg-black px-5 py-3 text-white font-semibold hover:bg-gray-900"
          aria-label="Proceed to address step"
        >
          Go to Checkout
        </Link>
      </div>
    </div>
  );
}
