// src/app/privacy-policy/page.tsx
import { Suspense } from "react";
import PrivacyClient from "./PrivacyClient";

// Always render at runtime so the Suspense boundary can hydrate properly
export const revalidate = 0;
export const dynamic = "force-dynamic";

export default function PrivacyPolicyPage() {
  return (
    <Suspense
      fallback={
        <main className="container-fw py-16">
          <p>Loading…</p>
        </main>
      }
    >
      <PrivacyClient />
    </Suspense>
  );
}
