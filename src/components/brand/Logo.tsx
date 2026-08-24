type LogoProps = {
  className?: string;
  title?: string;
};

export function Logo({ className = "", title = "piece/out" }: LogoProps) {
  return (
    <span
      className={`font-[family-name:var(--font-display)] text-[1.05em] font-extrabold tracking-tight ${className}`}
      role="img"
      aria-label={title}
    >
      piece/out
    </span>
  );
}
