// src/app/nations/page.tsx
import NationsClient from "@/components/nations/NationsClient";

export const metadata = {
  title: "Nations | FootballWorld",
  description: "Shop by nation — find your national team kits and more.",
};

export default function NationsPage() {
  return <NationsClient />;
}
