"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { COLOR, formatInr, parcelWeightG, payableOf, SHIPPING } from "@/lib/brand";
import { isEmail, normalizePhone } from "@/lib/checkout";
import { addressLooksComplete, isPincode, normalizePincode } from "@/lib/pincode";
import {
  loadRazorpay,
  openRazorpayCheckout,
  upiOnlyConfig,
  type PayVia,
  type RazorpaySuccess,
} from "@/lib/loadRazorpay";
import { cartSubtotal, useCartStore } from "@/store/cartStore";

const COLORS = ["#f5c400", "#e31b23", COLOR.purple, "#171411"];

type PayState = "form" | "waiting" | "placed";

const PAY_APPS: { id: PayVia; label: string; className: string }[] = [
  { id: "gpay", label: "Google Pay", className: "bg-[#1f1f1f] text-white" },
  { id: "phonepe", label: "PhonePe", className: "bg-[#5f259f] text-white" },
  { id: "paytm", label: "Paytm", className: "bg-[#00b9f1] text-[#171411]" },
  { id: "bhim", label: "BHIM / UPI", className: "border border-[#171411]/16 bg-[#fffaf3] text-[#171411]" },
];

function fireConfetti() {
  confetti({ particleCount: 42, spread: 64, origin: { y: 0.7 }, colors: COLORS });
}

