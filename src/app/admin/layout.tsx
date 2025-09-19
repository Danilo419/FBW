// src/app/admin/(panel)/layout.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import ClientAdminLayout from "./ClientAdminLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ClientAdminLayout>{children}</ClientAdminLayout>;
}
