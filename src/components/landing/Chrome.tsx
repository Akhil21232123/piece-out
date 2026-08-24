
export function Marquee() {
  const line = "pop it  ·  lock in  ·  150 pieces  ·  1 hour  ·  hang it  ·  ";
  return (
    <div className="overflow-hidden border-y border-[#171411]/10 bg-[#f5c400] py-3 text-[#171411]" suppressHydrationWarning>
      <div className="flex w-max animate-marquee">
        <p className="whitespace-nowrap px-4 text-sm font-extrabold uppercase tracking-[0.22em]">
          {line.repeat(8)}
        </p>
        <p className="whitespace-nowrap px-4 text-sm font-extrabold uppercase tracking-[0.22em]" aria-hidden>
          {line.repeat(8)}
        </p>
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-[#171411]/10 px-4 py-16 pb-32 md:px-8 md:pb-16">
      <div className="mx-auto max-w-[1400px]">
        <p className="type-on-field text-5xl font-extrabold tracking-tight text-[#171411]">
          piece<span className="text-[#e31b23]">/</span>out
        </p>
        <p className="font-hand type-on-field mt-3 text-2xl text-[#9b2242]">puzzles you can pop open.</p>
        <p className="type-on-field mt-2 max-w-xs text-sm text-[#7a7268]">one hour of you. then hang it.</p>
      </div>
    </footer>
  );
}
