export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, User2, MessageSquareText } from "lucide-react";
import DangerActionButton from "@/components/admin/DangerActionButton";
import { deleteReviewAction, deleteUserAction } from "../actions";

type PageProps = {
  params: Promise<{ id: string }>;
};

type AnyProduct = {
  id: string;
  name?: string | null;
  // We don't know your exact Product fields, so we read common ones safely:
  image?: string | null;
  mainImageUrl?: string | null;
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
  images?: string[] | null;
  imageUrls?: string[] | null;
};

function getPrimaryProductImage(p?: AnyProduct | null): string | null {
  if (!p) return null;

  const candidates: Array<string | null | undefined> = [
    p.mainImageUrl,
    p.thumbnailUrl,
    p.imageUrl,
    p.image,
    Array.isArray(p.images) ? p.images[0] : null,
    Array.isArray(p.imageUrls) ? p.imageUrls[0] : null,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) return c;
  }
  return null;
}

function Stars({ rating }: { rating: number | null }) {
  const r = typeof rating === "number" ? Math.max(0, Math.min(5, rating)) : 0;
  return (
    <div className="flex items-center gap-1" aria-label={`Rating ${r} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < r;
        return (
          <span
            key={i}
            className={filled ? "text-yellow-500" : "text-gray-300"}
            aria-hidden
          >
            ★
          </span>
        );
      })}
      <span className="ml-2 text-xs text-gray-500">{r}/5</span>
    </div>
  );
}

export default async function AdminUserDetailsPage({ params }: PageProps) {
  const { id: userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) return notFound();

  const reviews = await prisma.review.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      productId: true,
      rating: true,
      comment: true,
      createdAt: true,
      imageUrls: true,
      userId: true,
    },
  });

  // Fetch products for the reviews (so we can show product image + name)
  const productIds = Array.from(
    new Set(reviews.map((r) => r.productId).filter((x): x is string => !!x))
  );

  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        // We cast select as any to avoid TS errors if your Product fields differ.
        select: {
          id: true,
          name: true,
          image: true,
          mainImageUrl: true,
          thumbnailUrl: true,
          imageUrl: true,
          images: true,
          imageUrls: true,
        } as any,
      })
    : [];

  const productMap = new Map<string, AnyProduct>();
  for (const p of products as unknown as AnyProduct[]) productMap.set(p.id, p);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="flex items-center gap-2">
          <User2 className="h-5 w-5" />
          <h1 className="text-xl font-semibold">User Details</h1>
        </div>
      </div>

      {/* User Card */}
      <div className="mb-6 rounded-xl border bg-white p-4">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {/* ✅ User profile photo */}
            <div className="relative h-14 w-14 overflow-hidden rounded-full border bg-gray-50">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name ? `${user.name} profile photo` : "User profile photo"}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                  No photo
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="text-lg font-semibold text-gray-900 truncate">
                {user.name ?? "No name"}
              </div>
              <div className="text-sm text-gray-600 truncate">
                {user.email ?? "No email"}
              </div>
              <div className="mt-1 text-xs text-gray-500 truncate">ID: {user.id}</div>
            </div>
          </div>

          <div className="w-full max-w-xs">
            <DangerActionButton
              label="Delete account"
              confirmText="Are you sure you want to DELETE this account? All user reviews will also be deleted."
              action={deleteUserAction}
              formData={{ userId: user.id }}
              className="inline-flex w-full items-center justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <InfoBox label="Created" value={user.createdAt} />
          <InfoBox label="Updated" value={user.updatedAt} />
          <InfoBox label="Total reviews" value={reviews.length} />
        </div>
      </div>

      {/* Reviews */}
      <div className="rounded-xl border bg-white">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4" />
            <div className="text-sm font-semibold">Reviews</div>
          </div>
          <div className="text-xs text-gray-500">{reviews.length} total</div>
        </div>

        {reviews.length === 0 ? (
          <div className="px-4 py-8 text-sm text-gray-600">
            This user has not submitted any reviews yet.
          </div>
        ) : (
          <div className="divide-y">
            {reviews.map((r) => {
              const p = r.productId ? productMap.get(r.productId) ?? null : null;
              const productImg = getPrimaryProductImage(p);
              const productName = p?.name ?? "Unknown product";

              return (
                <div key={r.id} className="px-4 py-4">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* ✅ Product thumbnail */}
                      <div className="relative h-14 w-14 overflow-hidden rounded-lg border bg-gray-50 shrink-0">
                        {productImg ? (
                          <Image
                            src={productImg}
                            alt={productName}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                            No image
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {productName}
                        </div>
                        <div className="text-xs text-gray-500">
                          <b>Review ID:</b> {r.id} •{" "}
                          {r.createdAt ? new Date(r.createdAt).toLocaleString("en-GB") : "-"}
                        </div>

                        {/* ✅ Stars instead of “Rating: number” */}
                        <div className="mt-1">
                          <Stars rating={typeof r.rating === "number" ? r.rating : null} />
                        </div>

                        <div className="mt-1 text-xs text-gray-600">
                          <b>Product ID:</b> {r.productId ?? "-"}
                        </div>
                      </div>
                    </div>

                    <div className="w-full max-w-[220px]">
                      <DangerActionButton
                        label="Delete review"
                        confirmText="Delete this review?"
                        action={deleteReviewAction}
                        formData={{ reviewId: r.id }}
                        className="inline-flex w-full items-center justify-center rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border bg-gray-50 p-3 text-sm text-gray-900 whitespace-pre-wrap">
                    {r.comment ?? "[No comment]"}
                  </div>

                  {/* Review images (optional) */}
                  <div className="mt-2 text-xs text-gray-600">
                    <b>Review images:</b>{" "}
                    {Array.isArray(r.imageUrls) && r.imageUrls.length > 0 ? (
                      <span className="break-all">{r.imageUrls.join(", ")}</span>
                    ) : (
                      "-"
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= Helpers ================= */

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: Date | number | null | undefined;
}) {
  return (
    <div className="rounded-lg border bg-gray-50 p-3">
      <div className="text-xs font-semibold text-gray-600">{label}</div>
      <div className="text-sm text-gray-900">
        {value instanceof Date ? value.toLocaleString("en-GB") : value ?? "-"}
      </div>
    </div>
  );
}
