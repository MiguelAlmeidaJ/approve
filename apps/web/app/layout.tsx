import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aprovação — Terceiro Andar",
  description: "Calendário e aprovação de conteúdo da Terceiro Andar."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
