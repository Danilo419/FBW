// src/app/contact/page.tsx
import { Suspense } from "react";
import ContactClient from "./ContactClient";

export const revalidate = 0;               // avoid SSG for this page
export const dynamic = "force-dynamic";   // render at runtime

export default function ContactPage() {
  return (
    <main className="container-fw py-16 max-w-2xl">
      <h1 className="text-3xl font-extrabold mb-6">Contact</h1>

      <Suspense
        fallback={
          <div className="rounded-2xl border bg-white p-5 text-center">
            Loading…
          </div>
        }
      >
        <ContactClient />
      </Suspense>
    </main>
  );
}
