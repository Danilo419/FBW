// src/app/admin/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import PanelPage from "./(panel)/page";

// Evita re-export direto; o wrapper garante que o ficheiro gerado é /admin/page.*
export default function AdminPage(props: any) {
  return <PanelPage {...props} />;
}
