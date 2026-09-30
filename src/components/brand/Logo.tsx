"use client";

import Image from "next/image";

type LogoProps = {
  className?: string;
  title?: string;
  size?: number;
  withWordmark?: boolean;
  ink?: "dark" | "light";
};

export function Logo({
  className = "",
  title = "pieceout",
  size = 40,
  withWordmark = false,
  ink = "dark",
}: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} role="img" aria-label={title}>
      <Image
        src="/brand/mark.jpg"
        alt=""
        width={size}
        height={size}
        quality={100}
        unoptimized
        className="rounded-full object-cover mark-live"
        style={{ width: size, height: size }}
      />
      {withWordmark ? (
        <span
          className={`hidden text-sm font-extrabold tracking-tight sm:inline ${
            ink === "light" ? "text-[#fffaf3]" : "text-[#171411]"
          }`}
        >
          piece<span className="text-[#8A56B8]">/</span>out
        </span>
      ) : null}
    </span>
  );
}
