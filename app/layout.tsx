import type { Metadata } from "next";
import { Quicksand, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import DisclaimerModal from "@/components/DisclaimerModal";
import Providers from "@/components/Providers";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://placement-chronicles.vercel.app'),
  title: "Placement Chronicles",
  description: "Share and explore real placement interview and PSG placement experiences from students on Placement Chronicles. The ultimate platform for PSG Tech placement preparation.",
  keywords: ["PSG Tech", "PSG placement experiences", "Interview experiences", "Placement Chronicles", "PSG College of Technology", "Placement preparation", "Engineering interview reviews"],
  authors: [{ name: "Placement Chronicles Team" }],
  creator: "Placement Chronicles Team",
  publisher: "Placement Chronicles",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
    shortcut: '/logo.png',
  },
  openGraph: {
    title: 'Placement Chronicles',
    description: 'Real PSG placement experiences and interview insights. Help your juniors by sharing your journey.',
    url: 'https://placement-chronicles.vercel.app',
    siteName: 'Placement Chronicles',
    images: [
      {
        url: 'https://placement-chronicles.vercel.app/logo.png',
        width: 512,
        height: 512,
        alt: 'Placement Chronicles Logo — PSG Tech Placement Experiences',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Placement Chronicles',
    description: 'Real PSG placement experiences and interview insights.',
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: "oCIVvhLTTOFxdKNSyQJweFSclxzsJTnnE_IoH8dj45w",
  },
};

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Placement Chronicles',
    alternateName: 'PSG Tech Placement Chronicles',
    url: 'https://placement-chronicles.vercel.app',
    description: 'A community-driven platform for PSG Tech students to share and explore placement interview experiences.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://placement-chronicles.vercel.app/?search={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Placement Chronicles',
    url: 'https://placement-chronicles.vercel.app',
    logo: {
      '@type': 'ImageObject',
      url: 'https://placement-chronicles.vercel.app/logo.png',
      width: 512,
      height: 512,
    },
    description: 'PSG College of Technology\'s largest community platform for sharing real placement and interview experiences.',
    foundingLocation: {
      '@type': 'Place',
      name: 'PSG College of Technology, Coimbatore, India',
    },
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning belongs on <html>: next-themes writes the theme
    // class onto this element before paint, so the server markup can't match.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${quicksand.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          {children}
          <Suspense fallback={null}>
            <DisclaimerModal />
          </Suspense>
          <Toaster />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}

