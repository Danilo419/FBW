// src/app/account/signup/page.tsx
import { Suspense } from "react";
import SignupClient from "./SignupClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SignupPage() {
  return (
    <div className="container-fw max-w-md py-16">
      <h1 className="text-3xl font-extrabold mb-6">Log in / Sign up</h1>

      <Suspense
        fallback={
          <div className="rounded-2xl border bg-white p-5 text-center">
            Loading…
          </div>
        }
      >
        <SignupClient />
      </Suspense>
    </div>
  );
}
