export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, User2, MessageSquareText } from "lucide-react";
import DangerActionButton from "@/components/admin/DangerActionButton";
import { deleteReviewAction, deleteUserAction } from "../actions";

export default async function AdminUserDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const userId = params.id;

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
      userId: true,
      productId: true,
      rating: true,
      comment: true,
      createdAt: true,
      imageUrls: true,
    },
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <div className="flex items-center gap-2">
          <User2 className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Detalhes do User</h1>
        </div>
      </div>

      {/* Card User */}
      <div className="mb-6 rounded-xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-lg font-semibold text-gray-900 truncate">
              {user.name ?? "Sem nome"}
            </div>
            <div className="text-sm text-gray-600 truncate">
              {user.email ?? "Sem email"}
            </div>
            <div className="mt-1 text-xs text-gray-500 truncate">ID: {user.id}</div>
          </div>

          <div className="w-full max-w-xs">
            <DangerActionButton
              label="Eliminar conta"
              confirmText="Tens a certeza que queres ELIMINAR esta conta? Isto vai apagar também as reviews deste user."
              action={deleteUserAction}
              formData={{ userId: user.id }}
              className="inline-flex w-full items-center justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-gray-50 p-3">
            <div className="text-xs font-semibold text-gray-600">Criado</div>
            <div className="text-sm text-gray-900">
              {user.createdAt ? new Date(user.createdAt).toLocaleString("pt-PT") : "-"}
            </div>
          </div>

          <div className="rounded-lg border bg-gray-50 p-3">
            <div className="text-xs font-semibold text-gray-600">Atualizado</div>
            <div className="text-sm text-gray-900">
              {user.updatedAt ? new Date(user.updatedAt).toLocaleString("pt-PT") : "-"}
            </div>
          </div>

          <div className="rounded-lg border bg-gray-50 p-3">
            <div className="text-xs font-semibold text-gray-600">Total reviews</div>
            <div className="text-sm text-gray-900">{reviews.length}</div>
          </div>
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
            Este user ainda não fez reviews.
          </div>
        ) : (
          <div className="divide-y">
            {reviews.map((r) => (
              <div key={r.id} className="px-4 py-4">
                <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                  <div className="text-xs text-gray-500">
                    <span className="font-semibold">ID:</span> {r.id} •{" "}
                    {r.createdAt ? new Date(r.createdAt).toLocaleString("pt-PT") : "-"}
                    {" • "}
                    <span className="font-semibold">Rating:</span> {r.rating ?? "—"}
                  </div>

                  <div className="w-full max-w-[220px]">
                    <DangerActionButton
                      label="Apagar review"
                      confirmText="Apagar esta review?"
                      action={deleteReviewAction}
                      formData={{ reviewId: r.id }}
                      className="inline-flex w-full items-center justify-center rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                    />
                  </div>
                </div>

                <div className="rounded-lg border bg-gray-50 p-3 text-sm text-gray-900 whitespace-pre-wrap">
                  {r.comment ?? "[Sem comentário]"}
                </div>

                <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-gray-600">
                  <div>
                    <span className="font-semibold">Product ID:</span>{" "}
                    {r.productId ?? "—"}
                  </div>

                  {Array.isArray(r.imageUrls) && r.imageUrls.length > 0 ? (
                    <div className="break-all">
                      <span className="font-semibold">Images:</span>{" "}
                      {r.imageUrls.join(", ")}
                    </div>
                  ) : (
                    <div>
                      <span className="font-semibold">Images:</span> —
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
