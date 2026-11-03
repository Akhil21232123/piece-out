"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Chrome";
import { PuzzleField } from "@/components/landing/PuzzleField";
import { CUSTOM_PUZZLE, formatInr, SHIPPING } from "@/lib/brand";

type OrderStatus = {
  id: string;
  status: "pending" | "paid" | "failed";
  total: number;
  items?: Array<{ productId: string; qty: number }>;
  failureReason?: string;
};

const POLL_MS = 3000;
const POLL_LIMIT = 60; // ~3 minutes of waiting for Razorpay to confirm

/** Fire the Meta Pixel Purchase once per order (deduped in this browser; eventID = order id). */
function trackPurchase(order: OrderStatus) {
  const key = `po-px-purchase-${order.id}`;
  try {
    if (window.localStorage.getItem(key)) return;
  } catch {
    /* storage blocked: still track once for this page view */
  }
  const items = order.items ?? [];
  const payload = {
    value: order.total,
    currency: "INR",
    content_type: "product",
    content_ids: items.map((item) => item.productId),
    contents: items.map((item) => ({ id: item.productId, quantity: item.qty })),
    num_items: items.reduce((sum, item) => sum + item.qty, 0),
    order_id: order.id,
  };
  let tries = 0;
  const send = () => {
    if (typeof window.fbq === "function") {
      window.fbq("track", "Purchase", payload, { eventID: order.id });
      try {
        window.localStorage.setItem(key, String(Date.now()));
      } catch {
        /* ignore */
      }
      return;
    }
    // The pixel script loads after the page; wait for it (up to ~10s).
    if (tries++ < 33) window.setTimeout(send, 300);
  };
  send();
}

