// src/app/admin/layout.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

// Este layout raiz protege TODAS as rotas dentro de /admin.
// Ele envolve o conteúdo do grupo (panel) com o AdminGuard (cliente).
import AdminGuard from "./AdminGuard";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminGuard>{children}</AdminGuard>;
}
