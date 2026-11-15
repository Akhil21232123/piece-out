"use client";

import { useEffect, useMemo, useState } from "react";
import type { ShipRow } from "@/lib/shipFlow";

type Board = { toShip: ShipRow[]; onTheWay: ShipRow[]; done: ShipRow[] };

const day = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" })
    : "";

const STATE_LABEL: Record<ShipRow["state"], string> = {
  ready: "Ready",
  pickup_requested: "Pickup asked",
  picked_up: "On the way",
  delivered: "Delivered",
  sent_other: "Sent another way",
};

export function AdminShip({ initial }: { initial: Board }) {
  const [board, setBoard] = useState<Board>(initial);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState("");

  const ids = useMemo(() => board.toShip.filter((r) => picked.has(r.id)).map((r) => r.id), [board, picked]);
  const allOn = board.toShip.length > 0 && ids.length === board.toShip.length;

  const send = async (action: string, body: Record<string, unknown> = {}) => {
    setBusy(action);
    setNote("");
    try {
      const res = await fetch("/api/admin/ship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const data = (await res.json()) as Board & {
        error?: string;
        pickup?: { parcels: number; date: string; time: string };
        sync?: { shipped: number; delivered: number };
      };
      if (!res.ok) throw new Error(data.error || "Something failed.");
      setBoard({ toShip: data.toShip, onTheWay: data.onTheWay, done: data.done });
      if (data.pickup) {
        setNote(`Pickup booked: ${data.pickup.parcels} parcels, ${day(data.pickup.date)} from ${data.pickup.time.slice(0, 5)}. Keep them labelled and ready.`);
      } else if (data.sync && action === "sync") {
        setNote(`Checked Delhivery: ${data.sync.shipped} newly shipped, ${data.sync.delivered} delivered.`);
      }
      setPicked(new Set());
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Something failed.");
    } finally {
      setBusy("");
      setConfirm("");
    }
  };

  // Pull fresh Delhivery status once when the page opens.
  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/ship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      }).catch(() => null);
      if (!res?.ok) return;
      const data = (await res.json()) as Board;
      setBoard({ toShip: data.toShip, onTheWay: data.onTheWay, done: data.done });
    })();
  }, []);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const twoStep = (key: string, run: () => void) => {
    if (confirm === key) run();
    else setConfirm(key);
  };

  const n = ids.length;

  return (
    <div className="mt-6 pb-28">
      <p className="text-sm text-[#7a7268]">
        Paid orders that haven&apos;t left yet, oldest first. Tick the parcels you&apos;re sending today → print labels → stick one
        on each → request pickup. Customers get a &ldquo;shipped&rdquo; email with tracking as soon as Delhivery scans the parcel.
      </p>

      {note ? (
        <p className="mt-4 rounded-[1rem] bg-[#171411] px-4 py-3 text-sm font-bold text-[#fffaf3]">{note}</p>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-extrabold tracking-tight">to ship · {board.toShip.length}</h2>
        <button
          type="button"
          onClick={() => void send("sync")}
          disabled={Boolean(busy)}
          className="rounded-full border border-[#171411]/16 bg-[#fffaf3] px-3 py-1.5 text-xs font-extrabold disabled:opacity-50"
        >
          {busy === "sync" ? "Checking…" : "Check Delhivery now"}
        </button>
      </div>

      {board.toShip.length ? (
        <>
          <label className="mt-3 flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={allOn}
              onChange={() => setPicked(allOn ? new Set() : new Set(board.toShip.map((r) => r.id)))}
              className="h-5 w-5 accent-[#171411]"
            />
            Select all
          </label>
          <ul className="mt-3 space-y-2">
            {board.toShip.map((r) => (
              <li key={r.id}>
                <label
                  className={`flex cursor-pointer gap-3 rounded-[1.1rem] border p-4 ${
                    picked.has(r.id) ? "border-[#171411] bg-[#fffaf3]" : "border-[#171411]/10 bg-[#fffaf3]/70"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={picked.has(r.id)}
                    onChange={() => toggle(r.id)}
                    className="mt-1 h-5 w-5 shrink-0 accent-[#171411]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-extrabold">{r.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                          r.state === "pickup_requested" ? "bg-[#f5c400] text-[#171411]" : "bg-[#efe8dc] text-[#5e574e]"
                        }`}
                      >
                        {r.state === "pickup_requested" ? `Pickup asked ${day(r.pickupRequestedAt)}` : "Ready"}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-sm">{r.items}</span>
                    <span className="mt-1 block text-xs text-[#7a7268]">
                      {r.id} · {day(r.createdAt)} · {[r.city, r.pincode].filter(Boolean).join(" ")}
                      {r.awb ? ` · AWB ${r.awb}` : ""}
                    </span>
                    {!r.awb && r.shippingError ? (
                      <span className="mt-1 block text-xs font-bold text-[#e31b23]">No label yet: {r.shippingError}</span>
                    ) : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-3 rounded-[1.1rem] bg-[#fffaf3] p-5 text-sm text-[#7a7268]">Nothing waiting. Every paid order has left.</p>
      )}

      {board.onTheWay.length ? (
        <section className="mt-10">
          <h2 className="text-xl font-extrabold tracking-tight">on the way · {board.onTheWay.length}</h2>
          <ul className="mt-3 space-y-2">
            {board.onTheWay.map((r) => (
              <li key={r.id} className="rounded-[1.1rem] bg-[#fffaf3] p-4 text-sm">
                <span className="flex flex-wrap justify-between gap-2">
                  <span className="font-extrabold">{r.name}</span>
                  <span className="text-xs font-bold text-[#5e574e]">{r.courierStatus || "Picked up"}</span>
                </span>
                <span className="mt-1 block text-xs text-[#7a7268]">
                  {r.id} · picked up {day(r.pickedUpAt)} · {r.city}
                  {r.awb ? (
                    <>
                      {" · "}
                      <a className="underline" href={`/track/${r.awb}`} target="_blank" rel="noreferrer">
                        track
                      </a>
                    </>
                  ) : null}
                  {r.emailed ? " · customer emailed ✓" : " · not emailed"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {board.done.length ? (
        <details className="mt-10">
          <summary className="cursor-pointer text-sm font-extrabold">done · last {board.done.length}</summary>
          <ul className="mt-3 space-y-2">
            {board.done.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-[1rem] bg-[#fffaf3]/70 p-3 text-xs">
                <span>
                  <b>{r.name}</b> · {r.id} · {STATE_LABEL[r.state]}
                  {r.deliveredAt ? ` ${day(r.deliveredAt)}` : ""}
                </span>
                {r.state === "sent_other" ? (
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => void send("ready", { ids: [r.id] })}
                    className="shrink-0 rounded-full border border-[#171411]/16 px-2.5 py-1 font-extrabold"
                  >
                    Undo
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {n ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#171411]/10 bg-[#efe8dc]/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
            <span className="mr-auto text-sm font-extrabold">{n} selected</span>
            <a
              href={`/api/admin/ship/labels?ids=${encodeURIComponent(ids.join(","))}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center rounded-full bg-[#171411] px-4 text-sm font-extrabold text-[#fffaf3]"
            >
              1 · Print {n} label{n > 1 ? "s" : ""}
            </a>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => twoStep("pickup", () => void send("pickup", { ids }))}
              className="min-h-11 rounded-full bg-[#e31b23] px-4 text-sm font-extrabold text-white disabled:opacity-50"
            >
              {busy === "pickup"
                ? "Booking…"
                : confirm === "pickup"
                  ? `Tap again: pickup for ${n}`
                  : `2 · Request pickup (${n})`}
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => twoStep("other", () => void send("sent_other", { ids }))}
              className="min-h-11 rounded-full border border-[#171411]/20 bg-[#fffaf3] px-4 text-sm font-extrabold disabled:opacity-50"
            >
              {confirm === "other" ? "Tap again to confirm" : "Already sent another way"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
