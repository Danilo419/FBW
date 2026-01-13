export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, User2, MessageSquareText } from "lucide-react";
import DangerActionButton from "@/components/admin/DangerActionButton";
import { deleteReviewAction, deleteUserAction } from "../actions";

type PageProps = {
  params: Promise<{ id: string }>;
};

type AnyProduct = Record<string, any>;

function isLikelyImageUrl(s: string): boolean {
  const v = s.trim().toLowerCase();
  if (!v.startsWith("http")) return false;

  // common image extensions OR common CDNs (cloudinary, supabase, etc.)
  if (
    v.includes("cloudinary.com") ||
    v.includes("supabase.co") ||
    v.includes("storage.googleapis") ||
    v.includes("vercel-storage.com") ||
    v.includes("blob.vercel") ||
    v.includes("cdn") ||
    v.endsWith(".jpg") ||
    v.endsWith(".jpeg") ||
    v.endsWith(".png") ||
    v.endsWith(".webp") ||
    v.endsWith(".gif")
  ) {
    return true;
  }

  // sometimes URLs have query params (e.g. .jpg?x=)
  if (v.includes(".jpg?") || v.includes(".jpeg?") || v.includes(".png?") || v.includes(".webp?"))
    return true;

  return false;
}

function firstImageFromUnknownValue(val: any): string | null {
  if (!val) return null;

  // direct string
  if (typeof val === "string") {
    return isLikelyImageUrl(val) ? val : null;
  }

  // array
  if (Array.isArray(val)) {
    for (const item of val) {
      const got = firstImageFromUnknownValue(item);
      if (got) return got;
    }
    return null;
  }

  // object with url
  if (typeof val === "object") {
    // common nested keys
    const nestedKeys = ["url", "src", "href", "secure_url", "publicUrl"];
    for (const k of nestedKeys) {
      if (typeof val[k] === "string" && isLikelyImageUrl(val[k])) return val[k];
    }
    // search deeper shallowly
    for (const k of Object.keys(val)) {
      const got = firstImageFromUnknownValue(val[k]);
      if (got) return got;
    }
  }

  return null;
}

function getPrimaryProductImage(p?: AnyProduct | null): string | null {
  if (!p) return null;

  // 1) Try a curated list of common image keys
  const commonKeys = [
    "mainImage",
    "mainImageUrl",
    "primaryImage",
    "primaryImageUrl",
    "coverImage",
    "coverImageUrl",
    "thumbnail",
    "thumbnailUrl",
    "thumb",
    "thumbUrl",
    "image",
    "imageUrl",
    "img",
    "imgUrl",
    "photo",
    "photoUrl",
    "picture",
    "pictureUrl",
    "images",
    "imageUrls",
    "gallery",
    "photos",
    "media",
  ];

  for (const key of commonKeys) {
    if (key in p) {
      const got = firstImageFromUnknownValue(p[key]);
      if (got) return got;
    }
  }

  // 2) Fallback: scan ALL product fields to find the first thing that looks like an image URL
  for (const key of Object.keys(p)) {
    const got = firstImageFromUnknownValue(p[key]);
    if (got) return got;
  }

  return null;
}

function getProductName(p?: AnyProduct | null): string {
  if (!p) return "Unknown product";
  const name =
    (typeof p.name === "string" && p.name) ||
    (typeof p.title === "string" && p.title) ||
    (typeof p.productName === "string" && p.productName) ||
    null;
  return name ?? "Unknown product";
}

function Stars({ rating }: { rating: number | null }) {
  const r =
    typeof rating === "number" && Number.isFinite(rating)
      ? Math.max(0, Math.min(5, Math.round(rating)))
      : 0;

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
    },
  });

  const productIds = Array.from(
    new Set(reviews.map((r) => r.productId).filter((x): x is string => !!x))
  );

  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
      })
    : [];

  const productMap = new Map<string, AnyProduct>();
  for (const p of products as unknown as AnyProduct[]) {
    if (p?.id) productMap.set(String(p.id), p);
  }

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
            <div className="h-14 w-14 overflow-hidden rounded-full border bg-gray-50 shrink-0">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name ? `${user.name} profile photo` : "User profile photo"}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
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
              const productName = getProductName(p);

              return (
                <div key={r.id} className="px-4 py-4">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-14 w-14 overflow-hidden rounded-lg border bg-gray-50 shrink-0">
                        {productImg ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={productImg}
                            alt={productName}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                            No image found
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {productName}
                        </div>

                        <div className="text-xs text-gray-500">
                          <b>Review ID:</b> {r.id} •{" "}
                          {r.createdAt
                            ? new Date(r.createdAt).toLocaleString("en-GB")
                            : "-"}
                        </div>

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

                  {/* OPTIONAL: show review images as clickable thumbnails (better than plain URLs) */}
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-gray-600 mb-2">Review images</div>
                    {Array.isArray(r.imageUrls) && r.imageUrls.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {r.imageUrls.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="block"
                            title="Open image"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={`Review image ${idx + 1}`}
                              className="h-16 w-16 rounded-md border object-cover bg-gray-50"
                              referrerPolicy="no-referrer"
                            />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">-</div>
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
