import { compareFor, formatInr, priceFor } from "@/lib/brand";

export function DealPrice({
  withFrame,
  amount,
  compare,
  className = "",
  compact = false,
  light = false,
}: {
  withFrame?: boolean;
  amount?: number;
  compare?: number;
  className?: string;
  compact?: boolean;
  light?: boolean;
}) {
  const now = amount ?? priceFor(Boolean(withFrame));
  const was = compare ?? compareFor(Boolean(withFrame));
  return (
    <span className={`deal-price ${compact ? "is-compact" : ""} ${light ? "is-light" : ""} ${className}`.trim()}>
      <s className="deal-was">{formatInr(was)}</s>
      <span className="deal-now">{formatInr(now)}</span>
    </span>
  );
}
