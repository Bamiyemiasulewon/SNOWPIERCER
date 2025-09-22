import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron, Rajdhani, Inter } from "next/font/google";
import "./globals.css";
import { WalletProviders } from "@/components/WalletProviders";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
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
        className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} ${rajdhani.variable} ${inter.variable} antialiased`}
      >
        <WalletProviders>
          {children}
        </WalletProviders>
      </body>
    </html>
  );
}
