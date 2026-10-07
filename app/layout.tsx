import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SEO Local Agency",
  description: "Sistema de execução de SEO local com IA",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
