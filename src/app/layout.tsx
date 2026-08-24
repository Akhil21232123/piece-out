import type { Metadata, Viewport } from "next";
import { Caveat, Outfit } from "next/font/google";
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
  title: "piece/out — puzzles you can pop open",
  description: "Puzzles you can pop open. One hour off the algorithm. ₹500 / ₹600 framed.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#efe8dc",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#efe8dc] text-[#171411]">{children}</body>
    </html>
  );
}
