import type { Metadata } from "next";
import { PlayPage } from "@/components/landing/PlayPage";
import { PUZZLE_REWARD } from "@/lib/brand";

export const metadata: Metadata = {
  title: "solve the can",
  description: `Finish the piece/out Diet Coke puzzle and get ${PUZZLE_REWARD.percent}% off your order.`,
  alternates: { canonical: "/play" },
};

export default function Play() {
  return <PlayPage />;
}
