// src/app/[locale]/admin/login/page.tsx
import { redirect } from "next/navigation";

export default async function AdminLoginRedirect({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  const locale = params.locale;

  // Next 15: searchParams é Promise
  const sp = (await searchParams) ?? {};
  const raw = sp.next;

  const next =
    typeof raw === "string"
      ? raw
      : Array.isArray(raw)
      ? raw[0]
      : `/${locale}/admin`;

  redirect(`/${locale}/account/login?next=${encodeURIComponent(next)}`);
}