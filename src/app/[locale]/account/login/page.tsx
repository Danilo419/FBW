// src/app/account/login/page.tsx
import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LoginPage() {
  return (
    <div className="container-fw py-16 max-w-md">

      {/* Client logic (useSearchParams/useSession/signIn) lives in LoginClient */}
      <Suspense
        fallback={
          <div className="rounded-2xl border bg-white p-5 text-center">Loading…</div>
        }
      >
        <LoginClient />
      </Suspense>
    </div>
  );
}
