import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProviders } from "@/components/WalletProviders";

// Use Inter as the main font with system font fallbacks
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap',
  fallback: ['system-ui', 'arial'],
});

export const metadata: Metadata = {
  title: "VolumeBot - Solana Volume Trading Bot",
  description: "Professional Solana volume trading bot with advanced features",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <WalletProviders>
          {children}
        </WalletProviders>
      </body>
    </html>
  );
}
