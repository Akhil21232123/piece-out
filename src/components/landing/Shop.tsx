"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CATEGORIES, filterShop, isProductSoldOut, SHOP, type Product, type ShopFilter } from "@/data/products";
import { NotifyModal } from "./NotifyModal";
import { ProductCard } from "./ProductCard";
import { ProductStory } from "./ProductStory";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const FILTERS: { id: ShopFilter; label: string }[] = [
  { id: "all", label: "All" },
  ...CATEGORIES,
];

export function Shop() {
  const rootRef = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<ShopFilter>("all");
  const [catalog, setCatalog] = useState<Product[]>(SHOP);
  const [story, setStory] = useState<Product | null>(null);
  const [notify, setNotify] = useState<Product | null>(null);
  const shown = filterShop(filter, catalog);

  useEffect(() => {
    let live = true;
    fetch("/api/catalog", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { products?: Product[] }) => {
        if (!live || !Array.isArray(data.products) || !data.products.length) return;
        setCatalog(data.products);
      })
      .catch(() => {
        /* keep the local drop */
      });
    return () => {
      live = false;
    };
  }, []);

  useGSAP(
    () => {
      const head = headRef.current;
      if (!head) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;
      const line = head.querySelector(".shop-line");
      if (line) {
        gsap.from(line, {
          yPercent: 110,
          duration: 0.95,
          ease: "power4.out",
          scrollTrigger: {
            trigger: head,
            start: "top 88%",
            once: true,
          },
        });
      }
      gsap.from(head.children, {
        y: 16,
        autoAlpha: 0.25,
        duration: 0.75,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: {
          trigger: head,
          start: "top 88%",
          once: true,
        },
      });
    },
    { scope: headRef },
  );

  useGSAP(
    (_context, contextSafe) => {
      const root = rootRef.current;
      const spot = spotRef.current;
      if (!root || !spot) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      gsap.set(spot, { xPercent: -50, yPercent: -50, autoAlpha: 0, scale: 0.78 });
      const xTo = gsap.quickTo(spot, "x", { duration: 0.55, ease: "power3.out" });
      const yTo = gsap.quickTo(spot, "y", { duration: 0.55, ease: "power3.out" });
      const cards = gsap.utils.toArray<HTMLElement>(root.querySelectorAll("article"));
      let hover: HTMLElement | null = null;
      let current: HTMLElement | null = null;

      const place = (el: HTMLElement) => {
        const box = root.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        xTo(r.left + r.width / 2 - box.left);
        yTo(r.top + r.height * 0.34 - box.top);
      };

      const light = (el: HTMLElement | null) => {
        if (el === current) {
          if (el) place(el);
          return;
        }
        current?.classList.remove("is-spot");
        current = el;
        current?.classList.add("is-spot");
        if (el) place(el);
      };

      const pick = () => {
        if (hover?.isConnected) {
          light(hover);
          return;
        }
        const mid = window.innerHeight * 0.42;
        let best: HTMLElement | null = null;
        let bestD = Infinity;
        for (const card of cards) {
          const r = card.getBoundingClientRect();
          if (r.bottom < 90 || r.top > window.innerHeight - 50) continue;
          const d = Math.abs(r.top + r.height * 0.32 - mid);
          if (d < bestD) {
            bestD = d;
            best = card;
          }
        }
        light(best);
      };

      const safe = contextSafe ?? ((fn: (e: PointerEvent) => void) => fn);
      const onMove = safe((e: PointerEvent) => {
        if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
        hover = (e.target as HTMLElement | null)?.closest("article") ?? null;
        pick();
      });
      const onLeave = safe(() => {
        hover = null;
        pick();
      });

      root.addEventListener("pointermove", onMove, { passive: true });
      root.addEventListener("pointerleave", onLeave);

      ScrollTrigger.create({
        trigger: root,
        start: "top 88%",
        end: "bottom 8%",
        onEnter: () => gsap.to(spot, { autoAlpha: 1, scale: 1, duration: 0.7, ease: "power3.out" }),
        onEnterBack: () => gsap.to(spot, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "power3.out" }),
        onLeave: () => gsap.to(spot, { autoAlpha: 0, duration: 0.35, ease: "power2.out" }),
        onLeaveBack: () => gsap.to(spot, { autoAlpha: 0, duration: 0.28, ease: "power2.out" }),
        onUpdate: pick,
      });
      pick();
      requestAnimationFrame(() => ScrollTrigger.refresh());

      return () => {
        root.removeEventListener("pointermove", onMove);
        root.removeEventListener("pointerleave", onLeave);
        current?.classList.remove("is-spot");
      };
    },
    { scope: rootRef, dependencies: [filter, catalog], revertOnUpdate: true },
  );

  return (
    <section ref={rootRef} id="shop" className="relative scroll-mt-20 py-10 md:py-20">
      <div ref={spotRef} className="shop-spot" aria-hidden />
      <div className="relative z-[1] mx-auto w-full max-w-[1400px]">
        <div
          ref={headRef}
          className="mb-4 flex items-end justify-between gap-6 px-3 md:mb-6 md:px-8"
        >
          <h2 className="type-on-field min-w-0 overflow-hidden text-[clamp(2.1rem,11vw,4.5rem)] font-extrabold leading-[0.86] tracking-[-0.05em] text-[#171411]">
            <span className="shop-line inline-block">products.</span>
          </h2>
          <p className="hidden max-w-[16rem] pb-3 text-sm text-[#7a7268] md:block">
            art. culture. music. sports. movies.
          </p>
        </div>
        <div className="mb-6 px-3 md:mb-10 md:px-8">
          <div className="shop-cats" role="group" aria-label="Shop by category">
            {FILTERS.map((item) => {
              const on = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter(item.id)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-extrabold ${
                    on
                      ? "border-[#171411] bg-[#171411] text-[#fffaf3]"
                      : "border-[#171411]/16 bg-[#fffaf3] text-[#171411] hover:border-[#171411]/40"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
        <div
          ref={gridRef}
          className="shop-grid grid grid-cols-1 gap-y-8 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-12 sm:px-4 md:px-8 lg:gap-x-8"
        >
          {shown.flatMap((product, index) => {
            const sold = isProductSoldOut(product);
            const firstSold = sold && (index === 0 || !isProductSoldOut(shown[index - 1]));
            const card = (
              <ProductCard
                key={product.id}
                product={product}
                slot={index}
                eager={index < 2}
                onOpen={() => setStory(product)}
                onNotify={() => setNotify(product)}
              />
            );
            if (!firstSold) return [card];
            return [
              <p
                key="sold-out-label"
                className="col-span-full px-1 pt-4 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#7a7268] sm:px-0"
              >
                sold out
              </p>,
              card,
            ];
          })}
        </div>
      </div>
      <ProductStory
        product={story}
        onClose={() => setStory(null)}
        onNotify={(item) => {
          setStory(null);
          setNotify(item);
        }}
      />
      <NotifyModal product={notify} onClose={() => setNotify(null)} />
    </section>
  );
}
