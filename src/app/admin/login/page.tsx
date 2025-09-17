// src/app/admin/login/page.tsx
import { Suspense } from "react";
import AdminLoginClient from "./AdminLoginClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminLoginPage() {
  return (
    <div className="container-fw py-16 max-w-md">
      <h1 className="text-3xl font-extrabold mb-6">Admin — Log in</h1>

      <Suspense
        fallback={
          <div className="rounded-2xl border bg-white p-5 text-center">Loading…</div>
        }
      >
        <AdminLoginClient />
      </Suspense>
    </div>
  );
}
