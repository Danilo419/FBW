'use client';

import { signOut } from 'next-auth/react';

type Props = { redirectTo?: string };

export default function LogoutButton({ redirectTo = '/account/login' }: Props) {
  const handleClick = async () => {
    // Não use router.push aqui. Deixe o NextAuth encerrar a sessão e redirecionar.
    await signOut({
      callbackUrl: redirectTo, // para onde ir depois do logout
      // redirect: true é o padrão; mantém hard navigation e limpa caches
    });
  };

  return (
    <button
      onClick={handleClick}
      className="px-3 py-2 rounded-lg border hover:opacity-80"
      aria-label="Terminar sessão"
    >
      Logout
    </button>
  );
}
