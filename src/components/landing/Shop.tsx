"use client";

import { PRODUCTS } from "@/data/products";
import { ProductCard } from "./ProductCard";

export function Shop() {
  return (
    <section id="shop" className="relative scroll-mt-20 py-10 md:py-20">
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="mb-6 flex items-end justify-between gap-6 px-4 md:mb-10 md:px-8">
          <h2 className="type-on-field min-w-0 text-[clamp(2.1rem,11vw,4.5rem)] font-extrabold leading-[0.86] tracking-[-0.05em] text-[#171411]">
            the drop.
          </h2>
          <p className="hidden max-w-[16rem] text-sm text-[#7a7268] md:block">
            same can. same hour. pick a mood.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-y-8 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-12 sm:px-4 md:px-8 lg:gap-x-8">
          {PRODUCTS.map((product, index) => (
            <ProductCard key={product.id} product={product} eager={index < 2} />
          ))}
        </div>
      </div>
    </section>
  );
}