export function ThankYouPage({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [lookup, setLookup] = useState<"loading" | "done" | "missing">(orderId ? "loading" : "missing");
  const tracked = useRef(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    let stop = false;
    let polls = 0;
    let timer = 0;
    const load = async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" });
        if (res.status === 404) {
          if (!stop) setLookup("missing");
          return;
        }
        const data = (await res.json()) as OrderStatus;
        if (stop) return;
        setOrder(data);
        setLookup("done");
        if (data.status === "pending" && polls++ < POLL_LIMIT) {
          timer = window.setTimeout(load, POLL_MS);
        }
      } catch {
        if (!stop && polls++ < POLL_LIMIT) timer = window.setTimeout(load, POLL_MS);
      }
    };
    void load();
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
  }, [orderId]);

  useEffect(() => {
    if (!order || order.status !== "paid" || tracked.current) return;
    tracked.current = true;
    trackPurchase(order);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      confetti({
        particleCount: 80,
        spread: 75,
        origin: { y: 0.55 },
        colors: ["#e31b23", "#f5c400", "#171411", "#fffaf3"],
      });
    }
  }, [order]);

  const copyId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(orderId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  }, [orderId]);

  const custom = order?.items?.some((item) => item.productId === CUSTOM_PUZZLE.id) ?? false;
  const days = custom ? CUSTOM_PUZZLE.days : SHIPPING.days;
  const paid = order?.status === "paid";
  const pending = order?.status === "pending" || lookup === "loading";
  const failed = order?.status === "failed";

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-transparent text-[#171411]">
      <div className="paper-drift" aria-hidden />
      <PuzzleField />
      <div className="relative z-10 isolate">
        <Nav onCheckout={() => undefined} />
        <section className="relative px-4 pb-20 pt-28 md:px-8 md:pb-28 md:pt-36">
          <div className="mx-auto max-w-2xl text-center" aria-live="polite">
            {paid ? (
              <>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#e31b23]">
                  paid · packing
                </p>
                <h1 className="type-on-field mt-3 text-[clamp(3rem,13vw,6.5rem)] font-extrabold leading-[0.86] tracking-[-0.05em]">
                  thank you.
                </h1>
                <p className="font-hand mt-4 text-[1.8rem] leading-none text-[#9b2242] md:text-4xl">we got you.</p>
                <div className="mx-auto mt-8 max-w-md rounded-[1.4rem] border border-[#171411]/10 bg-[#fffaf3] p-5 text-left shadow-[0_20px_50px_rgb(23_20_17_/_0.1)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#7a7268]">order id</p>
                      <p className="mt-0.5 text-2xl font-extrabold tracking-tight">{order.id}</p>
                    </div>
                    <button
                      type="button"
                      onClick={copyId}
                      className="rounded-full border border-[#171411]/16 px-4 py-2 text-xs font-extrabold transition hover:border-[#171411]/40"
                    >
                      {copied ? "copied" : "copy"}
                    </button>
                  </div>
                  <dl className="mt-4 space-y-1.5 border-t border-[#171411]/10 pt-4 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-[#7a7268]">Paid</dt>
                      <dd className="font-extrabold tabular-nums">{formatInr(order.total)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[#7a7268]">Ships in</dt>
                      <dd className="font-extrabold">{days}</dd>
                    </div>
                    {custom ? (
                      <div className="flex justify-between">
                        <dt className="text-[#7a7268]">Custom puzzle</dt>
                        <dd className="font-extrabold">printed to order</dd>
                      </div>
                    ) : null}
                  </dl>
                  <p className="mt-4 text-xs leading-relaxed text-[#7a7268]">
                    Keep this order id. You&apos;ll need it if you message us about your order.
                  </p>
                </div>
                <Link
                  href="/#shop"
                  className="mt-8 inline-flex min-h-12 items-center rounded-full bg-[#f5c400] px-7 text-sm font-extrabold text-[#171411] transition hover:bg-[#171411] hover:text-[#fffaf3]"
                >
                  Keep shopping
                </Link>
              </>
            ) : failed ? (
              <>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#e31b23]">payment failed</p>
                <h1 className="type-on-field mt-3 text-[clamp(2.6rem,10vw,5rem)] font-extrabold leading-[0.9] tracking-[-0.045em]">
                  that didn&apos;t go through.
                </h1>
                <p className="mx-auto mt-4 max-w-md text-[#5e574e]">
                  {order?.failureReason || "Razorpay didn't confirm this payment."} If money left your account,
                  your bank usually reverses it within a few days. Order {orderId}.
                </p>
                <Link
                  href="/#shop"
                  className="mt-8 inline-flex min-h-12 items-center rounded-full bg-[#171411] px-7 text-sm font-extrabold text-[#fffaf3]"
                >
                  Back to the shop
                </Link>
              </>
            ) : pending ? (
              <>
                <p className="mx-auto h-2.5 w-2.5 rounded-full bg-[#8A56B8] pay-live-dot" />
                <h1 className="type-on-field mt-5 text-[clamp(2.4rem,9vw,4.5rem)] font-extrabold leading-[0.9] tracking-[-0.045em]">
                  confirming your payment…
                </h1>
                <p className="mx-auto mt-4 max-w-md text-[#5e574e]">
                  Razorpay is confirming order {orderId}. This page updates by itself. Don&apos;t pay again.
                </p>
              </>
            ) : (
              <>
                <h1 className="type-on-field text-[clamp(2.6rem,10vw,5rem)] font-extrabold leading-[0.9] tracking-[-0.045em]">
                  no order here.
                </h1>
                <p className="mx-auto mt-4 max-w-md text-[#5e574e]">
                  We couldn&apos;t find that order. If you just paid, check the order id in your Razorpay receipt.
                </p>
                <Link
                  href="/#shop"
                  className="mt-8 inline-flex min-h-12 items-center rounded-full bg-[#171411] px-7 text-sm font-extrabold text-[#fffaf3]"
                >
                  Go to the shop
                </Link>
              </>
            )}
          </div>
        </section>
        <Footer />
      </div>
    </main>
  );
}
