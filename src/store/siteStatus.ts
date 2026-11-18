"use client";

import { useEffect } from "react";
import { create } from "zustand";

type SiteStatus = { paused: boolean; loaded: boolean; load: () => Promise<void> };

/** Whether the shop owner has paused orders (flipped in /admin). Fetched once per visit. */
export const useSiteStatus = create<SiteStatus>((set, get) => ({
  paused: false,
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    set({ loaded: true });
    try {
      const res = await fetch("/api/site/status", { cache: "no-store" });
      const data = (await res.json()) as { paused?: boolean };
      set({ paused: Boolean(data.paused) });
    } catch {
      /* keep shop open if the check fails */
    }
  },
}));

export function useOrdersPaused(): boolean {
  const paused = useSiteStatus((s) => s.paused);
  const load = useSiteStatus((s) => s.load);
  useEffect(() => {
    void load();
  }, [load]);
  return paused;
}
