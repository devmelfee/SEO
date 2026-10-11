import type { Metadata } from "next";
import "./globals.css";
import { THEME_BOOT } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "SEO Local Agency",
  description: "Sistema de execução de SEO local com IA",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} /></head>
      <body>{children}</body>
    </html>
  );
}
