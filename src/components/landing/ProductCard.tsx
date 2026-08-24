"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product } from "@/data/products";
import { priceFor } from "@/lib/brand";
import { useCartStore } from "@/store/cartStore";
import { FrameSwitch } from "./FrameSwitch";
import { ProductPuzzle } from "./ProductPuzzle";

export function ProductCard({ product }: { product: Product }) {
  const [withFrame, setWithFrame] = useState(false);
  const [added, setAdded] = useState(false);
  const add = useCartStore((state) => state.add);
  const qty = useCartStore((state) =>
    state.lines
      .filter((line) => line.productId === product.id)
      .reduce((sum, line) => sum + line.qty, 0),
  );
  const price = priceFor(withFrame);

  const addToCart = () => {
    add({
      productId: product.id,
      name: product.name,
      image: product.image,
      line: product.line,
      withFrame,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 900);
  };

  return (
    <article className="flex h-full min-w-0 flex-col">
      <div className="relative overflow-hidden bg-[#efe8dc] sm:rounded-[1.25rem]">
        <Image
          src={product.image}
          alt={`${product.name} puzzle can and framed art`}
          width={product.width}
          height={product.height}
          sizes="(max-width: 640px) 100vw, 50vw"
          quality={90}
          className="product-shot h-auto w-full max-w-full"
        />
        <ProductPuzzle product={product} />
      </div>
      <div className="flex flex-1 flex-col gap-3 bg-[#fffaf3]/90 px-4 py-4 sm:bg-[#fffaf3]/80 sm:px-2 sm:pb-4">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-[#171411]">{product.name}</h3>
            <p className="mt-0.5 text-sm text-[#7a7268]">{product.line}</p>
          </div>
          <p className="text-lg font-extrabold tabular-nums text-[#171411]">₹{price}</p>
        </div>
        <FrameSwitch withFrame={withFrame} onChange={setWithFrame} />
        <button
          type="button"
          onClick={addToCart}
          className={`mt-auto min-h-12 rounded-full py-3 text-sm font-extrabold transition ${
            added
              ? "bg-[#f5c400] text-[#171411]"
              : "bg-[#171411] text-[#fffaf3] hover:bg-[#e31b23]"
          }`}
        >
          {added ? "Added" : qty > 0 ? `Add another · ${qty} in bag` : "Add to cart"}
        </button>
      </div>
    </article>
  );
}
