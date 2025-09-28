'use client';

import { useState } from 'react';
// Se usas NextAuth:
import { signIn } from 'next-auth/react';

type Props = {
  callbackUrl?: string;
  text?: string;
  className?: string;
};

export default function GoogleAuthButton({
  callbackUrl = '/',
  text = 'Continue with Google',
  className = '',
}: Props) {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    try {
      setLoading(true);
      // NextAuth: inicia o fluxo OAuth Google
      await signIn('google', { callbackUrl });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Continue with Google"
      className={[
        // container
        'w-full rounded-xl border bg-white px-4 py-2.5 shadow-sm',
        'hover:bg-gray-50 active:bg-gray-100',
        'transition-colors',
        'flex items-center justify-center gap-3',
        'text-gray-900',
        loading ? 'opacity-70 cursor-wait' : 'cursor-pointer',
        className,
      ].join(' ')}
      disabled={loading}
    >
      <GoogleIcon className="h-5 w-5" />
      <span className="font-medium">{text}</span>
    </button>
  );
}

function GoogleIcon({ className = '' }: { className?: string }) {
  // Ícone "G" multicolor (oficial)
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.153 7.957 3.043l5.657-5.657C33.826 6.053 29.139 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20c11.045 0 20-8.955 20-20 0-1.341-.138-2.651-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.814C14.39 15.261 18.856 12 24 12c3.059 0 5.842 1.153 7.957 3.043l5.657-5.657C33.826 6.053 29.139 4 24 4 16.318 4 9.645 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.168 0 9.9-1.973 13.457-5.186l-6.206-5.254C29.2 35.655 26.748 36.6 24 36.6c-5.196 0-9.61-3.317-11.242-7.93l-6.545 5.04C9.51 39.62 16.194 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.02 12.02 0 0 1-4.052 5.56l6.206 5.254C39.018 35.92 44 30.4 44 24c0-1.341-.138-2.651-.389-3.917z"/>
    </svg>
  );
}
