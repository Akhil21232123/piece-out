"use client";

import { DealPrice } from "@/components/brand/DealPrice";

export function FrameSwitch({
  withFrame,
  onChange,
}: {
  withFrame: boolean;
  onChange: (next: boolean) => void;
}) {
  const base =
    "min-h-12 rounded-full px-3 py-2.5 text-sm font-extrabold leading-tight transition border";
  const on = "border-[#171411] bg-[#171411] text-[#fffaf3]";
  const off = "border-[#171411]/16 bg-[#fffaf3] text-[#171411] hover:border-[#171411]/40";

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        aria-pressed={!withFrame}
        onClick={() => onChange(false)}
        className={`${base} ${withFrame ? off : on}`}
      >
        Without frame
        <span className={`mt-0.5 block text-[11px] font-semibold ${withFrame ? "text-[#7a7268]" : "text-[#fffaf3]/70"}`}>
          <DealPrice withFrame={false} compact light={!withFrame} />
        </span>
      </button>
      <button
        type="button"
        aria-pressed={withFrame}
        onClick={() => onChange(true)}
        className={`${base} ${withFrame ? on : off}`}
      >
        With frame
        <span className={`mt-0.5 block text-[11px] font-semibold ${withFrame ? "text-[#fffaf3]/70" : "text-[#7a7268]"}`}>
          <DealPrice withFrame compact light={withFrame} />
        </span>
      </button>
    </div>
  );
}
