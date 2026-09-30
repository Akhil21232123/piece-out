import type { ReactNode } from "react";
import type { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#8A56B8",
};

export default function HowLayout({ children }: { children: ReactNode }) {
  return children;
}
