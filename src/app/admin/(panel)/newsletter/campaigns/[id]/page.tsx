export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function NewsletterCampaignDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const campaign = await prisma.newsletterCampaign.findUnique({
    where: { id },
    include: {
      logs: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!campaign) return notFound();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <Link href="/admin/newsletter" className="text-sm text-gray-600 hover:underline">
            ← Back
          </Link>
          <h1 className="text-2xl font-semibold truncate mt-1">{campaign.subject}</h1>
          <div className="text-sm text-gray-600">
            Status: <span className="font-semibold text-black">{campaign.status}</span> •{" "}
            {campaign.sentCount}/{campaign.totalRecipients} sent • {campaign.failedCount} failed
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <div className="font-semibold mb-2">HTML preview</div>
          <div className="rounded-xl border bg-gray-50 p-3 overflow-auto">
            <div dangerouslySetInnerHTML={{ __html: campaign.html }} />
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="font-semibold mb-2">Logs (latest 50)</div>
          <div className="divide-y rounded-xl border overflow-hidden">
            {campaign.logs.map((l) => (
              <div key={l.id} className="px-3 py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{l.email}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(l.createdAt).toLocaleString()}
                    {l.providerId ? ` • id: ${l.providerId}` : ""}
                  </div>
                  {l.error ? <div className="text-xs text-red-600 mt-1">{l.error}</div> : null}
                </div>
                <span
                  className={[
                    "text-xs rounded-full border px-2 py-0.5 shrink-0",
                    l.status === "SENT"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-red-50 text-red-700 border-red-200",
                  ].join(" ")}
                >
                  {l.status}
                </span>
              </div>
            ))}
            {!campaign.logs.length && (
              <div className="px-3 py-8 text-center text-sm text-gray-600">No logs.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
