"use client";

import { useState } from "react";
import { formatInr } from "@/lib/brand";
import type { ShopOrder } from "@/lib/orderTypes";

export function AdminOrders({ orders }: { orders: ShopOrder[] }) {
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

  if (!rows.length) {
    return (
      <p className="mt-10 rounded-[1.2rem] border border-[#171411]/10 bg-[#fffaf3] p-6 text-sm text-[#7a7268]">
        No orders yet. When a buyer pays, it shows up here and in your email.
      </p>
    );
  }

  return (
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
          <p className="mt-3 text-sm font-extrabold text-[#171411]">{order.name}</p>
          <p className="text-sm text-[#7a7268]">{order.phone}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#171411]">{order.address}</p>
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
  );
}
