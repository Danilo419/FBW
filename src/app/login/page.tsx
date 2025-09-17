// src/app/login/page.tsx
import { Suspense } from "react";
import LoginClient from "../account/login/LoginClient";

export const revalidate = 0;          // avoid prerender caching
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="container-fw py-16 max-w-md">
          <div className="rounded-2xl border bg-white p-5 text-center">
            Loading…
          </div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
