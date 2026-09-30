"use client";

import { useEffect, useState } from "react";
import type { RestockAlert } from "@/lib/alerts";

function waHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const local = digits.length === 10 ? `91${digits}` : digits;
  if (local.length < 10) return "";
  return `https://wa.me/${local}`;
}

function when(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-IN");
}

export function AdminAlerts({ initial = [] }: { initial?: RestockAlert[] }) {
  const [rows, setRows] = useState<RestockAlert[]>(initial);

  const pull = async () => {
    const res = await fetch("/api/notify", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { alerts?: RestockAlert[] };
    if (Array.isArray(data.alerts)) setRows(data.alerts);
  };

  useEffect(() => {
    void pull();
    const id = window.setInterval(() => void pull(), 12000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-extrabold tracking-tight text-[#171411]">restock pings</h2>
      <p className="mt-1 text-sm text-[#7a7268]">
        People who asked to be told when a sold-out can is back. {rows.length} waiting.
      </p>
      {!rows.length ? (
        <p className="mt-4 rounded-[1.2rem] border border-[#171411]/10 bg-[#fffaf3] p-5 text-sm text-[#7a7268]">
          No restock pings yet. Sold-out shop cards now collect name and number.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => {
            const wa = waHref(row.phone);
            return (
              <li key={row.id} className="rounded-[1.2rem] border border-[#171411]/10 bg-[#fffaf3] p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-lg font-extrabold text-[#171411]">{row.name}</p>
                  <p className="text-sm font-extrabold text-[#e31b23]">{row.productName}</p>
                </div>
                <p className="mt-1 text-xs text-[#7a7268]">
                  {row.id} · {when(row.createdAt)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a className="font-extrabold text-[#171411]" href={`tel:${row.phone}`}>
                    {row.phone}
                  </a>
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
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
