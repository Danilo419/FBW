export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import NewsletterComposer from "./ui/NewsletterComposer";

const PAGE_SIZE = 10;

type SearchParams = {
  page?: string;
};

type Row = {
  id: string;
  email: string;
  createdAt: Date;
};

export default async function AdminNewsletterPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  // ✅ Next.js 15: searchParams é Promise
  const sp = (await searchParams) ?? {};
  const page = Math.max(1, Number(sp.page || 1) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [total, rows] = await Promise.all([
    prisma.newsletterSubscriber.count({
      where: { unsubscribedAt: null },
    }),
    prisma.newsletterSubscriber.findMany({
      where: { unsubscribedAt: null },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip,
      select: { id: true, email: true, createdAt: true },
    }),
  ]);

  const typedRows = rows as Row[];
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function PageLink({ p }: { p: number }) {
    const active = p === page;
    return (
      <Link
        href={`/admin/newsletter?page=${p}`}
        className={`px-3 py-1.5 rounded-lg border text-sm ${
          active
            ? "bg-black text-white border-black"
            : "bg-white hover:bg-gray-50"
        }`}
      >
        {p}
      </Link>
    );
  }

  // paginação tipo 1,2,3... com cortes
  const visible: number[] = [];
  const add = (n: number) => {
    if (n >= 1 && n <= pages && !visible.includes(n)) visible.push(n);
  };

  add(1);
  add(2);
  add(pages);
  add(pages - 1);
  add(page - 1);
  add(page);
  add(page + 1);

  visible.sort((a, b) => a - b);

  const chunks: (number | "dots")[] = [];
  for (let i = 0; i < visible.length; i++) {
    const cur = visible[i];
    const prev = visible[i - 1];
    if (i > 0 && cur - prev > 1) chunks.push("dots");
    chunks.push(cur);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Newsletter</h1>
          <p className="text-sm text-gray-600">
            Send an email to all subscribed customers and manage subscribers.
          </p>
        </div>
        <div className="text-sm text-gray-600">
          Active subscribers:{" "}
          <span className="font-semibold text-black">{total}</span>
        </div>
      </div>

      {/* Composer */}
      <div className="rounded-2xl border bg-white p-4">
        <NewsletterComposer />
      </div>

      {/* Subscribers list */}
      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold">Subscribers</div>
          <div className="text-sm text-gray-600">
            Showing {typedRows.length ? skip + 1 : 0}–
            {skip + typedRows.length} of {total}
          </div>
        </div>

        <div className="divide-y">
          {typedRows.map((r) => (
            <div
              key={r.id}
              className="px-4 py-3 flex items-center justify-between gap-4"
            >
              <div className="text-sm font-medium">{r.email}</div>
              <div className="text-xs text-gray-500">
                {new Date(r.createdAt).toLocaleString()}
              </div>
            </div>
          ))}

          {!typedRows.length && (
            <div className="px-4 py-10 text-center text-sm text-gray-600">
              No subscribers yet.
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="px-4 py-4 border-t flex items-center justify-center gap-2">
          {chunks.map((x, idx) =>
            x === "dots" ? (
              <span key={`d${idx}`} className="px-2 text-gray-500">
                …
              </span>
            ) : (
              <PageLink key={x} p={x} />
            )
          )}
        </div>
      </div>
    </div>
  );
}
