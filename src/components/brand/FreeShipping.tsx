/** "free shipping" pill — truck mark + label. `dark` for use on the ink cart bar. */
export function FreeShipping({
  className = "",
  dark = false,
  label = "free shipping",
}: {
  className?: string;
  dark?: boolean;
  label?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase leading-none tracking-[0.14em] ${
        dark ? "bg-[#f5c400] text-[#171411]" : "bg-[#171411] text-[#f5c400]"
      } ${className}`.trim()}
    >
      <svg viewBox="0 0 24 16" aria-hidden className="h-3 w-[18px] shrink-0" fill="none">
        <path
          d="M1.5 2.5h12v9h-12zM13.5 5.5h4.2l3.3 3.4v2.6h-7.5z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <circle cx="5.5" cy="12.8" r="1.9" fill="currentColor" />
        <circle cx="17.5" cy="12.8" r="1.9" fill="currentColor" />
      </svg>
      {label}
    </span>
  );
}
