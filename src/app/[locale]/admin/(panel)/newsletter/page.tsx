// src/app/[locale]/admin/(panel)/newsletter/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import NewsletterComposer from "./ui/NewsletterComposer";

const SUBS_PAGE_SIZE = 10;
const CAMP_PAGE_SIZE = 10;

type SearchParams = {
  page?: string;
  cpage?: string;
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
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Newsletter</h1>
          <p className="text-sm text-gray-600">
            Create newsletters, send them to subscribers, and track history.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active subscribers" value={activeSubscribers} />
        <StatCard label="Campaigns" value={campaignsTotal} />
        <StatCard label="Total sent" value={sentTotal} />
        <StatCard label="Total failed" value={failedTotal} />
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <NewsletterComposer />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-semibold">Campaign history</div>
          <div className="text-sm text-gray-600">Latest campaigns</div>
        </div>

        <div className="divide-y">
          {campaigns.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <Link
                  href={`/admin/newsletter/campaigns/${c.id}`}
                  className="block truncate text-sm font-semibold hover:underline"
                  title={c.subject}
                >
                  {c.subject}
                </Link>
                <div className="text-xs text-gray-500">
                  {new Date(c.createdAt).toLocaleString("en-GB")}
                  {c.sentAt ? ` • Sent: ${new Date(c.sentAt).toLocaleString("en-GB")}` : ""}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={[
                    "rounded-full border px-2 py-0.5 text-xs",
                    c.status === "SENT"
                      ? "border-green-200 bg-green-50 text-green-700"
                      : c.status === "FAILED"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : c.status === "SENDING"
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-gray-200 bg-gray-50 text-gray-700",
                  ].join(" ")}
                >
                  {c.status}
                </span>

                <div className="tabular-nums text-xs text-gray-700">
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

      <div className="overflow-hidden rounded-2xl border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-semibold">Subscribers</div>
          <div className="text-sm text-gray-600">
            Showing {subs.length ? subsSkip + 1 : 0}–{subsSkip + subs.length} of {subsTotal}
          </div>
        </div>

        <div className="divide-y">
          {subs.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="text-sm font-medium">{s.email}</div>
              <div className="text-xs text-gray-500">
                {new Date(s.createdAt).toLocaleString("en-GB")}
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
      <div className="tabular-nums text-2xl font-extrabold">{value}</div>
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
    <div className="flex items-center justify-center gap-2 border-t px-4 py-4">
      {chunks.map((x, idx) =>
        x === "dots" ? (
          <span key={`d${idx}`} className="px-2 text-gray-500">
            …
          </span>
        ) : (
          <Link
            key={`${param}-${x}`}
            href={`${baseHref}?${param}=${x}`}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              x === page ? "border-black bg-black text-white" : "bg-white hover:bg-gray-50"
            }`}
          >
            {x}
          </Link>
        )
      )}
    </div>
  );
}