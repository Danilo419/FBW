// src/app/_components/NotFoundClient.tsx
'use client';

import { useSearchParams } from 'next/navigation';

export default function NotFoundClient() {
  // Example: read a query param safely on the client
  const params = useSearchParams();
  const q = params.get('q');

  if (!q) return null;
  return (
    <p className="text-sm text-gray-500 mt-2">
      (You searched for: <span className="font-medium">{q}</span>)
    </p>
  );
}