function appLabel(via: PayVia) {
  if (via === "gpay") return "Google Pay";
  if (via === "phonepe") return "PhonePe";
  if (via === "paytm") return "Paytm";
  if (via === "bhim") return "your UPI app";
  return "Razorpay";
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
  const subtotal = cartSubtotal(lines);
  const weight = parcelWeightG(lines);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [pinCity, setPinCity] = useState("");
  const [pinState, setPinState] = useState("");
  const [pinLocality, setPinLocality] = useState("");
  const [pinOk, setPinOk] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);
  const [pinNote, setPinNote] = useState("");
  const [delivery, setDelivery] = useState(0);
  const [error, setError] = useState("");
  const [state, setState] = useState<PayState>("form");
  const [orderId, setOrderId] = useState("");
  const [busy, setBusy] = useState(false);
  const [placedTotal, setPlacedTotal] = useState(0);
  const [payReady, setPayReady] = useState(true);
  const [waitApp, setWaitApp] = useState<PayVia>("gpay");
  const watchRef = useRef<(() => void) | null>(null);

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
      watchRef.current?.();
    };
  }, [onClose]);

  useEffect(() => {
    let live = true;
    fetch("/api/checkout/config")
      .then((res) => res.json())
      .then((data: { razorpay?: boolean }) => {
        if (live) setPayReady(Boolean(data.razorpay));
      })
      .catch(() => {
        if (live) setPayReady(false);
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (state === "placed" || state === "waiting" || busy || orderId) return;
    if (lines.length === 0) onClose();
  }, [busy, lines.length, onClose, orderId, state]);

  useEffect(() => {
    const pin = normalizePincode(pincode);
    if (!isPincode(pin)) {
      setPinOk(false);
      setPinCity("");
      setPinState("");
      setPinLocality("");
      setDelivery(0);
      setPinNote(pin.length === 6 ? "Enter a valid 6-digit pincode." : "");
      setPinBusy(false);
      return;
    }
    let live = true;
    setPinBusy(true);
    const timer = window.setTimeout(() => {
      fetch(`/api/pincode?pin=${pin}&weight=${weight}`, { cache: "no-store" })
        .then((res) => res.json())
        .then((data: {
          ok?: boolean;
          city?: string;
          state?: string;
          locality?: string;
          serviceable?: boolean;
          delivery?: number;
          error?: string;
        }) => {
          if (!live) return;
          const good = Boolean(data.ok && data.city && data.state);
          const fee = Number(data.delivery);
          setPinOk(good);
          setPinCity(data.city ?? "");
          setPinState(data.state ?? "");
          setPinLocality(data.locality ?? "");
          setDelivery(good && Number.isFinite(fee) && fee > 0 ? Math.round(fee) : 0);
          setPinNote(good ? "" : data.error || "This pincode is not valid.");
        })
        .catch(() => {
          if (!live) return;
          setPinOk(false);
          setDelivery(0);
          setPinNote("Could not check this pincode. Try again.");
        })
        .finally(() => {
          if (live) setPinBusy(false);
        });
    }, 280);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [pincode, weight]);

  const due = payableOf(subtotal, pinOk ? delivery : 0);

  const markPaid = (id: string, amount: number) => {
    watchRef.current?.();
    watchRef.current = null;
    setOrderId(id);
    setPlacedTotal(amount);
    fireConfetti();
    setState("placed");
    window.dispatchEvent(new Event("po-bought"));
    clear();
  };

  const verifyPayment = async (payload: RazorpaySuccess, shopId: string, amount: number) => {
    const res = await fetch("/api/checkout/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      throw new Error(data.error ?? "Payment could not be verified.");
    }
    markPaid(shopId, amount);
  };

  const watchOrder = (shopId: string, amount: number) => {
    watchRef.current?.();
    let stopped = false;
    const apply = (status: string, failureReason?: string) => {
      if (stopped) return;
      if (status === "paid") markPaid(shopId, amount);
      else if (status === "failed") {
        setError(failureReason || "Payment failed. Try another method.");
        setState("form");
      }
    };
    const poll = async () => {
      const res = await fetch(`/api/orders/${shopId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { status?: string; failureReason?: string };
      if (data.status) apply(data.status, data.failureReason);
    };
    const es = new EventSource(`/api/orders/${shopId}/live`);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { status?: string; failureReason?: string };
        if (data.status) apply(data.status, data.failureReason);
      } catch {
        /* ignore bad frames */
      }
    };
    const tick = window.setInterval(() => void poll(), 2000);
    void poll();
    watchRef.current = () => {
      stopped = true;
      es.close();
      window.clearInterval(tick);
    };
  };

  const startPay = async (via: PayVia) => {
    const contact = normalizePhone(phone);
    const pin = normalizePincode(pincode);
    if (!name.trim() || !email.trim() || !contact || !address.trim() || !pin) {
      setError("Name, email, phone, full address, and 6-digit pincode are required.");
      return;
    }
    if (!isEmail(email.trim().toLowerCase())) {
      setError("Enter a valid email.");
      return;
    }
    if (!/^\d{10}$/.test(contact)) {
      setError("Enter a 10-digit phone number.");
      return;
    }
    if (!isPincode(pin)) {
      setError("Enter a valid 6-digit pincode.");
      return;
    }
    if (pinBusy) {
      setError("Wait for the live pincode check.");
      return;
    }
    if (!pinOk || !pinCity || !pinState) {
      setError(pinNote || "Enter a valid pincode we can ship to.");
      return;
    }
    if (!addressLooksComplete(address)) {
      setError("Add house / flat number, street, and area so the courier can find you.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: contact,
          address: address.trim(),
          pincode: pin,
          items: lines.map((line) => ({
            productId: line.productId,
            withFrame: line.withFrame,
            qty: line.qty,
            merchandiseId: line.merchandiseId,
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
        keyId?: string;
        razorpayOrderId?: string;
        amount?: number;
        currency?: string;
        total?: number;
        name?: string;
        email?: string;
        phone?: string;
      };
      if (!res.ok || !data.id || !data.razorpayOrderId || !data.keyId) {
        setError(data.error ?? "Could not start payment. Try again.");
        return;
      }
      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) {
        setError("Could not open Razorpay. Check your connection and try again.");
        return;
      }
      const shopId = data.id;
      const amount = data.total ?? due.total;
      setOrderId(shopId);
      const upi = via !== "card";
      openRazorpayCheckout({
        via,
        onFail: (message) => {
          setError(message);
          setState("form");
        },
        options: {
          key: data.keyId,
          amount: data.amount ?? amount * 100,
          currency: data.currency ?? "INR",
          name: "pieceout",
          image: "/brand/mark.jpg",
          description: `order ${shopId}`,
          order_id: data.razorpayOrderId,
          prefill: {
            name: data.name ?? name.trim(),
            email: data.email ?? email.trim(),
            contact: data.phone ?? contact,
            method: upi ? "upi" : undefined,
          },
          notes: { shop_order_id: shopId },
          theme: { color: COLOR.purple },
          config: upi ? upiOnlyConfig() : undefined,
          modal: {
            ondismiss: () => {
              if (upi) {
                setWaitApp(via);
                setState("waiting");
                watchOrder(shopId, amount);
              }
            },
          },
          handler: (response) => {
            void verifyPayment(response, shopId, amount).catch((err: unknown) => {
              setError(err instanceof Error ? err.message : "Payment could not be verified.");
              setState("form");
            });
          },
        },
      });
      if (upi) {
        setWaitApp(via);
        setState("waiting");
        watchOrder(shopId, amount);
      }
    } catch {
      setError("Could not start payment. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const canPay = payReady && !busy && Boolean(name.trim()) && Boolean(address.trim()) && pincode.length === 6;

  const payHint = !payReady
    ? "Razorpay is not on the server yet."
    : pinBusy
      ? "Checking this pincode…"
      : pincode.length === 6 && !pinOk && pinNote
        ? pinNote
        : address.trim() && !addressLooksComplete(address)
          ? "Add house / flat, street, and area so the courier can find you."
          : "";

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void startPay("card");
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#171411]/50 p-0 md:items-center md:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 24, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        onClick={(event) => event.stopPropagation()}
        className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[1.6rem] border border-[#171411]/10 bg-[#fffaf3] p-6 shadow-2xl md:rounded-[1.6rem] md:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e31b23]">checkout</p>
            <h2 id="checkout-title" className="mt-1 text-2xl font-extrabold tracking-tight text-[#171411]">
              {state === "placed" ? "paid. packing." : state === "waiting" ? "complete payment" : "your bag"}
            </h2>
            {state === "form" && (
              <p className="text-sm text-[#7a7268]">
                {lines.length} {lines.length === 1 ? "style" : "styles"} · {formatInr(subtotal)}
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

        {state === "placed" ? (
          <div className="mt-8 text-center">
            <p className="font-hand text-3xl text-[#9b2242]">we got you.</p>
            <p className="mt-3 font-extrabold tracking-tight text-[#171411]">{orderId}</p>
            <p className="mt-3 text-sm leading-relaxed text-[#7a7268]">
              Razorpay confirmed {formatInr(placedTotal)}. We pack and ship in {SHIPPING.days}. keep this
              order id.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-8 rounded-full bg-[#f5c400] px-6 py-3.5 text-sm font-extrabold text-[#171411]"
            >
              Shop products
            </button>
          </div>
        ) : state === "waiting" ? (
          <div className="mt-8 text-center">
            <p className="mx-auto h-2.5 w-2.5 rounded-full bg-[#8A56B8] pay-live-dot" />
            <p className="mt-4 text-lg font-extrabold text-[#171411]">
              Finish in {appLabel(waitApp)}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#7a7268]">
              On phone this opens the app. On laptop it shows a UPI QR — scan with {appLabel(waitApp)}.
              This page updates the moment Razorpay confirms.
            </p>
            <p className="mt-4 text-sm font-extrabold tracking-tight text-[#171411]">{orderId}</p>
            {error && <p className="mt-3 text-sm text-[#e31b23]">{error}</p>}
            <button
              type="button"
              onClick={() => {
                watchRef.current?.();
                watchRef.current = null;
                setState("form");
              }}
              className="mt-8 rounded-full border border-[#171411]/16 px-6 py-3 text-sm font-extrabold text-[#171411]"
            >
              Try another method
            </button>
          </div>
        ) : (
          <form className="mt-6 flex flex-col gap-3" onSubmit={onSubmit}>
            <ul className="space-y-3 rounded-[1.1rem] border border-[#171411]/10 bg-[#efe8dc] p-3">
              {lines.map((line) => (
                <li key={line.id} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Image
                      src={line.image}
                      alt=""
                      width={112}
                      height={112}
                      quality={100}
                      sizes="56px"
                      loading="eager"
                      className="h-14 w-14 rounded-xl object-cover"
                    />
                    <div>
                      <p className="text-sm font-extrabold text-[#171411]">{line.name}</p>
                      <p className="text-xs text-[#7a7268]">
                        {line.line} · {line.withFrame ? "with frame" : "without frame"} · {formatInr(line.unitPrice)}
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
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="checkout-input"
              autoComplete="email"
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
            <div className="rounded-[1.1rem] border border-[#171411]/10 bg-[#efe8dc] p-3">
              <label className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#7a7268]" htmlFor="checkout-pin">
                Pincode
              </label>
              <input
                id="checkout-pin"
                required
                placeholder="6-digit pincode"
                value={pincode}
                onChange={(e) => setPincode(normalizePincode(e.target.value))}
                className="checkout-input mt-2"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
              />
              <p
                className={`mt-2 min-h-5 text-sm font-extrabold ${
                  pinOk ? "text-[#15803d]" : pinNote ? "text-[#e31b23]" : "text-[#7a7268]"
                }`}
              >
                {pinBusy
                  ? "Checking live…"
                  : pinOk
                    ? `${pinLocality ? `${pinLocality} · ` : ""}${pinCity}, ${pinState}`
                    : pinNote || "Type your pincode. We pull city and state live."}
              </p>
            </div>
            <textarea
              required
              placeholder="House / flat, street, area"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="checkout-input min-h-24"
              autoComplete="street-address"
            />
            {pinOk && addressLooksComplete(address) ? (
              <p className="rounded-[1rem] bg-[#efe8dc] px-3 py-2 text-sm text-[#5e574e]">
                Ships to {address.trim()}, {pinCity}, {pinState} {pincode}
              </p>
            ) : null}

            <dl className="rounded-[1.1rem] border border-[#171411]/10 bg-[#fffaf3] px-4 py-3 text-sm">
              <div className="flex justify-between text-[#7a7268]">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatInr(due.subtotal)}</dd>
              </div>
              <div className="mt-1 flex justify-between text-[#7a7268]">
                <dt>Delivery</dt>
                <dd className="tabular-nums">
                  {pinBusy ? "…" : pinOk && due.shipping > 0 ? formatInr(due.shipping) : "Add pincode"}
                </dd>
              </div>
              <div className="mt-2 flex justify-between font-extrabold text-[#171411]">
                <dt>Pay</dt>
                <dd className="tabular-nums">{formatInr(due.total)}</dd>
              </div>
              <p className="mt-2 text-xs text-[#7a7268]">
                Delivery is Delhivery’s rate for your pin. Collected here, paid to Delhivery when we book. Ships in {SHIPPING.days}.
              </p>
            </dl>

            <p className="mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a7268]">
              pay with Razorpay · opens GPay, PhonePe, Paytm
            </p>
            {!payReady && (
              <p className="text-center text-sm text-[#e31b23]">
                Razorpay is not on the server yet.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {PAY_APPS.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  disabled={!canPay}
                  onClick={() => void startPay(app.id)}
                  className={`relative z-10 min-h-12 rounded-full px-3 py-3 text-sm font-extrabold disabled:opacity-60 ${app.className}`}
                >
                  {busy ? "Opening…" : app.label}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={!canPay}
              className="relative z-10 rounded-full bg-[#8A56B8] px-6 py-3.5 text-sm font-extrabold text-white disabled:opacity-60"
            >
              {busy ? "Opening Razorpay…" : `Cards / netbanking · ${formatInr(due.total)}`}
            </button>
            {payHint && !error ? <p className="text-sm text-[#7a7268]">{payHint}</p> : null}
            {error && <p className="text-sm text-[#e31b23]">{error}</p>}
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
