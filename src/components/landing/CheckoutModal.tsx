"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import confetti from "canvas-confetti";
import { BRAND, formatInr } from "@/lib/brand";
import { buildUpiPayUri, openUpiApp, type UpiApp } from "@/lib/checkout";
import { cartTotal, useCartStore } from "@/store/cartStore";

const COLORS = ["#f5c400", "#e31b23", "#efe8dc", "#171411"];

type PayState = "form" | "paying" | "paid" | "failed";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
    };
  }
}

function fireConfetti() {
  confetti({ particleCount: 42, spread: 64, origin: { y: 0.7 }, colors: COLORS });
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load Razorpay")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay"));
    document.body.appendChild(script);
  });
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
  const [error, setError] = useState("");
  const [state, setState] = useState<PayState>("form");
  const [orderId, setOrderId] = useState("");
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState(0);
  const [copied, setCopied] = useState(false);
  const [failReason, setFailReason] = useState("");
  const [razorpay, setRazorpay] = useState(false);
  const [keyId, setKeyId] = useState("");
  const [rzpOrder, setRzpOrder] = useState("");
  const upiUri = useMemo(() => buildUpiPayUri(total, orderId || "piece out puzzle"), [total, orderId]);

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
    fetch("/api/checkout/config")
      .then((res) => res.json())
      .then((data: { razorpay?: boolean; keyId?: string }) => {
        setRazorpay(Boolean(data.razorpay));
        setKeyId(data.keyId ?? "");
      })
      .catch(() => {
        setRazorpay(false);
      });
  }, []);

  useEffect(() => {
    if (!orderId || state === "paid" || state === "failed") return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
        const data = (await res.json()) as { status?: string; failureReason?: string };
        if (cancelled) return;
        if (data.status === "paid") {
          fireConfetti();
          setPaid(total);
          setState("paid");
          clear();
        } else if (data.status === "failed") {
          setFailReason(data.failureReason || "Payment failed");
          setState("failed");
        }
      } catch {
        /* keep waiting */
      }
    };
    const id = window.setInterval(tick, 2000);
    const onVis = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVis);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [clear, orderId, state, total]);

  useEffect(() => {
    if (state !== "paid" && state !== "failed" && lines.length === 0 && !orderId) onClose();
  }, [lines.length, onClose, orderId, state]);

  const markPaid = () => {
    fireConfetti();
    setPaid(total);
    setState("paid");
    clear();
  };

  const createOrder = async () => {
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setError("Name, phone, and full address are required.");
      return null;
    }
    if (!/^\d{10}$/.test(phone.replace(/\s/g, ""))) {
      setError("Enter a 10-digit phone number.");
      return null;
    }
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.replace(/\s/g, ""),
          address: address.trim(),
          items: lines.map((line) => ({
            productId: line.productId,
            withFrame: line.withFrame,
            qty: line.qty,
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        razorpay?: boolean;
        razorpayOrderId?: string;
        error?: string;
      };
      if (!res.ok || !data.id) {
        setError(data.error ?? "Could not start payment. Try again.");
        return null;
      }
      setOrderId(data.id);
      setRzpOrder(data.razorpayOrderId ?? "");
      setState("paying");
      return data;
    } catch {
      setError("Could not start payment. Try again.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const payWithRazorpay = async (e: FormEvent) => {
    e.preventDefault();
    const created = orderId
      ? { id: orderId, razorpay, razorpayOrderId: rzpOrder }
      : await createOrder();
    if (!created) return;
    if (!razorpay || !keyId || !created.razorpayOrderId) {
      setError("Payment sheet is not ready. Use GPay or PhonePe.");
      return;
    }

    try {
      await loadRazorpay();
    } catch {
      setError("Could not open the payment sheet. Use GPay or PhonePe below.");
      return;
    }

    const checkout = new window.Razorpay!({
      key: keyId,
      amount: total * 100,
      currency: "INR",
      name: "piece/out",
      description: created.id,
      order_id: created.razorpayOrderId,
      prefill: { name: name.trim(), contact: phone.replace(/\s/g, "") },
      theme: { color: "#e31b23" },
      method: { netbanking: true, card: true, upi: true, wallet: false },
      remember_customer: false,
      handler: async (response: {
        razorpay_order_id?: string;
        razorpay_payment_id?: string;
        razorpay_signature?: string;
      }) => {
        const res = await fetch("/api/checkout/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(response),
        });
        if (res.ok) markPaid();
        else {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setFailReason(data.error ?? "Payment failed");
          setState("failed");
        }
      },
      modal: {
        ondismiss: () => {
          if (state !== "paid") setState("paying");
        },
      },
    });
    checkout.on("payment.failed", (response) => {
      const reason = response.error?.description || "Payment failed";
      setFailReason(reason);
      setState("failed");
      void fetch("/api/checkout/fail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: created.id, reason }),
      });
    });
    checkout.open();
  };

  const payWithApp = async (app: UpiApp) => {
    const created = orderId ? { id: orderId } : await createOrder();
    if (!created?.id) return;
    openUpiApp(app, total, created.id);
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
              {state === "paid" ? "order locked in." : state === "failed" ? "payment failed." : "your drop"}
            </h2>
            {state !== "paid" && state !== "failed" && (
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

        {state === "paid" ? (
          <div className="mt-8 text-center">
            <p className="font-hand text-3xl text-[#9b2242]">we got you.</p>
            <p className="mt-3 font-extrabold tracking-tight text-[#171411]">{orderId}</p>
            <p className="mt-3 text-sm leading-relaxed text-[#7a7268]">
              payment confirmed. packing the cans. {formatInr(paid)} · keep this order id.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-8 rounded-full bg-[#f5c400] px-6 py-3.5 text-sm font-extrabold text-[#171411]"
            >
              Back to the drop
            </button>
          </div>
        ) : state === "failed" ? (
          <div className="mt-8 text-center">
            <p className="text-sm leading-relaxed text-[#7a7268]">
              {failReason || "Payment failed"}. No order is locked. Try GPay or PhonePe again.
            </p>
            <button
              type="button"
              onClick={() => {
                setState(orderId ? "paying" : "form");
                setFailReason("");
                setError("");
              }}
              className="mt-8 rounded-full bg-[#171411] px-6 py-3.5 text-sm font-extrabold text-[#fffaf3]"
            >
              Try again
            </button>
          </div>
        ) : (
          <form
            className="mt-6 flex flex-col gap-3"
            onSubmit={(e) => {
              if (razorpay) {
                void payWithRazorpay(e);
                return;
              }
              e.preventDefault();
              void payWithApp("gpay");
            }}
          >
            <ul className="space-y-3 rounded-[1.1rem] border border-[#171411]/10 bg-[#efe8dc] p-3">
              {lines.map((line) => (
                <li key={line.id} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Image
                      src={line.image}
                      alt=""
                      width={56}
                      height={56}
                      loading="eager"
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

            {razorpay ? (
              <button
                type="submit"
                disabled={busy}
                className="mt-2 flex w-full items-center justify-center rounded-full bg-[#171411] px-6 py-3.5 text-sm font-extrabold text-[#fffaf3] transition hover:bg-[#e31b23] disabled:opacity-60"
              >
                {busy ? "Opening pay…" : `Pay ${formatInr(total)} with GPay / PhonePe`}
              </button>
            ) : (
              <>
                <p className="mt-1 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a7268]">
                  pay with
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => payWithApp("gpay")} className="rounded-full bg-[#efe8dc] px-2 py-3 text-sm font-extrabold text-[#171411]">
                    GPay
                  </button>
                  <button type="button" onClick={() => payWithApp("phonepe")} className="rounded-full bg-[#efe8dc] px-2 py-3 text-sm font-extrabold text-[#171411]">
                    PhonePe
                  </button>
                  <button type="button" onClick={() => payWithApp("paytm")} className="rounded-full bg-[#efe8dc] px-2 py-3 text-sm font-extrabold text-[#171411]">
                    Paytm
                  </button>
                  <button type="button" onClick={() => payWithApp("bhim")} className="rounded-full bg-[#efe8dc] px-2 py-3 text-sm font-extrabold text-[#171411]">
                    BHIM
                  </button>
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
                  {copied ? "UPI ID copied" : `or copy ${BRAND.vpa}`}
                </button>
                <p className="text-center text-[11px] text-[#7a7268]">
                  {formatInr(total)} to {BRAND.vpa} · GPay, PhonePe, Paytm or BHIM
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
                <p className="text-center text-[11px] text-[#7a7268]">
                  {state === "paying"
                    ? "finish in GPay or PhonePe. this page updates when the payment is confirmed."
                    : "desktop? scan with GPay or PhonePe."}
                </p>
              </>
            )}
            {error && <p className="text-sm text-[#e31b23]">{error}</p>}
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
