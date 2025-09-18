// src/app/admin/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

// Reexporta a página real que está no grupo (panel)
export { default } from "./(panel)/page";
