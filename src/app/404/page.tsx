// src/app/404/page.tsx
import Link from 'next/link';
import { Suspense } from 'react';
import NotFoundClient from '../_components/NotFoundClient';

export const dynamic = 'force-dynamic';

export default function Custom404() {
  return (
    <div className="container-fw py-20 space-y-4">
      <h1 className="text-3xl font-extrabold">Page not found</h1>
      <Suspense fallback={null}>
        <NotFoundClient />
      </Suspense>
      <Link href="/" className="underline">← Back</Link>
    </div>
  );
}
