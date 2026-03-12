import JerseysPageClient from "./JerseysPageClient";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default function JerseysPage() {
  return <JerseysPageClient />;
}