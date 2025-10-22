// src/app/admin/login/page.tsx
import { redirect } from "next/navigation";

export default async function AdminLoginRedirect({
  searchParams,
}: {
  // Next 15: searchParams é Promise
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  const sp = (await searchParams) ?? {};
  const raw = sp.next;
  const next =
    (Array.isArray(raw) ? raw[0] : raw) && typeof (Array.isArray(raw) ? raw[0] : raw) === "string"
      ? (Array.isArray(raw) ? raw[0] : raw)
      : "/admin";

  redirect(`/login?next=${encodeURIComponent(next)}`);
}
