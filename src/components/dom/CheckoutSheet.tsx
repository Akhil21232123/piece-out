"use client";

import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { useShopStore } from "@/store/shopStore";
import { useScrollStore } from "@/store/scrollStore";
import { getPuzzle } from "@/data/puzzles";
import { BRAND, formatInr, priceFor } from "@/lib/brand";
import { buildUpiUri, upiAppLinks, whatsappOrderUrl } from "@/lib/upi";
import { FrameToggle } from "./FrameToggle";
import { getLenis } from "@/hooks/useLenisScroll";

interface Details {
  name: string;
  phone: string;
  email: string;
  address: string;
  pincode: string;
  utr: string;
}

const empty: Details = {
  name: "",
  phone: "",
  email: "",
  address: "",
  pincode: "",
  utr: "",
};

export function CheckoutSheet() {
  const open = useShopStore((s) => s.checkoutOpen);
  const step = useShopStore((s) => s.checkoutStep);
  const orderId = useShopStore((s) => s.orderId);
  const close = useShopStore((s) => s.closeCheckout);
  const goToPay = useShopStore((s) => s.goToPay);
  const withFrame = useShopStore((s) => s.withFrame);
  const chapterIndex = useScrollStore((s) => s.chapterIndex);
  const puzzle = getPuzzle(chapterIndex);
  const amount = priceFor(withFrame);
  const [details, setDetails] = useState<Details>(empty);
  const [qr, setQr] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const upiUri = useMemo(
    () => (orderId ? buildUpiUri(amount, orderId) : ""),
    [amount, orderId],
  );
  const apps = useMemo(
    () => (orderId ? upiAppLinks(amount, orderId) : null),
    [amount, orderId],
  );

  useEffect(() => {
    const lenis = getLenis();
    if (open) lenis?.stop();
    else lenis?.start();
    return () => {
      lenis?.start();
    };
  }, [open]);

  useEffect(() => {
    if (!open || step !== "pay" || !upiUri) return;
    let cancelled = false;
    import("qrcode").then((mod) => {
      const QR = (mod.default ?? mod) as typeof import("qrcode");
      return QR.toDataURL(upiUri, {
        width: 320,
        margin: 1,
        color: { dark: "#111111", light: "#FFF5F8" },
      }).then((url: string) => {
        if (!cancelled) setQr(url);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [open, step, upiUri]);

  if (!open) return null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!details.name.trim() || !details.phone.trim() || !details.address.trim()) {
      setError("Name, phone, and address are required.");
      return;
    }
    if (!/^\d{10}$/.test(details.phone.replace(/\s/g, ""))) {
      setError("Enter a 10-digit phone number.");
      return;
    }
    if (!/^\d{6}$/.test(details.pincode)) {
      setError("Enter a 6-digit pin code.");
      return;
    }
    setError("");
    goToPay();
  };

  const field =
    (key: keyof Details) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDetails((d) => ({ ...d, [key]: e.target.value }));

  const waMessage = [
    `piece/out order ${orderId ?? ""}`,
    `${puzzle.name} ${puzzle.subtitle}`,
    withFrame ? "With frame · ₹600" : "No frame · ₹500",
    details.name,
    details.phone,
    details.email,
    details.address,
    details.pincode,
    details.utr ? `UTR ${details.utr}` : "UTR pending",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#2a1218]/50 p-0 md:items-center md:p-6"
      data-lenis-prevent
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close checkout"
        onClick={close}
      />
      <div className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#111111]/10 bg-[#FFF5F8] p-6 text-[#111111] shadow-2xl md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#E31B23]">
              Checkout
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold">
              {puzzle.name}
            </h2>
            <p className="text-sm text-[#6d4e57]">{puzzle.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="text-[#8a6a72] transition hover:text-[#111111]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4">
          <FrameToggle />
        </div>

        {step === "details" && (
          <form className="mt-6 flex flex-col gap-3" onSubmit={onSubmit}>
            <input
              required
              placeholder="Full name"
              value={details.name}
              onChange={field("name")}
              className="checkout-input"
              autoComplete="name"
            />
            <input
              required
              placeholder="Phone"
              value={details.phone}
              onChange={field("phone")}
              className="checkout-input"
              inputMode="numeric"
              autoComplete="tel"
            />
            <input
              placeholder="Email (optional)"
              value={details.email}
              onChange={field("email")}
              className="checkout-input"
              type="email"
              autoComplete="email"
            />
            <textarea
              required
              placeholder="Shipping address"
              value={details.address}
              onChange={field("address")}
              className="checkout-input min-h-24"
              autoComplete="street-address"
            />
            <input
              required
              placeholder="PIN code"
              value={details.pincode}
              onChange={field("pincode")}
              className="checkout-input"
              inputMode="numeric"
              autoComplete="postal-code"
            />
            {error && <p className="text-sm text-[#c23b22]">{error}</p>}
            <button
              type="submit"
              className="mt-2 rounded-full bg-[#111111] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#E31B23]"
            >
              Pay {formatInr(amount)} via UPI
            </button>
          </form>
        )}

        {step === "pay" && orderId && apps && (
          <div className="mt-6">
            <p className="text-sm text-[#6d4e57]">
              Order <span className="text-[#111111]">{orderId}</span> · {formatInr(amount)} to{" "}
              <span className="text-[#111111]">{BRAND.vpa}</span>
            </p>

            {qr && (
              <img
                src={qr}
                alt={`UPI QR for ${BRAND.vpa} amount ${amount}`}
                className="mx-auto mt-5 h-52 w-52 bg-[#fff5f8] p-2"
              />
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <a href={apps.generic} className="pay-chip">
                Pay UPI
              </a>
              <a href={apps.gpay} className="pay-chip">
                GPay
              </a>
              <a href={apps.phonepe} className="pay-chip">
                PhonePe
              </a>
              <a href={apps.paytm} className="pay-chip">
                Paytm
              </a>
              <button
                type="button"
                className="pay-chip"
                onClick={async () => {
                  await navigator.clipboard.writeText(BRAND.vpa);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? "Copied" : "Copy VPA"}
              </button>
            </div>

            <input
              placeholder="UTR / UPI ref (optional)"
              value={details.utr}
              onChange={field("utr")}
              className="checkout-input mt-4"
            />

            <a
              href={whatsappOrderUrl(waMessage)}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex w-full items-center justify-center rounded-full bg-[#111111] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#E31B23]"
            >
              Paid? Send order on WhatsApp
            </a>
            <p className="mt-3 text-center text-[12px] leading-relaxed text-[#8a6a72]">
              UPI opens GPay / PhonePe / Paytm and pays {BRAND.vpa}. We match the amount and
              WhatsApp the shipping details. Personal UPI cannot auto-confirm.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
