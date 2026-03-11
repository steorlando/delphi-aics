import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Consultazione Delphi",
  description: "Flusso semplificato di consultazione Delphi per documenti di policy.",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
