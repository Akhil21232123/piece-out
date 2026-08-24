"use client";

import Image from "next/image";

export function BlendPhoto({
  src,
  alt,
  sizes,
  preload = false,
  eager = false,
  multiply = false,
  className = "",
}: {
  src: string;
  alt: string;
  sizes: string;
  preload?: boolean;
  eager?: boolean;
  multiply?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <div className="photo-bloom pointer-events-none absolute inset-0" />
      <div className={`photo-blend relative h-full w-full ${multiply ? "photo-multiply" : ""}`}>
        <Image
          src={src}
          alt={alt}
          fill
          preload={preload}
          loading={preload || eager ? "eager" : "lazy"}
          fetchPriority={preload ? "high" : "auto"}
          unoptimized
          sizes={sizes}
          className="object-contain"
        />
      </div>
    </div>
  );
}
