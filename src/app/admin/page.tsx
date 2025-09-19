// src/app/admin/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import AdminDashboardPage from "./(panel)/page";

export default function AdminIndex() {
  return <AdminDashboardPage />;
}
