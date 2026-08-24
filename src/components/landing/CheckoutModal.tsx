"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import confetti from "canvas-confetti";
import { BRAND, formatInr } from "@/lib/brand";
import { launchUpi, upiAppHrefs } from "@/lib/checkout";
import { cartTotal, useCartStore } from "@/store/cartStore";

const COLORS = ["#f5c400", "#e31b23", "#efe8dc", "#171411"];

function fireConfetti() {
  confetti({ particleCount: 42, spread: 64, origin: { y: 0.7 }, colors: COLORS });
}

export function CheckoutModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && <CheckoutDialog onClose={onClose} />}
    </AnimatePresence>
  );
}

function CheckoutDialog({ onClose }: { onClose: () => void }) {
  const lines = useCartStore((state) => state.lines);
  const inc = useCartStore((state) => state.inc);
  const dec = useCartStore((state) => state.dec);
  const clear = useCartStore((state) => state.clear);
  const total = cartTotal(lines);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [utr, setUtr] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [paid, setPaid] = useState(0);
  const [copied, setCopied] = useState(false);
  const hrefs = useMemo(() => upiAppHrefs(total), [total]);
  const upiUri = hrefs.any;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    if (!done && lines.length === 0) onClose();
  }, [done, lines.length, onClose]);

  const confirm = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setError("Name, phone, and full address are required.");
      return;
    }
    if (!/^\d{10}$/.test(phone.replace(/\s/g, ""))) {
      setError("Enter a 10-digit phone number.");
      return;
    }
    if (!/^\d{12}$/.test(utr.trim())) {
      setError("Enter the 12-digit UPI UTR number.");
      return;
    }
    setError("");
    fireConfetti();
    setPaid(total);
    setDone(true);
    clear();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#171411]/50 p-0 md:items-center md:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close checkout"
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 24, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[1.6rem] border border-[#171411]/10 bg-[#fffaf3] p-6 shadow-2xl md:rounded-[1.6rem] md:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e31b23]">checkout</p>
            <h2 id="checkout-title" className="mt-1 text-2xl font-extrabold tracking-tight text-[#171411]">
              {done ? "order locked in." : "your drop"}
            </h2>
            {!done && (
              <p className="text-sm text-[#7a7268]">
                {lines.length} {lines.length === 1 ? "style" : "styles"} · {formatInr(total)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#7a7268] transition hover:text-[#171411]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {done ? (
          <div className="mt-8 text-center">
            <p className="font-hand text-3xl text-[#9b2242]">we got you.</p>
            <p className="mt-3 text-sm leading-relaxed text-[#7a7268]">
              packing the cans. {formatInr(paid)} matched to {BRAND.vpa}.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-8 rounded-full bg-[#f5c400] px-6 py-3.5 text-sm font-extrabold text-[#171411]"
            >
              Back to the drop
            </button>
          </div>
        ) : (
          <form className="mt-6 flex flex-col gap-3" onSubmit={confirm}>
            <ul className="space-y-3 rounded-[1.1rem] border border-[#171411]/10 bg-[#efe8dc] p-3">
              {lines.map((line) => (
                <li key={line.id} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Image
                      src={line.image}
                      alt=""
                      width={56}
                      height={56}
                      className="h-14 w-14 rounded-xl object-cover"
                    />
                    <div>
                      <p className="text-sm font-extrabold text-[#171411]">{line.name}</p>
                      <p className="text-xs text-[#7a7268]">
                        {line.withFrame ? "with frame" : "no frame"} · {formatInr(line.unitPrice)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => dec(line.id)}
                      className="h-7 w-7 rounded-full bg-[#171411] text-sm font-extrabold text-white"
                      aria-label={`Remove one ${line.name}`}
                    >
                      −
                    </button>
                    <span className="w-4 text-center text-sm font-extrabold">{line.qty}</span>
                    <button
                      type="button"
                      onClick={() => inc(line.id)}
                      className="h-7 w-7 rounded-full bg-[#171411] text-sm font-extrabold text-white"
                      aria-label={`Add one ${line.name}`}
                    >
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <input
              required
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="checkout-input"
              autoComplete="name"
            />
            <input
              required
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="checkout-input"
              inputMode="numeric"
              autoComplete="tel"
            />
            <textarea
              required
              placeholder="Full Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="checkout-input min-h-24"
              autoComplete="street-address"
            />

            <div className="mt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => launchUpi(total)}
                className="flex w-full items-center justify-center rounded-full bg-[#171411] px-6 py-3.5 text-sm font-extrabold text-[#fffaf3] transition hover:bg-[#e31b23]"
              >
                Pay via UPI App · {formatInr(total)}
              </button>
              <div className="grid grid-cols-3 gap-2">
                <a
                  href={hrefs.gpay}
                  className="rounded-full bg-[#efe8dc] px-2 py-2 text-center text-[11px] font-extrabold text-[#171411]"
                >
                  GPay
                </a>
                <a
                  href={hrefs.phonepe}
                  className="rounded-full bg-[#efe8dc] px-2 py-2 text-center text-[11px] font-extrabold text-[#171411]"
                >
                  PhonePe
                </a>
                <a
                  href={hrefs.paytm}
                  className="rounded-full bg-[#efe8dc] px-2 py-2 text-center text-[11px] font-extrabold text-[#171411]"
                >
                  Paytm
                </a>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(BRAND.vpa);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1600);
                } catch {
                  setCopied(false);
                }
              }}
              className="text-center text-[11px] font-semibold text-[#7a7268] underline decoration-[#171411]/20"
            >
              {copied ? "UPI ID copied" : `copy ${BRAND.vpa}`}
            </button>
            <p className="text-center text-[11px] text-[#7a7268]">
              pays {BRAND.vpa} · {formatInr(total)} INR
            </p>

            <div className="mx-auto mt-2 rounded-2xl bg-white p-3">
              <QRCodeSVG
                value={upiUri}
                size={180}
                bgColor="#ffffff"
                fgColor="#171411"
                marginSize={1}
                title={`UPI QR for ${BRAND.vpa}`}
              />
            </div>
            <p className="text-center text-[11px] text-[#7a7268]">desktop? scan the same UPI link.</p>

            <input
              placeholder="12-digit UPI UTR number"
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              className="checkout-input mt-1"
              inputMode="numeric"
              maxLength={12}
            />
            {error && <p className="text-sm text-[#e31b23]">{error}</p>}
            <button
              type="submit"
              className="rounded-full bg-[#f5c400] px-6 py-3.5 text-sm font-extrabold text-[#171411] transition hover:bg-[#e31b23] hover:text-white"
            >
              Confirm Order
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
