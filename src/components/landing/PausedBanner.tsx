"use client";

import { useOrdersPaused } from "@/store/siteStatus";

/** Shown across the top while orders are paused from /admin. */
export function PausedBanner() {
  const paused = useOrdersPaused();
  if (!paused) return null;
  return (
    <div role="status" className="relative z-30 bg-[#171411] px-4 py-2.5 text-center text-[13px] font-extrabold text-[#fffaf3]">
      We&apos;re taking a short break and not taking new orders right now. Back very soon. Look around in the meantime.
    </div>
  );
}
