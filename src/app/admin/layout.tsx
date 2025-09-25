// src/app/admin/layout.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import AdminGuard from "./AdminGuard";
import ClientAdminLayout from "./ClientAdminLayout";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <ClientAdminLayout>{children}</ClientAdminLayout>
    </AdminGuard>
  );
}
