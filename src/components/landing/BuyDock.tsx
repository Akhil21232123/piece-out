"use client";

import { PRODUCTS } from "@/data/products";
import { priceFor } from "@/lib/brand";
import type { CheckoutItem } from "@/lib/checkout";

export function BuyDock({ onBuy }: { onBuy: (item: CheckoutItem) => void }) {
  const product = PRODUCTS[0];
  const price = priceFor(false);

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0a0a0a]/92 px-4 py-3 backdrop-blur-md md:hidden">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold">{product.name}</p>
          <p className="text-xs text-[#8a857c]">₹{price} · tap to pop pieces</p>
        </div>
        <button
          type="button"
          onClick={() =>
            onBuy({
              productId: product.id,
              name: product.name,
              subtitle: product.line,
              withFrame: false,
              price,
            })
          }
          className="rounded-full bg-[#d8ff3e] px-5 py-2.5 text-xs font-extrabold text-[#0a0a0a]"
        >
          Buy
        </button>
      </div>
    </div>
  );
}
