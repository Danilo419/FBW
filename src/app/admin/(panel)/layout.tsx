// src/app/admin/(panel)/layout.tsx
import type { ReactNode } from "react";
import AdminShell from "@/components/admin/AdminShell"; 

export default function PanelLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
