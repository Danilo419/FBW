// src/app/admin/(panel)/Header.tsx
import LogoutButton from '@/components/LogoutButton';

export default function Header() {
  return (
    <header className="flex items-center justify-between">
      <h1 className="text-lg font-semibold">Admin</h1>
      <LogoutButton />
    </header>
  );
}
