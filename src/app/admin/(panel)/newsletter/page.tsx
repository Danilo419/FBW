export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import NewsletterComposer from "./ui/NewsletterComposer";

const SUBS_PAGE_SIZE = 10;
const CAMP_PAGE_SIZE = 10;

type SearchParams = {
  page?: string; // subscribers
  cpage?: string; // campaigns
};

export default async function AdminNewsletterPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = (await searchParams) ?? {};
  const page = Math.max(1, Number(sp.page || 1) || 1);
  const cpage = Math.max(1, Number(sp.cpage || 1) || 1);

  const subsSkip = (page - 1) * SUBS_PAGE_SIZE;
  const campSkip = (cpage - 1) * CAMP_PAGE_SIZE;

  const [
    activeSubscribers,
    logsAgg,
    campaignsTotal,
    subsTotal,
    subs,
    campaigns,
  ] = await Promise.all([
    prisma.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
    prisma.newsletterSendLog.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.newsletterCampaign.count(),
    prisma.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
    prisma.newsletterSubscriber.findMany({
      where: { unsubscribedAt: null },
      orderBy: { createdAt: "desc" },
      take: SUBS_PAGE_SIZE,
      skip: subsSkip,
      select: { id: true, email: true, createdAt: true },
    }),
    prisma.newsletterCampaign.findMany({
      orderBy: { createdAt: "desc" },
      take: CAMP_PAGE_SIZE,
      skip: campSkip,
      select: {
        id: true,
        subject: true,
        status: true,
        totalRecipients: true,
        sentCount: true,
        failedCount: true,
        createdAt: true,
        sentAt: true,
      },
    }),
  ]);

  const sentTotal = logsAgg.find((x) => x.status === "SENT")?._count.status ?? 0;
  const failedTotal = logsAgg.find((x) => x.status === "FAILED")?._count.status ?? 0;

  const subsPages = Math.max(1, Math.ceil(subsTotal / SUBS_PAGE_SIZE));
  const campPages = Math.max(1, Math.ceil(campaignsTotal / CAMP_PAGE_SIZE));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Newsletter</h1>
          <p className="text-sm text-gray-600">
            Create newsletters, send to subscribers, and track history.
          </p>
        </div>
      </div>

      {/* 📊 Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active subscribers" value={activeSubscribers} />
        <StatCard label="Campaigns" value={campaignsTotal} />
        <StatCard label="Total sent" value={sentTotal} />
        <StatCard label="Total failed" value={failedTotal} />
      </div>

      {/* 🖼️ Editor / Composer */}
      <div className="rounded-2xl border bg-white p-4">
        <NewsletterComposer />
      </div>

      {/* 🧾 History */}
      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold">Campaign history</div>
          <div className="text-sm text-gray-600">Last campaigns</div>
        </div>

        <div className="divide-y">
          {campaigns.map((c) => (
            <div key={c.id} className="px-4 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <Link
                  href={`/admin/newsletter/campaigns/${c.id}`}
                  className="text-sm font-semibold hover:underline truncate block"
                  title={c.subject}
                >
                  {c.subject}
                </Link>
                <div className="text-xs text-gray-500">
                  {new Date(c.createdAt).toLocaleString()}{" "}
                  {c.sentAt ? `• Sent: ${new Date(c.sentAt).toLocaleString()}` : ""}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={[
                    "text-xs rounded-full border px-2 py-0.5",
                    c.status === "SENT"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : c.status === "FAILED"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : c.status === "SENDING"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-gray-50 text-gray-700 border-gray-200",
                  ].join(" ")}
                >
                  {c.status}
                </span>

                <div className="text-xs text-gray-700 tabular-nums">
                  {c.sentCount}/{c.totalRecipients} sent
                  {c.failedCount ? ` • ${c.failedCount} failed` : ""}
                </div>
              </div>
            </div>
          ))}

          {!campaigns.length && (
            <div className="px-4 py-10 text-center text-sm text-gray-600">
              No campaigns yet.
            </div>
          )}
        </div>

        <Pagination
          baseHref="/admin/newsletter"
          page={cpage}
          pages={campPages}
          param="cpage"
        />
      </div>

      {/* Subscribers */}
      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold">Subscribers</div>
          <div className="text-sm text-gray-600">
            Showing {subs.length ? subsSkip + 1 : 0}–{subsSkip + subs.length} of{" "}
            {subsTotal}
          </div>
        </div>

        <div className="divide-y">
          {subs.map((s) => (
            <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-4">
              <div className="text-sm font-medium">{s.email}</div>
              <div className="text-xs text-gray-500">
                {new Date(s.createdAt).toLocaleString()}
              </div>
            </div>
          ))}

          {!subs.length && (
            <div className="px-4 py-10 text-center text-sm text-gray-600">
              No subscribers yet.
            </div>
          )}
        </div>

        <Pagination
          baseHref="/admin/newsletter"
          page={page}
          pages={subsPages}
          param="page"
        />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-extrabold tabular-nums">{value}</div>
    </div>
  );
}

function Pagination({
  baseHref,
  page,
  pages,
  param,
}: {
  baseHref: string;
  page: number;
  pages: number;
  param: "page" | "cpage";
}) {
  // 1,2,..., current-1,current,current+1,..., last
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
    <div className="px-4 py-4 border-t flex items-center justify-center gap-2">
      {chunks.map((x, idx) =>
        x === "dots" ? (
          <span key={`d${idx}`} className="px-2 text-gray-500">
            …
          </span>
        ) : (
          <Link
            key={`${param}-${x}`}
            href={`${baseHref}?${param}=${x}`}
            className={`px-3 py-1.5 rounded-lg border text-sm ${
              x === page ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50"
            }`}
          >
            {x}
          </Link>
        )
      )}
    </div>
  );
}
