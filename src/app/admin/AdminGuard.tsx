'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession(); // 'loading' | 'authenticated' | 'unauthenticated'
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      // Marque de onde veio, para o login saber pra onde voltar depois
      router.replace('/account/login?from=/admin');
    }
  }, [status, router]);

  if (status === 'loading') return null; // ou um spinner
  if (status !== 'authenticated') return null;

  return <>{children}</>;
}
