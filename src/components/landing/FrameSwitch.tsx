"use client";

export function FrameSwitch({
  withFrame,
  onChange,
}: {
  withFrame: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`text-[11px] font-semibold ${withFrame ? "text-[#7a7268]" : "text-[#171411]"}`}>
        No frame
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={withFrame ? "true" : "false"}
        aria-label="Toggle frame"
        onClick={() => onChange(!withFrame)}
        className={`relative h-7 w-12 shrink-0 rounded-full border border-[#171411]/15 transition-colors ${
          withFrame ? "bg-[#f5c400]" : "bg-[#d9d0c3]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-[#171411] transition-transform duration-200 ${
            withFrame ? "translate-x-[20px]" : "translate-x-0"
          }`}
          style={{ left: "2px" }}
        />
      </button>
      <span className={`text-[11px] font-semibold ${withFrame ? "text-[#171411]" : "text-[#7a7268]"}`}>
        Frame
      </span>
    </div>
  );
}
