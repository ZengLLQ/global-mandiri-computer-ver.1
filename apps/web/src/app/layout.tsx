import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Global Mandiri Computer (GMC) - Pusat Komputasi",
  description: "Retailer resmi laptop, PC Desktop, All-in-One, Printer, Projector, dan Starlink Satelit di ITC Mega Grosir. Bergaransi resmi pabrikan.",
  keywords: ["laptop", "komputer", "pc", "printer", "projector", "starlink", "gmc", "global mandiri computer", "itc mega grosir", "toko laptop"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable}`}>
      <body className="antialiased selection:bg-neutral-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}
