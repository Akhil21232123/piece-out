"use client";

import { useState } from "react";
import { formatInr } from "@/lib/brand";
import type { ShopOrder } from "@/lib/orderTypes";

export function AdminOrders({
  orders,
  durableStore,
}: {
  orders: ShopOrder[];
  durableStore: boolean;
}) {
  const [rows, setRows] = useState(orders);

  const setStatus = async (id: string, status: "paid" | "failed") => {
    const res = await fetch(`/api/orders/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return;
    setRows((current) => current.map((row) => (row.id === id ? { ...row, status } : row)));
  };

  return (
    <>
      {!durableStore && (
        <p className="mt-6 rounded-[1.2rem] border border-[#e31b23]/30 bg-[#fffaf3] p-4 text-sm leading-relaxed text-[#7a7268]">
          Neon <code className="font-semibold text-[#171411]">DATABASE_URL</code> is not set on Vercel yet.
          Checkout still emails you name, email, phone, and address. Add a Neon Postgres URL so this
          dashboard keeps every order after deploys.
        </p>
      )}
      {!rows.length ? (
        <p className="mt-10 rounded-[1.2rem] border border-[#171411]/10 bg-[#fffaf3] p-6 text-sm text-[#7a7268]">
          No checkouts yet. The moment someone fills checkout, their name, email, phone, and address
          land here and in your inbox.
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {rows.map((order) => (
            <li key={order.id} className="rounded-[1.2rem] border border-[#171411]/10 bg-[#fffaf3] p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-lg font-extrabold text-[#171411]">{order.id}</p>
                <p className="text-sm font-extrabold tabular-nums text-[#171411]">{formatInr(order.total)}</p>
              </div>
              <p
                className={`mt-2 text-xs font-extrabold uppercase tracking-[0.16em] ${
                  order.status === "paid"
                    ? "text-[#1d4ed8]"
                    : order.status === "failed"
                      ? "text-[#e31b23]"
                      : "text-[#7a7268]"
                }`}
              >
                {order.status}
              </p>
              <p className="mt-1 text-xs text-[#7a7268]">{new Date(order.createdAt).toLocaleString("en-IN")}</p>
              <dl className="mt-4 space-y-1 text-sm">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a7268]">Name</dt>
                  <dd className="font-extrabold text-[#171411]">{order.name}</dd>
                </div>
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
                  <dd className="whitespace-pre-wrap leading-relaxed text-[#171411]">{order.address}</dd>
                </div>
              </dl>
              {order.paymentId && (
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#e31b23]">
                  pay {order.paymentId}
                </p>
              )}
              {order.utr && (
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#e31b23]">
                  UTR {order.utr}
                </p>
              )}
              {order.failureReason && (
                <p className="mt-2 text-xs text-[#e31b23]">{order.failureReason}</p>
              )}
              <ul className="mt-3 space-y-1 text-sm text-[#5e574e]">
                {order.items.map((item) => (
                  <li key={`${order.id}-${item.productId}-${item.withFrame}`}>
                    {item.qty}× {item.name} · {item.withFrame ? "framed" : "no frame"} · {formatInr(item.unitPrice)}
                  </li>
                ))}
              </ul>
              {order.status === "pending" && (
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void setStatus(order.id, "paid")}
                    className="rounded-full bg-[#171411] px-4 py-2 text-xs font-extrabold text-[#fffaf3]"
                  >
                    Mark paid
                  </button>
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
          ))}
        </ul>
      )}
    </>
  );
}
