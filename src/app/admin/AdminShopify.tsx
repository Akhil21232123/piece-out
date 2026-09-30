"use client";

import { useState } from "react";

type Status = {
  storefront?: boolean;
  admin?: boolean;
  webhook?: boolean;
  domain?: string;
  products?: number;
  shopify?: boolean;
};

export function AdminShopify({ initial }: { initial: Status }) {
  const [status, setStatus] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const run = async (action: "sync" | "pull") => {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/admin/shopify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        created?: number;
        skipped?: number;
        errors?: string[];
        products?: number;
        orders?: number;
        pushed?: number;
      };
      if (!res.ok) {
        setNote(data.error ?? "Shopify request failed.");
        return;
      }
      if (typeof data.products === "number") {
        setStatus((current) => ({ ...current, products: data.products, shopify: true }));
      }
      setNote(
        action === "pull"
          ? `Pulled ${data.orders ?? 0} Shopify rows. Copied ${data.pushed ?? 0} Razorpay paid orders into Shopify.`
          : `Catalog ready. Created ${data.created ?? 0}, already there ${data.skipped ?? 0}. Copied ${data.pushed ?? 0} paid orders.${
              data.errors?.length ? ` ${data.errors.join(" ")}` : ""
            }`,
      );
    } finally {
      setBusy(false);
    }
  };

  const live = Boolean(status.storefront);
  return (
    <div className="mt-6 rounded-[1.2rem] border border-[#171411]/10 bg-[#fffaf3] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a7268]">Shopify</p>
      <p className="mt-2 text-lg font-extrabold text-[#171411]">
        {live ? "Shopify catalog connected" : "Shopify waiting on 4 env values"}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-[#7a7268]">
        Razorpay still takes the money. Shopify holds products, stock, and a copy of every paid order.
        {status.domain ? ` ${status.domain} ·` : ""} {status.products ?? 0} products
        {status.admin ? " · admin token on" : " · missing admin token"}
        {status.webhook ? " · webhooks on" : " · missing API secret"}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !status.admin}
          onClick={() => void run("sync")}
          className="rounded-full bg-[#171411] px-4 py-2 text-xs font-extrabold text-[#fffaf3] disabled:opacity-60"
        >
          {busy ? "Talking to Shopify…" : "Push catalog + register webhooks"}
        </button>
        <button
          type="button"
          disabled={busy || !status.admin}
          onClick={() => void run("pull")}
          className="rounded-full border border-[#171411]/16 px-4 py-2 text-xs font-extrabold text-[#171411] disabled:opacity-60"
        >
          Pull orders
        </button>
      </div>
      {note ? <p className="mt-3 text-sm text-[#5e574e]">{note}</p> : null}
    </div>
  );
}
