import type { Metadata } from "next";
import { ThankYouPage } from "@/components/landing/ThankYouPage";

export const metadata: Metadata = {
  title: "thank you",
  robots: { index: false, follow: false },
};

export default async function ThankYou({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = (await searchParams).order;
  const order = (Array.isArray(raw) ? raw[0] : raw)?.trim().toUpperCase() ?? "";
  return <ThankYouPage orderId={/^PO-[A-Z0-9]{4,12}$/.test(order) ? order : ""} />;
}
