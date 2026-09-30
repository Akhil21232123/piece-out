"use client";

import { useEffect, useMemo, useState } from "react";
import { formatInr } from "@/lib/brand";
import { moneyLane, type BankDeposit, type MoneyLane, type ShopOrder } from "@/lib/orderTypes";

type Filter = "all" | MoneyLane;

function matches(order: ShopOrder, q: string) {
  if (!q) return true;
  const hay = [
    order.id,
    order.name,
    order.email,
    order.phone,
    order.address,
    order.awb ?? "",
    order.pincode ?? "",
    ...order.items.map((item) => item.name),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function waHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const local = digits.length === 10 ? `91${digits}` : digits;
  if (local.length < 10) return "";
  return `https://wa.me/${local}`;
}

function ShipBox({
  order,
  onUpdate,
}: {
  order: ShopOrder;
  onUpdate: (order: ShopOrder) => void;
}) {
  const [awb, setAwb] = useState("");
  const [partner, setPartner] = useState(order.shippingPartner || "Delhivery");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const ship = async (body: { awb?: string; partner?: string; book?: boolean }) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${order.id}/ship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; order?: ShopOrder };
      if (!res.ok || !data.order) {
        setError(data.error ?? "Could not update shipping.");
        return;
      }
      onUpdate(data.order);
      setAwb("");
    } finally {
      setBusy(false);
    }
  };

  const packText = encodeURIComponent(
    [
      `pieceout ${order.id} · READY TO SHIP`,
      `${order.name} · ${order.phone}`,
      order.address,
      [order.city, order.state, order.pincode].filter(Boolean).join(", "),
      order.items.map((item) => `${item.qty}× ${item.name}${item.withFrame ? " framed" : ""}`).join(", "),
      `Paid ₹${order.total}`,
    ].join("\n"),
  );

  return (
    <div className="mt-4 rounded-[1rem] border border-[#171411]/10 bg-[#efe8dc] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a7268]">
        Shipping
      </p>
      {order.awb ? (
        <p className="mt-1 text-sm font-extrabold text-[#171411]">
          {order.shippingPartner || "Courier"} · AWB {order.awb}
          {order.trackingUrl ? (
            <>
              {" · "}
              <a className="underline decoration-[#171411]/20" href={order.trackingUrl} target="_blank" rel="noreferrer">
                Track
              </a>
            </>
          ) : null}
        </p>
      ) : (
        <p className="mt-1 text-sm text-[#7a7268]">Book via Delhivery, or paste an AWB.</p>
      )}
      {order.shippingError ? <p className="mt-1 text-xs text-[#b45309]">{order.shippingError}</p> : null}
      {order.status === "paid" ? (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <select
              value={partner}
              onChange={(e) => setPartner(e.target.value)}
              className="checkout-input min-h-10 w-auto py-2 text-sm"
            >
              <option value="Delhivery">Delhivery</option>
              <option value="DTDC">DTDC</option>
              <option value="Blue Dart">Blue Dart</option>
              <option value="India Post">India Post</option>
              <option value="Other">Other</option>
            </select>
            <input
              value={awb}
              onChange={(e) => setAwb(e.target.value)}
              placeholder="Paste AWB"
              className="checkout-input min-h-10 flex-1 py-2 text-sm"
            />
            <button
              type="button"
              disabled={busy || !awb.trim()}
              onClick={() => void ship({ awb, partner })}
              className="rounded-full bg-[#171411] px-4 py-2 text-xs font-extrabold text-[#fffaf3] disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save tracking"}
            </button>
            {!order.awb ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void ship({ book: true })}
                className="rounded-full bg-[#e31b23] px-4 py-2 text-xs font-extrabold text-white disabled:opacity-60"
              >
                {busy ? "Booking…" : "Book Delhivery"}
              </button>
            ) : null}
          </div>
          <a
            href={`https://wa.me/?text=${packText}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit rounded-full border border-[#171411]/16 bg-[#fffaf3] px-4 py-2 text-xs font-extrabold text-[#171411]"
          >
            Share pack slip on WhatsApp
          </a>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-xs text-[#e31b23]">{error}</p> : null}
    </div>
  );
}

function laneCopy(lane: MoneyLane) {
  if (lane === "in_bank") return "In your bank";
  if (lane === "in_razorpay") return "Razorpay confirmed · not in bank yet";
  if (lane === "unverified") return "Not confirmed at Razorpay";
  if (lane === "failed") return "Failed";
  return "Waiting for customer";
}

function laneClass(lane: MoneyLane) {
  if (lane === "in_bank") return "text-[#15803d]";
  if (lane === "in_razorpay") return "text-[#7c3aed]";
  if (lane === "unverified") return "text-[#b45309]";
  if (lane === "failed") return "text-[#e31b23]";
  return "text-[#7a7268]";
}

function when(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-IN");
}

export function AdminOrders({
  orders,
  durableStore,
  inbox,
}: {
  orders: ShopOrder[];
  durableStore: boolean;
  inbox: string;
}) {
  const [rows, setRows] = useState(orders);
  const [bank, setBank] = useState<BankDeposit | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [syncing, setSyncing] = useState(false);

  const pull = async () => {
    const res = await fetch("/api/orders", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { orders?: ShopOrder[]; bank?: BankDeposit | null };
    if (Array.isArray(data.orders)) setRows(data.orders);
    if (data.bank !== undefined) setBank(data.bank);
  };

  useEffect(() => {
    void pull();
    const id = window.setInterval(() => void pull(), 8000);
    return () => window.clearInterval(id);
  }, []);

  const counts = useMemo(() => {
    const lanes = rows.map(moneyLane);
    return {
      all: rows.length,
      waiting: lanes.filter((lane) => lane === "waiting").length,
      unverified: lanes.filter((lane) => lane === "unverified").length,
      in_razorpay: lanes.filter((lane) => lane === "in_razorpay").length,
      in_bank: lanes.filter((lane) => lane === "in_bank").length,
      failed: lanes.filter((lane) => lane === "failed").length,
    };
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => (filter === "all" || moneyLane(row) === filter) && matches(row, q));
  }, [filter, query, rows]);

  const latestBank = useMemo(() => {
    if (bank?.utr) return bank;
    const settled = rows
      .filter((row) => row.settlementUtr)
      .sort(
        (a, b) =>
          Date.parse(b.settledAt ?? b.capturedAt ?? "") - Date.parse(a.settledAt ?? a.capturedAt ?? ""),
      );
    const top = settled[0];
    if (!top?.settlementUtr) return null;
    return {
      id: top.settlementId ?? top.id,
      amountInr: top.total,
      feesInr: 0,
      utr: top.settlementUtr,
      at: top.settledAt ?? top.capturedAt ?? top.createdAt,
      status: "processed",
    } satisfies BankDeposit;
  }, [bank, rows]);

  const setStatus = async (id: string, status: "paid" | "failed") => {
    const res = await fetch(`/api/orders/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return;
    setRows((current) => current.map((row) => (row.id === id ? { ...row, status } : row)));
  };

  const refreshNow = async () => {
    setSyncing(true);
    try {
      await fetch("/api/checkout/reconcile", { method: "POST", cache: "no-store" });
      await pull();
    } finally {
      setSyncing(false);
    }
  };

  const chip = (id: Filter, label: string, count: number) => (
    <button
      type="button"
      onClick={() => setFilter(id)}
      className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${
        filter === id ? "bg-[#171411] text-[#fffaf3]" : "bg-[#efe8dc] text-[#171411]"
      }`}
      aria-pressed={filter === id}
    >
      {label} · {count}
    </button>
  );

  return (
    <>
      {!durableStore && (
        <p className="mt-6 rounded-[1.2rem] border border-[#e31b23]/30 bg-[#fffaf3] p-4 text-sm leading-relaxed text-[#7a7268]">
          Neon is not connected on this deploy yet. Orders will not stick until{" "}
          <code className="font-semibold text-[#171411]">DATABASE_URL</code> is live.
        </p>
      )}
      {durableStore && (
        <p className="mt-6 rounded-[1.2rem] border border-[#171411]/10 bg-[#fffaf3] p-4 text-sm text-[#7a7268]">
          This page asks Razorpay every few seconds whether the customer paid, and whether Razorpay has
          settled that money into your linked bank. You do not mark this by hand
          {inbox ? ` · copies also go to ${inbox}` : ""}.
        </p>
      )}

      <div className="mt-6 rounded-[1.2rem] border border-[#171411]/10 bg-[#fffaf3] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a7268]">Last Razorpay deposit to your bank</p>
        {latestBank?.utr ? (
          <>
            <p className="mt-2 text-2xl font-extrabold text-[#15803d]">{formatInr(latestBank.amountInr)}</p>
            <p className="mt-1 text-sm text-[#171411]">
              UTR {latestBank.utr} · {when(latestBank.at)}
              {latestBank.feesInr ? ` · fee ${formatInr(latestBank.feesInr)}` : ""}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-[#7a7268]">
            No bank settlement from Razorpay yet. Captured payments sit with Razorpay until the next
            payout (usually 1–2 working days). That is not the same as your UPI app.
          </p>
        )}
        <button
          type="button"
          onClick={() => void refreshNow()}
          disabled={syncing}
          className="mt-4 rounded-full bg-[#171411] px-4 py-2 text-xs font-extrabold text-[#fffaf3] disabled:opacity-60"
        >
          {syncing ? "Checking Razorpay…" : "Check Razorpay now"}
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, phone, product, order id, UTR"
          className="checkout-input"
        />
        <div className="flex flex-wrap gap-2">
          {chip("all", "All", counts.all)}
          {chip("waiting", "Waiting", counts.waiting)}
          {chip("unverified", "Unverified", counts.unverified)}
          {chip("in_razorpay", "In Razorpay", counts.in_razorpay)}
          {chip("in_bank", "In bank", counts.in_bank)}
          {chip("failed", "Failed", counts.failed)}
        </div>
      </div>

      {!visible.length ? (
        <p className="mt-10 rounded-[1.2rem] border border-[#171411]/10 bg-[#fffaf3] p-6 text-sm text-[#7a7268]">
          {rows.length
            ? "No orders match that search."
            : "No orders yet. The first paid checkout will land here with name, email, phone, address, and products."}
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {visible.map((order) => {
            const wa = waHref(order.phone);
            const lane = moneyLane(order);
            return (
              <li key={order.id} className="rounded-[1.2rem] border border-[#171411]/10 bg-[#fffaf3] p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-lg font-extrabold text-[#171411]">{order.name}</p>
                  <p className="text-sm font-extrabold tabular-nums text-[#171411]">{formatInr(order.total)}</p>
                </div>
                <p className="mt-1 text-xs font-semibold text-[#7a7268]">
                  {order.id} · {when(order.createdAt)}
                </p>
                <p className={`mt-2 text-xs font-extrabold uppercase tracking-[0.16em] ${laneClass(lane)}`}>
                  {laneCopy(lane)}
                </p>
                {lane === "in_razorpay" && (
                  <p className="mt-1 text-sm text-[#7a7268]">
                    Razorpay API confirmed captured {formatInr((order.razorpayAmountPaise ?? order.total * 100) / 100)}
                    {order.paymentMethod ? ` · ${order.paymentMethod}` : ""}
                    {order.paymentVpa ? ` · ${order.paymentVpa}` : ""}. Money is with Razorpay until
                    settlement hits your linked bank.
                  </p>
                )}
                {lane === "unverified" && (
                  <p className="mt-1 text-sm text-[#b45309]">
                    This is not a Razorpay capture. It may have been marked by staff. It does not count as money received.
                  </p>
                )}
                {lane === "in_bank" && order.settlementUtr && (
                  <p className="mt-1 text-sm font-extrabold text-[#15803d]">Bank UTR {order.settlementUtr}</p>
                )}
                {order.capturedAt && (
                  <p className="mt-1 text-xs text-[#7a7268]">Captured {when(order.capturedAt)}</p>
                )}
                {order.settledAt && <p className="text-xs text-[#7a7268]">Settled {when(order.settledAt)}</p>}

                <ul className="mt-4 space-y-1 text-sm font-extrabold text-[#171411]">
                  {order.items.map((item) => (
                    <li key={`${order.id}-${item.productId}-${item.withFrame}`}>
                      {item.qty}× {item.name} · {item.withFrame ? "with frame" : "without frame"} ·{" "}
                      {formatInr(item.unitPrice)}
                    </li>
                  ))}
                </ul>
                {order.subtotal != null || order.gst != null || order.shippingFee != null ? (
                  <p className="mt-2 text-xs text-[#7a7268]">
                    {order.subtotal != null ? `Subtotal ${formatInr(order.subtotal)}` : ""}
                    {order.shippingFee != null ? ` · Delhivery ${formatInr(order.shippingFee)}` : ""}
                    {order.gst != null ? ` · GST (incl.) ${formatInr(order.gst)}` : ""}
                  </p>
                ) : null}

                <dl className="mt-4 space-y-1 text-sm">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a7268]">Email</dt>
                    <dd>
                      {order.email ? (
                        <a className="font-extrabold text-[#171411] underline decoration-[#171411]/20" href={`mailto:${order.email}`}>
                          {order.email}
                        </a>
                      ) : (
                        <span className="text-[#7a7268]">—</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a7268]">Mobile</dt>
                    <dd>
                      <a className="font-extrabold text-[#171411]" href={`tel:${order.phone}`}>
                        {order.phone}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a7268]">Address</dt>
                    <dd className="whitespace-pre-wrap leading-relaxed text-[#171411]">
                      {order.address}
                      {order.city || order.state || order.pincode ? (
                        <span className="mt-1 block text-[#7a7268]">
                          {[order.city, order.state, order.pincode].filter(Boolean).join(", ")}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap gap-2">
                  {order.email ? (
                    <a
                      href={`mailto:${order.email}?subject=${encodeURIComponent(`piece/out ${order.id}`)}`}
                      className="rounded-full bg-[#efe8dc] px-4 py-2 text-xs font-extrabold text-[#171411]"
                    >
                      Email
                    </a>
                  ) : null}
                  {wa ? (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-[#efe8dc] px-4 py-2 text-xs font-extrabold text-[#171411]"
                    >
                      WhatsApp
                    </a>
                  ) : null}
                </div>

                {order.status === "paid" || order.awb ? (
                  <ShipBox
                    order={order}
                    onUpdate={(next) =>
                      setRows((current) => current.map((row) => (row.id === next.id ? next : row)))
                    }
                  />
                ) : null}

                {order.paymentId && (
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#8A56B8]">
                    Razorpay {order.paymentId}
                  </p>
                )}
                {order.failureReason && <p className="mt-2 text-xs text-[#e31b23]">{order.failureReason}</p>}

                {order.status === "pending" && (
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void setStatus(order.id, "failed")}
                      className="rounded-full bg-[#efe8dc] px-4 py-2 text-xs font-extrabold text-[#171411]"
                    >
                      Mark failed
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
