export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { User2, MessageSquareText } from "lucide-react";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  const grouped = await prisma.review.groupBy({
    by: ["userId"],
    _count: { _all: true },
  });

  const counts = new Map<string, number>();
  for (const g of grouped) {
    if (!g.userId) continue; // ✅ evita string | null
    counts.set(g.userId, g._count._all);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <User2 className="h-5 w-5" />
        <h1 className="text-xl font-semibold">Users</h1>
      </div>

      <div className="rounded-xl border bg-white">
        <div className="grid grid-cols-12 gap-3 border-b px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
          <div className="col-span-4">User</div>
          <div className="col-span-4">Email</div>
          <div className="col-span-2">Reviews</div>
          <div className="col-span-2">Criado</div>
        </div>

        {users.length === 0 ? (
          <div className="px-4 py-8 text-sm text-gray-600">Sem users.</div>
        ) : (
          <div className="divide-y">
            {users.map((u) => (
              <Link
                key={u.id}
                href={`/admin/users/${u.id}`}
                className="grid grid-cols-12 gap-3 px-4 py-3 hover:bg-gray-50"
              >
                <div className="col-span-4">
                  <div className="text-sm font-medium text-gray-900">
                    {u.name ?? "Sem nome"}
                  </div>
                  <div className="text-xs text-gray-500">ID: {u.id}</div>
                </div>

                <div className="col-span-4 text-sm text-gray-800">
                  {u.email ?? "Sem email"}
                </div>

                <div className="col-span-2 flex items-center gap-2 text-sm text-gray-800">
                  <MessageSquareText className="h-4 w-4" />
                  {counts.get(u.id) ?? 0}
                </div>

                <div className="col-span-2 text-sm text-gray-800">
                  {u.createdAt ? new Date(u.createdAt).toLocaleString("pt-PT") : "-"}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
