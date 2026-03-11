// src/app/layout.tsx
import "./globals.css";
import type {Metadata} from "next";

export const metadata: Metadata = {
  title: "FootballWorld",
  description: "Authentic & concept football jerseys with worldwide shipping."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return children;
}