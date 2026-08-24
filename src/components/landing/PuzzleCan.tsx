type PuzzleCanProps = {
  name: string;
  subtitle: string;
  accent: string;
  accent2: string;
  ink: string;
  piecesFill: string;
};

export function PuzzleCan({
  name,
  subtitle,
  accent,
  accent2,
  ink,
  piecesFill,
}: PuzzleCanProps) {
  return (
    <div className="relative mx-auto flex h-full w-full max-w-[220px] items-end justify-center pb-2">
      <div className="relative aspect-[10/19] w-[72%]">
        <div
          className="absolute left-1/2 top-0 z-20 h-[5%] w-[78%] -translate-x-1/2 rounded-full"
          style={{ background: "linear-gradient(180deg, #f7f8fa 0%, #b8bec6 100%)" }}
        />
        <div className="absolute left-1/2 top-[1.2%] z-30 h-[3%] w-[34%] -translate-x-1/2 rounded-full bg-[#d5d9de]" />

        <div
          className="absolute inset-x-0 top-[2.4%] bottom-[3%] overflow-hidden rounded-[1.65rem] border border-black/10 shadow-[0_18px_40px_rgb(17_17_17_/_0.16)]"
          style={{ backgroundColor: accent }}
        >
          <div
            className="absolute -left-[12%] top-[8%] h-[70%] w-[28%] rounded-full opacity-90"
            style={{ backgroundColor: accent2 }}
          />
          <div
            className="absolute -right-[12%] top-[8%] h-[70%] w-[28%] rounded-full opacity-90"
            style={{ backgroundColor: accent2 }}
          />

          <div className="relative z-10 flex h-[54%] flex-col items-center justify-center px-3 pt-5 text-center">
            <span
              className="text-[11px] font-extrabold leading-none tracking-tight"
              style={{ color: ink }}
            >
              piece/out
            </span>
            <span
              className="mt-1 max-w-[9rem] text-[9px] font-medium leading-tight"
              style={{ color: ink, opacity: 0.72 }}
            >
              puzzles you can pop open
            </span>
            <span
              className="mt-4 text-[15px] font-extrabold leading-none tracking-tight"
              style={{ color: ink }}
            >
              {name}
            </span>
            <span
              className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: ink, opacity: 0.7 }}
            >
              {subtitle}
            </span>
          </div>

          <div className="relative h-[46%] overflow-hidden border-t border-black/10 bg-white/20">
            <span
              className="absolute left-[12%] top-[18%] block h-5 w-5 rotate-12"
              style={{ backgroundColor: piecesFill, borderRadius: "4px 10px 4px 10px" }}
            />
            <span
              className="absolute left-[42%] top-[8%] block h-4 w-4 -rotate-6"
              style={{ backgroundColor: piecesFill, borderRadius: "4px 10px 4px 10px" }}
            />
            <span
              className="absolute left-[68%] top-[22%] block h-5 w-5 rotate-[28deg]"
              style={{ backgroundColor: piecesFill, borderRadius: "4px 10px 4px 10px" }}
            />
            <span
              className="absolute left-[18%] top-[48%] block h-3.5 w-3.5 rotate-[40deg]"
              style={{ backgroundColor: piecesFill, borderRadius: "4px 10px 4px 10px" }}
            />
            <span
              className="absolute left-[52%] top-[42%] block h-6 w-6 rotate-[8deg]"
              style={{ backgroundColor: piecesFill, borderRadius: "4px 10px 4px 10px" }}
            />
            <span
              className="absolute left-[72%] top-[62%] block h-4 w-4 -rotate-[18deg]"
              style={{ backgroundColor: piecesFill, borderRadius: "4px 10px 4px 10px" }}
            />
            <span
              className="absolute left-[30%] top-[70%] block h-5 w-5 rotate-[22deg]"
              style={{ backgroundColor: piecesFill, borderRadius: "4px 10px 4px 10px" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
