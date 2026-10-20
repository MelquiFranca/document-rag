import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Evidence Auditor",
  description: "Auditoria de evidências, versões e contradições em aplicações RAG.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
