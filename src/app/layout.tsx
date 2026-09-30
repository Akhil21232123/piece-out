import type { Metadata, Viewport } from "next";
import { Caveat, Outfit } from "next/font/google";
import { InsightsBeacon } from "@/components/analytics/InsightsBeacon";
import { MetaPixel } from "@/components/analytics/MetaPixel";
import { JsonLd } from "@/components/seo/JsonLd";
import { DESCRIPTION, KEYWORDS, SITE, TITLE } from "@/lib/seo";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: TITLE,
    template: "%s | pieceout",
  },
  description: DESCRIPTION,
  applicationName: "pieceout",
  authors: [{ name: "pieceout", url: SITE.url }],
  creator: "pieceout",
  publisher: "piece/out",
  category: "shopping",
  keywords: [...KEYWORDS],
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
    languages: {
      "en-IN": "/",
      "en": "/",
    },
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/brand/mark.jpg", type: "image/jpeg", sizes: "576x576" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/brand/mark.jpg", sizes: "576x576", type: "image/jpeg" }],
    shortcut: "/brand/mark.jpg",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    url: SITE.url,
    siteName: "pieceout",
    locale: SITE.locale,
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: SITE.mark,
        width: 576,
        height: 576,
        alt: "pieceout — premium collection puzzles",
      },
      {
        url: SITE.poster,
        width: 576,
        height: 1024,
        alt: "pieceout brand poster",
      },
      {
        url: SITE.hero,
        width: 1024,
        height: 990,
        alt: "pieceout f1 speed collection puzzle in a can",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [SITE.hero],
  },
  other: {
    "og:brand": "pieceout",
    "product:price:amount": String(BRAND.priceBare),
    "product:price:currency": "INR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#efe8dc",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      className={`${outfit.variable} ${caveat.variable} antialiased`}
    >
      <body className="bg-[#efe8dc] text-[#171411]">
        <JsonLd />
        <MetaPixel />
        <InsightsBeacon />
        {children}
      </body>
    </html>
  );
}
