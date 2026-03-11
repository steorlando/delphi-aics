import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Delphi Consultation",
  description: "Simplified Delphi consultation workflow for policy documents.",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
