"use client";

import { useShopStore } from "@/store/shopStore";
import { formatInr, priceFor } from "@/lib/brand";

export function FrameToggle({ compact = false }: { compact?: boolean }) {
  const withFrame = useShopStore((s) => s.withFrame);
  const setWithFrame = useShopStore((s) => s.setWithFrame);
  const price = priceFor(withFrame);

  return (
    <div className={`flex items-center ${compact ? "gap-2" : "gap-3"}`}>
      <div
        className="flex rounded-full border border-[#111111]/12 bg-white/70 p-0.5"
        role="group"
        aria-label="Frame option"
      >
        <button
          type="button"
          onClick={() => setWithFrame(false)}
          className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
            !withFrame ? "bg-[#111111] text-white" : "text-[#6d4e57] hover:text-[#111111]"
          }`}
        >
          No frame
        </button>
        <button
          type="button"
          onClick={() => setWithFrame(true)}
          className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
            withFrame ? "bg-[#111111] text-white" : "text-[#6d4e57] hover:text-[#111111]"
          }`}
        >
          Frame
        </button>
      </div>
      <span className="font-[family-name:var(--font-display)] text-lg font-extrabold tabular-nums text-[#111111]">
        {formatInr(price)}
      </span>
    </div>
  );
}
