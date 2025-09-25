'use client';

import { signOut } from 'next-auth/react';

type Props = {
  /** Para onde redirecionar depois do logout */
  redirectTo?: string;
};

export default function LogoutButton({ redirectTo = '/account/login?loggedOut=1' }: Props) {
  const handleClick = async () => {
    try {
      // ⚡ Não usar router.push — deixa o NextAuth invalidar cookies e redirecionar
      await signOut({
        redirect: true,          // navegação completa (hard reload)
        callbackUrl: redirectTo, // destino após sair
      });
    } catch (err) {
      console.error('Erro ao terminar sessão:', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="px-3 py-2 rounded-lg border hover:bg-gray-100 transition"
      aria-label="Terminar sessão"
    >
      Logout
    </button>
  );
}
