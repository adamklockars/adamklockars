import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://adamklockars.com";

const DESCRIPTION =
  "Engineering leader with 10+ years building and scaling platforms, APIs and developer ecosystems — most recently Zoom's App Marketplace. A scroll through my projects (PredictVS, Curve Appeal, Beyond the Metric) plus a couple of playable experiments.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Adam Oscar Klockars — Engineering Leader",
  description: DESCRIPTION,
  openGraph: {
    title: "Adam Oscar Klockars — Engineering Leader",
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Adam Oscar Klockars",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Adam Oscar Klockars — Engineering Leader",
    description: DESCRIPTION,
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
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
