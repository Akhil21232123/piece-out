import gsap from "gsap";

const JIG =
  "M26 8h10c0 7 10 7 10 0h10v10c7 0 7 10 0 10v10H46c0-7-10-7-10 0H26V28c-7 0-7-10 0-10V8Z";

const CHIP_COLORS = ["#f5c400", "#e31b23", "#8A56B8", "#fffaf3", "#9b2242", "#171411", "#1d4ed8"];

function jigSvg(fill: string, size: number) {
  const el = document.createElement("div");
  el.className = "cart-burst-chip";
  el.style.cssText = `position:absolute;top:0;left:0;width:${size}px;height:${size}px;will-change:transform;`;
  el.innerHTML = `<svg viewBox="0 0 72 72" width="${size}" height="${size}" aria-hidden><path d="${JIG}" fill="${fill}"/></svg>`;
  return el;
}

function bagCenter() {
  const bag = document.querySelector("[data-cart-bag]");
  if (bag) {
    const r = bag.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return {
    x: window.innerWidth / 2,
    y: window.innerHeight - 28 - Number.parseFloat(getComputedStyle(document.documentElement).fontSize || "16"),
  };
}

export function playAddToCart(opts: { button: DOMRect; photo?: DOMRect; image: string }) {
  if (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    window.matchMedia("(pointer: coarse)").matches
  ) {
    window.dispatchEvent(new Event("po-cart-catch"));
    return;
  }

  const layer = document.createElement("div");
  layer.className = "cart-burst-layer";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);

  const ox = opts.button.left + opts.button.width / 2;
  const oy = opts.button.top + opts.button.height / 2;
  const chips = CHIP_COLORS.map((fill, i) => {
    const size = 18 + (i % 3) * 4;
    const chip = jigSvg(fill, size);
    layer.appendChild(chip);
    gsap.set(chip, {
      x: ox,
      y: oy,
      xPercent: -50,
      yPercent: -50,
      scale: 0,
      rotation: (i - 3) * 18,
      force3D: true,
    });
    return chip;
  });

  let ghost: HTMLDivElement | null = null;
  if (opts.photo && opts.image) {
    ghost = document.createElement("div");
    ghost.className = "cart-burst-ghost";
    ghost.style.cssText = [
      "position:absolute",
      "top:0",
      "left:0",
      `width:${opts.photo.width}px`,
      `height:${opts.photo.height}px`,
      `background-image:url("${opts.image}")`,
      "background-size:cover",
      "background-position:center",
      "border-radius:1.15rem",
      "box-shadow:0 18px 40px rgb(23 20 17 / 0.22)",
      "will-change:transform,opacity",
    ].join(";");
    layer.appendChild(ghost);
    gsap.set(ghost, {
      x: opts.photo.left + opts.photo.width / 2,
      y: opts.photo.top + opts.photo.height / 2,
      xPercent: -50,
      yPercent: -50,
      scale: 1,
      force3D: true,
    });
  }

  const scatter = chips.map((_, i) => {
    const ang = (Math.PI * 2 * i) / chips.length - Math.PI / 2;
    const dist = 42 + (i % 4) * 14;
    return { x: ox + Math.cos(ang) * dist, y: oy + Math.sin(ang) * dist, rot: (i % 2 ? 1 : -1) * (48 + i * 12) };
  });

  const fly = () => {
    const bag = bagCenter();
    const tl = gsap.timeline({
      onComplete: () => {
        layer.remove();
      },
    });

    tl.to(
      chips,
      {
        x: (i) => scatter[i].x,
        y: (i) => scatter[i].y,
        scale: 1,
        rotation: (i) => scatter[i].rot,
        duration: 0.28,
        stagger: 0.018,
        ease: "back.out(2.1)",
      },
      0,
    );

    if (ghost) {
      const startScale = 1;
      const midScale = Math.min(0.22, 56 / Math.max(opts.photo!.width, 1));
      tl.to(
        ghost,
        {
          scale: startScale * 0.92,
          duration: 0.12,
          ease: "power2.out",
        },
        0,
      );
      tl.to(
        ghost,
        {
          x: bag.x,
          y: bag.y,
          scale: midScale,
          rotation: 14,
          duration: 0.62,
          ease: "power3.in",
        },
        0.1,
      );
      tl.to(
        ghost,
        { scale: 0, autoAlpha: 0, duration: 0.16, ease: "power2.in" },
        "-=0.08",
      );
    }

    tl.to(
      chips,
      {
        x: bag.x,
        y: bag.y,
        scale: 0.18,
        rotation: (i) => scatter[i].rot + (i % 2 ? 160 : -160),
        duration: 0.52,
        stagger: 0.022,
        ease: "power3.in",
      },
      0.2,
    );
    tl.to(
      chips,
      { scale: 0, autoAlpha: 0, duration: 0.14, ease: "power2.in" },
      "-=0.12",
    );
    tl.add(() => {
      window.dispatchEvent(new Event("po-cart-catch"));
    }, 0.62);
  };

  gsap.delayedCall(0.08, fly);
}
