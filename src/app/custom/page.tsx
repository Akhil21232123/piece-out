import type { Metadata } from "next";
import { CustomPage } from "@/components/landing/CustomPage";
import { CUSTOM_PUZZLE } from "@/lib/brand";

export const metadata: Metadata = {
  title: "customised: your photo in a can",
  description: `Turn your photo into a 150-piece ${CUSTOM_PUZZLE.size} puzzle in a can, frame included. ₹${CUSTOM_PUZZLE.price}.`,
  alternates: { canonical: "/custom" },
};

export default function Custom() {
  return <CustomPage />;
}
