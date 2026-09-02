import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NaturalCreatorAI — Le Méta-Moteur des 50+ Meilleures IA au Monde",
  description: "NaturalCreatorAI (www.naturalcreatorai.com) interroge et combine simultanément les 50 meilleurs moteurs d'intelligence artificielle au monde pour vous offrir la solution ultime dans tous les domaines.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-white">
        {publishableKey ? (
          <ClerkProvider>{children}</ClerkProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
