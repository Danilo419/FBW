'use client';

import { signOut } from 'next-auth/react';

type Props = {
  /** Para onde redirecionar depois do logout */
  redirectTo?: string;
};

export default function LogoutButton({ redirectTo = '/account/login' }: Props) {
  const handleClick = async () => {
    try {
      // ⚡ Importante: não usar router.push, só deixar o NextAuth redirecionar
      await signOut({
        redirect: true,          // força navegação completa (hard reload)
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
