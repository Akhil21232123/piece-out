"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Product } from "@/data/products";

export function NotifyModal({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!product) return;
    setName("");
    setPhone("");
    setError("");
    setBusy(false);
    setDone(false);
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
  }, [product, onClose]);

  if (!product) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, productId: product.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save that.");
        return;
      }
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#171411]/45 p-3 sm:items-center" role="presentation">
      <button type="button" className="absolute inset-0" aria-label="Close notify popup" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notify-title"
        className="relative z-[1] w-full max-w-md rounded-[1.6rem] border border-[#171411]/10 bg-[#fffaf3] p-6 shadow-[0_24px_80px_rgb(23_20_17_/_0.28)]"
      >
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#e31b23]">gone for now</p>
        <h2 id="notify-title" className="mt-2 text-2xl font-extrabold tracking-tight text-[#171411]">
          ping me for {product.name}
        </h2>
        {done ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-[#5e574e]">
              Locked in. We will WhatsApp you when this can is back.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 min-h-12 w-full rounded-full bg-[#171411] text-sm font-extrabold text-[#fffaf3]"
            >
              Close
            </button>
          </>
        ) : (
          <form onSubmit={(e) => void submit(e)} className="mt-5 flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-[#5e574e]">
              Leave a name and number. When this edition drops again, you hear first.
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              className="checkout-input"
              required
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Mobile number"
              inputMode="numeric"
              autoComplete="tel"
              className="checkout-input"
              required
            />
            {error ? <p className="text-sm text-[#e31b23]">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="min-h-12 rounded-full bg-[#e31b23] text-sm font-extrabold text-white disabled:opacity-60"
            >
              {busy ? "Saving…" : "Notify me"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
