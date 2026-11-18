"use client";

import { useState } from "react";

/** One switch: stop or reopen orders on the live site. */
export function AdminPause({ initial }: { initial: boolean }) {
  const [paused, setPaused] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");

  const flip = async () => {
    if (!confirm) return setConfirm(true);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused: !paused }),
      });
      const data = (await res.json()) as { paused?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed");
      setPaused(Boolean(data.paused));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  };

  return (
    <div
      className={`mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.1rem] p-4 ${
        paused ? "bg-[#171411] text-[#fffaf3]" : "bg-[#fffaf3] text-[#171411]"
      }`}
    >
      <div>
        <p className="text-sm font-extrabold">{paused ? "Orders are PAUSED" : "Shop is open for orders"}</p>
        <p className={`text-xs ${paused ? "text-[#fffaf3]/70" : "text-[#7a7268]"}`}>
          {paused
            ? "Visitors can browse but can't add to cart or pay. A banner tells them you're on a short break."
            : "Pausing keeps the site up but stops new orders."}
        </p>
        {error ? <p className="mt-1 text-xs font-bold text-[#e31b23]">{error}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => void flip()}
        disabled={busy}
        className={`min-h-10 rounded-full px-4 text-sm font-extrabold disabled:opacity-50 ${
          paused ? "bg-[#f5c400] text-[#171411]" : "bg-[#e31b23] text-white"
        }`}
      >
        {busy ? "Saving…" : confirm ? "Tap again to confirm" : paused ? "Reopen orders" : "Pause orders"}
      </button>
    </div>
  );
}
