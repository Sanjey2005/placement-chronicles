import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Placement Chronicles - Real Interview & PSG placement experiences",
  description: "Share and explore real placement interview and PSG placement experiences from students on Placement Chronicles",
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Placement Chronicles - Real Interview & PSG placement experiences',
    description: 'Share and explore real placement interview and PSG placement experiences from students on Placement Chronicles',
    type: 'website',
    siteName: 'Placement Chronicles',
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "oCIVvhLTTOFxdKNSyQJweFSclxzsJTnnE_IoH8dj45w",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}

