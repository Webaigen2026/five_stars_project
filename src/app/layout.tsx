import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({
  variable: "--font-five-stars",
  subsets: ["latin"],
  display: "swap",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.fivestarsfly.com"),

  title: {
    default: "Five Stars | Flights, Cargo & Charter",
    template: "%s | Five Stars",
  },

  description:
    "Book flights, manage trips, ship cargo, and request private charter service between Haiti and the United States with Five Stars.",

  applicationName: "Five Stars",

  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Five Stars",
    title: "Five Stars | Flights, Cargo & Charter",
    description:
      "Book flights, manage trips, ship cargo, and request private charter service between Haiti and the United States with Five Stars.",
    url: "https://www.fivestarsfly.com",
  },

  twitter: {
    card: "summary_large_image",
    title: "Five Stars | Flights, Cargo & Charter",
    description:
      "Book flights, manage trips, ship cargo, and request private charter service between Haiti and the United States with Five Stars.",
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        {children}
      </body>
    </html>
  );
}