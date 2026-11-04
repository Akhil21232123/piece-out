"use client";

import { useEffect, useState } from "react";
import type { StockView } from "@/lib/inventory";

const LOW = 3;

function when(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-IN");
}

/** Hidden stock counts: only visible here in /admin. */
export function AdminStock({ initial = [] }: { initial?: StockView[] }) {
  const [rows, setRows] = useState<StockView[]>(initial);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");

  const pull = async () => {
    const res = await fetch("/api/admin/inventory", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { stock?: StockView[] };
    if (Array.isArray(data.stock)) setRows(data.stock);
  };

  useEffect(() => {
    const id = window.setInterval(() => void pull(), 15000);
    return () => window.clearInterval(id);
  }, []);

  const save = async (productId: string) => {
    const qty = Number(draft[productId]);
    if (!Number.isFinite(qty) || qty < 0) {
      setError("Enter a count of 0 or more.");
      return;
    }
    setError("");
    setSaving(productId);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, qty }),
      });
      const data = (await res.json().catch(() => ({}))) as { stock?: StockView[]; error?: string };
      if (!res.ok || !data.stock) throw new Error(data.error || "Could not save.");
      setRows(data.stock);
      setDraft((current) => {
        const next = { ...current };
        delete next[productId];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving("");
    }
  };

  const rank = (qty: number | null) => (qty == null ? -1 : qty);
  const sorted = [...rows].sort((a, b) => rank(a.qty) - rank(b.qty) || a.name.localeCompare(b.name));
  const tracked = rows.filter((row) => row.qty != null) as Array<StockView & { qty: number }>;
  const out = tracked.filter((row) => row.qty <= 0).length;
  const low = tracked.filter((row) => row.qty > 0 && row.qty <= LOW).length;
  const total = tracked.reduce((sum, row) => sum + Math.max(0, row.qty), 0);
  const unset = rows.length - tracked.length;

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-extrabold tracking-tight text-[#171411]">stock</h2>
      <p className="mt-1 text-sm text-[#7a7268]">
        Only you see these numbers. Paid orders take cans off automatically. At 0 the shop shows
        &quot;sold out · notify me&quot; and you get an email (also at {LOW} left). Type a new count to restock.
      </p>
      <p className="mt-2 text-sm font-extrabold text-[#171411]">
        {total} cans · {out} sold out · {low} low
        {unset ? <span className="text-[#e31b23]"> · {unset} not counted yet (not limited on the site)</span> : null}
      </p>
      {error ? <p className="mt-2 text-sm font-semibold text-[#e31b23]">{error}</p> : null}
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {sorted.map((row) => {
          const state = row.qty == null ? "not counted" : row.qty <= 0 ? "sold out" : row.qty <= LOW ? "low" : "";
          const value = draft[row.productId] ?? "";
          return (
            <li
              key={row.productId}
              className={`flex items-center justify-between gap-3 rounded-[1.1rem] border p-3 ${
                row.qty == null
                  ? "border-dashed border-[#171411]/25 bg-[#fffaf3]"
                  : row.qty <= 0
                  ? "border-[#e31b23]/40 bg-[#e31b23]/8"
                  : row.qty <= LOW
                    ? "border-[#f5c400] bg-[#f5c400]/15"
                    : "border-[#171411]/10 bg-[#fffaf3]"
              }`}
            >
              <div className="min-w-0">
                <p className="truncate font-extrabold text-[#171411]">{row.name}</p>
                <p className="text-xs text-[#7a7268]">
                  {state ? <span className="font-extrabold uppercase text-[#e31b23]">{state} · </span> : null}
                  {row.updatedAt ? `updated ${when(row.updatedAt)}` : "type the count you have"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="w-10 text-right text-2xl font-extrabold tabular-nums text-[#171411]">{row.qty ?? "—"}</span>
                <input
                  inputMode="numeric"
                  aria-label={`New count for ${row.name}`}
                  placeholder="set"
                  value={value}
                  onChange={(e) => setDraft((current) => ({ ...current, [row.productId]: e.target.value.replace(/\D/g, "") }))}
                  className="w-16 rounded-full border border-[#171411]/16 bg-white px-3 py-1.5 text-sm"
                />
                <button
                  type="button"
                  disabled={!value || saving === row.productId}
                  onClick={() => void save(row.productId)}
                  className="rounded-full bg-[#171411] px-3 py-1.5 text-xs font-extrabold text-[#fffaf3] disabled:opacity-40"
                >
                  {saving === row.productId ? "…" : "Save"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
