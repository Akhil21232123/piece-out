const LINE = "UNOPENED  ·  UNSEEN  ·  BY REQUEST  ·  AFTER MIDNIGHT  ·  EMPIRIQUE  ·  PRIVATE ISSUE  ·  ";

export function Marquee() {
  return (
    <div className="emp-marquee py-3" suppressHydrationWarning>
      <div className="emp-marquee-track">
        <p className="whitespace-nowrap px-6 text-[10px] font-medium uppercase tracking-[0.38em] text-[#A8845C]">
          {LINE.repeat(8)}
        </p>
        <p
          className="whitespace-nowrap px-6 text-[10px] font-medium uppercase tracking-[0.38em] text-[#A8845C]"
          aria-hidden
        >
          {LINE.repeat(8)}
        </p>
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="px-6 py-12 md:px-12">
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-8 border-t border-[#A8845C]/15 pt-10 md:flex-row md:items-end">
        <div>
          <p className="font-display text-3xl italic tracking-[0.1em] text-[#E8DCC8] md:text-4xl">
            Empirique
          </p>
          <p className="mt-3 text-[10px] uppercase tracking-[0.36em] text-[#8A7A6E]">
            Established in silence
          </p>
        </div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#7A6248]">
          © {new Date().getFullYear()} · The house
        </p>
      </div>
    </footer>
  );
}
