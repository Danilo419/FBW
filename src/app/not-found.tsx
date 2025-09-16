// src/app/not-found.tsx
import Link from 'next/link';
import { Suspense } from 'react';
import NotFoundClient from './_components/NotFoundClient';

export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="container-fw py-20 space-y-4">
      <h1 className="text-3xl font-extrabold">Page not found</h1>
      <p className="text-gray-600">The page you were looking for does not exist.</p>

      {/* Wrap client hooks (useSearchParams) in Suspense */}
      <Suspense fallback={null}>
        <NotFoundClient />
      </Suspense>

      <div className="pt-4">
        <Link href="/" className="underline">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
