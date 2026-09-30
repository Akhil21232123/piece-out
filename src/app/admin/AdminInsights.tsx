"use client";

import { useEffect, useState } from "react";
import { HEAT_CELLS, HEAT_COLS, type DayInsight } from "@/lib/insightTypes";

function maxOf(values: number[]) {
  return values.reduce((n, v) => (v > n ? v : n), 0);
}

export function AdminInsights({ initial }: { initial: DayInsight[] }) {
  const [days, setDays] = useState(initial);
  const [at, setAt] = useState(Date.now());
  const [live, setLive] = useState(true);
  const today = days[days.length - 1];
  const peak = maxOf(days.map((day) => day.viewers));
  const heatMax = today ? maxOf(today.heat) : 0;

  useEffect(() => {
    let on = true;
    const pull = async () => {
      const res = await fetch("/api/insights", { cache: "no-store" });
      if (!on) return;
      if (!res.ok) return;
      const data = (await res.json()) as { days?: DayInsight[]; live?: boolean };
      if (Array.isArray(data.days)) setDays(data.days);
      setLive(data.live !== false);
      setAt(Date.now());
    };
    void pull();
    const id = window.setInterval(pull, 4000);
    return () => {
      on = false;
      window.clearInterval(id);
    };
  }, []);

  return (
    <section className="mt-10 rounded-2xl border border-[#171411]/10 bg-[#fffaf3] p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#e31b23]">live site</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#171411]">today on the shop</h2>
        </div>
        <p className="text-[11px] font-semibold text-[#7a7268]">
          {live ? "saving to the live database" : "store offline"} · updates every 4s ·{" "}
          {new Date(at).toLocaleTimeString("en-IN")}
        </p>
      </div>

      {today ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="viewers" value={today.viewers} hint="unique sessions today" />
          <Stat label="bought" value={today.bought} hint="paid checkout" />
          <Stat label="left, no buy" value={today.leftNoBuy} hint="browsed, then gone" />
          <Stat label="bounce" value={today.bounce} hint="in and out" />
        </div>
      ) : null}

      <div className="mt-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#7a7268]">last 7 days</p>
        <div className="mt-3 flex h-28 items-end gap-1.5">
          {days.map((day) => {
            const h = peak ? Math.max(6, Math.round((day.viewers / peak) * 100)) : 6;
            return (
              <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-bold tabular-nums text-[#171411]">{day.viewers}</span>
                <div
                  className="w-full rounded-sm bg-[#e31b23]"
                  style={{ height: `${h}%` }}
                  title={`${day.date}: ${day.viewers} viewers`}
                />
                <span className="text-[10px] font-semibold text-[#7a7268]">{day.date.slice(5)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#7a7268]">what they tap</p>
          {today && today.taps.length ? (
            <ol className="mt-3 space-y-2">
              {today.taps.map((tap) => (
                <li key={tap.label} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-[#171411]">{tap.label}</span>
                  <span className="shrink-0 font-extrabold tabular-nums text-[#e31b23]">{tap.n}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-[#7a7268]">Open the shop on a phone or laptop — taps land here.</p>
          )}
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#7a7268]">heatmap</p>
          <div
            className="insight-heat mt-3"
            style={{ gridTemplateColumns: `repeat(${HEAT_COLS}, minmax(0, 1fr))` }}
            aria-hidden
          >
            {(today?.heat ?? Array.from({ length: HEAT_CELLS }, () => 0)).map((n, i) => (
              <i
                key={i}
                style={{
                  opacity: heatMax ? 0.08 + 0.92 * (n / heatMax) : 0.05,
                }}
              />
            ))}
          </div>
          <p className="mt-2 text-[11px] text-[#7a7268]">Hotter cells are where fingers land on the page.</p>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-xl bg-[#efe8dc] px-3 py-3">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#7a7268]">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums text-[#171411]">{value}</p>
      <p className="mt-0.5 text-[11px] text-[#7a7268]">{hint}</p>
    </div>
  );
}
